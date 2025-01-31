import { addMilliseconds, subDays } from "date-fns";
import { Pool } from "pg";
import {
  DiscussionBuilder,
  GeoPositionDto,
  Location,
  LocationBuilder,
  SearchResultDto,
  UserBuilder,
  WithAcquisition,
  errors,
  expectArraysToEqualIgnoringOrder,
  expectArraysToMatch,
  expectPromiseToFailWithError,
  expectToEqual,
} from "shared";
import { v4 as uuid } from "uuid";
import { KyselyDb, makeKyselyDb } from "../../../config/pg/kysely/kyselyUtils";
import { getTestPgPool } from "../../../config/pg/pgUtils";
import {
  rueBitcheDto,
  rueGuillaumeTellDto,
  rueJacquardDto,
} from "../../core/address/adapters/InMemoryAddressGateway";
import { PgUserRepository } from "../../core/authentication/inclusion-connect/adapters/PgUserRepository";
import {
  EstablishmentAggregate,
  EstablishmentUserRight,
} from "../entities/EstablishmentAggregate";
import { SearchMade } from "../entities/SearchMadeEntity";
import {
  EstablishmentAggregateBuilder,
  EstablishmentEntityBuilder,
  OfferEntityBuilder,
} from "../helpers/EstablishmentBuilders";
import { PgDiscussionRepository } from "./PgDiscussionRepository";
import { PgEstablishmentAggregateRepository } from "./PgEstablishmentAggregateRepository";
import {
  analysteEnGeomatiqueImmersionOffer,
  artisteCirqueOffer,
  cartographeImmersionOffer,
  cuvisteOffer,
  groomChevauxOffer,
  makeExpectedSearchResult,
  offer_A1101_11987,
  offer_A1101_12862,
  offer_A1101_17751,
  offer_A1101_20404,
  sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
} from "./PgEstablishmentAggregateRepository.test.helpers";

const osefUser = new UserBuilder().withId(uuid()).build();
const osefUserRight: EstablishmentUserRight = {
  role: "establishment-admin",
  job: "osef",
  phone: "3615-OSEF",
  userId: osefUser.id,
};

