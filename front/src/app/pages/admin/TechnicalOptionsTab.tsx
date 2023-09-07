import React, { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { fr } from "@codegouvfr/react-dsfr";
import Alert, { AlertProps } from "@codegouvfr/react-dsfr/Alert";
import { Badge } from "@codegouvfr/react-dsfr/Badge";
import Button from "@codegouvfr/react-dsfr/Button";
import { Checkbox } from "@codegouvfr/react-dsfr/Checkbox";
import Input from "@codegouvfr/react-dsfr/Input";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { Table } from "@codegouvfr/react-dsfr/Table";
import { ToggleSwitch } from "@codegouvfr/react-dsfr/ToggleSwitch";
import { zodResolver } from "@hookform/resolvers/zod";
import { keys } from "ramda";
import { v4 as uuidV4 } from "uuid";
import {
  ApiConsumer,
  ApiConsumerContact,
  ApiConsumerId,
  ApiConsumerKind,
  apiConsumerKinds,
  ApiConsumerName,
  ApiConsumerRights,
  apiConsumerSchema,
  ConventionScope,
  FeatureFlagName,
  NoScope,
  toDisplayedDate,
} from "shared";
import { Loader } from "react-design-system";
import { MultipleEmailsInput } from "src/app/components/forms/commons/MultipleEmailsInput";
import { commonContent } from "src/app/contents/commonContent";
import { makeFieldError } from "src/app/hooks/formContents.hooks";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { useFeatureFlags } from "src/app/hooks/useFeatureFlags";
import { apiConsumerSelectors } from "src/core-logic/domain/apiConsumer/apiConsumer.selector";
import { apiConsumerSlice } from "src/core-logic/domain/apiConsumer/apiConsumer.slice";
import { featureFlagSelectors } from "src/core-logic/domain/featureFlags/featureFlags.selector";
import { featureFlagsSlice } from "src/core-logic/domain/featureFlags/featureFlags.slice";

const labelsByFeatureFlag: Record<FeatureFlagName, string> = {
  enableInseeApi: "API insee (siret)",
  enableLogoUpload: "Upload de logos (pour agences)",
  enablePeConnectApi: "PE Connect",
  enablePeConventionBroadcast: "Diffusion des Conventions à Pole Emploi",
  enableTemporaryOperation: "Activer l'offre temporaire",
  enableMaxContactPerWeek:
    "Activer le nombre de mise en contact maximum par semaine sur le formulaire entreprise",
  enableMaintenance: "Activer le mode maintenance",
};

type ApiConsumerRow = [
  ReactNode,
  ReactNode,
  string,
  string,
  ReactNode,
  ReactNode,
];

const formatApiConsumerContact = (apiConsumerContact: ApiConsumerContact) => `${
  apiConsumerContact.lastName
} ${apiConsumerContact.firstName}
  ${apiConsumerContact.job}
  ${apiConsumerContact.phone}
  ${apiConsumerContact.emails.join(", ")}`;

const apiConsumerKindSeverity: Record<ApiConsumerKind, AlertProps.Severity> = {
  READ: "success",
  WRITE: "warning",
};

const formatApiConsumerRights = (apiConsumerRights: ApiConsumerRights) => {
  const apiConsumerNames = keys(apiConsumerRights);
  return (
    <ul>
      {apiConsumerNames.map((name, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <li key={index}>
          <strong>{name}</strong>
          <ul className={fr.cx("fr-badge-group")}>
            {apiConsumerRights[name].kinds.map((kind) => (
              <li key={kind}>
                <Badge severity={apiConsumerKindSeverity[kind]}>{kind}</Badge>
              </li>
            ))}
          </ul>
          {formatApiConsumerScope(apiConsumerRights[name].scope)}
        </li>
      ))}
    </ul>
  );
};

const formatApiConsumerDescription = (description: string | undefined) => {
  if (!description) return "";
  return (
    <span title={description}>
      {description.length <= 15
        ? description
        : `${description.slice(0, 15)}...`}
    </span>
  );
};

const formatApiConsumerName = (id: ApiConsumerId, name: ApiConsumerName) => (
  <>
    <strong>{id}</strong>
    <br />({name})
  </>
);

const formatApiConsumerScope = (scope: NoScope | ConventionScope) => {
  if (scope === "no-scope") return "";
  return <ApiConsumerConventionScopeDisplayed scope={scope} />;
};

const makeApiConsumerActionButtons = (
  apiConsumer: ApiConsumer,
  onClick: (apiConsumer: ApiConsumer) => void,
) => (
  <Button size="small" type="button" onClick={() => onClick(apiConsumer)}>
    Éditer
  </Button>
);

const ApiConsumerConventionScopeDisplayed = ({
  scope,
}: {
  scope: ConventionScope;
}) => {
  const apiConsumerScopeName = keys(scope);
  const [isScopeDisplayed, setIsDisplayed] = useState(false);
  return (
    <>
      <Button
        className={fr.cx("fr-my-1w")}
        size="small"
        priority="secondary"
        type="button"
        onClick={() => {
          setIsDisplayed(!isScopeDisplayed);
        }}
      >
        {isScopeDisplayed ? "Cacher les scopes" : "Voir les scopes"}
      </Button>
      {isScopeDisplayed && (
        <ul className={fr.cx("fr-text--xs")}>
          {apiConsumerScopeName.map((scopeName) => (
            <li key={scopeName}>
              {scopeName}:
              <ul>
                {scope[scopeName].map((value) => (
                  <li key={value}>{value}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

const {
  Component: ApiConsumerModal,
  open: openApiConsumerModal,
  close: closeApiConsumerModal,
} = createModal({
  id: "consumer-api-modal",
  isOpenedByDefault: false,
});

const defaultApiConsumerValues: ApiConsumer = {
  id: uuidV4(),
  consumer: "",
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
    },
    convention: {
      kinds: [],
      scope: {
        agencyKinds: [],
        agencyIds: [],
      },
    },
  },
  createdAt: new Date().toISOString(),
  expirationDate: new Date().toISOString(),
};

export const TechnicalOptionsTab = () => {
  const { isLoading: isFeatureFlagsLoading, ...featureFlags } =
    useFeatureFlags();
  const dispatch = useDispatch();
  const lastCreatedToken = useAppSelector(
    apiConsumerSelectors.lastCreatedToken,
  );
  const maintenanceMessageRef = useRef<HTMLDivElement>(null);
  const maintenanceMessage = useAppSelector(
    featureFlagSelectors.maintenanceMessage,
  );
  const [currentApiConsumerToEdit, setCurrentApiConsumerToEdit] =
    useState<ApiConsumer>(defaultApiConsumerValues);
  const apiConsumers = useAppSelector(apiConsumerSelectors.apiConsumers);
  const isApiConsumersLoading = useAppSelector(apiConsumerSelectors.isLoading);

  const onEditButtonClick = (apiConsumer: ApiConsumer) => {
    setCurrentApiConsumerToEdit(apiConsumer);
    openApiConsumerModal();
  };

  const tableDataFromApiConsumers: ApiConsumerRow[] = apiConsumers.map(
    (apiConsumer) => [
      formatApiConsumerName(apiConsumer.id, apiConsumer.consumer),
      formatApiConsumerDescription(apiConsumer.description),
      toDisplayedDate(new Date(apiConsumer.expirationDate), true),
      formatApiConsumerContact(apiConsumer.contact),
      formatApiConsumerRights(apiConsumer.rights),
      makeApiConsumerActionButtons(apiConsumer, onEditButtonClick),
    ],
  );

  useEffect(() => {
    dispatch(apiConsumerSlice.actions.retrieveApiConsumersRequested());
  }, []);

  const onConfirmTokenModalClose = () => {
    dispatch(apiConsumerSlice.actions.clearLastCreatedToken());
    dispatch(apiConsumerSlice.actions.retrieveApiConsumersRequested());
    closeApiConsumerModal();
  };

  const onApiConsumerAddClick = () => {
    setCurrentApiConsumerToEdit(defaultApiConsumerValues);
    openApiConsumerModal();
  };

  return (
    <>
      {(isFeatureFlagsLoading || isApiConsumersLoading) && <Loader />}
      <div className={fr.cx("fr-container")}>
        <h4>Les fonctionnalités optionnelles</h4>
        <div className={fr.cx("fr-grid-row")}>
          <div className={fr.cx("fr-col")}>
            <div className={fr.cx("fr-input-group")}>
              <fieldset className={fr.cx("fr-fieldset")}>
                <div className={fr.cx("fr-fieldset__content")}>
                  {keys(labelsByFeatureFlag).map((featureFlagName) => (
                    <div key={featureFlagName}>
                      <ToggleSwitch
                        label={labelsByFeatureFlag[featureFlagName]}
                        checked={featureFlags[featureFlagName].isActive}
                        showCheckedHint={false}
                        onChange={() => {
                          const isConfirmed = window.confirm(
                            "Vous aller changer ce réglage pour tous les utilisateurs, voulez-vous confirmer ?",
                          );

                          if (isConfirmed)
                            dispatch(
                              featureFlagsSlice.actions.setFeatureFlagRequested(
                                {
                                  flagName: featureFlagName,
                                  flagContent: {
                                    ...featureFlags[featureFlagName],
                                    isActive:
                                      !featureFlags[featureFlagName].isActive,
                                  },
                                },
                              ),
                            );
                        }}
                      />
                      {featureFlagName === "enableMaintenance" && (
                        <div className={fr.cx("fr-ml-9w")}>
                          <Input
                            ref={maintenanceMessageRef}
                            textArea
                            label="Message de maintenance"
                            hintText="Si aucun message n'est fourni, nous affichons le message de maintenance par défaut."
                            nativeTextAreaProps={{
                              placeholder: commonContent.maintenanceMessage,
                              defaultValue: maintenanceMessage,
                            }}
                          />
                          <Button
                            type="button"
                            size="small"
                            onClick={() => {
                              const message =
                                maintenanceMessageRef.current?.querySelector(
                                  "textarea",
                                )?.value || "";
                              dispatch(
                                featureFlagsSlice.actions.setFeatureFlagRequested(
                                  {
                                    flagName: featureFlagName,
                                    flagContent: {
                                      isActive:
                                        featureFlags[featureFlagName].isActive,
                                      value: {
                                        message,
                                      },
                                    },
                                  },
                                ),
                              );
                            }}
                          >
                            Mettre à jour le message de maintenance
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      </div>
      <div className={fr.cx("fr-container", "fr-mt-6w")}>
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
          <ApiConsumerModal title="Ajout consommateur api">
            {lastCreatedToken && (
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
                <Button type="button" onClick={onConfirmTokenModalClose}>
                  J'ai bien copié le token, je peux fermer la fenêtre
                </Button>
              </>
            )}
            {!lastCreatedToken && (
              <ApiConsumerForm initialValues={currentApiConsumerToEdit} />
            )}
          </ApiConsumerModal>,
          document.body,
        )}
      </div>
    </>
  );
};

const ApiConsumerForm = ({ initialValues }: { initialValues: ApiConsumer }) => {
  const dispatch = useDispatch();
  const methods = useForm<ApiConsumer>({
    resolver: zodResolver(apiConsumerSchema),
    mode: "onTouched",
    defaultValues: initialValues,
  });
  const { getValues, register, setValue, handleSubmit, formState, reset } =
    methods;

  const getFieldError = makeFieldError(formState);

  const onValidSubmit = (values: ApiConsumer) => {
    dispatch(apiConsumerSlice.actions.saveApiConsumerRequested(values));
  };

  useEffect(() => {
    reset(initialValues);
  }, [initialValues]);

  return (
    <form onSubmit={handleSubmit(onValidSubmit)}>
      <input type="hidden" {...register("id")} />
      <Input
        label="Nom du consommateur"
        nativeInputProps={{
          ...register("consumer"),
        }}
        {...getFieldError("consumer")}
      />
      <Input
        label="Nom du contact"
        nativeInputProps={{ ...register("contact.lastName") }}
        {...getFieldError("contact.lastName")}
      />
      <Input
        label="Prénom du contact"
        nativeInputProps={{ ...register("contact.firstName") }}
        {...getFieldError("contact.firstName")}
      />
      <Input
        label="Poste du contact"
        nativeInputProps={{ ...register("contact.job") }}
        {...getFieldError("contact.job")}
      />
      <Input
        label="Téléphone du contact"
        nativeInputProps={{ ...register("contact.phone") }}
        {...getFieldError("contact.phone")}
      />
      <MultipleEmailsInput
        label="Emails du contact"
        valuesInList={getValues().contact.emails}
        setValues={(values) => {
          setValue("contact.emails", values, { shouldValidate: true });
        }}
        {...register("contact.emails")}
      />
      <Input
        label="Description"
        textArea
        nativeTextAreaProps={{ ...register("description") }}
        {...getFieldError("description")}
      />
      <input type="hidden" {...register("createdAt")} />
      <Input
        label="Date d'expiration"
        nativeInputProps={{ ...register("expirationDate"), type: "date" }}
        {...getFieldError("expirationDate")}
      />
      <ul>
        {keys(initialValues.rights).map((rightName) => (
          <li key={rightName}>
            {rightName}
            <Checkbox
              orientation="horizontal"
              className={fr.cx("fr-mt-1w")}
              options={apiConsumerKinds.map((apiConsumerKind) => ({
                label: apiConsumerKind,
                nativeInputProps: {
                  name: register(`rights.${rightName}.kinds`).name,
                  checked:
                    getValues().rights[rightName].kinds.includes(
                      apiConsumerKind,
                    ),
                  onChange: () => {
                    const rightsToSet = getValues().rights[
                      rightName
                    ].kinds.includes(apiConsumerKind)
                      ? getValues().rights[rightName].kinds.filter(
                          (kind) => kind !== apiConsumerKind,
                        )
                      : [
                          ...getValues().rights[rightName].kinds,
                          apiConsumerKind,
                        ];
                    setValue(`rights.${rightName}.kinds`, rightsToSet, {
                      shouldValidate: true,
                    });
                  },
                },
              }))}
            />
          </li>
        ))}
      </ul>
      <Button>Envoyer</Button>
    </form>
  );
};
