import { FormEstablishmentDto, SiretDto } from "shared";

export interface FormEstablishmentRepository {
  create: (formEstablishmentDto: FormEstablishmentDto) => Promise<void>;
  update: (formEstablishmentDto: FormEstablishmentDto) => Promise<void>;
  delete: (siret: SiretDto) => Promise<void>;

  getBySiret: (siret: SiretDto) => Promise<FormEstablishmentDto | undefined>;
  getAll: () => Promise<FormEstablishmentDto[]>;
}
