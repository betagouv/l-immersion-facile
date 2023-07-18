import { z } from "zod";
import {
  httpErrorSchema,
  searchImmersionResultSchema,
  searchImmersionsSchema,
  withAuthorizationHeaders,
} from "shared";
import { defineRoute, defineRoutes } from "shared-routes";
import { contactEstablishmentPublicV2Schema } from "../DtoAndSchemas/v2/input/ContactEstablishmentPublicV2.schema";
import { searchImmersionRequestPublicV2Schema } from "../DtoAndSchemas/v2/input/SearchImmersionRequestPublicV2.schema";

export type PublicApiV2Routes = typeof publicApiV2Routes;
export const publicApiV2Routes = defineRoutes({
  getOfferBySiretAndAppellationCode: defineRoute({
    method: "get",
    url: "/v2/offers/:siret/:appellationCode",
    ...withAuthorizationHeaders,
    responses: {
      200: searchImmersionResultSchema,
      401: httpErrorSchema,
      403: httpErrorSchema,
      404: httpErrorSchema,
    },
  }),
  searchImmersion: defineRoute({
    method: "get",
    url: "/v2/offers",
    queryParamsSchema: searchImmersionRequestPublicV2Schema,
    ...withAuthorizationHeaders,
    responses: {
      200: searchImmersionsSchema,
      400: httpErrorSchema,
      401: httpErrorSchema,
      403: httpErrorSchema,
    },
  }),
  contactEstablishment: defineRoute({
    method: "post",
    url: "/v2/contact-establishment",
    requestBodySchema: contactEstablishmentPublicV2Schema,
    ...withAuthorizationHeaders,
    responses: {
      201: z.void(),
      400: httpErrorSchema,
      401: httpErrorSchema,
      403: httpErrorSchema,
      404: httpErrorSchema,
    },
  }),
});
