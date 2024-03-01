import {
  AppellationAndRomeDto,
  FormEstablishmentDtoBuilder,
  defaultValidFormEstablishment,
  expectPromiseToFailWithError,
} from "shared";
import {
  BadRequestError,
  ConflictError,
} from "../../../config/helpers/httpErrors";
import { InMemoryOutboxRepository } from "../../core/events/adapters/InMemoryOutboxRepository";
import { makeCreateNewEvent } from "../../core/events/ports/EventBus";
import { InMemoryRomeRepository } from "../../core/rome/adapters/InMemoryRomeRepository";
import {
  InMemorySiretGateway,
  SiretEstablishmentDtoBuilder,
  TEST_OPEN_ESTABLISHMENT_1,
} from "../../core/sirene/adapters/InMemorySiretGateway";
import { CustomTimeGateway } from "../../core/time-gateway/adapters/CustomTimeGateway";
import { InMemoryUowPerformer } from "../../core/unit-of-work/adapters/InMemoryUowPerformer";
import { createInMemoryUow } from "../../core/unit-of-work/adapters/createInMemoryUow";
import { TestUuidGenerator } from "../../core/uuid-generator/adapters/UuidGeneratorImplementations";
import { InMemoryFormEstablishmentRepository } from "../adapters/InMemoryFormEstablishmentRepository";
import { AddFormEstablishment } from "./AddFormEstablishment";

