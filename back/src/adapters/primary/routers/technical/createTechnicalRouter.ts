import { createHmac } from "crypto";
import { Router } from "express";
import { IpFilter } from "express-ipfilter";
import multer from "multer";
import { TallyForm, technicalRoutes, uploadFileRoute } from "shared";
import { BadRequestError, ForbiddenError } from "shared";
import { createExpressSharedRouter } from "shared-routes/express";
import type { AppDependencies } from "../../../../config/bootstrap/createAppDependencies";
import { sendHttpResponse } from "../../../../config/helpers/sendHttpResponse";
import { sendRedirectResponse } from "../../../../config/helpers/sendRedirectResponse";
import { UploadFileInput } from "../../../../domains/core/file-storage/useCases/UploadFile";
import { createLogger } from "../../../../utils/logger";
import { createOpenApiSpecV2 } from "../apiKeyAuthRouter/createOpenApiV2";

const logger = createLogger(__filename);

export const createTechnicalRouter = (
  deps: AppDependencies,
  inboundEmailAllowIps: string[],
) => {
  const technicalRouter = Router();

  const upload = multer({ storage: multer.memoryStorage() });

  technicalRouter
    .route(`/${uploadFileRoute}`)
    .post(upload.single(uploadFileRoute), (req, res) =>
      sendHttpResponse(req, res, async () => {
        if (!req.file) throw new BadRequestError("No file provided");
        const params: UploadFileInput = {
          multerFile: req.file,
          renameFileToId: req.body?.renameFileToId.toLowerCase() === "true",
        };
        return deps.useCases.uploadFile.execute(params);
      }),
    );

  const technicalSharedRouter = createExpressSharedRouter(
    technicalRoutes,
    technicalRouter,
    {
      onInputValidationError: (zodError, route) => {
        if (route.url === technicalRoutes.inboundEmailParsing.url) {
          logger.error({
            message: `Inbound email parsing failed : ${route.method.toUpperCase()} ${
              route.url
            }`,
            error: zodError,
          });
        }
        return zodError;
      },
    },
  );

  technicalSharedRouter.inboundEmailParsing(
    IpFilter(inboundEmailAllowIps, {
      mode: "allow",
      logLevel: "deny",
      detectIp: (req) => {
        const rawHeaders = req.headers["x-forwarded-for"];
        if (!rawHeaders) return "";
        if (typeof rawHeaders === "string") {
          return rawHeaders.split(",")[0];
        }
        return rawHeaders[0];
      },
    }),
    async (req, res) =>
      sendHttpResponse(req, res, () =>
        deps.useCases.addExchangeToDiscussion.execute(req.body),
      ),
  );

  technicalSharedRouter.openApiSpec(async (req, res) =>
    sendHttpResponse(req, res, () =>
      Promise.resolve(createOpenApiSpecV2(deps.config.envType)),
    ),
  );

  technicalSharedRouter.shortLink(async (req, res) =>
    sendRedirectResponse(req, res, () =>
      deps.useCases.getLink.execute(req.params.shortLinkId),
    ),
  );

  technicalSharedRouter.featureFlags(async (req, res) =>
    sendHttpResponse(req, res, deps.useCases.getFeatureFlags.execute),
  );

  technicalSharedRouter.htmlToPdf(
    deps.conventionMagicLinkAuthMiddleware,
    async (req, res) =>
      sendHttpResponse(req, res, () =>
        deps.useCases.htmlToPdf.execute(
          req.body.htmlContent,
          req.payloads?.inclusion ?? req.payloads?.convention,
        ),
      ),
  );

  technicalSharedRouter.validateEmail(async (req, res) =>
    sendHttpResponse(req, res, () =>
      deps.useCases.validateEmail.execute(req.query),
    ),
  );

  technicalSharedRouter.npsValidatedConvention(async (req, res) =>
    sendHttpResponse(req, res.status(201), () => {
      throwErrorIfWrongTallySignature(
        req.headers["tally-signature"],
        req.body,
        deps.config.tallySignatureSecret,
      );

      return deps.useCases.addValidatedConventionNPS.execute(req.body);
    }),
  );

  technicalSharedRouter.delegationContactRequest(async (req, res) =>
    sendHttpResponse(req, res.status(201), () => {
      throwErrorIfWrongTallySignature(
        req.headers["tally-signature"],
        req.body,
        deps.config.tallySignatureSecret,
      );

      return deps.useCases.notifyAgencyDelegationContact.execute(req.body);
    }),
  );

  return technicalRouter;
};

const throwErrorIfWrongTallySignature = (
  receivedTallySignature: string | string[] | undefined,
  body: TallyForm,
  tallySignatureSecret: string,
) => {
  const calculatedSignature = createHmac("sha256", tallySignatureSecret)
    .update(JSON.stringify(body))
    .digest("base64");

  if (receivedTallySignature !== calculatedSignature) {
    throw new ForbiddenError("Missmatch Tally signature");
  }
};
