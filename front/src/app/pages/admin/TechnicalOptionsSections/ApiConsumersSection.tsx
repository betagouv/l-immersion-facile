import { fr } from "@codegouvfr/react-dsfr";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Button } from "@codegouvfr/react-dsfr/Button";
import ButtonsGroup from "@codegouvfr/react-dsfr/ButtonsGroup";
import { Input } from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { useIsModalOpen } from "@codegouvfr/react-dsfr/Modal/useIsModalOpen";
import { Table } from "@codegouvfr/react-dsfr/Table";
import { addYears } from "date-fns";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import {
  ApiConsumer,
  ApiConsumerJwt,
  toDateString,
  toDisplayedDate,
} from "shared";
import { ApiConsumerForm } from "src/app/components/admin/technical-options/ApiConsumerForm";
import {
  formatApiConsumerContact,
  formatApiConsumerDescription,
  formatApiConsumerName,
  formatApiConsumerRights,
  makeApiConsumerActionButtons,
} from "src/app/contents/admin/apiConsumer";
import { useAdminToken } from "src/app/hooks/jwt.hooks";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { useCopyButton } from "src/app/hooks/useCopyButton";
import { apiConsumerSelectors } from "src/core-logic/domain/apiConsumer/apiConsumer.selector";
import { apiConsumerSlice } from "src/core-logic/domain/apiConsumer/apiConsumer.slice";
import { P, match } from "ts-pattern";
import { v4 as uuidV4 } from "uuid";

export const ApiConsumersSection = () => {
  const apiConsumers = useAppSelector(apiConsumerSelectors.apiConsumers);

  const isApiConsumerModalOpened = useIsModalOpen(apiConsumerModal);
  const saveConsumerFeedback = useAppSelector(apiConsumerSelectors.feedback);

  const dispatch = useDispatch();

  const adminToken = useAdminToken();
  useEffect(() => {
    adminToken &&
      dispatch(
        apiConsumerSlice.actions.retrieveApiConsumersRequested(adminToken),
      );
  }, [adminToken, dispatch]);

  useEffect(() => {
    if (isApiConsumerModalOpened) return;
    dispatch(apiConsumerSlice.actions.clearFeedbackTriggered());
    dispatch(apiConsumerSlice.actions.clearLastCreatedToken());
    adminToken &&
      dispatch(
        apiConsumerSlice.actions.retrieveApiConsumersRequested(adminToken),
      );
  }, [isApiConsumerModalOpened, dispatch, adminToken]);

  const [currentApiConsumerToEdit, setCurrentApiConsumerToEdit] =
    useState<ApiConsumer>(defaultApiConsumerValues);
  const onApiConsumerAddClick = () => {
    setCurrentApiConsumerToEdit(defaultApiConsumerValues);
    apiConsumerModal.open();
  };

  const onEditButtonClick = (apiConsumer: ApiConsumer) => {
    setCurrentApiConsumerToEdit({
      ...apiConsumer,
      expirationDate: toDateString(new Date(apiConsumer.expirationDate)),
      createdAt: toDateString(new Date(apiConsumer.createdAt)),
    });
    apiConsumerModal.open();
  };

  const onConfirmTokenModalClose = () => {
    dispatch(apiConsumerSlice.actions.clearLastCreatedToken());
    adminToken &&
      dispatch(
        apiConsumerSlice.actions.retrieveApiConsumersRequested(adminToken),
      );
    apiConsumerModal.close();
  };

  const lastCreatedToken = useAppSelector(
    apiConsumerSelectors.lastCreatedToken,
  );

  const sortedApiConsumers = [...apiConsumers].sort(
    (apiConsumer1, apiConsumer2) =>
      new Date(apiConsumer2.createdAt).getTime() -
      new Date(apiConsumer1.createdAt).getTime(),
  );

  const tableDataFromApiConsumers = sortedApiConsumers.map((apiConsumer) => [
    formatApiConsumerName(apiConsumer.id, apiConsumer.name),
    formatApiConsumerDescription(apiConsumer.description),
    toDisplayedDate({
      date: new Date(apiConsumer.expirationDate),
      withHours: true,
    }),
    formatApiConsumerContact(apiConsumer.contact),
    formatApiConsumerRights(apiConsumer.rights),
    makeApiConsumerActionButtons(apiConsumer, onEditButtonClick),
  ]);

  return (
    <>
      <h4>Consommateurs API</h4>
      <Button type="button" onClick={onApiConsumerAddClick}>
        Ajouter un nouveau consommateur
      </Button>
      <div className={fr.cx("fr-grid-row")}>
        <div className={fr.cx("fr-col")}>
          <Table
            fixed
            data={tableDataFromApiConsumers}
            headers={[
              "Id (Nom)",
              "Description",
              "Date d'expiration",
              "Contact",
              "Droits",
              "Actions",
            ]}
          />
        </div>
      </div>
      {createPortal(
        <apiConsumerModal.Component title="Ajout consommateur api">
          {match({
            lastCreatedToken,
            saveConsumerFeedbackKind: saveConsumerFeedback.kind,
          })
            .with(
              {
                lastCreatedToken: P.not(P.nullish),
                saveConsumerFeedbackKind: "createSuccess",
              },
              ({ lastCreatedToken }) => (
                <ShowApiKeyToCopy
                  lastCreatedToken={lastCreatedToken}
                  onConfirmTokenModalClose={onConfirmTokenModalClose}
                />
              ),
            )
            .with({ saveConsumerFeedbackKind: "updateSuccess" }, () => (
              <>
                <Alert
                  severity="success"
                  title="Consommateur Api mis à jour !"
                  className={"fr-mb-2w"}
                />
                <Button type="button" onClick={onConfirmTokenModalClose}>
                  Fermer la fenêtre
                </Button>
              </>
            ))
            .otherwise(() => (
              <ApiConsumerForm initialValues={currentApiConsumerToEdit} />
            ))}
        </apiConsumerModal.Component>,
        document.body,
      )}
    </>
  );
};

