import ButtonsGroup from "@codegouvfr/react-dsfr/ButtonsGroup";
import { createModal } from "@codegouvfr/react-dsfr/Modal";
import { useEffect, useState } from "react";
import { FormOverlay } from "react-design-system";
import {
  isStringImmersionObjective,
  keys,
  labelsForImmersionObjective,
} from "shared";
import { inputsLabelsByKey } from "src/app/components/immersion-offer/ContactByEmail";
import {
  ContactTranscientData,
  TranscientData,
  useTranscientDataFromStorage,
} from "src/app/components/immersion-offer/useTranscientDataFromStorage";

const transcientPreferencesModal = createModal({
  id: "transcient-preferences-modal",
  isOpenedByDefault: true,
});

type TranscientPreferencesDisplayBaseProps = {
  scope: keyof TranscientData;
  onPreferencesChange: (accept: boolean) => void;
};

type TranscientPreferencesDisplayWithModeModal = {
  mode: "modal";
};

type TranscientPreferencesDisplayWithModeFormOverlay = {
  mode: "form-overlay";
  parentRef: React.RefObject<HTMLFormElement>;
};

type TranscientPreferencesDisplayProps = TranscientPreferencesDisplayBaseProps &
  (
    | TranscientPreferencesDisplayWithModeModal
    | TranscientPreferencesDisplayWithModeFormOverlay
  );

export const TranscientPreferencesDisplay = (
  props: TranscientPreferencesDisplayProps,
) => {
  const { scope, onPreferencesChange, mode } = props;
  const {
    getTranscientDataForScope,
    setPreferUseTranscientDataForScope,
    setTranscientDataForScope,
    clearTranscientDataForScope,
  } = useTranscientDataFromStorage(scope);
  const transcientDataForScope = getTranscientDataForScope();
  const [displayIsVisible, setDisplayIsVisible] = useState(false);
  const savePreferences = (accept: boolean) => {
    setPreferUseTranscientDataForScope(accept);
    setTranscientDataForScope({
      ...transcientDataForScope?.value,
    });
    onPreferencesChange(accept);
    if (mode === "modal") {
      transcientPreferencesModal.close();
    }
    if (mode === "form-overlay") {
      setDisplayIsVisible(false);
    }
  };
  const shouldOpenDisplay = transcientDataForScope !== null;
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (shouldOpenDisplay && mode === "modal") {
        transcientPreferencesModal.open();
      }
      if (shouldOpenDisplay && mode === "form-overlay") {
        setDisplayIsVisible(true);
      }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [shouldOpenDisplay, mode]);

  const jsxContent = (
    <>
      <p>
        Nous avons trouvé des données précédemment saisies pour vous aider à
        remplir ce formulaire :
      </p>
      {transcientDataForScope?.value && (
        <ul>{renderTranscientKeyValues(transcientDataForScope.value)}</ul>
      )}

      <p>Voulez-vous utiliser ces données ?</p>
      <ButtonsGroup
        buttons={[
          {
            type: "button",
            children: "Oui",
            id: "transcient-preferences-modal-yes",
            onClick: () => {
              savePreferences(true);
            },
          },
          {
            type: "button",
            priority: "secondary",
            children: "Pas cette fois",
            id: "transcient-preferences-modal-no",
            onClick: () => {
              savePreferences(false);
            },
          },
          {
            type: "button",
            priority: "secondary",
            children: "Non, ce n'est pas moi",
            id: "transcient-preferences-modal-clear",
            onClick: () => {
              savePreferences(false);
              clearTranscientDataForScope();
            },
          },
        ]}
      />
    </>
  );
  return mode === "modal" ? (
    <transcientPreferencesModal.Component title="Préremplir le formulaire">
      {jsxContent}
    </transcientPreferencesModal.Component>
  ) : (
    <FormOverlay isVisible={displayIsVisible} parentRef={props.parentRef}>
      {jsxContent}
    </FormOverlay>
  );
};

const renderTranscientKeyValues = (data: ContactTranscientData) => {
  return keys(data).map((key) => {
    const label = inputsLabelsByKey[key];
    const value = data[key];
    return value ? (
      <li key={key}>
        {label}&nbsp;: <strong>{renderValue(key, value)}</strong>
      </li>
    ) : null;
  });
};

const renderValue = (
  key: keyof ContactTranscientData,
  value: boolean | string | number,
): React.ReactNode => {
  if (typeof value === "boolean") {
    return value ? "Oui" : "Non";
  }
  if (isStringImmersionObjective(value) && key === "immersionObjective") {
    return labelsForImmersionObjective[value];
  }
  return <>{value}</>;
};