describe("PgEstablishmentAggregateRepository", () => {
  let pool: Pool;
  let kyselyDb: KyselyDb;
  let pgEstablishmentAggregateRepository: PgEstablishmentAggregateRepository;
  let pgDiscussionRepository: PgDiscussionRepository;
  let pgUserRepository: PgUserRepository;

  beforeAll(() => {
    pool = getTestPgPool();
    kyselyDb = makeKyselyDb(pool);
  });

  beforeEach(async () => {
    await kyselyDb.deleteFrom("establishments__users").execute();
    await kyselyDb.deleteFrom("immersion_offers").execute();
    await kyselyDb.deleteFrom("discussions").execute();
    await kyselyDb.deleteFrom("establishments_location_infos").execute();
    await kyselyDb.deleteFrom("establishments_location_positions").execute();
    await kyselyDb.deleteFrom("establishments").execute();
    await kyselyDb.deleteFrom("users").execute();

    pgEstablishmentAggregateRepository = new PgEstablishmentAggregateRepository(
      kyselyDb,
    );
    pgDiscussionRepository = new PgDiscussionRepository(kyselyDb);
    pgUserRepository = new PgUserRepository(kyselyDb);

    await pgUserRepository.save(osefUser, "proConnect");
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("Offers", () => {
    describe("searchImmersionResults", () => {
      describe("with `maxResults` parameter", () => {
        beforeEach(async () => {
          await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            establishmentWithOfferA1101_AtPosition,
          );
          await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            establishmentWithOfferA1101_close,
          );
          await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            establishmentWithOfferA1101_far,
          );
        });

        it("returns 1 closest establishment with `maxResults` at 1", async () => {
          expectToEqual(
            await pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: searchMadeDistanceWithoutRome,
              maxResults: 1,
            }),
            [
              makeExpectedSearchResult({
                establishment: establishmentWithOfferA1101_AtPosition,
                withOffers: [offer_A1101_11987],
                withLocationAndDistance: {
                  ...locationOfSearchPosition,
                  distance: 0,
                },
                nafLabel: "Activités des agences de travail temporaire",
              }),
            ],
          );
        });

        it("returns 2 closest establishments with `maxResults` at 2", async () => {
          expectToEqual(
            await pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: searchMadeDistanceWithoutRome,
              maxResults: 2,
            }),
            [
              makeExpectedSearchResult({
                establishment: establishmentWithOfferA1101_AtPosition,
                withOffers: [offer_A1101_11987],
                withLocationAndDistance: {
                  ...locationOfSearchPosition,
                  distance: 0,
                },
                nafLabel: "Activités des agences de travail temporaire",
              }),
              makeExpectedSearchResult({
                establishment: establishmentWithOfferA1101_close,
                withOffers: [offer_A1101_11987],
                withLocationAndDistance: {
                  ...locationOfCloseSearchPosition,
                  distance: 133.12254555,
                },
                nafLabel: "Activités des agences de travail temporaire",
              }),
            ],
          );
        });

        it("returns 2 closest establishments with `maxResults` at 3 without too far establishment", async () => {
          expectArraysToMatch(
            await pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: searchMadeDistanceWithoutRome,
              maxResults: 3,
            }),
            [
              makeExpectedSearchResult({
                establishment: establishmentWithOfferA1101_AtPosition,
                withOffers: [offer_A1101_11987],
                withLocationAndDistance: {
                  ...locationOfSearchPosition,
                  distance: 0,
                },
                nafLabel: "Activités des agences de travail temporaire",
              }),
              makeExpectedSearchResult({
                establishment: establishmentWithOfferA1101_close,
                withOffers: [offer_A1101_11987],
                withLocationAndDistance: {
                  ...locationOfCloseSearchPosition,
                  distance: 133.12254555,
                },
                nafLabel: "Activités des agences de travail temporaire",
              }),
            ],
          );
        });
      });

      describe("SearchMade parameters", () => {
        describe("'establishmentSearchableBy' SearchMade parameter", () => {
          beforeEach(async () => {
            await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              searchableByAllEstablishment,
            );
            await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              searchableByStudentsEstablishment,
            );
            await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              searchableByJobSeekerEstablishment,
            );
          });

          it(`with "establishmentSearchableBy:'students'" return only establishments SearchImmersionResults searchable by student`, async () => {
            const results =
              await pgEstablishmentAggregateRepository.searchImmersionResults({
                searchMade: {
                  ...cartographeSearchMade,
                  establishmentSearchableBy: "students",
                },
              });

            expectToEqual(
              results.sort(
                sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
              ),
              [searchableByStudentsEstablishment, searchableByAllEstablishment]
                .map((establishment) =>
                  makeExpectedSearchResult({
                    establishment: establishment,
                    withLocationAndDistance: {
                      ...establishment.establishment.locations[0],
                      distance: 0,
                    },
                    withOffers: establishment.offers,
                    nafLabel: "Activités des agences de travail temporaire",
                  }),
                )
                .sort(
                  sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
                ),
            );
          });

          it(`with "establishmentSearchableBy:'jobSeekers'" return only establishments SearchImmersionResults searchable by jobseekers`, async () => {
            const results =
              await pgEstablishmentAggregateRepository.searchImmersionResults({
                searchMade: {
                  ...cartographeSearchMade,
                  establishmentSearchableBy: "jobSeekers",
                },
              });

            expectToEqual(
              results.sort(
                sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
              ),
              [searchableByJobSeekerEstablishment, searchableByAllEstablishment]
                .map((establishment) =>
                  makeExpectedSearchResult({
                    establishment: establishment,
                    withLocationAndDistance: {
                      ...establishment.establishment.locations[0],
                      distance: 0,
                    },
                    withOffers: establishment.offers,
                    nafLabel: "Activités des agences de travail temporaire",
                  }),
                )
                .sort(
                  sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
                ),
            );
          });

          it('with"establishmentSearchableBy" not defined return all establishment SearchImmersionResults', async () => {
            const results =
              await pgEstablishmentAggregateRepository.searchImmersionResults({
                searchMade: cartographeSearchMade,
              });

            expectToEqual(
              results.sort(
                sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
              ),
              [
                searchableByStudentsEstablishment,
                searchableByJobSeekerEstablishment,
                searchableByAllEstablishment,
              ]
                .map((establishment) =>
                  makeExpectedSearchResult({
                    establishment: establishment,
                    withLocationAndDistance: {
                      ...establishment.establishment.locations[0],
                      distance: 0,
                    },
                    withOffers: establishment.offers,
                    nafLabel: "Activités des agences de travail temporaire",
                  }),
                )
                .sort(
                  sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
                ),
            );
          });
        });

        describe("without 'romeCode' SearchMade parameter", () => {
          it("returns all establishments within geographical area", async () => {
            // Prepare
            const establishmentCloseWithA1101Offers =
              new EstablishmentAggregateBuilder(
                establishmentWithOfferA1101_AtPosition,
              )
                .withOffers([offer_A1101_20404, offer_A1101_17751])
                .build();
            const establishmentFarWithA1101Offers =
              new EstablishmentAggregateBuilder(establishmentWithOfferA1101_far)
                .withOffers([offer_A1101_12862])
                .build();

            await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              establishmentCloseWithA1101Offers,
            );
            await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              establishmentFarWithA1101Offers,
            );

            // Act & Assert
            expectToEqual(
              await pgEstablishmentAggregateRepository.searchImmersionResults({
                searchMade: searchMadeDistanceWithoutRome,
              }),
              [
                makeExpectedSearchResult({
                  establishment: establishmentCloseWithA1101Offers,
                  withOffers: [offer_A1101_17751, offer_A1101_20404],
                  withLocationAndDistance: {
                    ...locationOfSearchPosition,
                    distance: 0,
                  },
                  nafLabel: "Activités des agences de travail temporaire",
                }),
              ],
            );
          });

          it("returns only offers with locations within geographical area without rome code given", async () => {
            const establishmentAggregateAtSaintesAndVeaux =
              new EstablishmentAggregateBuilder()
                .withEstablishmentSiret("78000403200029")
                .withOffers([cuvisteOffer, artisteCirqueOffer])
                .withLocations([
                  bassompierreSaintesLocation,
                  veauxLocation, // outside geographical area
                ])
                .withUserRights([osefUserRight])
                .build();

            const establishmentAggregateAtChaniersAndLaRochelle =
              new EstablishmentAggregateBuilder()
                .withEstablishmentSiret("78000403200030")
                .withOffers([
                  cartographeImmersionOffer,
                  cuvisteOffer,
                  groomChevauxOffer,
                ])
                .withLocations([
                  portHubleChaniersLocation,
                  tourDeLaChaineLaRochelleLocation,
                ])
                .withUserRights([osefUserRight])
                .build();

            // Prepare
            /// Two establishments located inside geographical area
            await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              establishmentAggregateAtSaintesAndVeaux,
            );

            await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              establishmentAggregateAtChaniersAndLaRochelle,
            );

            // Act
            const results =
              await pgEstablishmentAggregateRepository.searchImmersionResults({
                searchMade: {
                  sortedBy: "date",
                  distanceKm: 100,
                  ...centerOfSaintesGeoPosition,
                },
              });

            // Assert
            expectToEqual(
              results.sort(
                sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
              ),
              [
                ...[cuvisteOffer, artisteCirqueOffer].map((offer) =>
                  makeExpectedSearchResult({
                    establishment: establishmentAggregateAtSaintesAndVeaux,
                    withOffers: [offer],
                    withLocationAndDistance: {
                      ...bassompierreSaintesLocation,
                      distance: 7704.55035665,
                    },
                    nafLabel: "Activités des agences de travail temporaire",
                  }),
                ),
                ...[
                  cartographeImmersionOffer,
                  cuvisteOffer,
                  groomChevauxOffer,
                ].map((offer) =>
                  makeExpectedSearchResult({
                    establishment:
                      establishmentAggregateAtChaniersAndLaRochelle,
                    withOffers: [offer],
                    withLocationAndDistance: {
                      ...portHubleChaniersLocation,
                      distance: 11093.36505388,
                    },
                    nafLabel: "Activités des agences de travail temporaire",
                  }),
                ),
                ...[
                  cartographeImmersionOffer,
                  cuvisteOffer,
                  groomChevauxOffer,
                ].map((offer) =>
                  makeExpectedSearchResult({
                    establishment:
                      establishmentAggregateAtChaniersAndLaRochelle,
                    withOffers: [offer],
                    withLocationAndDistance: {
                      ...tourDeLaChaineLaRochelleLocation,
                      distance: 56222.51061222,
                    },
                    nafLabel: "Activités des agences de travail temporaire",
                  }),
                ),
              ].sort(sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults),
            );
          });
        });

        describe("'nafCodes' SearchMade param", () => {
          beforeEach(async () => {
            await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              establishment0145Z_A,
            );
            await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              establishment0145Z_B,
            );
            await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              establishment9900Z,
            );
            await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              establishment4741Z,
            );
          });

          it("establishments with all naf when naf filter is not provided", async () => {
            const results =
              await pgEstablishmentAggregateRepository.searchImmersionResults({
                searchMade: {},
              });

            expectToEqual(
              results.sort(
                sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
              ),
              [
                makeExpectedSearchResult({
                  establishment: establishment0145Z_A,
                  withLocationAndDistance: {
                    ...establishment0145Z_A.establishment.locations[0],
                    distance: undefined,
                  },
                  withOffers: establishment0145Z_A.offers,
                  nafLabel: "Élevage d'ovins et de caprins",
                }),
                makeExpectedSearchResult({
                  establishment: establishment0145Z_B,
                  withLocationAndDistance: {
                    ...establishment0145Z_B.establishment.locations[0],
                    distance: undefined,
                  },
                  withOffers: establishment0145Z_B.offers,
                  nafLabel: "Élevage d'ovins et de caprins",
                }),
                makeExpectedSearchResult({
                  establishment: establishment4741Z,
                  withLocationAndDistance: {
                    ...establishment4741Z.establishment.locations[0],
                    distance: undefined,
                  },
                  withOffers: establishment4741Z.offers,
                  nafLabel:
                    "Commerce de détail d'ordinateurs, d'unités périphériques et de logiciels en magasin spécialisé",
                }),
                makeExpectedSearchResult({
                  establishment: establishment9900Z,
                  withLocationAndDistance: {
                    ...establishment9900Z.establishment.locations[0],
                    distance: undefined,
                  },
                  withOffers: establishment9900Z.offers,
                  nafLabel:
                    "Activités des organisations et organismes extraterritoriaux",
                }),
              ].sort(sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults),
            );
          });

          it("establishments with all naf when naf filter is empty", async () => {
            const results =
              await pgEstablishmentAggregateRepository.searchImmersionResults({
                searchMade: { nafCodes: [] },
              });

            expectToEqual(
              results.sort(
                sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
              ),
              [
                makeExpectedSearchResult({
                  establishment: establishment0145Z_A,
                  withLocationAndDistance: {
                    ...establishment0145Z_A.establishment.locations[0],
                    distance: undefined,
                  },
                  withOffers: establishment0145Z_A.offers,
                  nafLabel: "Élevage d'ovins et de caprins",
                }),
                makeExpectedSearchResult({
                  establishment: establishment0145Z_B,
                  withLocationAndDistance: {
                    ...establishment0145Z_B.establishment.locations[0],
                    distance: undefined,
                  },
                  withOffers: establishment0145Z_B.offers,
                  nafLabel: "Élevage d'ovins et de caprins",
                }),
                makeExpectedSearchResult({
                  establishment: establishment4741Z,
                  withLocationAndDistance: {
                    ...establishment4741Z.establishment.locations[0],
                    distance: undefined,
                  },
                  withOffers: establishment4741Z.offers,
                  nafLabel:
                    "Commerce de détail d'ordinateurs, d'unités périphériques et de logiciels en magasin spécialisé",
                }),
                makeExpectedSearchResult({
                  establishment: establishment9900Z,
                  withLocationAndDistance: {
                    ...establishment9900Z.establishment.locations[0],
                    distance: undefined,
                  },
                  withOffers: establishment9900Z.offers,
                  nafLabel:
                    "Activités des organisations et organismes extraterritoriaux",
                }),
              ]

              .sort(sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults),
            );
          });

          it("establishments with naf when naf filter is provided with one value", async () => {
            const results =
              await pgEstablishmentAggregateRepository.searchImmersionResults({
                searchMade: {
                  nafCodes: [establishment0145Z_A.establishment.nafDto.code],
                },
              });

            expectToEqual(
              results.sort(
                sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
              ),
              [establishment0145Z_A, establishment0145Z_B]
                .map((establishment) =>
                  makeExpectedSearchResult({
                    establishment: establishment,
                    withLocationAndDistance: {
                      ...establishment.establishment.locations[0],
                      distance: undefined,
                    },
                    withOffers: establishment.offers,
                    nafLabel: "Élevage d'ovins et de caprins",
                  }),
                )
                .sort(
                  sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
                ),
            );
          });

          it("establishments with different naf when naf filter is provided with multiple values", async () => {
            const results =
              await pgEstablishmentAggregateRepository.searchImmersionResults({
                searchMade: {
                  nafCodes: [
                    establishment0145Z_A.establishment.nafDto.code,
                    establishment4741Z.establishment.nafDto.code,
                  ],
                },
              });

            expectToEqual(
              results.sort(
                sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults,
              ),
              [
                makeExpectedSearchResult({
                  establishment: establishment0145Z_A,
                  withLocationAndDistance: {
                    ...establishment0145Z_A.establishment.locations[0],
                    distance: undefined,
                  },
                  withOffers: establishment0145Z_A.offers,
                  nafLabel: "Élevage d'ovins et de caprins",
                }),
                makeExpectedSearchResult({
                  establishment: establishment0145Z_B,
                  withLocationAndDistance: {
                    ...establishment0145Z_B.establishment.locations[0],
                    distance: undefined,
                  },
                  withOffers: establishment0145Z_B.offers,
                  nafLabel: "Élevage d'ovins et de caprins",
                }),
                makeExpectedSearchResult({
                  establishment: establishment4741Z,
                  withLocationAndDistance: {
                    ...establishment4741Z.establishment.locations[0],
                    distance: undefined,
                  },
                  withOffers: establishment4741Z.offers,
                  nafLabel:
                    "Commerce de détail d'ordinateurs, d'unités périphériques et de logiciels en magasin spécialisé",
                }),
              ]

              .sort(sortSearchResultsByDistanceAndRomeAndSiretOnRandomResults),
            );
          });
        });
      });

      describe("fitForDisabledWorkers param", () => {
        const offer = new OfferEntityBuilder().build();

        const notFitForDisabledWorkers = new EstablishmentAggregateBuilder()
          .withEstablishmentSiret("00000000000001")
          .withFitForDisabledWorkers(false)
          .withLocationId(uuid())
          .withOffers([offer])
          .withUserRights([osefUserRight])
          .build();

        const fitForDisabledWorkers = new EstablishmentAggregateBuilder()
          .withEstablishmentSiret("00000000000002")
          .withFitForDisabledWorkers(true)
          .withLocationId(uuid())
          .withOffers([offer])
          .withUserRights([osefUserRight])
          .build();

        beforeEach(async () => {
          await Promise.all(
            [notFitForDisabledWorkers, fitForDisabledWorkers].map(
              (establishment) =>
                pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
                  establishment,
                ),
            ),
          );
        });

        it("without param", async () => {
          const results =
            await pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: {
                distanceKm: 10,
                lat: fitForDisabledWorkers.establishment.locations[0].position
                  .lat,
                lon: fitForDisabledWorkers.establishment.locations[0].position
                  .lon,
              },
            });
          expectToEqual(results, [
            makeExpectedSearchResult({
              establishment: notFitForDisabledWorkers,
              withOffers: [offer],
              withLocationAndDistance: {
                ...notFitForDisabledWorkers.establishment.locations[0],
                distance: 0,
              },
              nafLabel: "Activités des agences de travail temporaire",
            }),
            makeExpectedSearchResult({
              establishment: fitForDisabledWorkers,
              withOffers: [offer],
              withLocationAndDistance: {
                ...fitForDisabledWorkers.establishment.locations[0],
                distance: 0,
              },
              nafLabel: "Activités des agences de travail temporaire",
            }),
          ]);
        });

        it("with param false", async () => {
          const results =
            await pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: {
                distanceKm: 10,
                lat: fitForDisabledWorkers.establishment.locations[0].position
                  .lat,
                lon: fitForDisabledWorkers.establishment.locations[0].position
                  .lon,
              },
              fitForDisabledWorkers: false,
            });
          expectToEqual(results, [
            makeExpectedSearchResult({
              establishment: notFitForDisabledWorkers,
              withOffers: [offer],
              withLocationAndDistance: {
                ...notFitForDisabledWorkers.establishment.locations[0],
                distance: 0,
              },
              nafLabel: "Activités des agences de travail temporaire",
            }),
          ]);
        });

        it("with param true", async () => {
          const results =
            await pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: {
                distanceKm: 10,
                lat: fitForDisabledWorkers.establishment.locations[0].position
                  .lat,
                lon: fitForDisabledWorkers.establishment.locations[0].position
                  .lon,
              },
              fitForDisabledWorkers: true,
            });
          expectToEqual(results, [
            makeExpectedSearchResult({
              establishment: fitForDisabledWorkers,
              withOffers: [offer],
              withLocationAndDistance: {
                ...fitForDisabledWorkers.establishment.locations[0],
                distance: 0,
              },
              nafLabel: "Activités des agences de travail temporaire",
            }),
          ]);
        });
      });

      it("returns empty list when repo is empty", async () => {
        expectToEqual(
          await pgEstablishmentAggregateRepository.searchImmersionResults({
            searchMade: cartographeSearchMade,
          }),
          [],
        );
      });

      it("no location but keys provided in params - case occured from usecase without location", async () => {
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentWithOfferA1101_AtPosition,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.searchImmersionResults({
            searchMade: {
              lat: undefined,
              lon: undefined,
              distanceKm: undefined,
              sortedBy: "date",
              voluntaryToImmersion: true,
              place: undefined,
              appellationCodes: undefined,
              romeCode: undefined,
              establishmentSearchableBy: "jobSeekers",
              acquisitionCampaign: undefined,
              acquisitionKeyword: undefined,
            },
          }),
          [
            makeExpectedSearchResult({
              establishment: establishmentWithOfferA1101_AtPosition,
              withOffers: [offer_A1101_11987],
              withLocationAndDistance: {
                ...locationOfSearchPosition,
                distance: undefined,
              },
              nafLabel: "Activités des agences de travail temporaire",
            }),
          ],
        );
      });

      it("returns open establishments only", async () => {
        const openEstablishment = new EstablishmentAggregateBuilder()
          .withEstablishmentSiret("00000000000001")
          .withOffers([cartographeImmersionOffer])
          .withLocations([locationOfSearchPosition])
          .withEstablishmentOpen(true)
          .withUserRights([osefUserRight])
          .build();
        const closedEstablishment = new EstablishmentAggregateBuilder()
          .withOffers([cartographeImmersionOffer])
          .withLocations([locationOfCloseSearchPosition])
          .withEstablishmentOpen(false)
          .withUserRights([osefUserRight])
          .build();

        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          openEstablishment,
        );
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          closedEstablishment,
        );

        // Assert
        expectToEqual(
          await pgEstablishmentAggregateRepository.searchImmersionResults({
            searchMade: cartographeSearchMade,
          }),
          [
            makeExpectedSearchResult({
              establishment: openEstablishment,
              withLocationAndDistance: {
                ...locationOfSearchPosition,
                distance: 0,
              },
              withOffers: [cartographeImmersionOffer],
              nafLabel: "Activités des agences de travail temporaire",
            }),
          ],
        );
      });

      it("provide also non searchable establishments (so that usecase can prevent LBB results to be shown)", async () => {
        const establishment = new EstablishmentAggregateBuilder()
          .withOffers([cartographeImmersionOffer])
          .withLocations([locationOfSearchPosition])
          .withUserRights([osefUserRight])
          .withIsMaxDiscussionsForPeriodReached(true)
          .build();

        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishment,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.searchImmersionResults({
            searchMade: cartographeSearchMade,
          }),
          [
            makeExpectedSearchResult({
              establishment,
              withLocationAndDistance: {
                ...locationOfSearchPosition,
                distance: 0,
              },
              withOffers: [cartographeImmersionOffer],
              nafLabel: "Activités des agences de travail temporaire",
            }),
          ],
        );
      });

      it("returns one search DTO by establishment, with offers matching rome and geographical area", async () => {
        const establishmentAtRangeWithRome = new EstablishmentAggregateBuilder()
          .withEstablishmentSiret("00000000000001")
          .withOffers([
            analysteEnGeomatiqueImmersionOffer,
            cartographeImmersionOffer,
          ])
          .withLocations([locationOfSearchPosition])
          .withUserRights([osefUserRight])
          .build();

        const establishmentAtRangeWithOtherRome =
          new EstablishmentAggregateBuilder()
            .withEstablishmentSiret("00000000000002")
            .withOffers([artisteCirqueOffer])
            .withLocations([locationOfCloseSearchPosition])
            .withUserRights([osefUserRight])
            .build();

        const establishmentOutOfRangeWithRome =
          new EstablishmentAggregateBuilder()
            .withEstablishmentSiret("00000000000003")
            .withOffers([
              cartographeImmersionOffer,
              analysteEnGeomatiqueImmersionOffer,
            ])
            .withLocations([locationOfFarFromSearchedPosition])
            .withUserRights([osefUserRight])
            .build();

        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentAtRangeWithRome,
        );
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentAtRangeWithOtherRome,
        );
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentOutOfRangeWithRome,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.searchImmersionResults({
            searchMade: cartographeSearchMade,
          }),
          [
            makeExpectedSearchResult({
              establishment: establishmentAtRangeWithRome,
              withLocationAndDistance: {
                ...locationOfSearchPosition,
                distance: 0,
              },
              withOffers: establishmentAtRangeWithRome.offers,
              nafLabel: "Activités des agences de travail temporaire",
            }),
          ],
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.searchImmersionResults({
            searchMade: { ...cartographeSearchMade, romeCode: "A1010" },
          }),
          [],
        );
      });

      describe("multiple locations", () => {
        beforeEach(async () => {
          await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            establishmentCuvisteAtSaintesAndVeaux,
          );

          await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            establishmentCuvisteAtChaniersAndLaRochelle,
          );
        });

        it("search results with multiple locations and with matching rome code", async () => {
          expectToEqual(
            await pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: {
                sortedBy: "date",
                distanceKm: 50,
                ...centerOfSaintesGeoPosition,
                romeCode: cuvisteOffer.romeCode,
              },
            }),
            [
              makeExpectedSearchResult({
                establishment: establishmentCuvisteAtSaintesAndVeaux,
                withLocationAndDistance: {
                  ...bassompierreSaintesLocation,
                  distance: 7704.55035665,
                },
                withOffers: [cuvisteOffer],
                nafLabel: "Activités des agences de travail temporaire",
              }),
              makeExpectedSearchResult({
                establishment: establishmentCuvisteAtChaniersAndLaRochelle,
                withLocationAndDistance: {
                  ...portHubleChaniersLocation,
                  distance: 11093.36505388,
                },
                withOffers: [cuvisteOffer],
                nafLabel: "Activités des agences de travail temporaire",
              }),
            ],
          );
        });

        it("no search results with multiple locations and without matching rome code", async () => {
          expectToEqual(
            await pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: {
                sortedBy: "date",
                distanceKm: 100,
                ...centerOfSaintesGeoPosition,
                romeCode: groomChevauxOffer.romeCode,
              },
            }),
            [],
          );
        });
      });

      describe("sorting", () => {
        it("if sorted=distance, returns closest establishments in first", async () => {
          const closeEstablishment = new EstablishmentAggregateBuilder()
            .withEstablishmentSiret("00000000000001")
            .withOffers([cartographeImmersionOffer])
            .withLocations([
              new LocationBuilder(locationOfSearchPosition)
                .withId(uuid())
                .build(),
            ])
            .withUserRights([osefUserRight])
            .build();

          const farEstablishment = new EstablishmentAggregateBuilder()
            .withEstablishmentSiret("00000000000002")
            .withOffers([cartographeImmersionOffer])
            .withLocations([
              new LocationBuilder(locationOfSearchPosition)

                .withPosition({
                  lat: locationOfSearchPosition.position.lat + 0.001,
                  lon: locationOfSearchPosition.position.lon + 0.001,
                })
                .withId(uuid())
                .build(),
            ])
            .withUserRights([osefUserRight])
            .build();

          await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            closeEstablishment,
          );
          await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            farEstablishment,
          );

          // Act
          const searchResult =
            await pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: { ...cartographeSearchMade, sortedBy: "distance" },
              maxResults: 2,
            });

          // Assert
          expectToEqual(
            searchResult.map((result) => result.siret),
            [closeEstablishment, farEstablishment].map(
              ({ establishment }) => establishment.siret,
            ),
          );
        });

        it("if sorted=date, returns latest offers in first", async () => {
          const recentOfferEstablishment = new EstablishmentAggregateBuilder()
            .withEstablishmentSiret("00000000000001")
            .withOffers([
              new OfferEntityBuilder(cartographeImmersionOffer)
                .withCreatedAt(new Date("2022-05-05"))
                .build(),
            ])
            .withLocations([
              new LocationBuilder(locationOfSearchPosition)
                .withId(uuid())
                .build(),
            ])
            .withUserRights([osefUserRight])
            .build();

          const olderOfferEstablishment = new EstablishmentAggregateBuilder()
            .withEstablishmentSiret("00000000000002")
            .withOffers([
              new OfferEntityBuilder(cartographeImmersionOffer)
                .withCreatedAt(new Date("2022-05-02"))
                .build(),
            ])
            .withLocations([
              new LocationBuilder(locationOfSearchPosition)
                .withId(uuid())
                .build(),
            ])
            .withUserRights([osefUserRight])
            .build();

          await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            recentOfferEstablishment,
          );
          await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            olderOfferEstablishment,
          );

          // Act
          const searchResult =
            await pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: { ...cartographeSearchMade, sortedBy: "date" },
              maxResults: 2,
            });

          // Assert
          expectToEqual(
            searchResult.map((result) => result.siret),
            [recentOfferEstablishment, olderOfferEstablishment].map(
              ({ establishment }) => establishment.siret,
            ),
          );
        });

        it("if sorted=score, returns offers with appellations that have better score first", async () => {
          const establishmentWithHighAndLowScore =
            new EstablishmentAggregateBuilder()
              .withEstablishmentSiret("00000000000001")
              .withScore(10)
              .withLocations([
                {
                  id: uuid(),
                  position: locationOfSearchPosition.position,
                  address: {
                    city: "",
                    departmentCode: "",
                    postcode: "",
                    streetNumberAndAddress: "",
                  },
                },
              ])
              .withOffers([
                new OfferEntityBuilder(cartographeImmersionOffer).build(),
                new OfferEntityBuilder(
                  analysteEnGeomatiqueImmersionOffer,
                ).build(),
              ])
              .withUserRights([osefUserRight])
              .build();

          const establishmentWithMediumScores =
            new EstablishmentAggregateBuilder()
              .withEstablishmentSiret("00000000000002")
              .withScore(6)
              .withLocations([
                {
                  id: uuid(),
                  position: locationOfSearchPosition.position,
                  address: {
                    city: "",
                    departmentCode: "",
                    postcode: "",
                    streetNumberAndAddress: "",
                  },
                },
              ])
              .withOffers([
                new OfferEntityBuilder(cartographeImmersionOffer).build(),
                new OfferEntityBuilder(
                  analysteEnGeomatiqueImmersionOffer,
                ).build(),
              ])
              .withUserRights([osefUserRight])
              .build();

          await Promise.all([
            pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              establishmentWithHighAndLowScore,
            ),
            pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
              establishmentWithMediumScores,
            ),
          ]);

          // Act
          const searchResult =
            await pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: { ...cartographeSearchMade, sortedBy: "score" },
            });
          // Assert
          expectToEqual(
            searchResult.map(({ siret }) => siret),
            [
              establishmentWithHighAndLowScore,
              establishmentWithMediumScores,
            ].map(({ establishment }) => establishment.siret),
          );
        });
      });

      it("when multiple appellationCodes, returns the two related immersion-offers", async () => {
        const mostRecentDate = new Date("2022-05-05");
        const establishmentWithMostRecentOffer =
          new EstablishmentAggregateBuilder()
            .withEstablishmentUpdatedAt(mostRecentDate)
            .withOffers([
              new OfferEntityBuilder(cartographeImmersionOffer)
                .withCreatedAt(mostRecentDate)
                .build(),
            ])
            .withEstablishmentSiret("99000403200029")
            .withLocations([
              new LocationBuilder(locationOfSearchPosition)
                .withId(uuid())
                .build(),
            ])
            .withUserRights([osefUserRight])
            .build();

        const olderDate = new Date("2022-05-02");
        const establishmentWithMostOlderOffer =
          new EstablishmentAggregateBuilder()
            .withEstablishmentUpdatedAt(olderDate)
            .withOffers([
              new OfferEntityBuilder(analysteEnGeomatiqueImmersionOffer)
                .withCreatedAt(olderDate)
                .build(),
            ])
            .withEstablishmentSiret("11000403200029")
            .withLocations([
              new LocationBuilder(locationOfSearchPosition)
                .withId(uuid())
                .build(),
            ])
            .withUserRights([osefUserRight])
            .build();

        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentWithMostRecentOffer,
        );
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentWithMostOlderOffer,
        );

        // Act
        const searchResult =
          await pgEstablishmentAggregateRepository.searchImmersionResults({
            searchMade: {
              ...cartographeSearchMade,
              sortedBy: "date",
              appellationCodes: [
                cartographeImmersionOffer.appellationCode,
                analysteEnGeomatiqueImmersionOffer.appellationCode,
              ],
            },
          });

        // Assert
        expectToEqual(
          searchResult.map(({ siret }) => siret),
          [
            establishmentWithMostRecentOffer,
            establishmentWithMostOlderOffer,
          ].map(({ establishment }) => establishment.siret),
        );
      });

      it("provide next availability date, update_date and created_at on result", async () => {
        const recentDate = new Date("2023-12-02");
        const aggregateWithOptionalValues = new EstablishmentAggregateBuilder()
          .withLocations([
            new LocationBuilder(portHubleChaniersLocation)
              .withId(uuid())
              .build(),
          ])
          .withOffers([
            new OfferEntityBuilder().withCreatedAt(recentDate).build(),
          ])
          .withEstablishmentNextAvailabilityDate(new Date())
          .withEstablishmentUpdatedAt(recentDate)
          .withUserRights([osefUserRight])
          .build();

        const olderDate = new Date("2023-12-01");
        const aggregateWithoutOptionalValues =
          new EstablishmentAggregateBuilder()
            .withLocations([
              new LocationBuilder(portHubleChaniersLocation)
                .withId(uuid())
                .build(),
            ])
            .withOffers([
              new OfferEntityBuilder().withCreatedAt(olderDate).build(),
            ])
            .withEstablishmentSiret("12341234123412")
            .withEstablishmentNextAvailabilityDate(undefined)
            .withEstablishmentUpdatedAt(olderDate)
            .withUserRights([osefUserRight])
            .build();

        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          aggregateWithOptionalValues,
        );
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          aggregateWithoutOptionalValues,
        );

        const searchResults =
          await pgEstablishmentAggregateRepository.searchImmersionResults({
            searchMade: {
              ...aggregateWithOptionalValues.establishment.locations[0]
                .position,
              appellationCodes: [
                aggregateWithOptionalValues.offers[0].appellationCode,
              ],
              distanceKm: 0,
              sortedBy: "date",
            },
            maxResults: 2,
          });

        expectToEqual(
          searchResults.map(
            ({ siret, nextAvailabilityDate, updatedAt, createdAt }) => ({
              siret,
              nextAvailabilityDate,
              updatedAt,
              createdAt,
            }),
          ),
          [
            {
              siret: aggregateWithOptionalValues.establishment.siret,
              nextAvailabilityDate:
                aggregateWithOptionalValues.establishment.nextAvailabilityDate,
              updatedAt:
                aggregateWithOptionalValues.establishment.updatedAt.toISOString(),
              createdAt:
                aggregateWithOptionalValues.establishment.createdAt.toISOString(),
            },
            {
              siret: aggregateWithoutOptionalValues.establishment.siret,
              nextAvailabilityDate: undefined,
              updatedAt:
                aggregateWithoutOptionalValues.establishment.updatedAt.toISOString(),
              createdAt:
                aggregateWithoutOptionalValues.establishment.createdAt.toISOString(),
            },
          ],
        );
      });
      it("should return immersion offers even without lat/lon/distanceKm search", async () => {
        const establishmentAggregate = new EstablishmentAggregateBuilder()
          .withEstablishmentSiret("78000403200029")
          .withOffers([cuvisteOffer, artisteCirqueOffer])
          .withLocations([bassompierreSaintesLocation, veauxLocation])
          .withUserRights([osefUserRight])
          .build();

        // Prepare
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentAggregate,
        );

        // Act
        const searchResults: SearchResultDto[] =
          await pgEstablishmentAggregateRepository.searchImmersionResults({
            searchMade: {
              sortedBy: "date",
            },
          });
        const readableResults = searchResults.map(toReadableSearchResult);

        // Assert
        expect(readableResults).toHaveLength(4);
      });

      describe("Wrong paths", () => {
        it("should throw on a search made with sortedBy distance and no geo params are provided", async () => {
          // Assert
          await expectPromiseToFailWithError(
            pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: {
                sortedBy: "distance",
              },
            }),
            errors.establishment.invalidGeoParams(),
          );
        });
        it("should throw if only one of the geo params is provided (lat/lon/distanceKm)", async () => {
          // Assert
          await expectPromiseToFailWithError(
            pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: {
                sortedBy: "distance",
                lat: 45,
              },
            }),
            errors.establishment.invalidGeoParams(),
          );
        });
        it("should throw if all geo params value is 0 and sorted by distance", async () => {
          // Assert
          await expectPromiseToFailWithError(
            pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: {
                sortedBy: "distance",
                lat: 0,
                lon: 0,
                distanceKm: 0,
              },
            }),
            errors.establishment.invalidGeoParams(),
          );
        });

        it("should throw if all geo params value is 0 but distanceKm > 0 and sorted by distance", async () => {
          // Assert
          await expectPromiseToFailWithError(
            pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: {
                sortedBy: "distance",
                lat: 0,
                lon: 0,
                distanceKm: 10,
              },
            }),
            errors.establishment.invalidGeoParams(),
          );
        });

        it("should throw if lat / lon are 0 but distanceKm is provided and not 0 and sorted by distance", async () => {
          // Assert
          await expectPromiseToFailWithError(
            pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: {
                sortedBy: "distance",
                lat: 0,
                lon: 0,
                distanceKm: 10,
              },
            }),
            errors.establishment.invalidGeoParams(),
          );
        });
        it("should throw if one of the geo params value is 0", async () => {
          // Assert
          await expectPromiseToFailWithError(
            pgEstablishmentAggregateRepository.searchImmersionResults({
              searchMade: {
                sortedBy: "distance",
                lat: 0,
                lon: 45,
                distanceKm: 10,
              },
            }),
            errors.establishment.invalidGeoParams(),
          );
        });
      });
    });

    describe("getOffersAsAppellationDtoForFormEstablishment", () => {
      beforeEach(async () => {
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentWithOfferA1101_AtPosition,
        );
      });

      it("returns an empty list if no establishment found with this siret", async () => {
        const siretNotInTable = "11111111111111";

        expectToEqual(
          await pgEstablishmentAggregateRepository.getOffersAsAppellationAndRomeDtosBySiret(
            siretNotInTable,
          ),
          [],
        );
      });

      it("returns a list with offers from offers as AppellationDto of given siret", async () => {
        expectArraysToEqualIgnoringOrder(
          await pgEstablishmentAggregateRepository.getOffersAsAppellationAndRomeDtosBySiret(
            establishmentWithOfferA1101_AtPosition.establishment.siret,
          ),
          establishmentWithOfferA1101_AtPosition.offers.map((offer) => ({
            appellationCode: offer.appellationCode,
            appellationLabel: offer.appellationLabel,
            romeCode: offer.romeCode,
            romeLabel: offer.romeLabel,
          })),
        );
      });
    });

    describe("getSearchResultBySearchQuery", () => {
      beforeEach(async () => {
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentWithOfferA1101_AtPosition,
        );
      });

      it("undefined when missing offer by siret", async () => {
        const missingSiret = "11111111111111";

        expectToEqual(
          await pgEstablishmentAggregateRepository.getSearchResultBySearchQuery(
            missingSiret,
            establishmentWithOfferA1101_AtPosition.offers[0].appellationCode,
            establishmentWithOfferA1101_AtPosition.establishment.locations[0]
              .id,
          ),
          undefined,
        );
      });

      it("undefined when missing location id", async () => {
        const missingLocationId = "55555555-5555-4444-5555-555555555666";

        expectToEqual(
          await pgEstablishmentAggregateRepository.getSearchResultBySearchQuery(
            establishmentWithOfferA1101_AtPosition.establishment.siret,
            establishmentWithOfferA1101_AtPosition.offers[0].appellationCode,
            missingLocationId,
          ),
          undefined,
        );
      });

      it("undefined when missing offer appellation code", async () => {
        const missingAppellationCode = artisteCirqueOffer.appellationCode;

        expectToEqual(
          await pgEstablishmentAggregateRepository.getSearchResultBySearchQuery(
            establishmentWithOfferA1101_AtPosition.establishment.siret,
            missingAppellationCode,
            establishmentWithOfferA1101_AtPosition.establishment.locations[0]
              .id,
          ),
          undefined,
        );
      });

      it("Returns reconstructed SearchImmersionResultDto for given siret, appellationCode and location id", async () => {
        expectToEqual(
          await pgEstablishmentAggregateRepository.getSearchResultBySearchQuery(
            establishmentWithOfferA1101_AtPosition.establishment.siret,
            establishmentWithOfferA1101_AtPosition.offers[0].appellationCode,
            establishmentWithOfferA1101_AtPosition.establishment.locations[0]
              .id,
          ),
          {
            rome: establishmentWithOfferA1101_AtPosition.offers[0].romeCode,
            romeLabel:
              establishmentWithOfferA1101_AtPosition.offers[0].romeLabel,
            establishmentScore:
              establishmentWithOfferA1101_AtPosition.establishment.score,
            appellations: [
              {
                appellationLabel:
                  establishmentWithOfferA1101_AtPosition.offers[0]
                    .appellationLabel,
                appellationCode:
                  establishmentWithOfferA1101_AtPosition.offers[0]
                    .appellationCode,
              },
            ],
            naf: establishmentWithOfferA1101_AtPosition.establishment.nafDto
              .code,
            nafLabel: "Activités des agences de travail temporaire",
            siret: establishmentWithOfferA1101_AtPosition.establishment.siret,
            name: establishmentWithOfferA1101_AtPosition.establishment.name,
            customizedName:
              establishmentWithOfferA1101_AtPosition.establishment
                .customizedName,
            website:
              establishmentWithOfferA1101_AtPosition.establishment.website,
            additionalInformation:
              establishmentWithOfferA1101_AtPosition.establishment
                .additionalInformation,
            voluntaryToImmersion:
              establishmentWithOfferA1101_AtPosition.establishment
                .voluntaryToImmersion,
            fitForDisabledWorkers:
              establishmentWithOfferA1101_AtPosition.establishment
                .fitForDisabledWorkers,
            numberOfEmployeeRange:
              establishmentWithOfferA1101_AtPosition.establishment
                .numberEmployeesRange,
            contactMode:
              establishmentWithOfferA1101_AtPosition.establishment
                .contactMethod,
            distance_m: undefined,
            address:
              establishmentWithOfferA1101_AtPosition.establishment.locations[0]
                .address,
            position:
              establishmentWithOfferA1101_AtPosition.establishment.locations[0]
                .position,
            locationId:
              establishmentWithOfferA1101_AtPosition.establishment.locations[0]
                .id,
            createdAt:
              establishmentWithOfferA1101_AtPosition.establishment.createdAt.toISOString(),
            updatedAt:
              establishmentWithOfferA1101_AtPosition.establishment.updatedAt.toISOString(),
          },
        );
      });
    });
  });

  describe("EstablishmentAggregates", () => {
    describe("insertEstablishmentAggregates", () => {
      const siret1 = "11111111111111";
      const siret2 = "22222222222222";

      it("no establishment", async () => {
        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          [],
        );
      });

      it("adds the establishment values in `establishments` table when one new establishment is given", async () => {
        const establishment = new EstablishmentAggregateBuilder()
          .withEstablishment(
            new EstablishmentEntityBuilder()
              .withMaxContactsPerMonth(24)
              .withLastInseeCheck(new Date("2020-04-14T12:00:00.000"))
              .build(),
          )
          .withUserRights([osefUserRight])
          .build();

        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishment,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          [establishment],
        );
      });

      it("adds the establishment values in `establishments` table and keeps acquisition params", async () => {
        const establishment = new EstablishmentAggregateBuilder()
          .withEstablishment(
            new EstablishmentEntityBuilder()
              .withMaxContactsPerMonth(24)
              .withLastInseeCheck(new Date("2020-04-14T12:00:00.000"))
              .build(),
          )
          .withAcquisition({
            acquisitionKeyword: "acquisition-keyword",
            acquisitionCampaign: "acquisition-campaign",
          })
          .withUserRights([osefUserRight])
          .build();

        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishment,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          [establishment],
        );
      });

      it("adds one new row per establishment in `establishments` table when multiple establishments are given", async () => {
        const establishments = [
          new EstablishmentAggregateBuilder()
            .withEstablishment(
              new EstablishmentEntityBuilder()
                .withSiret(siret1)
                .withLocations([
                  {
                    id: "22222222-ee70-4c90-b3f4-668d492f7395",
                    position: { lat: 49, lon: 6 },
                    address: rueGuillaumeTellDto,
                  },
                ])
                .build(),
            )
            .withOffers([new OfferEntityBuilder().build()])
            .withUserRights([osefUserRight])
            .build(),
          new EstablishmentAggregateBuilder()
            .withEstablishmentSiret(siret2)
            .withOffers([new OfferEntityBuilder().build()])
            .withUserRights([osefUserRight])
            .build(),
        ];

        for (const establishment of establishments) {
          await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            establishment,
          );
        }

        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          establishments,
        );
      });

      it("adds a new row in contact table with contact referencing the establishment siret", async () => {
        const establishment = new EstablishmentAggregateBuilder()
          .withEstablishmentSiret(siret1)
          .withContactMethod("EMAIL")
          .withUserRights([osefUserRight])
          .build();

        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishment,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          [establishment],
        );
      });

      it("adds as many row as immersion offers in table `immersion_offers`, each referencing the establishment siret and the contact uuid", async () => {
        const establishment = new EstablishmentAggregateBuilder()
          .withEstablishmentSiret(siret1)
          .withOffers([
            new OfferEntityBuilder()
              .withRomeLabel("Stylisme")
              .withRomeCode("B1805")
              .withAppellationLabel("Styliste")
              .withAppellationCode("19540")
              .build(),
            new OfferEntityBuilder()
              .withRomeLabel("Stylisme")
              .withRomeCode("B1805")
              .withAppellationCode("19541")
              .withAppellationLabel("Styliste chaussure")
              .build(),
          ])
          .withUserRights([osefUserRight])
          .build();

        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishment,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          [establishment],
        );
      });
    });

    describe("updateEstablishmentAggregate", () => {
      const user = new UserBuilder()
        .withId(uuid())
        .withEmail("email@mail.com")
        .build();
      const updatedAt = new Date();
      const aquisition: WithAcquisition = {
        acquisitionCampaign: "my-campaign",
        acquisitionKeyword: "my-keyword",
      };

      beforeEach(async () => {
        await pgUserRepository.save(user, "proConnect");
      });

      it.each([
        {
          originalEstablishment: new EstablishmentAggregateBuilder()
            .withEstablishmentSiret("78000403200029")
            .withEstablishmentCreatedAt(new Date("2021-01-15"))
            .withUserRights([
              {
                role: "establishment-admin",
                job: "aaaaaaaaaaaaa",
                phone: "+33600000000",
                userId: user.id,
              },
            ])
            .withOffers([analysteEnGeomatiqueImmersionOffer, cuvisteOffer])
            .build(),
          updatedEstablishment: new EstablishmentAggregateBuilder()
            .withEstablishmentSiret("78000403200029")
            .withEstablishmentCreatedAt(new Date("2021-01-15"))
            .withUserRights([
              {
                role: "establishment-admin",
                job: "aaaaaaaaaaaaa",
                phone: "+33600000000",
                userId: user.id,
              },
            ])
            .withOffers([
              analysteEnGeomatiqueImmersionOffer,
              artisteCirqueOffer,
              cuvisteOffer,
            ])
            .build(),
          title: "add immersion offer on establishment",
        },
        {
          originalEstablishment: new EstablishmentAggregateBuilder()
            .withEstablishmentSiret("78000403200029")
            .withEstablishmentCreatedAt(new Date("2021-01-15"))
            .withUserRights([
              {
                role: "establishment-admin",
                job: "aaaaaaaaaaaaa",
                phone: "+33600000000",
                userId: user.id,
              },
            ])
            .build(),
          updatedEstablishment: new EstablishmentAggregateBuilder()
            .withEstablishmentSiret("78000403200029")
            .withEstablishmentCreatedAt(new Date("2021-01-15"))
            .withEstablishmentUpdatedAt(updatedAt)
            .withUserRights([
              {
                role: "establishment-admin",
                job: "sdlm!fjsdlfkjsdmlfj",
                phone: "+33666887744",
                userId: user.id,
              },
            ])
            .withLocations([
              {
                id: "22222222-ee70-4c90-b3f4-668d492f7395",
                position: { lat: 49, lon: 6 },
                address: rueJacquardDto,
              },
              {
                id: "22222222-ee70-4c90-b3f4-668d492f7396",
                position: { lat: 49, lon: 6 },
                address: rueBitcheDto,
              },
            ])
            .withMaxContactsPerMonth(24)
            .withSearchableBy({
              jobSeekers: true,
              students: false,
            })
            .build(),
          title: "updates the establishment values",
        },
        {
          originalEstablishment: new EstablishmentAggregateBuilder()
            .withEstablishmentCustomizedName(
              "Activités des agences de travail temporaire",
            )
            .withUserRights([osefUserRight])
            .build(),
          updatedEstablishment: new EstablishmentAggregateBuilder()
            .withEstablishmentCustomizedName(undefined)
            .withUserRights([osefUserRight])
            .withEstablishmentUpdatedAt(updatedAt)
            .build(),
          title: "removes customized name",
        },
        {
          originalEstablishment: new EstablishmentAggregateBuilder()
            .withContactMethod("EMAIL")
            .withUserRights([osefUserRight])
            .build(),
          updatedEstablishment: new EstablishmentAggregateBuilder()
            .withContactMethod("IN_PERSON")
            .withUserRights([osefUserRight])
            .withEstablishmentUpdatedAt(updatedAt)
            .build(),
          title: "updates an establishment existing contact",
        },
        {
          originalEstablishment: new EstablishmentAggregateBuilder()
            .withEstablishment(
              new EstablishmentEntityBuilder()
                .withAdditionalInformation("my additionnal info")
                .withCustomizedName("my customize name")
                .withContactMethod("EMAIL")
                .withFitForDisabledWorkers(true)
                .withIsCommited(true)
                .withLastInseeCheck(new Date())
                .withNextAvailabilityDate(new Date())
                .withMaxContactsPerMonth(2)
                .withUpdatedAt(new Date())
                .withWebsite("https://www.truc.com")
                .withAcquisition(aquisition)
                .build(),
            )
            .withUserRights([osefUserRight])
            .build(),
          updatedEstablishment: new EstablishmentAggregateBuilder()
            .withEstablishment(
              new EstablishmentEntityBuilder(
                new EstablishmentEntityBuilder()
                  .withAdditionalInformation("my additionnal info")
                  .withCustomizedName("my customize name")
                  .withFitForDisabledWorkers(true)
                  .withIsCommited(true)
                  .withContactMethod("IN_PERSON")
                  .withLastInseeCheck(new Date())
                  .withNextAvailabilityDate(new Date())
                  .withMaxContactsPerMonth(5)
                  .withUpdatedAt(new Date())
                  .withWebsite("https://www.truc.com")
                  .withAcquisition(aquisition)
                  .build(),
              )
                .withAdditionalInformation("")
                .withCustomizedName(undefined)
                .withIsCommited(undefined)
                .withLastInseeCheck(undefined)
                .withNextAvailabilityDate(undefined)
                .withUpdatedAt(updatedAt)
                .withWebsite(undefined)
                .withAcquisition(aquisition)
                .build(),
            )
            .withUserRights([osefUserRight])
            .build(),
          title: "remove optional values",
        },
      ] satisfies {
        originalEstablishment: EstablishmentAggregate;
        updatedEstablishment: EstablishmentAggregate;
        title: string;
      }[])(
        "$title",
        async ({ originalEstablishment, updatedEstablishment }) => {
          // Prepare
          await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
            originalEstablishment,
          );

          expectToEqual(
            await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
            [originalEstablishment],
          );

          await pgEstablishmentAggregateRepository.updateEstablishmentAggregate(
            updatedEstablishment,
            updatedAt,
          );

          expectToEqual(
            await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
            [updatedEstablishment],
          );
        },
      );
    });
  });

  describe("hasEstablishmentFromFormWithSiret", () => {
    it("returns false if no establishment from form with given siret exists", async () => {
      expectToEqual(
        await pgEstablishmentAggregateRepository.hasEstablishmentAggregateWithSiret(
          establishmentWithOfferA1101_AtPosition.establishment.siret,
        ),
        false,
      );
    });

    it("returns true if an establishment from form with given siret exists", async () => {
      await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
        establishmentWithOfferA1101_AtPosition,
      );

      expectToEqual(
        await pgEstablishmentAggregateRepository.hasEstablishmentAggregateWithSiret(
          establishmentWithOfferA1101_AtPosition.establishment.siret,
        ),
        true,
      );
    });
  });

  describe("getSiretsOfEstablishmentsWithRomeCode", () => {
    it("Returns a list of establishment sirets that have an offer with given rome", async () => {
      // Prepare
      const matchingRomeCode = "A1101";
      const establishmentWithCodeOfferMatching =
        new EstablishmentAggregateBuilder()
          .withEstablishmentSiret("11111111111111")
          .withOffers([
            new OfferEntityBuilder()
              .withAppellationCode("11987")
              .withRomeCode(matchingRomeCode)
              .build(),
          ])
          .withLocationId(uuid())
          .withUserRights([osefUserRight])
          .build();
      const establishmentWithoutCodeOfferMatching =
        new EstablishmentAggregateBuilder()
          .withEstablishmentSiret("22222222222222")
          .withOffers([new OfferEntityBuilder().withRomeCode("A1201").build()])
          .withLocationId(uuid())
          .withUserRights([osefUserRight])
          .build();

      await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
        establishmentWithCodeOfferMatching,
      );
      await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
        establishmentWithoutCodeOfferMatching,
      );

      // Assert
      expectToEqual(
        await pgEstablishmentAggregateRepository.getSiretsOfEstablishmentsWithRomeCode(
          matchingRomeCode,
        ),
        [establishmentWithCodeOfferMatching.establishment.siret],
      );
    });
  });

  describe("delete establishment aggregate", () => {
    it("Throws on missing establishment", async () => {
      const siretNotInTable = "11111111111111";

      await expectPromiseToFailWithError(
        pgEstablishmentAggregateRepository.delete(siretNotInTable),
        errors.establishment.missingAggregate({ siret: siretNotInTable }),
      );
    });

    it("Delete aggregate including establishment, immersion offers, immersion contacts", async () => {
      const establishmentAggregate = new EstablishmentAggregateBuilder()
        .withSearchableBy({
          students: false,
          jobSeekers: false,
        })
        .withUserRights([osefUserRight])
        .build();

      await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
        establishmentAggregate,
      );

      expectToEqual(
        await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
        [establishmentAggregate],
      );

      await pgEstablishmentAggregateRepository.delete(
        establishmentAggregate.establishment.siret,
      );

      expectToEqual(
        await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
        [],
      );
    });

    it("Removes only establishment with given siret and its offers and its contacts", async () => {
      // Prepare

      const establishmentToRemove = new EstablishmentAggregateBuilder()
        .withEstablishmentSiret("11111111111111")
        .withOffers([
          new OfferEntityBuilder()
            .withRomeCode("A1401")
            .withRomeLabel("Aide agricole de production fruitière ou viticole")
            .withAppellationCode("10806")
            .withAppellationLabel("Aide agricole en arboriculture")
            .build(),
          new OfferEntityBuilder()
            .withRomeCode("A1405")
            .withRomeLabel("Arboriculture et viticulture")
            .withAppellationCode("12112")
            .withAppellationLabel("Chef de culture arboricole")
            .build(),
        ])
        .withLocationId(uuid())
        .withUserRights([osefUserRight])
        .build();
      const establishmentToKeep = new EstablishmentAggregateBuilder()
        .withEstablishmentSiret("22222222222222")
        .withOffers([
          new OfferEntityBuilder()
            .withRomeCode("A1405")
            .withRomeLabel("Arboriculture et viticulture")
            .withAppellationCode("17044")
            .withAppellationLabel("Oléiculteur / Oléicultrice")
            .build(),
        ])
        .withLocationId(uuid())
        .withUserRights([osefUserRight])
        .build();

      await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
        establishmentToRemove,
      );
      await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
        establishmentToKeep,
      );

      expectToEqual(
        await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
        [establishmentToRemove, establishmentToKeep],
      );

      // Act
      await pgEstablishmentAggregateRepository.delete(
        establishmentToRemove.establishment.siret,
      );

      expectToEqual(
        await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
        [establishmentToKeep],
      );
    });
  });

  describe("getEstablishmentAggregates", () => {
    const user1 = new UserBuilder()
      .withId(uuid())
      .withEmail("existing@email-in-repo.fr")
      .build();
    const user2 = new UserBuilder()
      .withId(uuid())
      .withEmail("another@email-in-repo.fr")
      .build();

    const establishmentWithoutEmail = new EstablishmentAggregateBuilder()
      .withEstablishmentSiret("00000000000001")
      .withEstablishmentCreatedAt(new Date())
      .withLocationId(uuid())
      .withUserRights([
        {
          role: "establishment-admin",
          job: "doing stuff",
          phone: "+336887875544",
          userId: user1.id,
        },
      ])
      .build();

    const establishmentWithUserId1 = new EstablishmentAggregateBuilder()
      .withEstablishmentSiret("00000000000002")
      .withLocationId(uuid())
      .withUserRights([
        {
          role: "establishment-admin",
          job: "doing other stuff",
          phone: "+33688445577",
          userId: user2.id,
        },
      ])
      .build();

    const establishmentWithUserId2 = new EstablishmentAggregateBuilder()
      .withEstablishmentSiret("00000000000003")
      .withLocationId(uuid())
      .withUserRights([
        {
          role: "establishment-admin",
          job: "doing other stuffffffffffffff",
          phone: "+33688445566",
          userId: user2.id,
        },
      ])
      .build();

    beforeEach(async () => {
      await pgUserRepository.save(user1, "proConnect");
      await pgUserRepository.save(user2, "proConnect");
      await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
        establishmentWithoutEmail,
      );
      await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
        establishmentWithUserId1,
      );
      await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
        establishmentWithUserId2,
      );
    });

    it("return empty list if no establishment matched", async () => {
      expectToEqual(
        await pgEstablishmentAggregateRepository.getEstablishmentAggregatesByFilters(
          {
            userId: uuid(),
          },
        ),
        [],
      );
    });

    it("return an establishmentAggregate if matched email", async () => {
      expectToEqual(
        await pgEstablishmentAggregateRepository.getEstablishmentAggregatesByFilters(
          {
            userId: user2.id,
          },
        ),
        [establishmentWithUserId1, establishmentWithUserId2],
      );
    });
  });

  describe("markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerMonth", () => {
    const since = subDays(new Date(), 7);

    const establishmentNotSearchable = new EstablishmentAggregateBuilder()
      .withUserRights([osefUserRight])
      .withIsMaxDiscussionsForPeriodReached(true)
      .build();

    const establishmentIsNotSearchableAndMaxContactPerMonth0 =
      new EstablishmentAggregateBuilder(establishmentNotSearchable)
        .withMaxContactsPerMonth(0)
        .withUserRights([osefUserRight])
        .build();

    const establishmentIsNotSearchableAndMaxContactPerMonth1 =
      new EstablishmentAggregateBuilder(establishmentNotSearchable)
        .withMaxContactsPerMonth(1)
        .withUserRights([osefUserRight])
        .build();

    const establishmentIsNotSearchableAndMaxContactPerMonth2 =
      new EstablishmentAggregateBuilder(establishmentNotSearchable)
        .withMaxContactsPerMonth(2)
        .withUserRights([osefUserRight])
        .build();

    const discussionAfterSinceDate = new DiscussionBuilder()
      .withSiret(
        establishmentIsNotSearchableAndMaxContactPerMonth2.establishment.siret,
      )
      .withId(uuid())
      .withCreatedAt(addMilliseconds(since, 1))
      .build();

    const discussionAtSinceDate = new DiscussionBuilder()
      .withSiret(
        establishmentIsNotSearchableAndMaxContactPerMonth2.establishment.siret,
      )
      .withId(uuid())
      .withCreatedAt(since)
      .build();

    describe("update", () => {
      it(`update is searchable for establishments that: 
          - are not searchable
          - have maxContactsPerMonth at 2
          - have 1 discussion since date`, async () => {
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentIsNotSearchableAndMaxContactPerMonth2,
        );
        await pgDiscussionRepository.insert(discussionAfterSinceDate);

        await pgEstablishmentAggregateRepository.markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerMonth(
          since,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          [
            new EstablishmentAggregateBuilder(
              establishmentIsNotSearchableAndMaxContactPerMonth2,
            )
              .withIsMaxDiscussionsForPeriodReached(false)
              .withFitForDisabledWorkers(false)
              .build(),
          ],
        );
      });

      it(`update is searchable for establishments that: 
          - are not searchable
          - have maxContactsPerMonth at 2
          - have no discussion`, async () => {
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentIsNotSearchableAndMaxContactPerMonth2,
        );

        await pgEstablishmentAggregateRepository.markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerMonth(
          since,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          [
            new EstablishmentAggregateBuilder(
              establishmentIsNotSearchableAndMaxContactPerMonth2,
            )
              .withIsMaxDiscussionsForPeriodReached(false)
              .withFitForDisabledWorkers(false)
              .build(),
          ],
        );
      });
      it(`update is searchable for establishments that: 
          - are not searchable
          - have maxContactsPerMonth at 1
          - have 1 discussion before date`, async () => {
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentIsNotSearchableAndMaxContactPerMonth1,
        );

        await pgDiscussionRepository.insert(discussionAtSinceDate);

        await pgEstablishmentAggregateRepository.markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerMonth(
          since,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          [
            new EstablishmentAggregateBuilder(
              establishmentIsNotSearchableAndMaxContactPerMonth1,
            )
              .withIsMaxDiscussionsForPeriodReached(false)
              .withFitForDisabledWorkers(false)
              .build(),
          ],
        );
      });
    });

    describe("do not update", () => {
      it(`do not update is searchable for establishments that: 
          - are not searchable
          - have maxContactsPerMonth at 0
          - have 0 discussion`, async () => {
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentIsNotSearchableAndMaxContactPerMonth0,
        );

        await pgEstablishmentAggregateRepository.markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerMonth(
          since,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          [establishmentIsNotSearchableAndMaxContactPerMonth0],
        );
      });

      it(`do not update is searchable for establishments that: 
          - are not searchable
          - have maxContactsPerMonth at 0
          - have 1 discussion since date`, async () => {
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentIsNotSearchableAndMaxContactPerMonth0,
        );
        await pgDiscussionRepository.insert(discussionAfterSinceDate);

        await pgEstablishmentAggregateRepository.markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerMonth(
          since,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          [establishmentIsNotSearchableAndMaxContactPerMonth0],
        );
      });

      it(`do not update is searchable for establishments that: 
          - are not searchable
          - have maxContactsPerMonth at 1
          - have 1 discussion since date`, async () => {
        await pgEstablishmentAggregateRepository.insertEstablishmentAggregate(
          establishmentIsNotSearchableAndMaxContactPerMonth1,
        );
        await pgDiscussionRepository.insert(discussionAfterSinceDate);

        await pgEstablishmentAggregateRepository.markEstablishmentAsSearchableWhenRecentDiscussionAreUnderMaxContactPerMonth(
          since,
        );

        expectToEqual(
          await pgEstablishmentAggregateRepository.getAllEstablishmentAggregatesForTest(),
          [establishmentIsNotSearchableAndMaxContactPerMonth1],
        );
      });
    });
  });
});

