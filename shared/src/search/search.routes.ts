import { defineRoute, defineRoutes } from "shared-routes";
import { contactEstablishmentRequestSchema } from "../contactEstablishmentRequest/contactEstablishmentRequest.schema";
import { groupWithResultsSchema } from "../group/group.schema";
import { httpErrorSchema } from "../httpClient/httpErrors.schema";
import {
  contactEstablishmentRoute,
  immersionOffersRoute,
} from "../routes/routes";
import { siretAndAppellationSchema } from "../siretAndAppellation/SiretAndAppellation.schema";
import { expressEmptyResponseBody } from "../zodUtils";
import { searchQueryParamsSchema } from "./SearchQueryParams.schema";
import { searchResultSchema, searchResultsSchema } from "./SearchResult.schema";

export type SearchRoutes = typeof searchImmersionRoutes;
export const searchImmersionRoutes = defineRoutes({
  getGroupBySlug: defineRoute({
    method: "get",
    url: `/groups/:groupSlug`,
    responses: {
      200: groupWithResultsSchema,
      404: httpErrorSchema,
    },
  }),
  search: defineRoute({
    method: "get",
    url: `/${immersionOffersRoute}`,
    queryParamsSchema: searchQueryParamsSchema,
    responses: {
      200: searchResultsSchema,
      400: httpErrorSchema,
    },
  }),
  contactEstablishment: defineRoute({
    method: "post",
    url: `/${contactEstablishmentRoute}`,
    requestBodySchema: contactEstablishmentRequestSchema,
    responses: {
      201: expressEmptyResponseBody,
      400: httpErrorSchema,
      404: httpErrorSchema,
      409: httpErrorSchema,
    },
  }),
  getSearchResult: defineRoute({
    method: "get",
    url: "/search-result",
    queryParamsSchema: siretAndAppellationSchema,
    responses: {
      200: searchResultSchema,
      400: httpErrorSchema,
      404: httpErrorSchema,
    },
  }),
});
