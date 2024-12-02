import { useDispatch } from "react-redux";
import { routes, useRoute } from "src/app/routes/routes";
import { authSlice } from "src/core-logic/domain/auth/auth.slice";

export const useRedirectToConventionWithoutIdentityProvider = () => {
  const dispatch = useDispatch();
  const route = useRoute();

  return () => {
    dispatch(
      authSlice.actions.federatedIdentityProvided({
        federatedIdentityWithUser: null,
        feedbackTopic: "auth-global",
      }),
    );
    if (route.name !== routes.conventionImmersion.name)
      routes.conventionImmersion().push();
  };
};