const toReadableSearchResult = ({
  address,
  rome,
  distance_m,
}: SearchResultDto) => ({
  address: `${address?.streetNumberAndAddress} ${address?.postcode} ${address?.city}`,
  rome,
  distance_m,
});

const centerOfSaintesGeoPosition: GeoPositionDto = {
  lat: 45.7461575,
  lon: -0.728166,
};

const bassompierreSaintesLocation: Location = {
  id: "22222222-ee70-4c90-b3f4-668d492f7395",
  address: {
    city: "Saintes",
    postcode: "17100",
    streetNumberAndAddress: "8 Place bassompierre",
    departmentCode: "17",
  },
  position: {
    lat: 45.7424192,
    lon: -0.6293045,
  },
};

const portHubleChaniersLocation: Location = {
  id: "22222222-ee70-4c90-b3f4-668d492f7396",
  address: {
    city: "Chaniers",
    postcode: "17610",
    streetNumberAndAddress: "Le Port Hublé, 2 Chem. des Métrelles",
    departmentCode: "17",
  },
  position: {
    lat: 45.7285766,
    lon: -0.5878595,
  },
};

const tourDeLaChaineLaRochelleLocation: Location = {
  id: "33333333-ee70-4c90-b3f4-668d492f7354",
  address: {
    streetNumberAndAddress: "Tour de la chaîne",
    postcode: "17000",
    city: "La Rochelle",
    departmentCode: "17",
  },
  position: {
    lat: 46.1556411,
    lon: -1.153885,
  },
};

