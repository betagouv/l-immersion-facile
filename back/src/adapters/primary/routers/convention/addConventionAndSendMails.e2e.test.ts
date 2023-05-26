import supertest from "supertest";
import {
  AgencyDtoBuilder,
  ConventionDto,
  ConventionDtoBuilder,
  conventionsRoute,
  expectEmailOfType,
  expectJwtInMagicLinkAndGetIt,
  expectToEqual,
  expectTypeToMatchAndEqual,
  Signatories,
  signConventionRoute,
  TemplatedEmail,
  UpdateConventionStatusRequestDto,
  updateConventionStatusRoute,
  VALID_EMAILS,
} from "shared";
import {
  buildTestApp,
  TestAppAndDeps,
} from "../../../../_testBuilders/buildTestApp";
import { DomainEvent } from "../../../../domain/core/eventBus/events";
import { shortLinkRedirectToLinkWithValidation } from "../../../../utils/e2eTestHelpers";
import { InMemoryOutboxRepository } from "../../../secondary/core/InMemoryOutboxRepository";
import { InMemoryNotificationGateway } from "../../../secondary/notificationGateway/InMemoryNotificationGateway";

const validatorEmail = "validator@mail.com";
const beneficiarySubmitDate = new Date();
beneficiarySubmitDate.setDate(beneficiarySubmitDate.getDate() - 3);
const beneficiarySignDate = new Date();
beneficiarySignDate.setDate(beneficiarySignDate.getDate() - 2);
const establishmentRepresentativeSignDate = new Date();
establishmentRepresentativeSignDate.setDate(
  establishmentRepresentativeSignDate.getDate() - 1,
);
const validationDate = new Date();

describe("Add Convention Notifications, then checks the mails are sent (trigerred by events)", () => {
  it("saves valid app in repository with full express app", async () => {
    const validConvention = new ConventionDtoBuilder().build();
    const { externalId, ...validConventionParams } = validConvention;
    const { request, gateways, eventCrawler, inMemoryUow } =
      await buildTestApp();

    gateways.shortLinkGenerator.addMoreShortLinkIds([
      "shortLink1",
      "shortLink2",
      "shortLink3",
      "shortLink4",
      "shortLink5",
      "shortLink6",
    ]);

    const res = await request
      .post(`/${conventionsRoute}`)
      .send(validConventionParams);

    expectResponseBody(res, { id: validConvention.id });
    expect(
      await inMemoryUow.conventionRepository.getById(validConvention.id),
    ).toEqual(validConvention);
    expectEventsInOutbox(inMemoryUow.outboxRepository, [
      {
        topic: "ImmersionApplicationSubmittedByBeneficiary",
        payload: validConvention,
        publications: [],
      },
    ]);

    await eventCrawler.processNewEvents();
    await eventCrawler.processNewEvents();

    expectSentEmails(gateways.notification, [
      {
        type: "NEW_CONVENTION_AGENCY_NOTIFICATION",
      },
      {
        type: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE",
        recipients: [validConvention.signatories.beneficiary.email],
      },
      {
        type: "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE",
        recipients: [
          validConvention.signatories.establishmentRepresentative.email,
        ],
      },
    ]);
  });

  // eslint-disable-next-line jest/expect-expect
  it("Scenario: application submitted, then signed, then validated", async () => {

    const peAgency = new AgencyDtoBuilder()
      .withKind("pole-emploi")
      .withValidatorEmails(["validator@mail.com"])
      .build();

    const initialConvention = new ConventionDtoBuilder()
      .withAgencyId(peAgency.id)
      .notSigned()
      .withStatus("READY_TO_SIGN")
      .withoutDateValidation()
      .withFederatedIdentity({ provider: "peConnect", token: "fake" })
      .build();

    const appAndDeps = await buildTestApp();
    appAndDeps.gateways.shortLinkGenerator.addMoreShortLinkIds([
      "link1",
      "link2",
      "link3",
      "link4",
      "link5",
      "link6",
      "link7",
      "link8",
    ]);

    appAndDeps.inMemoryUow.agencyRepository.setAgencies([peAgency]);

    const { beneficiarySignJwt, establishmentSignJwt } =
      await beneficiarySubmitsApplicationForTheFirstTime(
        appAndDeps,
        initialConvention,
        beneficiarySubmitDate,
      );

    await beneficiarySignsApplication(
      appAndDeps,
      beneficiarySignJwt,
      initialConvention,
    );

    const { validatorReviewJwt } = await establishmentSignsApplication(
      appAndDeps,
      establishmentSignJwt,
      initialConvention,
    );

    await validatorValidatesApplicationWhichTriggersConventionToBeSent(
      appAndDeps,
      validatorReviewJwt,
      initialConvention,
    );

    // REVIEW : RAJOUTER EXPECT A FAIRE !!!
  });

  const expectSentEmails = (
    notificationGateway: InMemoryNotificationGateway,
    emails: Partial<TemplatedEmail>[],
  ) => {
    expect(notificationGateway.getSentEmails()).toMatchObject(emails);
  };

  const expectEventsInOutbox = (
    outbox: InMemoryOutboxRepository,
    events: Partial<DomainEvent>[],
  ) => {
    expect(outbox.events).toMatchObject(events);
  };

  const expectResponseBody = (
    res: supertest.Response,
    body: Record<string, unknown>,
  ) => {
    expect(res.body).toEqual(body);
    expect(res.status).toBe(200);
  };
});