describe("Add FormEstablishment", () => {
  let addFormEstablishment: AddFormEstablishment;
  let formEstablishmentRepo: InMemoryFormEstablishmentRepository;
  let outboxRepo: InMemoryOutboxRepository;
  let romeRepository: InMemoryRomeRepository;
  let siretGateway: InMemorySiretGateway;
  let uowPerformer: InMemoryUowPerformer;

  beforeEach(() => {
    siretGateway = new InMemorySiretGateway();
    const uow = createInMemoryUow();
    formEstablishmentRepo = uow.formEstablishmentRepository;
    outboxRepo = uow.outboxRepository;
    romeRepository = uow.romeRepository;
    siretGateway.setSirenEstablishment({
      ...TEST_OPEN_ESTABLISHMENT_1,
      siret: defaultValidFormEstablishment.siret,
    });
    romeRepository.appellations = defaultValidFormEstablishment.appellations;

    uowPerformer = new InMemoryUowPerformer(uow);

    const uuidGenerator = new TestUuidGenerator();
    const createNewEvent = makeCreateNewEvent({
      timeGateway: new CustomTimeGateway(),
      uuidGenerator,
    });

    addFormEstablishment = new AddFormEstablishment(
      uowPerformer,
      createNewEvent,
      siretGateway,
    );
  });

  it("saves an establishment in the repository", async () => {
    const formEstablishment = FormEstablishmentDtoBuilder.valid()
      .withFitForDisabledWorkers(true)
      .withMaxContactsPerWeek(9)
      .withNextAvailabilityDate(new Date())
      .build();

    await addFormEstablishment.execute(formEstablishment);

    const storedInRepo = await formEstablishmentRepo.getAll();
    expect(storedInRepo).toHaveLength(1);
    expect(storedInRepo[0]).toEqual(formEstablishment);
    expect(outboxRepo.events).toHaveLength(1);
    expect(outboxRepo.events[0]).toMatchObject({
      topic: "FormEstablishmentAdded",
      payload: { formEstablishment },
    });
  });

  it("considers appellation_code as a reference, and ignores the labels, and rome (it fetches the one matching the appellation code anyways)", async () => {
    const weirdAppellationDto: AppellationAndRomeDto = {
      appellationCode: "12694", // le bon code
      appellationLabel:
        "une boulette, ca devrait être 'Coiffeur / Coiffeuse mixte'",
      romeCode: "A0000", // devrait être D1202
      romeLabel: "une autre boulette, ca devrait être 'Coiffure'",
    };

    const formEstablishmentBuilder =
      FormEstablishmentDtoBuilder.valid().withAppellations([
        weirdAppellationDto,
      ]);

    const formEstablishmentWithWeirdAppellationDto =
      formEstablishmentBuilder.build();

    const correctAppellationDto: AppellationAndRomeDto = {
      appellationCode: "12694",
      appellationLabel: "Coiffeur / Coiffeuse mixte",
      romeCode: "D1202",
      romeLabel: "Coiffure",
    };
    romeRepository.appellations = [correctAppellationDto];

    const formEstablishmentWithCorrectAppellationDto = formEstablishmentBuilder
      .withAppellations([correctAppellationDto])
      .build();

    await addFormEstablishment.execute(
      formEstablishmentWithWeirdAppellationDto,
    );

    const storedInRepo = await formEstablishmentRepo.getAll();
    expect(storedInRepo).toHaveLength(1);
    expect(storedInRepo[0]).toEqual(formEstablishmentWithCorrectAppellationDto);
    expect(outboxRepo.events).toHaveLength(1);
    expect(outboxRepo.events[0]).toMatchObject({
      topic: "FormEstablishmentAdded",
      payload: {
        formEstablishment: formEstablishmentWithCorrectAppellationDto,
      },
    });
  });

  it("cannot save an establishment with same siret", async () => {
    const formEstablishment = FormEstablishmentDtoBuilder.valid().build();

    formEstablishmentRepo.setFormEstablishments([formEstablishment]);

    await expectPromiseToFailWithError(
      addFormEstablishment.execute(formEstablishment),
      new ConflictError(
        "Establishment with siret 01234567890123 already exists",
      ),
    );
  });

  it("reject when trying to save Form Establishment in the repository with null values", async () => {
    const formEstablishment =
      FormEstablishmentDtoBuilder.allEmptyFields().build();

    await expect(
      addFormEstablishment.execute(formEstablishment),
    ).rejects.toThrow();
  });

  it("reject when trying to save Form Establishment in the repository with null siret", async () => {
    const formEstablishment = FormEstablishmentDtoBuilder.valid()
      .withSiret("")
      .build();

    try {
      await addFormEstablishment.execute(formEstablishment);
      throw new Error("Should not have been reached");
    } catch (e) {
      // eslint-disable-next-line jest/no-conditional-expect
      expect(e).toBeInstanceOf(BadRequestError);
    }
  });

  describe("SIRET validation", () => {
    const formEstablishment = FormEstablishmentDtoBuilder.valid()
      .withSiret(TEST_OPEN_ESTABLISHMENT_1.siret)
      .build();

    const siretRawInactiveEstablishment = new SiretEstablishmentDtoBuilder()
      .withSiret(formEstablishment.siret)
      .withIsActive(false)
      .withBusinessName("INACTIVE BUSINESS")
      .withBusinessAddress("20 AVENUE DE SEGUR 75007 PARIS 7")
      .withNafDto({ code: "78.3Z", nomenclature: "Ref2" })
      .build();

    it("rejects formEstablishment with SIRETs that don't correspond to active businesses", async () => {
      siretGateway.setSirenEstablishment(siretRawInactiveEstablishment);

      await expectPromiseToFailWithError(
        addFormEstablishment.execute(formEstablishment),
        new BadRequestError(
          `Ce SIRET (${formEstablishment.siret}) n'est pas attribué ou correspond à un établissement fermé. Veuillez le corriger.`,
        ),
      );
    });

    it("accepts formEstablishment with SIRETs that  correspond to active businesses", async () => {
      const siretRawEstablishment = new SiretEstablishmentDtoBuilder().build();
      siretGateway.setSirenEstablishment(siretRawEstablishment);
      await addFormEstablishment.execute(formEstablishment);
      expect(outboxRepo.events).toHaveLength(1);
      expect(await formEstablishmentRepo.getAll()).toHaveLength(1);
    });

    it("Throws errors when the SIRET endpoint throws erorrs", async () => {
      const error = new Error("test error");
      siretGateway.setError(error);

      await expectPromiseToFailWithError(
        addFormEstablishment.execute(formEstablishment),
        new Error("Le service Sirene API n'est pas disponible"),
      );
    });
  });
});