const veauxLocation: Location = {
  id: "33333333-ee70-4c90-b3f4-668d492f7395",
  address: rueJacquardDto,
  position: {
    lat: 45.7636093,
    lon: 4.9209047,
  },
};

const locationOfSearchPosition = new LocationBuilder()
  .withId(uuid())
  .withPosition({ lat: 49, lon: 6 })
  .build();
const locationOfCloseSearchPosition = new LocationBuilder()
  .withId(uuid())
  .withPosition({ lat: 49.001, lon: 6.001 })
  .build();
const locationOfFarFromSearchedPosition = new LocationBuilder()
  .withId(uuid())
  .withPosition({ lat: 32, lon: 89 })
  .build();

const searchMadeDistanceWithoutRome: SearchMade = {
  ...locationOfSearchPosition.position,
  distanceKm: 30,
  sortedBy: "distance",
};
const cartographeSearchMade: SearchMade = {
  ...searchMadeDistanceWithoutRome,
  appellationCodes: [cartographeImmersionOffer.appellationCode],
};

const establishmentWithOfferA1101_AtPosition =
  new EstablishmentAggregateBuilder()
    .withEstablishmentSiret("00000000000001")
    .withLocations([locationOfSearchPosition])
    .withOffers([offer_A1101_11987])
    .withUserRights([osefUserRight])
    .build();

