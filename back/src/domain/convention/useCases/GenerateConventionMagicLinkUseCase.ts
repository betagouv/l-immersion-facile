import {
  createConventionMagicLinkPayload,
  GenerateMagicLinkRequestDto,
  generateMagicLinkRequestSchema,
  GenerateMagicLinkResponseDto,
} from "shared";
import { GenerateConventionJwt } from "../../auth/jwt";
import { TimeGateway } from "../../core/ports/TimeGateway";
import { UseCase } from "../../core/UseCase";

export class GenerateConventionMagicLinkUseCase extends UseCase<
  GenerateMagicLinkRequestDto,
  GenerateMagicLinkResponseDto
> {
  inputSchema = generateMagicLinkRequestSchema;

  constructor(
    private readonly generateMagicLinkJwt: GenerateConventionJwt,
    private readonly timeGateway: TimeGateway,
  ) {
    super();
  }

  //eslint-disable-next-line @typescript-eslint/require-await
  public async _execute({
    applicationId,
    role,
    expired,
  }: GenerateMagicLinkRequestDto) {
    const now = this.timeGateway.now();
    const twoDaysAgo = Math.round((now.getTime() - 48 * 3600 * 1000) / 1000);
    const payload = createConventionMagicLinkPayload({
      id: applicationId,
      role,
      email: "backoffice administrator",
      durationDays: expired ? 1 : undefined,
      now,
      exp: expired ? twoDaysAgo : undefined,
    });
    return {
      jwt: this.generateMagicLinkJwt(payload),
    };
  }
}
