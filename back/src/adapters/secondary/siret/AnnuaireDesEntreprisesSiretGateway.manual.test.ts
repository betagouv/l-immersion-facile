import axios from "axios";
import { expectToEqual } from "shared";
import { createAxiosSharedClient } from "shared-routes/axios";
import { noRetries } from "../../../domain/core/ports/RetryStrategy";
import { AppConfig } from "../../primary/config/appConfig";
import { RealTimeGateway } from "../core/TimeGateway/RealTimeGateway";
import {
  AnnuaireDesEntreprisesSiretGateway,
  nonDiffusibleEstablishmentName,
} from "./AnnuaireDesEntreprisesSiretGateway";
import { annuaireDesEntreprisesSiretRoutes } from "./AnnuaireDesEntreprisesSiretGateway.routes";
import { InseeSiretGateway } from "./InseeSiretGateway";

// These tests are not hermetic and not meant for automated testing. They will make requests to the
// real SIRENE API, use up production quota, and fail for uncontrollable reasons such as quota
// errors.
//
// Requires the following environment variables to be set for the tests to pass:
// - SIRENE_ENDPOINT
// - SIRENE_BEARER_TOKEN
describe("AnnuaireDesEntreprisesSiretGateway", () => {
  let siretGateway: AnnuaireDesEntreprisesSiretGateway;
  const config = AppConfig.createFromEnv();

  beforeEach(() => {
    siretGateway = new AnnuaireDesEntreprisesSiretGateway(
      createAxiosSharedClient(annuaireDesEntreprisesSiretRoutes, axios),
      new InseeSiretGateway(
        config.inseeHttpConfig,
        new RealTimeGateway(),
        noRetries,
      ),
    );
  });

  it("returns open establishments", async () => {
    // ETABLISSEMENT PUBLIC DU MUSEE DU LOUVRE (should be active)
    const response =
      await siretGateway.getEstablishmentBySiret("18004623700012");
    expectToEqual(response, {
      businessAddress: "NUM 34 ET 36 34 QUAI FRANCOIS MITTERRAND 75001 PARIS 1",
      businessName: "ETABLISSEMENT PUBLIC DU MUSEE DU LOUVRE",
      isOpen: true,
      nafDto: {
        code: "9103Z",
        nomenclature: "NAFRev2",
      },
      numberEmployeesRange: "50-99",
      siret: "18004623700012",
    });
  });

  it("returns non diffusible open establishments", async () => {
    const response =
      await siretGateway.getEstablishmentBySiret("80327462000043");
    expectToEqual(response, {
      businessAddress: "127 RUE DE NANTES 85800 LE FENOUILLER",
      businessName: "LUCIE LEBOURDAIS",
      isOpen: true,
      nafDto: {
        code: "8690D",
        nomenclature: "NAFRev2",
      },
      numberEmployeesRange: "",
      siret: "80327462000043",
    });
  });

  it("returns undefined when no establishment found", async () => {
    const response =
      await siretGateway.getEstablishmentBySiret("00000000000000");
    expect(response).toBeUndefined();
  });

  it("retrieves closed establishments", async () => {
    // SOCIETE TEXTILE D'HENIN LIETARD, closed in 1966.
    const includeClosedEstablishments = true;
    const response = await siretGateway.getEstablishmentBySiret(
      "38961161700017",
      includeClosedEstablishments,
    );
    expectToEqual(response, {
      businessAddress: "RTE BEAUMONT COURCELLES 62110 HENIN-BEAUMONT",
      businessName: "SOCIETE TEXTILE D'HENIN LIETARD",
      isOpen: false,
      nafDto: {
        code: "4701",
        nomenclature: "NAFRev2",
      },
      numberEmployeesRange: "",
      siret: "38961161700017",
    });
  });

  it("filters out closed establishments", async () => {
    // SOCIETE TEXTILE D'HENIN LIETARD, closed in 1966.
    const response =
      await siretGateway.getEstablishmentBySiret("38961161700017");
    expectToEqual(response, undefined);
  });

  it("Should support several of parallel calls, and queue the calls if over accepted rate", async () => {
    const siretsPromises = Array(20).fill("34493368400021");
    const results = await Promise.all(
      siretsPromises.map((siret) =>
        siretGateway.getEstablishmentBySiret(siret).catch((error) => {
          const responseBodyAsString = error.response?.data
            ? ` Body : ${JSON.stringify(error.response?.data)}`
            : "";

          throw new Error(
            `Could not call api correctly, status: ${error.response.status}.${responseBodyAsString}`,
          );
        }),
      ),
    );
    expect(results).toHaveLength(siretsPromises.length);
  });

  it("Should return a non diffusible establishment using fallback API", async () => {
    const nonDiffusibleEstablishment =
      await siretGateway.getEstablishmentBySiret("44117926400078");
    expect(
      nonDiffusibleEstablishment?.businessName.includes(
        nonDiffusibleEstablishmentName,
      ),
    ).toBe(false);
  });

  it("Should work also with an establishment with no nom_commercial", async () => {
    const establishment =
      await siretGateway.getEstablishmentBySiret("83748116700026");
    expect(establishment?.businessName).toBe("P E CONSEIL");
  });
});
