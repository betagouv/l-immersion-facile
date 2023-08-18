import { z } from "zod";
import { UnitOfWorkPerformer } from "../../../core/ports/UnitOfWork";
import { UuidGenerator } from "../../../core/ports/UuidGenerator";
import { TransactionalUseCase } from "../../../core/UseCase";
import { StoredFile } from "../entity/StoredFile";
import { DocumentGateway } from "../port/DocumentGateway";

type MulterFile = {
  originalname: string;
  encoding: string;
  size: number;
  buffer: Buffer;
};

export class UploadLogo extends TransactionalUseCase<MulterFile, string> {
  protected inputSchema = z.any();

  readonly #documentGateway: DocumentGateway;

  readonly #uuidGenerator: UuidGenerator;

  constructor(
    uowPerformer: UnitOfWorkPerformer,
    documentGateway: DocumentGateway,
    uuidGenerator: UuidGenerator,
  ) {
    super(uowPerformer);

    this.#documentGateway = documentGateway;
    this.#uuidGenerator = uuidGenerator;
  }

  protected async _execute(multerFile: MulterFile): Promise<string> {
    const extension = multerFile.originalname.split(".").at(-1);

    const file: StoredFile = {
      id: `${this.#uuidGenerator.new()}.${extension}`,
      name: multerFile.originalname,
      encoding: multerFile.encoding,
      size: multerFile.size,
      buffer: multerFile.buffer,
    };
    await this.#documentGateway.put(file);
    return this.#documentGateway.getFileUrl(file);
  }
}
