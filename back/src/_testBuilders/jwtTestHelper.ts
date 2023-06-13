import {
  CreateConventionMagicLinkPayloadProperties,
  filterNotFalsy,
} from "shared";
import { GenerateConventionMagicLinkUrl } from "../adapters/primary/config/magicLinkUrl";
import { GenerateConventionJwt } from "../domain/auth/jwt";

export const generateConventionJwtTestFn: GenerateConventionJwt = (payload) => {
  const { applicationId, role, iat } = payload;
  return applicationId + ";" + role + ";" + iat;
};

export const fakeGenerateMagicLinkUrlFn: GenerateConventionMagicLinkUrl = ({
  email,
  id,
  now,
  exp,
  durationDays,
  iat,
  version,
  role,
  targetRoute,
}: CreateConventionMagicLinkPayloadProperties & { targetRoute: string }) => {
  const fakeJwt = [
    id,
    role,
    now.toISOString(),
    email,
    exp,
    durationDays,
    iat,
    version,
  ]
    .filter(filterNotFalsy)
    .join("/");
  return `http://fake-magic-link/${targetRoute}/${fakeJwt}`;
};
