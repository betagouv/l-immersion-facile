import { Router } from "express";
import multer from "multer";
import {
  featureFlagsRoute,
  inboundEmailParsingRoute,
  renewMagicLinkRoute,
  shortLinkRoute,
  uploadFileRoute,
} from "shared";
import { notifyObjectDiscord } from "../../../../utils/notifyDiscord";
import type { AppDependencies } from "../../config/createAppDependencies";
import {
  BadRequestError,
  FeatureDisabledError,
} from "../../helpers/httpErrors";
import { sendHttpResponse } from "../../helpers/sendHttpResponse";
import { sendRedirectResponse } from "../../helpers/sendRedirectResponse";

export const createTechnicalRouter = (deps: AppDependencies) => {
  const technicalRouter = Router();
  technicalRouter
    .route(`/${renewMagicLinkRoute}`)
    .get(async (req, res) =>
      sendHttpResponse(req, res, () =>
        deps.useCases.renewConventionMagicLink.execute(req.query as any),
      ),
    );

  technicalRouter
    .route(`/${featureFlagsRoute}`)
    .get(async (req, res) =>
      sendHttpResponse(req, res, deps.useCases.getFeatureFlags.execute),
    );

  const upload = multer({ storage: multer.memoryStorage() });

  technicalRouter
    .route(`/${uploadFileRoute}`)
    .post(upload.single(uploadFileRoute), (req, res) =>
      sendHttpResponse(req, res, async () => {
        await rejectIfFeatureFlagNotActive(deps);

        if (!req.file) throw new BadRequestError("No file provided");

        return deps.useCases.uploadLogo.execute(req.file);
      }),
    );

  technicalRouter
    .route(`/${shortLinkRoute}/:shortLinkId`)
    .get(async (req, res) =>
      sendRedirectResponse(req, res, () =>
        deps.useCases.getLink.execute(req.params.shortLinkId),
      ),
    );

  technicalRouter.route(`/${inboundEmailParsingRoute}`).post(async (req, res) =>
    sendHttpResponse(req, res, () => {
      // eslint-disable-next-line no-console
      console.log(
        `REACHED INBOUND EMAIL PARSING : ${JSON.stringify(req.body)}`,
      );
      notifyObjectDiscord(req.body);
      return Promise.resolve({ success: true });
    }),
  );

  return technicalRouter;
};

const rejectIfFeatureFlagNotActive = async (
  deps: AppDependencies,
): Promise<void> | never => {
  const { enableLogoUpload } = await deps.useCases.getFeatureFlags.execute();
  if (!enableLogoUpload) {
    throw new FeatureDisabledError("Upload Logo");
  }
};