const numberOfEmailInitialySent = 4;

const beneficiarySubmitsApplicationForTheFirstTime = async (
  { request, gateways, eventCrawler, inMemoryUow }: TestAppAndDeps,
  convention: ConventionDto,
  submitDate: Date,
) => {
  gateways.timeGateway.setNextDate(submitDate);
  gateways.shortLinkGenerator.addMoreShortLinkIds([
    "shortLink1",
    "shortLink2",
    "shortLink3",
    "shortLink4",
  ]);
  const { externalId, ...createConventionParams } = convention;
  const result = await request
    .post(`/${conventionsRoute}`)
    .send(createConventionParams);

  expect(result.status).toBe(200);

  expectTypeToMatchAndEqual(
    await inMemoryUow.conventionRepository.getById(convention.id),
    convention,
  );

  //Need to process events 2 times in order to handle submit & associate events
  await eventCrawler.processNewEvents();
  await eventCrawler.processNewEvents();

  const peNotification = gateways.poleEmploiGateway.notifications[0];
  expect(peNotification.id).toBe("00000000001");
  expectToEqual(peNotification.statut, "DEMANDE_A_SIGNER");
  expect(peNotification.originalId).toBe(convention.id);
  expect(peNotification.email).toBe(convention.signatories.beneficiary.email);
  const sentEmails = gateways.notification.getSentEmails();
  expect(sentEmails).toHaveLength(numberOfEmailInitialySent - 1);
  expect(sentEmails.map((e) => e.recipients)).toEqual([
    [VALID_EMAILS[2]],
    [VALID_EMAILS[0]],
    [VALID_EMAILS[1]],
  ]);

  const beneficiaryShortLinkSignEmail = expectEmailOfType(
    sentEmails[1],
    "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE",
  );
  const establishmentShortLinkSignEmail = expectEmailOfType(
    sentEmails[2],
    "NEW_CONVENTION_CONFIRMATION_REQUEST_SIGNATURE",
  );

  const beneficiarySignLink = await shortLinkRedirectToLinkWithValidation(
    beneficiaryShortLinkSignEmail.params.magicLink,
    request,
  );

  const establishmentSignLink = await shortLinkRedirectToLinkWithValidation(
    establishmentShortLinkSignEmail.params.magicLink,
    request,
  );

  const beneficiarySignJwt = expectJwtInMagicLinkAndGetIt(beneficiarySignLink);
  const establishmentSignJwt = expectJwtInMagicLinkAndGetIt(
    establishmentSignLink,
  );

  return {
    beneficiarySignJwt,
    establishmentSignJwt,
  };
};

const beneficiarySignsApplication = async (
  { request, gateways, eventCrawler, inMemoryUow }: TestAppAndDeps,
  beneficiarySignJwt: string,
  initialConvention: ConventionDto,
) => {
  gateways.timeGateway.setNextDate(beneficiarySignDate);

  const response = await request
    .post(`/auth/${signConventionRoute}/${initialConvention.id}`)
    .set("Authorization", beneficiarySignJwt);

  expect(response.status).toBe(200);

  expectTypeToMatchAndEqual(
    await inMemoryUow.conventionRepository.getById(initialConvention.id),
    {
      ...initialConvention,
      status: "PARTIALLY_SIGNED",
      signatories: makeSignatories(initialConvention, {
        beneficiarySignedAt: beneficiarySignDate.toISOString(),
      }),
    },
  );

  await eventCrawler.processNewEvents();

  const sentEmails = gateways.notification.getSentEmails();
  expect(sentEmails).toHaveLength(numberOfEmailInitialySent);
};

