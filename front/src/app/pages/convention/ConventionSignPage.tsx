import { fr } from "@codegouvfr/react-dsfr";
import { Alert } from "@codegouvfr/react-dsfr/Alert";
import { Badge } from "@codegouvfr/react-dsfr/Badge";
import React, { useEffect } from "react";
import {
  ConventionSummary,
  Loader,
  MainWrapper,
  PageHeader,
} from "react-design-system";
import { useDispatch } from "react-redux";
import {
  ConventionJwtPayload,
  SignatoryRole,
  allSignatoryRoles,
  decodeMagicLinkJwtWithoutSignatureCheck,
  errors,
  isSignatory,
  toDisplayedDate,
} from "shared";
import { ConventionSignForm } from "src/app/components/forms/convention/ConventionSignForm";
import { makeConventionSections } from "src/app/contents/convention/conventionSummary.helpers";
import { labelAndSeverityByStatus } from "src/app/contents/convention/labelAndSeverityByStatus";
import { P, match } from "ts-pattern";
import { useStyles } from "tss-react/dsfr";
import { Route } from "type-route";
import { conventionSlice } from "../../../core-logic/domain/convention/convention.slice";
import { HeaderFooterLayout } from "../../components/layout/HeaderFooterLayout";
import { useConventionTexts } from "../../contents/forms/convention/textSetup";
import { useConvention } from "../../hooks/convention.hooks";
import { useExistingSiret } from "../../hooks/siret.hooks";
import { routes } from "../../routes/routes";
import { ShowErrorOrRedirectToRenewMagicLink } from "./ShowErrorOrRedirectToRenewMagicLink";

interface ConventionSignPageProperties {
  route: Route<typeof routes.conventionToSign>;
}

const useClearConventionOnUnmount = () => {
  const dispatch = useDispatch();
  return useEffect(
    () => () => {
      dispatch(conventionSlice.actions.clearFetchedConvention());
    },
    [dispatch],
  );
};

export const ConventionSignPage = ({ route }: ConventionSignPageProperties) => {
  useClearConventionOnUnmount();
  if (!route.params.jwt) throw errors.routeParams.missingJwt();
  if (
    !isSignatory(
      decodeMagicLinkJwtWithoutSignatureCheck<ConventionJwtPayload>(
        route.params.jwt,
      ).role,
    )
  )
    throw errors.user.notConventionSignatory();
  return (
    <HeaderFooterLayout>
      <ConventionSignPageContent jwt={route.params.jwt} />
    </HeaderFooterLayout>
  );
};

type ConventionSignPageContentProperties = {
  jwt: string;
};

const ConventionSignPageContent = ({
  jwt,
}: ConventionSignPageContentProperties): JSX.Element => {
  const { cx } = useStyles();
  const dispatch = useDispatch();
  const { applicationId: conventionId } =
    decodeMagicLinkJwtWithoutSignatureCheck<ConventionJwtPayload>(jwt);
  const { convention, fetchConventionError, submitFeedback, isLoading } =
    useConvention({ jwt, conventionId });
  useEffect(() => {
    dispatch(
      conventionSlice.actions.currentSignatoryRoleChanged(extractRole(jwt)),
    );
  }, [jwt, dispatch]);

  useExistingSiret(convention?.siret);

  const t = useConventionTexts(
    convention ? convention.internshipKind : "immersion",
  );

  return (
    <>
      {match({
        hasConvention: convention !== null, // to avoid Type instantiation is excessively deep and possibly infinite error
        isLoading,
        fetchConventionError,
        submitFeedback,
      })
        .with(
          {
            hasConvention: false,
            fetchConventionError: null,
            isLoading: false,
            submitFeedback: { kind: "idle" },
          },
          () => <Loader />,
        )
        .with({ isLoading: true }, () => <Loader />)
        .with(
          { fetchConventionError: P.string },
          ({ fetchConventionError }) => (
            <ShowErrorOrRedirectToRenewMagicLink
              errorMessage={fetchConventionError}
              jwt={jwt}
            />
          ),
        )
        .with({ submitFeedback: { kind: "signedSuccessfully" } }, () => (
          <MainWrapper layout="default">
            <Alert
              severity="success"
              {...t.conventionAlreadySigned}
              title="Convention signée"
              description={`Votre convention (${conventionId}) a bien été signée, merci. Quand toutes les parties l'auront signée et qu'elle aura été validée par ${
                convention?.agencyRefersTo
                  ? convention?.agencyRefersTo.name
                  : convention?.agencyName
              }, vous la recevrez par email.`}
              className={fr.cx("fr-mb-5v")}
            />
            {convention && (
              <ConventionSummary
                submittedAt={toDisplayedDate({
                  date: new Date(convention.dateSubmission),
                })}
                summary={makeConventionSections(convention, cx)}
                conventionId={convention.id}
              />
            )}
          </MainWrapper>
        ))
        .with({ hasConvention: false }, () => (
          <Alert
            severity="error"
            title="Convention introuvable"
            description={errors.convention.notFound({ conventionId }).message}
          />
        ))
        .with(
          {
            hasConvention: true,
          },
          () => (
            <MainWrapper
              layout={"default"}
              vSpacing={0}
              pageHeader={
                <PageHeader
                  title={t.intro.conventionSignTitle}
                  badge={
                    convention && (
                      <Badge
                        className={cx(
                          fr.cx("fr-mb-3w"),
                          labelAndSeverityByStatus[convention.status].color,
                        )}
                      >
                        {labelAndSeverityByStatus[convention.status].label}
                      </Badge>
                    )
                  }
                />
              }
            >
              {convention && (
                <>
                  {convention.status === "REJECTED" && (
                    <Alert
                      severity="error"
                      title={t.sign.rejected.title}
                      description={
                        <>
                          <p className={fr.cx("fr-mt-1w")}>
                            {t.sign.rejected.detail}
                          </p>
                          <p>{t.sign.rejected.contact}</p>
                        </>
                      }
                    />
                  )}
                  {convention.status === "DRAFT" && (
                    <Alert
                      severity="info"
                      title={t.sign.needsModification.title}
                      description={
                        <p className={fr.cx("fr-mt-1w")}>
                          {t.sign.needsModification.detail}
                        </p>
                      }
                    />
                  )}
                  {convention.status === "DEPRECATED" && (
                    <Alert
                      severity="error"
                      title={t.sign.deprecated.title}
                      description={
                        <>
                          <p className={fr.cx("fr-mt-1w")}>
                            {t.sign.deprecated.detail}
                          </p>
                          {convention.statusJustification ? (
                            <p>
                              Les raisons sont :{" "}
                              {convention.statusJustification}
                            </p>
                          ) : null}
                        </>
                      }
                    />
                  )}
                  {convention.status !== "DRAFT" &&
                    convention.status !== "REJECTED" &&
                    convention.status !== "DEPRECATED" && (
                      <ConventionSignForm
                        convention={convention}
                        jwt={jwt}
                        submitFeedback={submitFeedback}
                      />
                    )}
                </>
              )}
            </MainWrapper>
          ),
        )
        .exhaustive()}
    </>
  );
};

const extractRole = (jwt: string): SignatoryRole => {
  const role =
    decodeMagicLinkJwtWithoutSignatureCheck<ConventionJwtPayload>(jwt).role;
  if (isSignatory(role)) return role;
  throw new Error(
    `Only ${allSignatoryRoles.join(", ")} are allow to sign, received ${role}`,
  );
};
