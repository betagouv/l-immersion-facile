import { createSelector } from "@reduxjs/toolkit";
import { InclusionConnectJwt, authFailed } from "shared";
import { FederatedIdentityWithUser } from "src/core-logic/domain/auth/auth.slice";
import { inclusionConnectedSelectors } from "src/core-logic/domain/inclusionConnected/inclusionConnected.selectors";
import { createRootSelector } from "src/core-logic/storeConfig/store";

const currentFederatedIdentity = createRootSelector(
  (state) => state.auth.federatedIdentityWithUser,
);

const isPeConnected = createSelector(
  currentFederatedIdentity,
  (federatedIdentity) =>
    federatedIdentity?.provider === "peConnect" &&
    federatedIdentity.token !== authFailed,
);

const isInclusionConnected = createSelector(
  currentFederatedIdentity,
  (federatedIdentity) => federatedIdentity?.provider === "inclusionConnect",
);

const inclusionConnectToken = createSelector(
  isInclusionConnected,
  currentFederatedIdentity,
  (isInclusionConnected, federatedIdentity) =>
    isInclusionConnected
      ? (federatedIdentity?.token as InclusionConnectJwt)
      : undefined,
);

const isAdminConnected = createSelector(
  inclusionConnectedSelectors.currentUser,
  isInclusionConnected,
  (user, isInclusionConnected) =>
    (isInclusionConnected && user?.isBackofficeAdmin) ?? false,
);

const userIsDefined = (
  federatedIdentity: FederatedIdentityWithUser | null,
): federatedIdentity is FederatedIdentityWithUser => {
  if (!federatedIdentity) return false;
  const { email, firstName, lastName } = federatedIdentity;
  return email !== "" && firstName !== "" && lastName !== "";
};

const connectedUser = createSelector(
  currentFederatedIdentity,
  (federatedIdentity) => {
    if (!userIsDefined(federatedIdentity)) return;
    const { email, firstName, lastName } = federatedIdentity;
    return { email, firstName, lastName };
  },
);

export const authSelectors = {
  federatedIdentity: currentFederatedIdentity,
  isAdminConnected,
  isPeConnected,
  isInclusionConnected,
  inclusionConnectToken,
  connectedUser,
};
