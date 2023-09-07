import { SuperTest, Test } from "supertest";
import {
  addressTargets,
  LookupAddress,
  LookupLocationInput,
  LookupSearchResult,
} from "shared";
import { buildTestApp } from "../../../../_testBuilders/buildTestApp";
import { InMemoryAddressGateway } from "../../../secondary/addressGateway/InMemoryAddressGateway";
import {
  expected8bdduportAddressAndPositions,
  query8bdduportLookup,
} from "../../../secondary/addressGateway/testUtils";

const lookupAddressQueryParam = "lookup";
const lookupLocationQueryParam = "query";

const lookupStreetAddressUrl = (lookup: LookupAddress): string =>
  `${addressTargets.lookupStreetAddress.url}?${lookupAddressQueryParam}=${lookup}`;

const lookupLocationUrl = (lookupLocationInput: LookupLocationInput): string =>
  `${addressTargets.lookupLocation.url}?${lookupLocationQueryParam}=${lookupLocationInput}`;

describe("addressRouter", () => {
  let request: SuperTest<Test>;
  let addressGateway: InMemoryAddressGateway;

  beforeEach(async () => {
    const testAppAndDeps = await buildTestApp();
    request = testAppAndDeps.request;
    addressGateway = testAppAndDeps.gateways.addressApi;
  });

  describe(`${addressTargets.lookupStreetAddress.url} route`, () => {
    it(`GET 200 ${lookupStreetAddressUrl(query8bdduportLookup)}`, async () => {
      addressGateway.setAddressAndPosition(
        expected8bdduportAddressAndPositions,
      );
      const response = await request.get(
        `${addressTargets.lookupStreetAddress.url}?${lookupAddressQueryParam}=${query8bdduportLookup}`,
      );
      expect(response.body).toEqual(expected8bdduportAddressAndPositions);
      expect(response.status).toBe(200);
    });

    describe("bad queries", () => {
      it(`GET 400 '${lookupStreetAddressUrl("1")}'`, async () => {
        const response = await request.get(
          `${addressTargets.lookupStreetAddress.url}?${lookupAddressQueryParam}=1`,
        );
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          status: 400,
          message: "Schema validation failed",
          issues: [
            "lookup: String must contain at least 2 character(s)",
            "lookup: String must contain at least 2 character(s), excluding special chars",
          ],
        });
      });

      it(`GET 400 '${lookupStreetAddressUrl(
        "a a a a a a a a a a a a a a a a a a a",
      )}'`, async () => {
        const response = await request.get(
          `${addressTargets.lookupStreetAddress.url}?${lookupAddressQueryParam}=a a a a a a a a a a a a a a a a a a a`,
        );
        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          status: 400,
          message: "Schema validation failed",
          issues: ["lookup: String must contain a maximum of 18 words"],
        });
      });

      it.each(["1,", "1, ", "⠀  , 125 ", " )),$,#                  "])(
        `GET 400 '${lookupStreetAddressUrl("%s")}'`,
        async () => {
          const response = await request.get(
            `${addressTargets.lookupStreetAddress.url}?${lookupAddressQueryParam}=1,`,
          );
          expect(response.status).toBe(400);
          expect(response.body).toEqual({
            status: 400,
            message: "Schema validation failed",
            issues: [
              "lookup: String must contain at least 2 character(s), excluding special chars",
            ],
          });
        },
      );
    });
  });

  describe(`${addressTargets.lookupLocation.url} route`, () => {
    const exampleQuery = "Saint-Emil";
    const expectedLookupSearchResults: LookupSearchResult[] = [
      {
        label: "Saint-Emilion",
        position: {
          lat: 23,
          lon: 12,
        },
      },
    ];

    it(`GET ${lookupLocationUrl(exampleQuery)}`, async () => {
      addressGateway.setLookupSearchResults(expectedLookupSearchResults);
      const response = await request.get(lookupLocationUrl(exampleQuery));
      expect(response.body).toEqual(expectedLookupSearchResults);
      expect(response.status).toBe(200);
    });
  });
});