const establishmentWithOfferA1101_close = new EstablishmentAggregateBuilder()
  .withEstablishmentSiret("00000000000002")
  .withLocations([locationOfCloseSearchPosition])
  .withOffers([offer_A1101_11987])
  .withUserRights([osefUserRight])
  .build();

const establishmentWithOfferA1101_far = new EstablishmentAggregateBuilder()
  .withEstablishmentSiret("00000000000003")
  .withLocations([locationOfFarFromSearchedPosition])
  .withOffers([offer_A1101_11987])
  .withUserRights([osefUserRight])
  .build();

const searchableByAllEstablishment = new EstablishmentAggregateBuilder()
  .withEstablishmentSiret("00000000000001")
  .withSearchableBy({ jobSeekers: true, students: true })
  .withOffers([cartographeImmersionOffer])
  .withLocations([
    new LocationBuilder(locationOfSearchPosition).withId(uuid()).build(),
  ])
  .withUserRights([osefUserRight])
  .build();
const searchableByStudentsEstablishment = new EstablishmentAggregateBuilder()
  .withEstablishmentSiret("00000000000002")
  .withSearchableBy({ jobSeekers: false, students: true })
  .withOffers([cartographeImmersionOffer])
  .withLocations([
    new LocationBuilder(locationOfSearchPosition).withId(uuid()).build(),
  ])
  .withUserRights([osefUserRight])
  .build();
