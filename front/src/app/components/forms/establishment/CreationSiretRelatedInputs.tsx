import { fr } from "@codegouvfr/react-dsfr";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import React, { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useDispatch } from "react-redux";
import {
  FormEstablishmentDto,
  addressDtoToString,
  domElementIds,
} from "shared";
import { AddressAutocomplete } from "src/app/components/forms/autocomplete/AddressAutocomplete";
import { formEstablishmentFieldsLabels } from "src/app/contents/forms/establishment/formEstablishment";
import {
  getFormContents,
  makeFieldError,
} from "src/app/hooks/formContents.hooks";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { useSiretFetcher } from "src/app/hooks/siret.hooks";
import { establishmentSelectors } from "src/core-logic/domain/establishmentPath/establishment.selectors";
import { establishmentSlice } from "src/core-logic/domain/establishmentPath/establishment.slice";

export const CreationSiretRelatedInputs = () => {
  const {
    currentSiret,
    establishmentInfos,
    isFetchingSiret,
    siretErrorToDisplay,
    siretRawError,
    updateSiret,
  } = useSiretFetcher({ shouldFetchEvenIfAlreadySaved: false });
  const establishmentFeedback = useAppSelector(establishmentSelectors.feedback);
  const isLoading = useAppSelector(establishmentSelectors.isLoading);
  const {
    setValue,
    register,
    formState: { touchedFields },
  } = useFormContext<FormEstablishmentDto>();
  const { getFormFields } = getFormContents(formEstablishmentFieldsLabels);
  const formContents = getFormFields();
  const getFieldError = makeFieldError(
    useFormContext<FormEstablishmentDto>().formState,
  );

  useEffect(() => {
    if (isFetchingSiret) return;
    setValue(
      "businessName",
      establishmentInfos ? establishmentInfos.businessName : "",
    );
    setValue(
      "businessAddresses.0",
      establishmentInfos ? establishmentInfos.businessAddress : "",
    );
    setValue("naf", establishmentInfos ? establishmentInfos.nafDto : undefined);
  }, [establishmentInfos]);

  const dispatch = useDispatch();
  return (
    <>
      <Input
        label={formContents.siret.label}
        hintText={formContents.siret.hintText}
        nativeInputProps={{
          ...formContents.siret,
          ...register("siret"),
          onChange: (event) => {
            updateSiret(event.target.value);
            setValue("siret", event.target.value);
          },
        }}
        state={siretErrorToDisplay && touchedFields.siret ? "error" : "default"}
        stateRelatedMessage={
          touchedFields.siret && siretErrorToDisplay ? siretErrorToDisplay : ""
        }
        disabled={isFetchingSiret}
      />
      {siretRawError === "Establishment with this siret is already in our DB" &&
        establishmentFeedback.kind !== "sendModificationLinkSuccess" && (
          <div className={fr.cx("fr-mb-4w")}>
            Cette entreprise a déjà été référencée.
            <Button
              className={fr.cx("fr-mt-2w")}
              onClick={() => {
                dispatch(
                  establishmentSlice.actions.sendModificationLinkRequested(
                    currentSiret,
                  ),
                );
              }}
              nativeButtonProps={{
                id: domElementIds.establishment.errorSiretAlreadyExistButton,
                disabled: isLoading,
              }}
              type="button"
            >
              Demande de modification du formulaire de référencement
            </Button>
            {establishmentFeedback.kind === "sendModificationLinkErrored" && (
              <p className={fr.cx("fr-error-text")}>
                Un email contenant un lien de modification a déjà été envoyé
              </p>
            )}
          </div>
        )}
      {establishmentFeedback.kind === "sendModificationLinkSuccess" && (
        <Alert
          severity="success"
          title="Succès de la demande"
          description="Succès. Un mail a été envoyé au référent de cet établissement avec un
        lien permettant la mise à jour des informations."
          className={fr.cx("fr-mb-4w")}
        />
      )}
      {siretRawError !== null &&
        siretRawError !==
          "Establishment with this siret is already in our DB" && (
          <Alert
            severity="error"
            title="La vérification du SIRET a échoué"
            description={siretErrorToDisplay}
            className={fr.cx("fr-mb-4w")}
          />
        )}
      <Input
        label={formContents.businessName.label}
        hintText={formContents.businessName.hintText}
        nativeInputProps={{
          ...formContents.businessName,
          ...register("businessName"),
          readOnly: true,
        }}
      />
      <Input
        label={formContents.businessNameCustomized.label}
        hintText={formContents.businessNameCustomized.hintText}
        nativeInputProps={{
          ...formContents.businessNameCustomized,
          ...register("businessNameCustomized"),
          readOnly: isFetchingSiret,
        }}
        {...getFieldError("businessNameCustomized")}
      />
      <AddressAutocomplete
        initialSearchTerm={establishmentInfos?.businessAddress}
        {...formContents.businessAddresses}
        setFormValue={({ address }) =>
          setValue("businessAddresses.0", addressDtoToString(address))
        }
        id={domElementIds.establishment.establishmentFormAddressAutocomplete}
        disabled={isFetchingSiret}
      />
    </>
  );
};
