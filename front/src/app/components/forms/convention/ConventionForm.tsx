import React, { useEffect, useState } from "react";
import { FormProvider, SubmitHandler, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { fr } from "@codegouvfr/react-dsfr";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { zodResolver } from "@hookform/resolvers/zod";
import { useStyles } from "tss-react/dsfr";
import {
  Beneficiary,
  ConventionDto,
  ConventionMagicLinkPayload,
  ConventionReadDto,
  conventionWithoutExternalIdSchema,
  decodeMagicLinkJwtWithoutSignatureCheck,
  hasBeneficiaryCurrentEmployer,
  isBeneficiaryMinor,
  isEstablishmentTutorIsEstablishmentRepresentative,
  isPeConnectIdentity,
  notJobSeeker,
} from "shared";
import {
  ConventionFormSidebar,
  SubmitConfirmationSection,
} from "react-design-system";
import { ConventionFeedbackNotification } from "src/app/components/forms/convention/ConventionFeedbackNotification";
import { ConventionFormFields } from "src/app/components/forms/convention/ConventionFormFields";
import {
  ConventionPresentation,
  isConventionFrozen,
  undefinedIfEmptyString,
} from "src/app/components/forms/convention/conventionHelpers";
import { sidebarStepContent } from "src/app/contents/forms/convention/formConvention";
import { useConventionTexts } from "src/app/contents/forms/convention/textSetup";
import { useAppSelector } from "src/app/hooks/reduxHooks";
import { useExistingSiret } from "src/app/hooks/siret.hooks";
import { useCopyButton } from "src/app/hooks/useCopyButton";
import { useMatomo } from "src/app/hooks/useMatomo";
import { useScrollToTop } from "src/app/hooks/window.hooks";
import { ShowErrorOrRedirectToRenewMagicLink } from "src/app/pages/convention/ShowErrorOrRedirectToRenewMagicLink";
import { authSelectors } from "src/core-logic/domain/auth/auth.selectors";
import { FederatedIdentityWithUser } from "src/core-logic/domain/auth/auth.slice";
import { conventionSelectors } from "src/core-logic/domain/convention/convention.selectors";
import { conventionSlice } from "src/core-logic/domain/convention/convention.slice";

const useClearConventionSubmitFeedbackOnUnmount = () => {
  const dispatch = useDispatch();
  useEffect(
    () => () => {
      dispatch(conventionSlice.actions.clearFeedbackTriggered());
    },
    [],
  );
};

const useWaitForReduxFormUiReadyBeforeFormikInitialisation = (
  initialValues: ConventionPresentation,
) => {
  const [reduxFormUiReady, setReduxFormUiReady] = useState<boolean>(false);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(
      conventionSlice.actions.isMinorChanged(isBeneficiaryMinor(initialValues)),
    );
    dispatch(
      conventionSlice.actions.isCurrentEmployerChanged(
        hasBeneficiaryCurrentEmployer(initialValues),
      ),
    );
    dispatch(
      conventionSlice.actions.isTutorEstablishmentRepresentativeChanged(
        isEstablishmentTutorIsEstablishmentRepresentative(initialValues),
      ),
    );
    setReduxFormUiReady(true);
  }, []);

  return reduxFormUiReady;
};

type ConventionFormProps = {
  conventionProperties: ConventionPresentation;
  routeParams?: { jwt?: string };
  mode: "create" | "edit";
};

