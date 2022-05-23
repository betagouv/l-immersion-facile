import { Router } from "express";
import promClient from "prom-client";
import {
  getImmersionOfferByIdRoute,
  searchImmersionRoute,
  immersionOffersApiAuthRoute,
} from "shared/src/routes";
import type { AppDependencies } from "../config/createAppDependencies";
import { sendHttpResponse } from "../helpers/sendHttpResponse";
import {
  ForbiddenError,
  validateAndParseZodSchema,
} from "../helpers/httpErrors";
import { formEstablishmentDtoPublicV0ToDomain } from "./DtoAndSchemas/v0/input/FormEstablishmentPublicV0.dto";
import { formEstablishmentSchemaPublicV0 } from "./DtoAndSchemas/v0/input/FormEstablishmentPublicV0.schema";
import { pipeWithValue } from "shared/src/pipeWithValue";
import { domainToSearchImmersionResultPublicV0 } from "./DtoAndSchemas/v0/output/SearchImmersionResultPublicV0.dto";
import { searchImmersionRequestPublicV0ToDomain } from "./DtoAndSchemas/v0/input/SearchImmersionRequestPublicV0.dto";

const counterFormEstablishmentCaller = new promClient.Counter({
  name: "form_establishment_callers_counter",
  help: "The total count form establishment adds, broken down by referer.",
  labelNames: ["referer"],
});

export const createApiKeyAuthRouter = (deps: AppDependencies) => {
  const authenticatedRouter = Router({ mergeParams: true });

  authenticatedRouter.use(deps.apiKeyAuthMiddleware);

  authenticatedRouter
    .route(`/${searchImmersionRoute}`)
    .post(async (req, res) => {
      const searchImmersionRequestDto = searchImmersionRequestPublicV0ToDomain(
        req.body,
      );
      return sendHttpResponse(req, res, async () => {
        await deps.useCases.callLaBonneBoiteAndUpdateRepositories.execute(
          searchImmersionRequestDto,
        );
        return (
          await deps.useCases.searchImmersion.execute(
            searchImmersionRequestDto,
            req.apiConsumer,
          )
        ).map(domainToSearchImmersionResultPublicV0);
      });
    });

  authenticatedRouter
    .route(`/${getImmersionOfferByIdRoute}/:id`)
    .get(async (req, res) =>
      sendHttpResponse(req, res, async () =>
        domainToSearchImmersionResultPublicV0(
          await deps.useCases.getImmersionOfferById.execute(
            req.params.id,
            req.apiConsumer,
          ),
        ),
      ),
    );
  authenticatedRouter
    .route(`/${immersionOffersApiAuthRoute}`)
    .post(async (req, res) => {
      counterFormEstablishmentCaller.inc({
        referer: req.get("Referrer"),
      });

      return sendHttpResponse(req, res, () => {
        if (!req.apiConsumer?.isAuthorized) throw new ForbiddenError();

        return pipeWithValue(
          validateAndParseZodSchema(formEstablishmentSchemaPublicV0, {
            ...req.body,
            isSearchable: true,
          }),
          formEstablishmentDtoPublicV0ToDomain,
          (domainFormEstablishmentWithoutSource) =>
            deps.useCases.addFormEstablishment.execute({
              ...domainFormEstablishmentWithoutSource,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              source: req.apiConsumer!.consumer,
            }),
        );
      });
    });

  return authenticatedRouter;
};