const searchableByJobSeekerEstablishment = new EstablishmentAggregateBuilder()
  .withEstablishmentSiret("00000000000003")
  .withSearchableBy({ jobSeekers: true, students: false })
  .withOffers([cartographeImmersionOffer])
  .withLocations([
    new LocationBuilder(locationOfSearchPosition).withId(uuid()).build(),
  ])
  .withUserRights([osefUserRight])
  .build();

const establishmentCuvisteAtSaintesAndVeaux =
  new EstablishmentAggregateBuilder()
    .withEstablishmentSiret("78000403200029")
    .withOffers([
      new OfferEntityBuilder(cuvisteOffer).withCreatedAt(new Date()).build(),
    ])
    .withLocations([
      bassompierreSaintesLocation,
      veauxLocation, // outside geographical area
    ])
    .withUserRights([osefUserRight])
    .build();

const establishmentCuvisteAtChaniersAndLaRochelle =
  new EstablishmentAggregateBuilder()
    .withEstablishmentSiret("78000403200030")
    .withOffers([
      new OfferEntityBuilder(cuvisteOffer)
        .withCreatedAt(subDays(new Date(), 1))
        .build(),
    ])
    .withLocations([
      portHubleChaniersLocation,
      tourDeLaChaineLaRochelleLocation, // outside geographical area (52km)
    ])
    .withUserRights([osefUserRight])
    .build();

