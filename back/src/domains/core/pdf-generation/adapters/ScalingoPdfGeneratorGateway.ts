import {
  AbsoluteUrl,
  HtmlToPdfRequest,
  withAuthorizationHeaders,
} from "shared";
import { HttpClient, defineRoute, defineRoutes } from "shared-routes";
import { z } from "zod";
import { UuidGenerator } from "../../uuid-generator/ports/UuidGenerator";
import { PdfGeneratorGateway } from "../ports/PdfGeneratorGateway";

type ScalingoPdfGeneratorRoutes = ReturnType<
  typeof makeScalingoPdfGeneratorRoutes
>;
export const makeScalingoPdfGeneratorRoutes = (baseUrl: AbsoluteUrl) => {
  const url: AbsoluteUrl = `${baseUrl}/generate`;

  return defineRoutes({
    generate: defineRoute({
      method: "post",
      url,
      ...withAuthorizationHeaders,
      queryParamsSchema: z.object({
        request_id: z.string().optional(),
      }),
      requestBodySchema: z.object({
        htmlContent: z.string(),
      }),
      responses: {
        200: z.string(),
        401: z.string(),
      },
    }),
  });
};

export class ScalingoPdfGeneratorGateway implements PdfGeneratorGateway {
  #httpClient: HttpClient<ScalingoPdfGeneratorRoutes>;

  #apiKey: string;

  #uuidGenerator: UuidGenerator;

  constructor(
    httpClient: HttpClient<ScalingoPdfGeneratorRoutes>,
    apiKey: string,
    uuidGenerator: UuidGenerator,
  ) {
    this.#httpClient = httpClient;
    this.#apiKey = apiKey;
    this.#uuidGenerator = uuidGenerator;
  }

  public async make({
    htmlContent,
    conventionId,
  }: HtmlToPdfRequest): Promise<string> {
    const requestId = this.#uuidGenerator.new();

    const response = await this.#httpClient.generate({
      headers: { authorization: this.#apiKey },
      body: { htmlContent },
      queryParams: {
        request_id: requestId,
      },
    });

    if (response.status !== 200)
      throw new Error(
        `[requestId : ${requestId}, conventionId : ${conventionId}] Pdf generation failed with status ${response.status} - ${response.body}`,
      );

    return response.body;
  }
}
