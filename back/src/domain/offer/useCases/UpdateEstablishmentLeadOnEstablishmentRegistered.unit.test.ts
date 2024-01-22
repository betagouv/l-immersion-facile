import { subDays } from "date-fns";
import {
  ConventionDto,
  ConventionDtoBuilder,
  expectToEqual,
  FormEstablishmentDtoBuilder,
} from "shared";
import {
  createInMemoryUow,
  InMemoryUnitOfWork,
} from "../../../adapters/primary/config/uowConfig";
import { CustomTimeGateway } from "../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { InMemoryUowPerformer } from "../../../adapters/secondary/InMemoryUowPerformer";
import { InMemoryEstablishmentLeadRepository } from "../../../adapters/secondary/offer/InMemoryEstablishmentLeadRepository";
import { EstablishmentLead } from "../entities/EstablishmentLeadEntity";
import { UpdateEstablishmentLeadOnEstablishmentRegistered } from "./UpdateEstablishmentLeadOnEstablishmentRegistered";

describe("UpdateEstablishmentLeadOnEstablishmentRegistered", () => {
  let uow: InMemoryUnitOfWork;
  let timeGateway: CustomTimeGateway;
  let updateEstablishmentLead: UpdateEstablishmentLeadOnEstablishmentRegistered;
  let establishmentLeadRepository: InMemoryEstablishmentLeadRepository;

  beforeEach(() => {
    uow = createInMemoryUow();
    timeGateway = new CustomTimeGateway();

    updateEstablishmentLead =
      new UpdateEstablishmentLeadOnEstablishmentRegistered(
        new InMemoryUowPerformer(uow),
        timeGateway,
      );
    establishmentLeadRepository = uow.establishmentLeadRepository;
  });

  it("do nothing when no establishment were found", async () => {
    const formEstablishment = FormEstablishmentDtoBuilder.valid().build();

    await updateEstablishmentLead.execute({ formEstablishment });

    expectToEqual(
      await establishmentLeadRepository.getBySiret(formEstablishment.siret),
      undefined,
    );
  });

  it("update establishment lead status to 'registration-accepted'", async () => {
    const convention: ConventionDto = new ConventionDtoBuilder()
      .withStatus("ACCEPTED_BY_VALIDATOR")
      .build();
    const alreadySavedLead: EstablishmentLead = {
      siret: convention.siret,
      lastEventKind: "reminder-sent",
      events: [
        {
          conventionId: convention.id,
          kind: "to-be-reminded",
          occuredAt: subDays(timeGateway.now(), 2),
        },
        {
          kind: "reminder-sent",
          occuredAt: subDays(timeGateway.now(), 1),
          notification: { id: "my-notification-id", kind: "email" },
        },
      ],
    };
    establishmentLeadRepository.establishmentLeads = [alreadySavedLead];
    const formEstablishment = FormEstablishmentDtoBuilder.valid()
      .withSiret(convention.siret)
      .build();

    await updateEstablishmentLead.execute({ formEstablishment });

    expectToEqual(
      await establishmentLeadRepository.getBySiret(formEstablishment.siret),

      {
        siret: convention.siret,
        lastEventKind: "registration-accepted",
        events: [
          {
            conventionId: convention.id,
            kind: "to-be-reminded",
            occuredAt: subDays(timeGateway.now(), 2),
          },
          {
            kind: "reminder-sent",
            occuredAt: subDays(timeGateway.now(), 1),
            notification: { id: "my-notification-id", kind: "email" },
          },
          {
            kind: "registration-accepted",
            occuredAt: timeGateway.now(),
          },
        ],
      },
    );
  });
});