const establishmentSignsApplication = async (
  { request, gateways, eventCrawler, inMemoryUow }: TestAppAndDeps,
  establishmentSignJwt: string,
  initialConvention: ConventionDto,
) => {
  gateways.timeGateway.setNextDate(establishmentRepresentativeSignDate);

  await request
    .post(`/auth/${signConventionRoute}/${initialConvention.id}`)
    .set("Authorization", establishmentSignJwt)
    .expect(200);

  expectTypeToMatchAndEqual(
    await inMemoryUow.conventionRepository.getById(initialConvention.id),
    {
      ...initialConvention,
      status: "IN_REVIEW",
      signatories: makeSignatories(initialConvention, {
        beneficiarySignedAt: beneficiarySignDate.toISOString(),
        establishmentRepresentativeSignedAt:
          establishmentRepresentativeSignDate.toISOString(),
      }),
    },
  );

  await eventCrawler.processNewEvents();

  const sentEmails = gateways.notification.getSentEmails();
  expect(sentEmails).toHaveLength(numberOfEmailInitialySent + 1);
  const needsReviewEmail = expectEmailOfType(
    sentEmails[sentEmails.length - 1],
    "NEW_CONVENTION_REVIEW_FOR_ELIGIBILITY_OR_VALIDATION",
  );
  expect(needsReviewEmail.recipients).toEqual([validatorEmail]);

  const validateMagicLink = await shortLinkRedirectToLinkWithValidation(
    needsReviewEmail.params.magicLink,
    request,
  );

  return {
    validatorReviewJwt: expectJwtInMagicLinkAndGetIt(validateMagicLink),
  };
};

const validatorValidatesApplicationWhichTriggersConventionToBeSent = async (
  { request, gateways, eventCrawler, inMemoryUow }: TestAppAndDeps,
  validatorReviewJwt: string,
  initialConvention: ConventionDto,
) => {
  const params: UpdateConventionStatusRequestDto = {
    status: "ACCEPTED_BY_VALIDATOR",
  };

  gateways.timeGateway.setNextDate(validationDate);
  gateways.shortLinkGenerator.addMoreShortLinkIds(["shortlinkId"]);

  await request
    .post(`/auth/${updateConventionStatusRoute}/${initialConvention.id}`)
    .set("Authorization", validatorReviewJwt)
    .send(params)
    .expect(200);

  expectTypeToMatchAndEqual(
    await inMemoryUow.conventionRepository.getById(initialConvention.id),
    {
      ...initialConvention,
      status: "ACCEPTED_BY_VALIDATOR",
      dateValidation: validationDate.toISOString(),
      signatories: makeSignatories(initialConvention, {
        beneficiarySignedAt: beneficiarySignDate.toISOString(),
        establishmentRepresentativeSignedAt:
          establishmentRepresentativeSignDate.toISOString(),
      }),
      statusJustification: undefined,
    },
  );

  await eventCrawler.processNewEvents();
  const sentEmails = gateways.notification.getSentEmails();
  expect(sentEmails).toHaveLength(numberOfEmailInitialySent + 2);
  const needsToTriggerConventionSentEmail = expectEmailOfType(
    sentEmails[sentEmails.length - 1],
    "VALIDATED_CONVENTION_FINAL_CONFIRMATION",
  );

  expect(needsToTriggerConventionSentEmail.recipients).toEqual([
    "beneficiary@email.fr",
    "establishment@example.com",
    validatorEmail,
  ]);

  const conventionDocumentLink = await shortLinkRedirectToLinkWithValidation(
    needsToTriggerConventionSentEmail.params.magicLink,
    request,
  );

  expectJwtInMagicLinkAndGetIt(conventionDocumentLink);
};

const makeSignatories = (
  convention: ConventionDto,
  {
    establishmentRepresentativeSignedAt,
    beneficiarySignedAt,
  }: {
    establishmentRepresentativeSignedAt?: string;
    beneficiarySignedAt?: string;
  },
): Signatories => ({
  beneficiary: {
    ...convention.signatories.beneficiary,
    signedAt: beneficiarySignedAt,
  },
  establishmentRepresentative: {
    ...convention.signatories.establishmentRepresentative,
    signedAt: establishmentRepresentativeSignedAt,
  },
});
