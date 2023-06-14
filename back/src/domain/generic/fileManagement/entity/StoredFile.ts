import { Flavor } from "shared";

type StoredFileId = Flavor<string, "StoredFileId">;

export interface StoredFile {
  id: StoredFileId;
  name: string;
  encoding: string;
  size: number;
  buffer: Buffer;
}
