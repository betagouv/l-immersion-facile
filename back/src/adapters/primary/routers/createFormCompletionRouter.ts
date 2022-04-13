import { Router } from "express";
import { romeAutocompleteInputSchema } from "../../../shared/romeAndAppellationDtos/romeAndAppellation.schema";
import {
  appellationRoute,
  romeRoute,
  siretRoute,
} from "../../../shared/routes";
import { createLogger } from "../../../utils/logger";
import { AppDependencies } from "../config";
import { sendHttpResponse } from "../helpers/sendHttpResponse";

const logger = createLogger(__filename);

export const createFormCompletionRouter = (deps: AppDependencies) => {
  const formCompletionRouter = Router();

  formCompletionRouter.route(`/${appellationRoute}`).get(async (req, res) =>
    sendHttpResponse(req, res, async () => {
      logger.info(req);
      return deps.useCases.appellationSearch.execute(
        req.query.searchText as any,
      );
    }),
  );

  formCompletionRouter.route(`/${romeRoute}`).get(async (req, res) =>
    sendHttpResponse(req, res, async () => {
      logger.info(req);
      const query = romeAutocompleteInputSchema.parse(req.query);
      return deps.useCases.romeSearch.execute(query.searchText);
    }),
  );

  formCompletionRouter
    .route(`/${siretRoute}/:siret`)
    .get(async (req, res) =>
      sendHttpResponse(req, res, async () =>
        deps.useCases.getSiret.execute(req.params),
      ),
    );

  return formCompletionRouter;
};
