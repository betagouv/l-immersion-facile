import {
  expectTypeToMatchAndEqual,
  SearchImmersionQueryParamsDto,
} from "shared";
import { EstablishmentAggregateBuilder } from "../../../_testBuilders/EstablishmentAggregateBuilder";
import { EstablishmentEntityBuilder } from "../../../_testBuilders/EstablishmentEntityBuilder";
import { ImmersionOfferEntityV2Builder } from "../../../_testBuilders/ImmersionOfferEntityV2Builder";
import { LaBonneBoiteCompanyVOBuilder } from "../../../_testBuilders/LaBonneBoiteCompanyVOBuilder";
import { createInMemoryUow } from "../../../adapters/primary/config/uowConfig";
import { CustomTimeGateway } from "../../../adapters/secondary/core/TimeGateway/CustomTimeGateway";
import { TestUuidGenerator } from "../../../adapters/secondary/core/UuidGeneratorImplementations";
import { InMemoryLaBonneBoiteAPI } from "../../../adapters/secondary/immersionOffer/laBonneBoite/InMemoryLaBonneBoiteAPI";
import { InMemoryUowPerformer } from "../../../adapters/secondary/InMemoryUowPerformer";
import { LaBonneBoiteRequestEntity } from "../entities/LaBonneBoiteRequestEntity";
import {
  LaBonneBoiteCompanyProps,
  LaBonneBoiteCompanyVO,
} from "../valueObjects/LaBonneBoiteCompanyVO";
import { CallLaBonneBoiteAndUpdateRepositories } from "./CallLaBonneBoiteAndUpdateRepositories";

const prepareUseCase = () => {
  const uow = createInMemoryUow();
  const establishmentAggregateRepository = uow.establishmentAggregateRepository;
  const laBonneBoiteRequestRepository = uow.laBonneBoiteRequestRepository;

  const laBonneBoiteAPI = new InMemoryLaBonneBoiteAPI();
  const uuidGenerator = new TestUuidGenerator();
  const timeGateway = new CustomTimeGateway();

  const lbbCompany = new LaBonneBoiteCompanyVOBuilder()
    .withRome("M1607")
    .withSiret("11112222333344")
    .withNaf("8500A")
    .build();
  laBonneBoiteAPI.setNextResults([lbbCompany]);

  const useCase = new CallLaBonneBoiteAndUpdateRepositories(
    new InMemoryUowPerformer(uow),
    laBonneBoiteAPI,
    timeGateway,
  );

  return {
    useCase,
    establishmentAggregateRepository,
    laBonneBoiteRequestRepository,
    laBonneBoiteAPI,
    uuidGenerator,
    timeGateway,
  };
};

