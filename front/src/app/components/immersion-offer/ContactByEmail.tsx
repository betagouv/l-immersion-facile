import React, { useEffect } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { fr } from "@codegouvfr/react-dsfr";
import Alert from "@codegouvfr/react-dsfr/Alert";
import { ButtonsGroup } from "@codegouvfr/react-dsfr/ButtonsGroup";
import CallOut from "@codegouvfr/react-dsfr/CallOut";
import { Input } from "@codegouvfr/react-dsfr/Input";
import Select from "@codegouvfr/react-dsfr/SelectNext";
import { zodResolver } from "@hookform/resolvers/zod";
import { Route } from "type-route";
import {
  AppellationCode,
  AppellationDto,
  ContactEstablishmentByMailDto,
  contactEstablishmentByMailFormSchema,
  conventionObjectiveOptions,
  domElementIds,
  SiretDto,
} from "shared";
import { useContactEstablishmentError } from "src/app/components/search/useContactEstablishmentError";
import { makeFieldError } from "src/app/hooks/formContents.hooks";
import { routes, useRoute } from "src/app/routes/routes";
import { searchGateway } from "src/config/dependencies";
import { EmailValidationInput } from "../forms/commons/EmailValidationInput";

type ContactByEmailProps = {
  siret: SiretDto;
  appellations: AppellationDto[];
  onSubmitSuccess: () => void;
};

const motivationPlaceholder =
  "***Rédigez ici votre email de motivation en suivant nos conseils.***";
const initialMessage = `Bonjour, \n\n\
J’ai trouvé votre entreprise sur le site https://immersion-facile.beta.gouv.fr\n\
${motivationPlaceholder}
  \n\
Pourriez-vous me contacter par mail ou par téléphone pour me proposer un rendez-vous ? \n\
Je pourrais alors vous expliquer directement mon projet. \n\
  \n\
En vous remerciant,`;

const getDefaultAppellationCode = (
  appellations: AppellationDto[],
  appellationInParams: AppellationCode,
) => {
  if (appellationInParams) {
    return appellationInParams;
  }
  return appellations.length > 1 ? "" : appellations[0].appellationCode;
};

export const ContactByEmail = ({
  siret,
  appellations,
  onSubmitSuccess,
}: ContactByEmailProps) => {
  const { activeError, setActiveErrorKind } = useContactEstablishmentError();
  const route = useRoute() as Route<typeof routes.searchResult>;

  const initialValues: ContactEstablishmentByMailDto = {
    siret,
    appellationCode: getDefaultAppellationCode(
      appellations,
      route.params.appellationCode,
    ),
    contactMode: "EMAIL",
    potentialBeneficiaryFirstName: route.params.contactFirstName ?? "",
    potentialBeneficiaryLastName: route.params.contactLastName ?? "",
    potentialBeneficiaryEmail: route.params.contactEmail ?? "",
    message: route.params.contactMessage ?? initialMessage,
    immersionObjective: null,
    potentialBeneficiaryResumeLink: "",
    potentialBeneficiaryPhone: route.params.contactPhone ?? "",
  };

  const appellationListOfOptions = appellations.map((appellation) => ({
    value: appellation.appellationCode,
    label: appellation.appellationLabel,
  }));

  const methods = useForm<ContactEstablishmentByMailDto>({
    resolver: zodResolver(contactEstablishmentByMailFormSchema),
    mode: "onTouched",
    defaultValues: initialValues,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState,
    formState: { isSubmitting },
  } = methods;

  const getFieldError = makeFieldError(formState);

  const onFormValid = async (values: ContactEstablishmentByMailDto) => {
    const errorKind = await searchGateway.contactEstablishment({
      ...values,
      message: removeMotivationPlaceholder(values.message),
    });
    if (errorKind) return setActiveErrorKind(errorKind);
    onSubmitSuccess();
  };

  useEffect(() => {
    reset({
      ...initialValues,
      siret,
    });
  }, [siret]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onFormValid)}>
        <>
          <p>
            Cette entreprise a choisi d'être contactée par mail. Veuillez
            compléter ce formulaire qui sera transmis à l'entreprise.
          </p>
          <CallOut title="Besoin d'aide ?">
            <a
              href="https://aide.immersion-facile.beta.gouv.fr/fr/article/choisir-lobjet-et-rediger-un-email-de-motivation-pour-decrocher-une-immersion-xytzii/"
              target="_blank"
              rel="noreferrer"
            >
              Nos conseils pour choisir l’objet et rédiger un bon email de
              motivation.
            </a>
          </CallOut>

          <h2 className={fr.cx("fr-h6", "fr-mt-3w")}>
            Votre email de motivation
          </h2>
          <Select
            label={
              "Objet de la période de mise en situation en milieu professionnel *"
            }
            options={immersionObjectiveListOfOptions}
            placeholder={"Sélectionnez un objet"}
            nativeSelectProps={{
              ...register("immersionObjective"),
            }}
            {...getFieldError("immersionObjective")}
          />

          <Select
            disabled={appellations.length === 1}
            label={"Métier sur lequel porte la demande d'immersion *"}
            options={appellationListOfOptions}
            placeholder={"Sélectionnez un métier"}
            nativeSelectProps={{
              ...register("appellationCode"),
            }}
            {...getFieldError("appellationCode")}
          />

          <Input
            label="Votre message à l’entreprise *"
            textArea
            nativeTextAreaProps={{
              ...register("message"),
              rows: 6,
            }}
            {...getFieldError("message")}
          />
          <h2 className={fr.cx("fr-h6")}>Vos informations</h2>

          <Input
            label="Prénom *"
            nativeInputProps={register("potentialBeneficiaryFirstName")}
            {...getFieldError("potentialBeneficiaryFirstName")}
          />
          <Input
            label="Nom *"
            nativeInputProps={register("potentialBeneficiaryLastName")}
            {...getFieldError("potentialBeneficiaryLastName")}
          />
          <EmailValidationInput
            label="Email *"
            nativeInputProps={{
              ...register("potentialBeneficiaryEmail"),
            }}
            {...getFieldError("potentialBeneficiaryEmail")}
          />

          <Input
            label="Téléphone *"
            nativeInputProps={{
              ...register("potentialBeneficiaryPhone"),
              type: "phone",
            }}
            {...getFieldError("potentialBeneficiaryPhone")}
          />

          <Input
            label="Page LinkedIn ou CV en ligne (facultatif)"
            nativeInputProps={{
              ...register("potentialBeneficiaryResumeLink"),
            }}
            {...getFieldError("potentialBeneficiaryResumeLink")}
          />

          <ButtonsGroup
            className={fr.cx()}
            alignment="right"
            inlineLayoutWhen="always"
            buttons={[
              {
                type: "submit",
                priority: "primary",
                disabled: isSubmitting || activeError.isActive,
                nativeButtonProps: {
                  id: domElementIds.search.contactByMailButton,
                },
                children: "Envoyer",
              },
            ]}
          />

          {activeError.isActive && (
            <Alert
              severity="error"
              title={activeError.title}
              description={activeError.description}
            />
          )}
        </>
      </form>
    </FormProvider>
  );
};

const immersionObjectiveListOfOptions = conventionObjectiveOptions.map(
  (immersionObjective) => ({
    value: immersionObjective,
    label: immersionObjective,
  }),
);
const removeMotivationPlaceholder = (message: string) =>
  message.replace(`\n${motivationPlaceholder}`, "");
