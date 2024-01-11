import { z } from "zod";
import { UuidGenerator } from "../../../core/ports/UuidGenerator";
import { UseCase } from "../../../core/UseCase";
import { uploadFileToGateway } from "../entity/StoredFile";
import { DocumentGateway } from "../port/DocumentGateway";

type MulterFile = {
  originalname: string;
  encoding: string;
  size: number;
  buffer: Buffer;
};

export class UploadLogo extends UseCase<MulterFile, string> {
  protected inputSchema = z.any();

  readonly #documentGateway: DocumentGateway;

  readonly #uuidGenerator: UuidGenerator;

  constructor(documentGateway: DocumentGateway, uuidGenerator: UuidGenerator) {
    super();
    this.#documentGateway = documentGateway;
    this.#uuidGenerator = uuidGenerator;
  }

  protected async _execute(multerFile: MulterFile): Promise<string> {
    const extension = multerFile.originalname.split(".").at(-1);

    return uploadFileToGateway(
      { fileId: `${this.#uuidGenerator.new()}.${extension}`, multerFile },
      this.#documentGateway,
    );
  }
}