const ShowApiKeyToCopy = ({
  lastCreatedToken,
  onConfirmTokenModalClose,
}: {
  lastCreatedToken: ApiConsumerJwt;
  onConfirmTokenModalClose: () => void;
}) => {
  const { copyButtonIsDisabled, copyButtonLabel, onCopyButtonClick } =
    useCopyButton("Copier la clé API");

  return (
    <>
      <Alert
        severity="success"
        title="Consommateur Api ajouté !"
        className={"fr-mb-2w"}
      />
      <Input
        textArea
        label="Token généré"
        hintText="Ce token est à conserver précieusement, il ne sera plus affiché par la suite."
        nativeTextAreaProps={{
          readOnly: true,
          value: lastCreatedToken,
          rows: 5,
        }}
      />

      <ButtonsGroup
        buttons={[
          {
            type: "button",
            children: copyButtonLabel,
            priority: "secondary",
            disabled: copyButtonIsDisabled,
            onClick: () => {
              onCopyButtonClick(lastCreatedToken);
            },
          },
          {
            type: "button",
            children: "J'ai bien copié le token, je peux fermer la fenêtre",
            onClick: onConfirmTokenModalClose,
          },
        ]}
      />
    </>
  );
};

const defaultApiConsumerValues: ApiConsumer = {
  id: uuidV4(),
  name: "",
  contact: {
    lastName: "",
    firstName: "",
    job: "",
    phone: "",
    emails: [],
  },
  rights: {
    searchEstablishment: {
      kinds: [],
      scope: "no-scope",
      subscriptions: [],
    },
    convention: {
      kinds: [],
      scope: {
        agencyKinds: [],
      },
      subscriptions: [],
    },
  },
  createdAt: toDateString(new Date()),
  expirationDate: toDateString(addYears(new Date(), 1)),
};

const apiConsumerModal = createModal({
  id: "api-consumer-modal",
  isOpenedByDefault: false,
});
