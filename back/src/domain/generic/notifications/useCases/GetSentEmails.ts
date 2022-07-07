import { EmailSentDto as SentEmailDto } from "shared/email";
import { z } from "zod";
import { EmailGateway } from "../../../convention/ports/EmailGateway";
import { UseCase } from "../../../core/UseCase";

export class GetSentEmails extends UseCase<void, SentEmailDto[]> {
  constructor(private emailGateway: EmailGateway) {
    super();
  }

  inputSchema = z.void();

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async _execute(): Promise<SentEmailDto[]> {
    return this.emailGateway.getLastSentEmailDtos();
  }
}
