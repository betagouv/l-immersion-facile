import { Router } from "express";
import { searchImmersionRoutes } from "shared";
import { createExpressSharedRouter } from "shared-routes/express";
import type { AppDependencies } from "../../config/createAppDependencies";
import { sendHttpResponse } from "../../helpers/sendHttpResponse";

export const createSearchImmersionRouter = (deps: AppDependencies) => {
  const searchImmersionRouter = Router();

  const expressSharedRouter = createExpressSharedRouter(
    searchImmersionRoutes,
    searchImmersionRouter,
  );

  expressSharedRouter.searchImmersion(async (req, res) =>
    sendHttpResponse(req, res, async () =>
      deps.useCases.searchImmersion.execute(req.query, req.apiConsumer),
    ),
  );

  expressSharedRouter.contactEstablishment(async (req, res) =>
    sendHttpResponse(req, res.status(201), () =>
      deps.useCases.contactEstablishment.execute(req.body),
    ),
  );

  expressSharedRouter.getOffersByGroupSlug(async (req, res) =>
    sendHttpResponse(req, res, async () =>
      deps.useCases.getOffersByGroupSlug.execute(req.params),
    ),
  );

  return searchImmersionRouter;
};
