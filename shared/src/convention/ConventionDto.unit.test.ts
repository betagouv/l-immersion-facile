import { addDays, subYears } from "date-fns";
import { keys } from "ramda";
import { z, ZodError } from "zod";
import {
  calculateNumberOfWorkedDays,
  calculateTotalImmersionHoursFromComplexSchedule,
  reasonableSchedule,
} from "../schedule/ScheduleUtils";
import {
  expectToEqual,
  splitCasesBetweenPassingAndFailing,
} from "../test.helpers";
import { DailyScheduleDto, DateIntervalDto, Weekday } from "..";
import {
  Beneficiary,
  BeneficiaryCurrentEmployer,
  BeneficiaryRepresentative,
  ConventionDto,
  ConventionInternshipKindSpecific,
  ConventionReadDto,
  conventionStatuses,
  EstablishmentRepresentative,
  InternshipKind,
  maximumCalendarDayByInternshipKind,
} from "./convention.dto";
import {
  conventionInternshipKindSpecificSchema,
  conventionReadSchema,
  conventionSchema,
} from "./convention.schema";
import { ConventionDtoBuilder, DATE_START } from "./ConventionDtoBuilder";
import { getConventionTooLongMessageAndPath } from "./conventionRefinements";

const currentEmployer: BeneficiaryCurrentEmployer = {
  role: "beneficiary-current-employer",
  email: "email@email.com",
  phone: "",
  firstName: "",
  lastName: "",
  job: "",
  businessSiret: "",
  businessName: "",
  businessAddress: "",
};
const beneficiaryRepresentative: BeneficiaryRepresentative = {
  role: "beneficiary-representative",
  firstName: "",
  lastName: "",
  phone: "",
  email: "demandeur@mail.fr",
};