export const ConventionForm = ({
  conventionProperties,
  routeParams = {},
  mode,
}: ConventionFormProps) => {
  const { cx } = useStyles();
  const federatedIdentity = useAppSelector(authSelectors.federatedIdentity);
  const currentStep = useAppSelector(conventionSelectors.currentStep);
  const sidebarContent = sidebarStepContent(
    conventionProperties?.internshipKind ?? "immersion",
  );
  const [initialValues] = useState<ConventionPresentation>({
    ...conventionProperties,

    signatories: {
      ...conventionProperties.signatories,
      beneficiary: makeInitialBenefiaryForm(
        conventionProperties.signatories.beneficiary,
        federatedIdentity,
      ),
    },
  });

  useExistingSiret(initialValues.siret);
  const submitFeedback = useAppSelector(conventionSelectors.feedback);
  const fetchedConvention: ConventionReadDto | null = useAppSelector(
    conventionSelectors.convention,
  );
  const fetchConventionError = useAppSelector(conventionSelectors.fetchError);
  const dispatch = useDispatch();
  const getInitialFormValues = (mode: ConventionFormProps["mode"]) => {
    if (mode === "create") return initialValues;
    return fetchedConvention || initialValues;
  };
  const methods = useForm<ConventionReadDto>({
    defaultValues: getInitialFormValues(mode),
    resolver: zodResolver(conventionWithoutExternalIdSchema),
    mode: "onTouched",
  });
  const { getValues, reset, formState } = methods;

  const formSuccessfullySubmitted =
    formState.isSubmitted && submitFeedback.kind === "justSubmitted";

  useMatomo(conventionProperties.internshipKind);

  useScrollToTop(formSuccessfullySubmitted);

  useEffect(() => {
    if (mode === "create") {
      dispatch(conventionSlice.actions.clearFetchedConvention());
      return;
    }

    if (mode === "edit" && routeParams.jwt) {
      dispatch(conventionSlice.actions.jwtProvided(routeParams.jwt));
      const { applicationId: conventionId } =
        decodeMagicLinkJwtWithoutSignatureCheck<ConventionMagicLinkPayload>(
          routeParams.jwt,
        );
      dispatch(
        conventionSlice.actions.fetchConventionRequested({
          jwt: routeParams.jwt,
          conventionId,
        }),
      );
    }
  }, []);

  useEffect(() => {
    if (fetchedConvention) {
      reset(fetchedConvention);
    }
  }, [fetchedConvention]);

  const onSubmit: SubmitHandler<ConventionReadDto> = (values) => {
    const conventionToSave = {
      ...values,
      workConditions: undefinedIfEmptyString(values.workConditions),
    } as ConventionDto;
    dispatch(conventionSlice.actions.saveConventionRequested(conventionToSave));
  };
  const reduxFormUiReady =
    useWaitForReduxFormUiReadyBeforeFormikInitialisation(initialValues);

  useClearConventionSubmitFeedbackOnUnmount();

  const t = useConventionTexts(initialValues.internshipKind);

  const isFrozen = isConventionFrozen(
    fetchedConvention ? fetchedConvention.status : initialValues.status,
  );

  const { copyButtonIsDisabled, copyButtonLabel, onCopyButtonClick } =
    useCopyButton();

  if (!reduxFormUiReady) return null;

  if (routeParams.jwt && fetchConventionError)
    return (
      <ShowErrorOrRedirectToRenewMagicLink
        errorMessage={fetchConventionError}
        jwt={routeParams.jwt}
      />
    );

  if (formSuccessfullySubmitted)
    return (
      <SubmitConfirmationSection
        idToCopy={getValues().id}
        copyButtonIsDisabled={copyButtonIsDisabled}
        copyButtonLabel={copyButtonLabel}
        onCopyButtonClick={onCopyButtonClick}
      />
    );

  return (
    <div className={fr.cx("fr-grid-row", "fr-grid-row--gutters")}>
      <div className={fr.cx("fr-col-12", "fr-col-lg-8")}>
        {/* Should be removed on accordion form */}
        <div className={cx("fr-text")}>{t.intro.welcome}</div>
        <Alert
          severity="info"
          small
          description={t.intro.conventionWelcomeNotification}
        />

        <p className={fr.cx("fr-text--xs", "fr-mt-3w")}>
          Tous les champs marqués d'une astérisque (*) sont obligatoires.
        </p>
        <FormProvider {...methods}>
          <form>
            <ConventionFormFields onSubmit={onSubmit} isFrozen={isFrozen} />
            <ConventionFeedbackNotification
              submitFeedback={submitFeedback}
              signatories={getValues("signatories")}
            />
          </form>
        </FormProvider>
      </div>
      <div className={fr.cx("fr-col-12", "fr-col-lg-4")}>
        <ConventionFormSidebar
          currentStep={currentStep}
          sidebarContent={sidebarContent}
        />
      </div>
    </div>
  );
};

const makeInitialBenefiaryForm = (
  beneficiary: Beneficiary<"immersion" | "mini-stage-cci">,
  federatedIdentityWithUser: FederatedIdentityWithUser | null,
): Beneficiary<"immersion" | "mini-stage-cci"> => {
  const { federatedIdentity, ...beneficiaryOtherProperties } = beneficiary;
  const peConnectIdentity =
    federatedIdentityWithUser && isPeConnectIdentity(federatedIdentityWithUser)
      ? federatedIdentityWithUser
      : undefined;
  const federatedIdentityValue = federatedIdentity ?? peConnectIdentity;

  return {
    ...beneficiaryOtherProperties,
    ...(federatedIdentityValue?.token !== notJobSeeker && {
      federatedIdentity: federatedIdentityValue,
    }),
  };
};
