import Alert from "@codegouvfr/react-dsfr/Alert";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import Select from "@codegouvfr/react-dsfr/SelectNext";
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  AppellationDto,
  ContactEstablishmentByPhoneDto,
  contactEstablishmentByPhoneSchema,
  domElementIds,
} from "shared";
import { getDefaultAppellationCode } from "src/app/components/immersion-offer/contactUtils";
import { useContactEstablishmentError } from "src/app/components/search/useContactEstablishmentError";
import { makeFieldError } from "src/app/hooks/formContents.hooks";
import { routes, useRoute } from "src/app/routes/routes";
import { outOfReduxDependencies } from "src/config/dependencies";
import { Route } from "type-route";

type ContactByPhoneProps = {
  appellations: AppellationDto[];
  onSubmitSuccess: () => void;
};

export const ContactByPhone = ({
  appellations,
  onSubmitSuccess,
}: ContactByPhoneProps) => {
  const { activeError, setActiveErrorKind } = useContactEstablishmentError();
  const route = useRoute() as Route<typeof routes.searchResult>;
  const initialValues: ContactEstablishmentByPhoneDto = useMemo(
    () => ({
      siret: route.params.siret,
      appellationCode: getDefaultAppellationCode(
        appellations,
        route.params.appellationCode,
      ),
      contactMode: "PHONE",
      potentialBeneficiaryFirstName: route.params.contactFirstName ?? "",
      potentialBeneficiaryLastName: route.params.contactLastName ?? "",
      potentialBeneficiaryEmail: route.params.contactEmail ?? "",
      locationId: route.params.location ?? "",
    }),
    [route.params, appellations],
  );

  const appellationListOfOptions = appellations.map((appellation) => ({
    value: appellation.appellationCode,
    label: appellation.appellationLabel,
  }));

  const methods = useForm<ContactEstablishmentByPhoneDto>({
    resolver: zodResolver(contactEstablishmentByPhoneSchema),
    mode: "onTouched",
    defaultValues: initialValues,
  });

  const {
    register,
    handleSubmit,
    formState,
    formState: { isSubmitting },
  } = methods;

  const getFieldError = makeFieldError(formState);

  const onFormValid = async (values: ContactEstablishmentByPhoneDto) => {
    const errorKind =
      await outOfReduxDependencies.searchGateway.contactEstablishment(values);
    if (errorKind) return setActiveErrorKind(errorKind);
    onSubmitSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onFormValid)}>
      <>
        <p className={"fr-my-2w"}>
          Cette entreprise souhaite être contactée par téléphone. Merci de nous
          indiquer vos coordonnées.
        </p>
        <p className={"fr-my-2w"}>
          Nous allons vous transmettre par e-mail le nom de la personne à
          contacter, son numéro de téléphone ainsi que des conseils pour
          présenter votre demande d’immersion.
        </p>
        <p className={"fr-my-2w"}>
          Ces informations sont personnelles et confidentielles. Elles ne
          peuvent pas être communiquées à d’autres personnes. Merci !
        </p>
        {appellations.length > 1 && (
          <Select
            label={"Métier sur lequel porte la demande d'immersion *"}
            options={appellationListOfOptions}
            placeholder={"Sélectionnez un métier"}
            nativeSelectProps={{
              ...register("appellationCode"),
            }}
            {...getFieldError("appellationCode")}
          />
        )}
        <Input
          label="Votre email *"
          nativeInputProps={{
            ...register("potentialBeneficiaryEmail"),
            type: "email",
          }}
          {...getFieldError("potentialBeneficiaryEmail")}
        />
        <Input
          label="Votre prénom *"
          nativeInputProps={register("potentialBeneficiaryFirstName")}
          {...getFieldError("potentialBeneficiaryFirstName")}
        />
        <Input
          label="Votre nom *"
          nativeInputProps={register("potentialBeneficiaryLastName")}
          {...getFieldError("potentialBeneficiaryLastName")}
        />

        <Button
          priority="secondary"
          type="submit"
          disabled={isSubmitting || activeError.isActive}
          nativeButtonProps={{
            id: domElementIds.search.contactByPhoneButton,
          }}
        >
          Envoyer
        </Button>

        {activeError.isActive && (
          <Alert
            severity="error"
            title={activeError.title}
            description={activeError.description}
          />
        )}
      </>
    </form>
  );
};