describe("conventionDtoSchema", () => {
  it("accepts valid Convention", () => {
    const convention = new ConventionDtoBuilder().build();
    expectConventionDtoToBeValid(convention);
  });

  describe("email validations", () => {
    it("ignores accents and case on emails", () => {
      const convention = new ConventionDtoBuilder()
        .withBeneficiaryEmail("Jérôme_Truc@associés.fr")
        .build();
      const parsedConvention = conventionSchema.parse(convention);
      expect(parsedConvention.signatories.beneficiary.email).toBe(
        "jerome_truc@associes.fr",
      );
    });

    it("allow empty emergency contact email", () => {
      const convention = new ConventionDtoBuilder()
        .withBeneficiaryEmergencyContactEmail("")
        .build();
      const parsedConvention = conventionSchema.parse(convention);
      expect(
        parsedConvention.signatories.beneficiary.emergencyContactEmail,
      ).toBe("");
    });

    it("ignores accents on emergency contact email", () => {
      const convention = new ConventionDtoBuilder()
        .withBeneficiaryEmergencyContactEmail("Jérôme_Truc@associés.fr")
        .build();
      const parsedConvention = conventionSchema.parse(convention);
      expect(
        parsedConvention.signatories.beneficiary.emergencyContactEmail,
      ).toBe("jerome_truc@associes.fr");
    });

    it("rejects equal beneficiary and establishment tutor emails", () => {
      expectConventionInvalidWithIssueMessages(
        conventionSchema,
        new ConventionDtoBuilder()
          .withBeneficiaryEmail("demandeur@mail.fr")
          .withEstablishmentTutorEmail("demandeur@mail.fr")
          .build(),
        [
          "Le mail du tuteur doit être différent des mails du bénéficiaire, de son représentant légal et de son employeur actuel.",
        ],
      );
    });

    it("rejects equal beneficiary and establishment representative emails", () => {
      expectConventionInvalidWithIssueMessages(
        conventionSchema,
        new ConventionDtoBuilder()
          .withBeneficiaryEmail("demandeur@mail.fr")
          .withEstablishmentRepresentativeEmail("demandeur@mail.fr")
          .build(),
        [
          "Les emails des signataires doivent être différents.",
          "Les emails des signataires doivent être différents.",
        ],
      );
    });

    it("rejects equal beneficiary and beneficiary representative emails", () => {
      expectConventionInvalidWithIssueMessages(
        conventionSchema,
        new ConventionDtoBuilder()
          .withBeneficiaryEmail("demandeur@mail.fr")
          .withBeneficiaryRepresentative(beneficiaryRepresentative)
          .build(),
        [
          "Obligatoire",
          "Numéro de téléphone incorrect",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Les emails des signataires doivent être différents.",
          "Les emails des signataires doivent être différents.",
        ],
      );
    });

    it("rejects equal beneficiary representative and establishment tutor emails", () => {
      expectConventionInvalidWithIssueMessages(
        conventionSchema,
        new ConventionDtoBuilder()
          .withEstablishmentTutorEmail(beneficiaryRepresentative.email)
          .withBeneficiaryRepresentative(beneficiaryRepresentative)
          .build(),
        [
          "Obligatoire",
          "Numéro de téléphone incorrect",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Le mail du tuteur doit être différent des mails du bénéficiaire, de son représentant légal et de son employeur actuel.",
        ],
      );
    });

    it("rejects equal beneficiary current employer and other signatories", () => {
      const convention = new ConventionDtoBuilder()
        .withBeneficiaryCurrentEmployer(currentEmployer)
        .build();
      expectConventionInvalidWithIssueMessages(
        conventionSchema,
        new ConventionDtoBuilder(convention)
          .withBeneficiaryEmail(currentEmployer.email)
          .build(),
        [
          "Obligatoire",
          "Numéro de téléphone incorrect",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "SIRET doit être composé de 14 chiffres",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Les emails des signataires doivent être différents.",
          "Les emails des signataires doivent être différents.",
        ],
      );
      expectConventionInvalidWithIssueMessages(
        conventionSchema,
        new ConventionDtoBuilder(convention)
          .withBeneficiaryRepresentative({
            ...currentEmployer,
            role: "beneficiary-representative",
          })
          .build(),
        [
          "Obligatoire",
          "Numéro de téléphone incorrect",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Numéro de téléphone incorrect",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "SIRET doit être composé de 14 chiffres",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Les emails des signataires doivent être différents.",
          "Les emails des signataires doivent être différents.",
        ],
      );
      expectConventionInvalidWithIssueMessages(
        conventionSchema,
        new ConventionDtoBuilder(convention)
          .withEstablishmentRepresentativeEmail(currentEmployer.email)
          .build(),
        [
          "Obligatoire",
          "Numéro de téléphone incorrect",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "SIRET doit être composé de 14 chiffres",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Les emails des signataires doivent être différents.",
          "Les emails des signataires doivent être différents.",
        ],
      );
    });

    it("confirm convention read schema inherit convention controls", () => {
      const validConventionRead: ConventionReadDto = {
        ...new ConventionDtoBuilder().build(),
        agencyName: "agence de test",
        agencyDepartment: "75",
        agencyKind: "pole-emploi",
      };
      expect(() =>
        conventionReadSchema.parse(validConventionRead),
      ).not.toThrow();
      expect(conventionReadSchema.parse(validConventionRead)).toBeTruthy();
      const invalidConventionRead: ConventionReadDto = {
        ...new ConventionDtoBuilder()
          .withEstablishmentTutorEmail(beneficiaryRepresentative.email)
          .withBeneficiaryRepresentative(beneficiaryRepresentative)
          .build(),
        agencyName: "agence de test",
        agencyDepartment: "90",
        agencyKind: "pole-emploi",
      };
      expectConventionInvalidWithIssueMessages(
        conventionReadSchema,
        invalidConventionRead,
        [
          "Obligatoire",
          "Numéro de téléphone incorrect",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Obligatoire",
          "Le mail du tuteur doit être différent des mails du bénéficiaire, de son représentant légal et de son employeur actuel.",
        ],
      );
    });
  });

  it("rejects when string with spaces are provided", () => {
    const convention = new ConventionDtoBuilder().withId("  ").build();

    expectConventionInvalidWithIssueMessages(conventionSchema, convention, [
      "Le format de l'identifiant est invalide",
    ]);
  });

  it("rejects when phone is not a valid number", () => {
    const convention = new ConventionDtoBuilder()
      .withBeneficiaryPhone("wrong")
      .build();

    expectConventionInvalidWithIssueMessages(conventionSchema, convention, [
      "Numéro de téléphone incorrect",
    ]);

    const convention2 = new ConventionDtoBuilder()
      .withBeneficiaryPhone("0203stillWrong")
      .build();

    expectConventionInvalidWithIssueMessages(conventionSchema, convention2, [
      "Numéro de téléphone incorrect",
    ]);
  });

  it("rejects when establishmentTutorPhone is not a valid number", () => {
    const convention = new ConventionDtoBuilder()
      .withEstablishementTutorPhone("wrong")
      .build();

    expectConventionInvalidWithIssueMessages(conventionSchema, convention, [
      "Numéro de téléphone incorrect",
    ]);
  });

  describe("constraint on dates", () => {
    it("rejects misformatted submission dates", () => {
      const convention = new ConventionDtoBuilder()
        .withDateSubmission("not-a-date")
        .build();

      expectConventionInvalidWithIssueMessages(conventionSchema, convention, [
        "Le format de la date saisie est invalide",
      ]);
    });

    it("rejects misformatted start dates", () => {
      const convention = new ConventionDtoBuilder()
        .withDateStart("not-a-date")
        .build();

      expectConventionInvalidWithIssueMessages(conventionSchema, convention, [
        "Le format de la date de début est invalide",
        "La date de fin doit être après la date de début.",
        "La durée maximale calendaire d'une immersion est de 30 jours.",
        "Veuillez remplir les horaires.",
      ]);
    });

    it("rejects misformatted end dates", () => {
      const convention = new ConventionDtoBuilder()
        .withDateEnd("not-a-date")
        .build();

      expectConventionInvalidWithIssueMessages(conventionSchema, convention, [
        "Le format de la date de fin est invalide",
        "La date de fin doit être après la date de début.",
        "La durée maximale calendaire d'une immersion est de 30 jours.",
        "Veuillez remplir les horaires.",
      ]);
    });

    it("rejects start dates that are after the end date", () => {
      const convention = new ConventionDtoBuilder()
        .withDateStart("2021-01-10")
        .withDateEnd("2021-01-03")
        .withSchedule(reasonableSchedule)
        .build();

      expectConventionInvalidWithIssueMessages(conventionSchema, convention, [
        "La date de fin doit être après la date de début.",
        "Veuillez remplir les horaires.",
      ]);
    });

    it("accept start dates that are tuesday if submitting on previous friday", () => {
      const convention = new ConventionDtoBuilder()
        .withDateSubmission("2023-10-15") // which is a friday
        .withDateStart("2023-10-19") // which is the following tuesday
        .withDateEnd("2023-10-27")
        .withSchedule(reasonableSchedule)
        .build();

      expectConventionDtoToBeValid(convention);
    });

    describe("Handle convention validation with time periods on season time update", () => {
      it("summer time", () => {
        const complexSchedule: DailyScheduleDto[] = [
          { date: "2023-03-20T00:00:00.000Z", timePeriods: [] },
          { date: "2023-04-06T00:00:00.000Z", timePeriods: [] },
          {
            date: "2023-04-07T00:00:00.000Z",
            timePeriods: [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ],
          },
          {
            date: "2023-04-08T00:00:00.000Z",
            timePeriods: [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ],
          },
          { date: "2023-04-09T00:00:00.000Z", timePeriods: [] },
          {
            date: "2023-04-10T00:00:00.000Z",
            timePeriods: [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ],
          },
          {
            date: "2023-04-11T00:00:00.000Z",
            timePeriods: [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ],
          },
          {
            date: "2023-04-12T00:00:00.000Z",
            timePeriods: [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ],
          },
        ];

        expectToEqual(calculateNumberOfWorkedDays(complexSchedule), 5);
        expectToEqual(
          calculateTotalImmersionHoursFromComplexSchedule(complexSchedule),
          35,
        );
        const convention = new ConventionDtoBuilder()
          .withDateStart("2023-03-20")
          .withDateEnd("2023-04-12")
          .withSchedule(
            (_interval: DateIntervalDto, _excludedDays?: Weekday[]) => ({
              totalHours:
                calculateTotalImmersionHoursFromComplexSchedule(
                  complexSchedule,
                ),
              isSimple: false,
              complexSchedule,
              workedDays: calculateNumberOfWorkedDays(complexSchedule),
            }),
          )
          .build();
        expectToEqual(conventionSchema.parse(convention), convention);
      });

      it("winter time", () => {
        const complexSchedule: DailyScheduleDto[] = [
          { date: "2023-10-20T00:00:00.000Z", timePeriods: [] },
          { date: "2023-11-06T00:00:00.000Z", timePeriods: [] },
          {
            date: "2023-11-07T00:00:00.000Z",
            timePeriods: [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ],
          },
          {
            date: "2023-11-08T00:00:00.000Z",
            timePeriods: [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ],
          },
          { date: "2023-11-09T00:00:00.000Z", timePeriods: [] },
          {
            date: "2023-11-10T00:00:00.000Z",
            timePeriods: [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ],
          },
          {
            date: "2023-11-11T00:00:00.000Z",
            timePeriods: [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ],
          },
          {
            date: "2023-11-12T00:00:00.000Z",
            timePeriods: [
              { start: "09:00", end: "12:00" },
              { start: "13:00", end: "17:00" },
            ],
          },
        ];

        expectToEqual(calculateNumberOfWorkedDays(complexSchedule), 5);
        expectToEqual(
          calculateTotalImmersionHoursFromComplexSchedule(complexSchedule),
          35,
        );
        const convention = new ConventionDtoBuilder()
          .withDateStart("2023-10-20")
          .withDateEnd("2023-11-12")
          .withSchedule(
            (_interval: DateIntervalDto, _excludedDays?: Weekday[]) => ({
              totalHours:
                calculateTotalImmersionHoursFromComplexSchedule(
                  complexSchedule,
                ),
              isSimple: false,
              complexSchedule,
              workedDays: calculateNumberOfWorkedDays(complexSchedule),
            }),
          )
          .build();
        expectToEqual(conventionSchema.parse(convention), convention);
      });
    });

    describe("Correctly handles max authorized number of days", () => {
      const calendarDayAndInternShips = keys(
        maximumCalendarDayByInternshipKind,
      ).map((internshipKind) => ({
        internshipKind,
        maxCalendarDays: maximumCalendarDayByInternshipKind[internshipKind],
      }));

      it.each(calendarDayAndInternShips)(
        "for $intershipKind rejects when it is more than $maxCalendarDays",
        ({ internshipKind, maxCalendarDays }) => {
          const convention = new ConventionDtoBuilder()
            .withInternshipKind(internshipKind)
            .withDateStart(DATE_START)
            .withDateEnd(
              addDays(new Date(DATE_START), maxCalendarDays + 1).toISOString(),
            )
            .withSchedule(reasonableSchedule, ["dimanche"])
            .build();

          expectConventionInvalidWithIssueMessages(
            conventionSchema,
            convention,
            [
              getConventionTooLongMessageAndPath({
                internshipKind,
                dateEnd: "",
                dateStart: "",
              }).message,
            ],
          );
        },
      );

      it.each(calendarDayAndInternShips)(
        "for $intershipKind accepts end date that are <= $maxCalendarDays calendar days after the start date",
        ({ internshipKind, maxCalendarDays }) => {
          const dateStart = DATE_START;
          const dateEnd = addDays(
            new Date(DATE_START),
            maxCalendarDays,
          ).toISOString();
          const convention = new ConventionDtoBuilder()
            .withInternshipKind(internshipKind)
            .withDateStart(dateStart)
            .withDateEnd(dateEnd)
            .withSchedule(reasonableSchedule, ["dimanche"])
            .build();

          expectConventionDtoToBeValid(convention);
        },
      );
    });

    describe("CCI specific, minor under 16yo", () => {
      it("max week hours depends on beneficiary age", () => {
        const dateStart = new Date("2021-01-04").toISOString();
        const dateEnd = addDays(new Date(DATE_START), 3).toISOString();
        const convention = new ConventionDtoBuilder()
          .withInternshipKind("mini-stage-cci")
          .withDateStart(dateStart)
          .withDateEnd(dateEnd)
          .withSchedule(reasonableSchedule)
          .withBeneficiary({
            birthdate: new Date("2006-05-26").toISOString(),
            firstName: "Jean",
            lastName: "Bono",
            role: "beneficiary",
            email: "jean@bono.com",
            levelOfEducation: "4ème",
            phone: "0836656565",
            isRqth: false,
          })
          .build();
        expectConventionInvalidWithIssueMessages(conventionSchema, convention, [
          "La durée maximale hebdomadaire pour un mini-stage d'une personne de moins de 16 ans est de 30h",
        ]);
      });
    });

    describe("status that are available without signatures", () => {
      const [allowWithoutSignature, failingWithoutSignature] =
        splitCasesBetweenPassingAndFailing(conventionStatuses, [
          "DRAFT",
          "READY_TO_SIGN",
          "PARTIALLY_SIGNED",
          "REJECTED",
          "CANCELLED",
          "DEPRECATED",
        ]);

      it.each(allowWithoutSignature.map((status) => ({ status })))(
        "WITHOUT signatures, a Convention CAN be $status",
        ({ status }) => {
          const convention = new ConventionDtoBuilder()
            .withStatus(status)
            .notSigned()
            .build();
          expectConventionDtoToBeValid(convention);
        },
      );

      it.each(failingWithoutSignature.map((status) => ({ status })))(
        "WITHOUT signatures, a Convention CANNOT be $status",
        ({ status }) => {
          const convention = new ConventionDtoBuilder()
            .withStatus(status)
            .notSigned()
            .build();
          expectConventionInvalidWithIssueMessages(
            conventionSchema,
            convention,
            ["La confirmation de votre accord est obligatoire."],
          );
        },
      );
    });
  });

  describe("differentiate beneficiaries according to internshipkind", () => {
    const establishmentRepresentative: EstablishmentRepresentative = {
      email: "b@b.com",
      firstName: "dfssd",
      lastName: "fghfg",
      phone: "022334455",
      role: "establishment-representative",
    };
    const beneficiaryStudent: Beneficiary<"mini-stage-cci"> = {
      birthdate: new Date().toISOString(),
      levelOfEducation: "1ère",
      email: "a@a.com",
      firstName: "student",
      lastName: "student",
      phone: "0011223344",
      role: "beneficiary",
      isRqth: false,
    };
    const beneficiary: Beneficiary<"immersion"> = {
      birthdate: new Date().toISOString(),
      email: "a@a.com",
      firstName: "sdfgf",
      lastName: "sdfs",
      phone: "0011223344",
      role: "beneficiary",
      isRqth: false,
    };

    it("right path internship immersion", () => {
      const conventionInternshipKindSpecificImmersion: ConventionInternshipKindSpecific<"immersion"> =
        {
          internshipKind: "immersion",
          signatories: {
            beneficiary,
            establishmentRepresentative,
          },
        };
      expect(() =>
        conventionInternshipKindSpecificSchema.parse(
          conventionInternshipKindSpecificImmersion,
        ),
      ).not.toThrow();
      expect(
        conventionInternshipKindSpecificSchema.parse(
          conventionInternshipKindSpecificImmersion,
        ),
      ).toBeTruthy();
    });

    it("right path internship mini-stage-cci", () => {
      const conventionInternshipKindSpecificCci: ConventionInternshipKindSpecific<"mini-stage-cci"> =
        {
          internshipKind: "mini-stage-cci",
          signatories: {
            beneficiary: beneficiaryStudent,
            establishmentRepresentative,
          },
        };
      expect(() =>
        conventionInternshipKindSpecificSchema.parse(
          conventionInternshipKindSpecificCci,
        ),
      ).not.toThrow();
      expect(
        conventionInternshipKindSpecificSchema.parse(
          conventionInternshipKindSpecificCci,
        ),
      ).toBeTruthy();
    });

    it("bad path internship mini-stage-cci", () => {
      const badConventionInternshipKindSpecific: ConventionInternshipKindSpecific<InternshipKind> =
        {
          internshipKind: "mini-stage-cci",
          signatories: {
            beneficiary,
            establishmentRepresentative,
          },
        };
      expectConventionInvalidWithIssueMessages(
        conventionInternshipKindSpecificSchema,
        badConventionInternshipKindSpecific,
        ["Votre niveau d'étude est obligatoire."],
      );
    });
  });

  describe("when beneficiary is too young", () => {
    it('rejects when beneficiary age is under 16yr with internship kind "immersion"', () => {
      const immersionStartDate = new Date("2022-01-01");
      const beneficiary: Beneficiary<"immersion"> = {
        birthdate: addDays(subYears(immersionStartDate, 16), 1).toISOString(),
        email: "a@a.com",
        firstName: "sdfgf",
        lastName: "sdfs",
        phone: "0011223344",
        role: "beneficiary",
        isRqth: false,
      };

      const convention = new ConventionDtoBuilder()
        .withInternshipKind("immersion")
        .withDateStart(immersionStartDate.toISOString())
        .withDateEnd(new Date("2022-01-02").toISOString())
        .withSchedule(reasonableSchedule)
        .withBeneficiary(beneficiary)
        .build();

      expectConventionInvalidWithIssueMessages(conventionSchema, convention, [
        "L'âge du bénéficiaire doit être au minimum de 16ans",
      ]);
    });

    it('rejects when beneficiary age is under 10yr with internship kind "mini-stage-cci"', () => {
      const immersionStartDate = new Date("2022-01-01");
      const beneficiary: Beneficiary<"mini-stage-cci"> = {
        levelOfEducation: "Terminale",
        birthdate: addDays(subYears(immersionStartDate, 10), 1).toISOString(),
        email: "a@a.com",
        firstName: "sdfgf",
        lastName: "sdfs",
        phone: "0011223344",
        role: "beneficiary",
      };

      const convention = new ConventionDtoBuilder()
        .withInternshipKind("mini-stage-cci")
        .withDateStart(immersionStartDate.toISOString())
        .withDateEnd(new Date("2022-01-02").toISOString())
        .withSchedule(reasonableSchedule, ["dimanche"])
        .withBeneficiary(beneficiary)
        .build();

      expectConventionInvalidWithIssueMessages(conventionSchema, convention, [
        "L'âge du bénéficiaire doit être au minimum de 10ans",
      ]);
    });
  });

  describe("when sunday is in schedule", () => {
    const saturdayOfWeek1 = new Date("2023-07-22").toISOString();
    const sundayOfWeek1 = new Date("2023-07-23").toISOString();
    const mondayOfWeek2 = new Date("2023-07-24").toISOString();
    const conventionBuilder = new ConventionDtoBuilder()
      .withDateStart(saturdayOfWeek1)
      .withDateEnd(mondayOfWeek2);

    describe("when there is no timePeriods on sunday", () => {
      it("accepts when internship kind is mini-stage-cci", () => {
        const scheduleWithoutSunday: DailyScheduleDto[] = [
          {
            date: saturdayOfWeek1,
            timePeriods: [{ start: "09:00", end: "12:00" }],
          },
          {
            date: sundayOfWeek1,
            timePeriods: [],
          },
          {
            date: mondayOfWeek2,
            timePeriods: [{ start: "09:00", end: "12:00" }],
          },
        ];

        expectConventionDtoToBeValid(
          conventionBuilder
            .withInternshipKind("mini-stage-cci")
            .withSchedule(() => ({
              totalHours: calculateTotalImmersionHoursFromComplexSchedule(
                scheduleWithoutSunday,
              ),
              workedDays: calculateNumberOfWorkedDays(scheduleWithoutSunday),
              isSimple: false,
              complexSchedule: scheduleWithoutSunday,
            }))
            .build(),
        );
      });
    });

    describe("when there is timePeriods on sunday", () => {
      it("rejects when internship kind is mini-stage-cci", () => {
        const convention = conventionBuilder
          .withInternshipKind("mini-stage-cci")
          .withSchedule(reasonableSchedule)
          .build();

        expectConventionInvalidWithIssueMessages(conventionSchema, convention, [
          `[${convention.id}] Le mini-stage ne peut pas se dérouler un dimanche`,
        ]);
      });

      it("accepts valid convention when kind is immersion", () => {
        expectConventionDtoToBeValid(
          conventionBuilder
            .withInternshipKind("immersion")
            .withSchedule(reasonableSchedule)
            .build(),
        );
      });
    });
  });
});

const expectConventionDtoToBeValid = (validConvention: ConventionDto): void => {
  expect(() => conventionSchema.parse(validConvention)).not.toThrow();
  expect(conventionSchema.parse(validConvention)).toBeTruthy();
};

const expectConventionInvalidWithIssueMessages = <T>(
  schema: z.Schema<T>,
  convention: T,
  issueMessages: string[],
) => {
  expect(() => schema.parse(convention)).toThrow();
  try {
    schema.parse(convention);
  } catch (error) {
    if (error instanceof ZodError) {
      error.issues.forEach((issue, index) => {
        expect(issue.message).toEqual(issueMessages[index]);
      });
      return;
    }
    throw new Error("Zod error expected when parsing convention");
  }
};
