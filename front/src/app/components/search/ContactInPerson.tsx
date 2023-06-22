import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ContactEstablishmentInPersonDto,
  contactEstablishmentInPersonSchema,
  domElementIds,
  RomeCode,
  SiretDto,
} from "shared";
import { makeFieldError } from "src/app/hooks/formContents.hooks";
import { immersionSearchGateway } from "src/config/dependencies";

type ContactInPersonProps = {
  siret: SiretDto;
  romeCode: RomeCode;
  onSuccess: () => void;
};

export const ContactInPerson = ({
  siret,
  romeCode,
  onSuccess,
}: ContactInPersonProps) => {
  const initialValues: ContactEstablishmentInPersonDto = {
    siret,
    romeCode,
    contactMode: "IN_PERSON",
    potentialBeneficiaryFirstName: "",
    potentialBeneficiaryLastName: "",
    potentialBeneficiaryEmail: "",
  };

  const methods = useForm<ContactEstablishmentInPersonDto>({
    resolver: zodResolver(contactEstablishmentInPersonSchema),
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

  const onFormValid = async (values: ContactEstablishmentInPersonDto) => {
    await immersionSearchGateway.contactEstablishment(values);
    onSuccess();
  };
  return (
    <form onSubmit={handleSubmit(onFormValid)}>
      <>
        <p className={"fr-my-2w"}>
          Cette entreprise souhaite que vous vous présentiez directement pour
          candidater.
        </p>
        <p className={"fr-my-2w"}>
          Merci de nous indiquer vos coordonnées. Vous recevrez par e-mail le
          nom de la personne à contacter ainsi que des conseils pour présenter
          votre demande d’immersion. Ces informations sont personnelles et
          confidentielles. Elles ne peuvent pas être communiquées à d’autres
          personnes.
        </p>
        <p className={"fr-my-2w"}>Merci !</p>
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
          disabled={isSubmitting}
          nativeButtonProps={{
            id: domElementIds.search.contactInPersonButton,
          }}
        >
          Envoyer
        </Button>
      </>
    </form>
  );
};