const establishment0145Z_A = new EstablishmentAggregateBuilder()
  .withUserRights([osefUserRight])
  .withOffers([cuvisteOffer])
  .withEstablishmentSiret("00000000000010")
  .withLocations([bassompierreSaintesLocation])
  .withEstablishmentNaf({
    code: "0145Z",
    nomenclature: "Élevage d'ovins et de caprins",
  })
  .build();
const establishment0145Z_B = new EstablishmentAggregateBuilder()
  .withUserRights([osefUserRight])
  .withOffers([cuvisteOffer])
  .withEstablishmentSiret("00000000000011")
  .withLocations([portHubleChaniersLocation])
  .withEstablishmentNaf({
    code: "0145Z",
    nomenclature: "Élevage d'ovins et de caprins",
  })
  .build();

const establishment4741Z = new EstablishmentAggregateBuilder()
  .withUserRights([osefUserRight])
  .withOffers([cuvisteOffer])
  .withEstablishmentSiret("00000000000020")
  .withLocations([veauxLocation])
  .withEstablishmentNaf({
    code: "4741Z",
    nomenclature:
      "Commerce de détail d'ordinateurs, d'unités périphériques et de logiciels en magasin spécialisé",
  })
  .build();

const establishment9900Z = new EstablishmentAggregateBuilder()
  .withUserRights([osefUserRight])
  .withOffers([cuvisteOffer])
  .withEstablishmentSiret("00000000000030")
  .withLocations([tourDeLaChaineLaRochelleLocation])
  .withEstablishmentNaf({
    code: "9900Z",
    nomenclature: "Activités des organisations et organismes extraterritoriaux",
  })
  .build();
