import React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@codegouvfr/react-dsfr/Button";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ContactEstablishmentByPhoneDto,
  contactEstablishmentByPhoneSchema,
  domElementIds,
  RomeCode,
  SiretDto,
} from "shared";
import { makeFieldError } from "src/app/hooks/formContents.hooks";
import { immersionSearchGateway } from "src/config/dependencies";

type ContactByPhoneProps = {
  siret: SiretDto;
  romeCode: RomeCode;
  onSuccess: () => void;
};

export const ContactByPhone = ({
  siret,
  romeCode,
  onSuccess,
}: ContactByPhoneProps) => {
  const initialValues: ContactEstablishmentByPhoneDto = {
    siret,
    romeCode,
    contactMode: "PHONE",
    potentialBeneficiaryFirstName: "",
    potentialBeneficiaryLastName: "",
    potentialBeneficiaryEmail: "",
  };

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
    await immersionSearchGateway.contactEstablishment(values);
    onSuccess();
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
            id: domElementIds.search.contactByPhoneButton,
          }}
        >
          Envoyer
        </Button>
      </>
    </form>
  );
};
