import { Pool, PoolClient } from "pg";
import {
  expectArraysToEqualIgnoringOrder,
  expectToEqual,
  FormEstablishmentDtoBuilder,
} from "shared";
import { getTestPgPool } from "../../../_testBuilders/getTestPgPool";
import { PgFormEstablishmentRepository } from "./PgFormEstablishmentRepository";

describe("PgFormEstablishmentRepository", () => {
  let pool: Pool;
  let client: PoolClient;
  let formEstablishmentRepository: PgFormEstablishmentRepository;

  beforeAll(async () => {
    pool = getTestPgPool();
    client = await pool.connect();
  });

  beforeEach(async () => {
    await client.query("DELETE FROM form_establishments");
    formEstablishmentRepository = new PgFormEstablishmentRepository(client);
  });

  afterAll(async () => {
    client.release();
    await pool.end();
  });

  it("Adds a new FormEstablishment", async () => {
    const formEstablishment = FormEstablishmentDtoBuilder.valid()
      .withSource("lesentreprises-sengagent")
      .withSiret("88888888888888")
      .withMaxContactsPerWeek(8)
      .build();

    await formEstablishmentRepository.create(formEstablishment);

    expectToEqual(
      await formEstablishmentRepository.getBySiret(formEstablishment.siret),
      formEstablishment,
    );
  });

  it("Gets saved Form Establishment", async () => {
    const siretA = "11111111111111";
    const formEstablishmentA = FormEstablishmentDtoBuilder.valid()
      .withSource("lesentreprises-sengagent")
      .withSiret(siretA)
      .build();

    const siretB = "22222222222222";
    const formEstablishmentB = FormEstablishmentDtoBuilder.valid()
      .withFitForDisabledWorkers(true)
      .withSiret(siretB)
      .build();

    await formEstablishmentRepository.create(formEstablishmentA);
    await formEstablishmentRepository.create(formEstablishmentB);

    const resultA = await formEstablishmentRepository.getBySiret(siretA);
    expect(resultA).toEqual(formEstablishmentA);

    const resultAll = await formEstablishmentRepository.getAll();
    expectArraysToEqualIgnoringOrder(resultAll, [
      formEstablishmentA,
      formEstablishmentB,
    ]);
  });

  describe("Pg implementation of 'edit' method", () => {
    it("Edits all fields if establishment indeed exists", async () => {
      // Prepare
      const formEstablishment = FormEstablishmentDtoBuilder.valid()
        .withSiret("88888888888888")
        .withBusinessName("oldName")
        .build();

      await formEstablishmentRepository.create(formEstablishment);

      // Act
      await formEstablishmentRepository.update({
        ...formEstablishment,
        businessName: "newName",
        fitForDisabledWorkers: true,
      });

      // Assert
      const result = await client.query("SELECT * FROM form_establishments");
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].business_name).toBe("newName");
    });
  });
});