describe("Eventually requests LBB and adds offers and partial establishments in repositories", () => {
  it("should not request LBB if no rome code is provided", async () => {
    // Prepare
    const { useCase, laBonneBoiteRequestRepository, laBonneBoiteAPI } =
      prepareUseCase();

    // Act
    await useCase.execute({
      rome: undefined,
      longitude: 10,
      latitude: 10,
      distance_km: 10,
      sortedBy: "distance",
    });

    // Assert
    expect(laBonneBoiteAPI.nbOfCalls).toBe(0);
    expect(laBonneBoiteRequestRepository.laBonneBoiteRequests).toHaveLength(0);
  });

  describe("lBB has not been requested for this rome code", () => {
    const dto: SearchImmersionQueryParamsDto = {
      rome: "M1607",
      longitude: 10,
      latitude: 9,
      distance_km: 30,
      sortedBy: "distance",
    };

    const nextDate = new Date("2022-01-01");

    it("should add the request entity to the repository", async () => {
      // Prepare
      const {
        useCase,
        laBonneBoiteRequestRepository,
        laBonneBoiteAPI,
        timeGateway,
      } = prepareUseCase();

      timeGateway.setNextDate(nextDate);
      laBonneBoiteAPI.setNextResults([]);

      // Act
      await useCase.execute(dto);

      // Assert
      expect(laBonneBoiteRequestRepository.laBonneBoiteRequests).toHaveLength(
        1,
      );

      const expectedRequestEntity: LaBonneBoiteRequestEntity = {
        params: {
          rome: dto.rome!,
          lon: dto.longitude,
          lat: dto.latitude,
          distance_km: 50, // LBB_DISTANCE_KM_REQUEST_PARAM
        },
        result: {
          error: null,
          number0fEstablishments: 0,
          numberOfRelevantEstablishments: 0,
        },
        requestedAt: nextDate,
      };

      expect(laBonneBoiteRequestRepository.laBonneBoiteRequests[0]).toEqual(
        expectedRequestEntity,
      );
    });
    it("should insert as many 'relevant' establishments and offers in repositories as LBB responded with undefined field `updatedAt`", async () => {
      // Prepare
      const { useCase, laBonneBoiteAPI, establishmentAggregateRepository } =
        prepareUseCase();
      establishmentAggregateRepository.establishmentAggregates = [];

      const ignoredNafRomeCombination = {
        matched_rome_code: "D1202",
        naf: "8411",
      };
      laBonneBoiteAPI.setNextResults([
        new LaBonneBoiteCompanyVO({
          matched_rome_code: "A1101",
          naf: "8500A",
        } as LaBonneBoiteCompanyProps),
        new LaBonneBoiteCompanyVO({
          matched_rome_code: "A1201",
          naf: "8500B",
        } as LaBonneBoiteCompanyProps),
        new LaBonneBoiteCompanyVO(
          ignoredNafRomeCombination as LaBonneBoiteCompanyProps,
        ),
      ]);

      // Act
      await useCase.execute(dto);

      // Assert
      expect(
        establishmentAggregateRepository.establishmentAggregates,
      ).toHaveLength(2);
      expect(
        establishmentAggregateRepository.establishmentAggregates[0]
          .establishment.updatedAt,
      ).toBeUndefined();
    });
    it("Should ignore establishments that have been inserted with `form` dataSource", async () => {
      const conflictSiret = "12345678901234";
      // Prepare : an establishment already inserted from form
      const { useCase, laBonneBoiteAPI, establishmentAggregateRepository } =
        await prepareUseCase();
      const alreadyExistingAggregateFromForm =
        new EstablishmentAggregateBuilder()
          .withEstablishment(
            new EstablishmentEntityBuilder()
              .withSiret(conflictSiret)
              .withDataSource("form")
              .build(),
          )
          .build();

      establishmentAggregateRepository.establishmentAggregates = [
        alreadyExistingAggregateFromForm,
      ];

      laBonneBoiteAPI.setNextResults([
        new LaBonneBoiteCompanyVOBuilder().withSiret(conflictSiret).build(),
      ]);

      // Act : this establishment is referenced in LBB
      await useCase.execute(dto);

      // Assert : Should have skipped this establishment
      expect(establishmentAggregateRepository.establishmentAggregates).toEqual([
        alreadyExistingAggregateFromForm,
      ]);
    });
    it("Should ignore establishments that already exist and have offer with same rome", async () => {
      const existingSiret = "12345678901234";
      const existingRome = dto.rome!;
      // Prepare : an establishment already inserted from form
      const { useCase, laBonneBoiteAPI, establishmentAggregateRepository } =
        await prepareUseCase();
      const alreadyExistingAggregateFromLBB =
        new EstablishmentAggregateBuilder()
          .withEstablishment(
            new EstablishmentEntityBuilder()
              .withSiret(existingSiret)
              .withDataSource("api_labonneboite")
              .withUpdatedAt(new Date("2022-05-11"))
              .build(),
          )
          .withImmersionOffers([
            new ImmersionOfferEntityV2Builder()
              .withCreatedAt(new Date("2022-05-12"))
              .withRomeCode(existingRome)
              .build(),
          ])
          .build();

      establishmentAggregateRepository.establishmentAggregates = [
        alreadyExistingAggregateFromLBB,
      ];

      laBonneBoiteAPI.setNextResults([
        new LaBonneBoiteCompanyVOBuilder()
          .withSiret(existingSiret)
          .withRome(existingRome)
          .build(),
      ]);

      // Act : this establishment is referenced in LBB
      await useCase.execute(dto);

      // Assert : Should have skipped this establishment
      expect(establishmentAggregateRepository.establishmentAggregates).toEqual([
        alreadyExistingAggregateFromLBB,
      ]);
    });
    it("Should update (and not re-create !) establishments that already exist but don't have this rome", async () => {
      const existingSiret = "12345678901234";
      const newRome = dto.rome!;
      // Prepare : an establishment already inserted from form
      const {
        useCase,
        laBonneBoiteAPI,
        establishmentAggregateRepository,
        timeGateway,
      } = await prepareUseCase();
      const alreadyExistingAggregateFromLBB =
        new EstablishmentAggregateBuilder()
          .withEstablishment(
            new EstablishmentEntityBuilder()
              .withSiret(existingSiret)
              .withDataSource("api_labonneboite")
              .withUpdatedAt(new Date("2022-05-11"))
              .build(),
          )
          .withImmersionOffers([
            new ImmersionOfferEntityV2Builder()
              .withCreatedAt(new Date("2022-05-12"))
              .withRomeCode("A1101") // Existing offer
              .build(),
          ])
          .build();

      establishmentAggregateRepository.establishmentAggregates = [
        alreadyExistingAggregateFromLBB,
      ];

      laBonneBoiteAPI.setNextResults([
        new LaBonneBoiteCompanyVOBuilder()
          .withSiret(existingSiret)
          .withRome(newRome)
          .withStars(5)
          .build(),
      ]);
      const newOffercreatedAt = new Date("2022-05-18");
      timeGateway.setNextDate(newOffercreatedAt);

      // Act : this establishment is referenced in LBB
      await useCase.execute(dto);

      // Assert : Should have skipped this establishment
      expectTypeToMatchAndEqual(
        establishmentAggregateRepository.establishmentAggregates,
        [
          {
            ...alreadyExistingAggregateFromLBB,
            immersionOffers: [
              alreadyExistingAggregateFromLBB.immersionOffers[0],
              {
                romeCode: newRome,
                score: 5,
                createdAt: newOffercreatedAt,
              },
            ],
          },
        ],
      );
    });
  });

  describe("lBB has been requested for this rome code and this geographic area", () => {
    const userSearchedRome = "M1234";
    const userSearchedLocationInParis17 = {
      lat: 48.862725, // 7 rue guillaume Tell, 75017 Paris
      lon: 2.287592,
    };
    const previouslySearchedLocationInParis10 = {
      lat: 48.8841446, // 169 Bd de la Villette, 75010 Paris
      lon: 2.3651789,
    };

    const previousSimilarRequestEntity = {
      params: {
        rome: userSearchedRome,
        lat: previouslySearchedLocationInParis10.lat,
        lon: previouslySearchedLocationInParis10.lon,
        distance_km: 50,
      },
      requestedAt: new Date("2021-01-01"),
    } as LaBonneBoiteRequestEntity;

    it("should not request LBB if the request has been made in the last month", async () => {
      // Prepare
      const {
        useCase,
        laBonneBoiteRequestRepository,
        laBonneBoiteAPI,
        timeGateway,
      } = prepareUseCase();

      laBonneBoiteRequestRepository.laBonneBoiteRequests = [
        previousSimilarRequestEntity,
      ];
      timeGateway.setNextDate(new Date("2021-01-30"));

      // Act
      await useCase.execute({
        rome: userSearchedRome,
        latitude: userSearchedLocationInParis17.lat,
        longitude: userSearchedLocationInParis17.lon,
        distance_km: 10,
        sortedBy: "distance",
      });

      // Assert
      expect(laBonneBoiteAPI.nbOfCalls).toBe(0);
      expect(laBonneBoiteRequestRepository.laBonneBoiteRequests).toHaveLength(
        1,
      );
    });

    it("should request LBB if the request was made more than a month ago", async () => {
      // Prepare
      const { useCase, laBonneBoiteRequestRepository, timeGateway } =
        await prepareUseCase();

      laBonneBoiteRequestRepository.laBonneBoiteRequests = [
        previousSimilarRequestEntity,
      ];
      timeGateway.setNextDate(new Date("2021-02-01"));

      // Act
      await useCase.execute({
        rome: userSearchedRome,
        latitude: userSearchedLocationInParis17.lat,
        longitude: userSearchedLocationInParis17.lon,
        distance_km: 10,
        sortedBy: "distance",
      });

      // Assert
      expect(laBonneBoiteRequestRepository.laBonneBoiteRequests).toHaveLength(
        2,
      );
    });
  });
});
