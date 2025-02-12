import { Router } from "express";
import { establishmentRoutes, formCompletionRoutes } from "shared";
import { createExpressSharedRouter } from "shared-routes/express";
import type { AppDependencies } from "../../../../config/bootstrap/createAppDependencies";
import { sendHttpResponse } from "../../../../config/helpers/sendHttpResponse";

export const createEstablishmentRouter = (deps: AppDependencies) => {
  const establishmentRouter = Router({ mergeParams: true });

  //TODO: Move this route to createFormCompletionRouter OR move isSiretAlreadySaved route on EstablishmentRoutes
  const sharedSiretRouter = createExpressSharedRouter(
    formCompletionRoutes,
    establishmentRouter,
  );

  sharedSiretRouter.isSiretAlreadySaved((req, res) =>
    sendHttpResponse(req, res, () =>
      deps.useCases.isFormEstablishmentWithSiretAlreadySaved.execute(
        req.params.siret,
      ),
    ),
  );

  const establishmentSharedRouter = createExpressSharedRouter(
    establishmentRoutes,
    establishmentRouter,
  );

  establishmentSharedRouter.addFormEstablishment((req, res) =>
    sendHttpResponse(req, res, () =>
      deps.useCases.addFormEstablishment.execute(req.body),
    ),
  );

  establishmentSharedRouter.requestEmailToUpdateFormRoute((req, res) =>
    sendHttpResponse(req, res.status(201), () =>
      deps.useCases.requestEditFormEstablishment.execute(req.params.siret),
    ),
  );

  establishmentSharedRouter.getFormEstablishment(
    deps.establishmentMagicLinkAuthMiddleware,
    (req, res) =>
      sendHttpResponse(req, res, () =>
        deps.useCases.retrieveFormEstablishmentFromAggregates.execute(
          req.params.siret,
          req.payloads?.establishment ?? req.payloads?.inclusion,
        ),
      ),
  );

  establishmentSharedRouter.updateFormEstablishment(
    deps.establishmentMagicLinkAuthMiddleware,
    (req, res) =>
      sendHttpResponse(req, res, () =>
        deps.useCases.updateEstablishmentAggregateFromForm.execute(
          { formEstablishment: req.body },
          req.payloads?.establishment ?? req.payloads?.inclusion,
        ),
      ),
  );

  establishmentSharedRouter.deleteEstablishment(
    deps.inclusionConnectAuthMiddleware,
    (req, res) =>
      sendHttpResponse(req, res.status(204), () =>
        deps.useCases.deleteEstablishment.execute(
          req.params,
          req.payloads?.currentUser,
        ),
      ),
  );

  return establishmentRouter;
};
