import { addDays, isBefore } from "date-fns";
import subDays from "date-fns/subDays";
import { propEq, toPairs } from "ramda";
import {
  ConventionDto,
  ConventionId,
  ConventionReadDto,
  ConventionScope,
  DateRange,
  FindSimilarConventionsParams,
  SiretDto,
  UserId,
  errors,
  validatedConventionStatuses,
} from "shared";
import { NotFoundError } from "shared";
import { InMemoryAgencyRepository } from "../../agency/adapters/InMemoryAgencyRepository";
import { InMemoryUserRepository } from "../../core/authentication/inclusion-connect/adapters/InMemoryUserRepository";
import { InMemoryNotificationRepository } from "../../core/notifications/adapters/InMemoryNotificationRepository";
import {
  ConventionQueries,
  GetConventionsFilters,
  GetConventionsParams,
} from "../ports/ConventionQueries";
import { InMemoryConventionRepository } from "./InMemoryConventionRepository";

export class InMemoryConventionQueries implements ConventionQueries {
  constructor(
    private readonly conventionRepository: InMemoryConventionRepository,
    private readonly agencyRepository: InMemoryAgencyRepository,
    private readonly notificationRepository: InMemoryNotificationRepository,
    private readonly userRepository: InMemoryUserRepository,
  ) {}

  public async findSimilarConventions(
    params: FindSimilarConventionsParams,
  ): Promise<ConventionId[]> {
    const dateStartToMatch = new Date(params.dateStart);

    return this.conventionRepository.conventions
      .filter(
        ({
          siret,
          immersionAppellation,
          dateStart,
          signatories: { beneficiary },
        }) =>
          siret === params.siret &&
          immersionAppellation.appellationCode === params.codeAppellation &&
          beneficiary.birthdate === params.beneficiaryBirthdate &&
          beneficiary.lastName === params.beneficiaryLastName &&
          dateStartToMatch >= subDays(new Date(dateStart), 7) &&
          dateStartToMatch <= addDays(new Date(dateStart), 7),
      )
      .map((convention) => convention.id);
  }

  public async getAllConventionsForThoseEndingThatDidntGoThrough(
    finishingRange: DateRange,
  ): Promise<ConventionReadDto[]> {
    const notifications = this.notificationRepository
      ? (await this.notificationRepository.getLastNotifications()).emails
      : [];
    const immersionIdsThatAlreadyGotAnEmail = notifications
      ? notifications.map(
          (notification) => notification.followedIds.conventionId,
        )
      : [];
    return await Promise.all(
      this.conventionRepository.conventions
        .filter(
          (convention) =>
            new Date(convention.dateEnd).getDate() >=
              finishingRange.from.getDate() &&
            new Date(convention.dateEnd).getDate() <=
              finishingRange.to.getDate() &&
            validatedConventionStatuses.includes(convention.status) &&
            !immersionIdsThatAlreadyGotAnEmail.includes(convention.id),
        )
        .map((convention) => this.#addAgencyDataToConvention(convention)),
    );
  }

  public async getConventionById(
    id: ConventionId,
  ): Promise<ConventionReadDto | undefined> {
    const convention = this.conventionRepository.conventions.find(
      propEq(id, "id"),
    );
    if (!convention) return;

    return this.#addAgencyDataToConvention(convention);
  }

  public getConventionsByFiltersCalled = 0;

  public async getConventions(
    params: GetConventionsParams,
  ): Promise<ConventionDto[]> {
    this.getConventionsByFiltersCalled++;
    const conventions = await Promise.all(
      this.conventionRepository.conventions
        .filter(makeApplyFiltersToConventions(params.filters))
        .map((convention) => this.#addAgencyDataToConvention(convention)),
    );

    return conventions.sort((previous, current) => {
      const previousDate = previous[params.sortBy];
      const currentDate = current[params.sortBy];

      if (!previousDate) return 1;
      if (!currentDate) return -1;

      return new Date(previousDate).getTime() - new Date(currentDate).getTime();
    });
  }

  public async getConventionsByScope(params: {
    scope: ConventionScope;
    limit: number;
    filters: GetConventionsFilters;
  }): Promise<ConventionReadDto[]> {
    return await Promise.all(
      this.conventionRepository.conventions
        .filter((convention) => {
          //TODO : dépendance agency repo dans convention repo à gérer plutot dans le usecase pour garder le repo convention indépendant
          const agency = this.agencyRepository.agencies.find(
            (agency) => agency.id === convention.agencyId,
          );

          if (!agency) throw new NotFoundError("agency not found");

          return (
            params.scope.agencyKinds?.includes(agency.kind) ||
            params.scope.agencyIds?.includes(agency.id)
          );
        })
        .filter(makeApplyFiltersToConventions(params.filters))
        .map((convention) => this.#addAgencyDataToConvention(convention)),
    );
  }

  public async getLatestConventionBySirets(
    sirets: SiretDto[],
  ): Promise<ConventionReadDto[]> {
    const conventionReadDtos = await Promise.all(
      this.conventionRepository.conventions
        .filter(
          (conventionDto) =>
            sirets?.includes(conventionDto.siret) &&
            !!conventionDto.dateValidation,
        )
        .map((conventionDto) => this.#addAgencyDataToConvention(conventionDto)),
    );

    const latestConventionsBySiret = conventionReadDtos.reduce(
      (acc: Record<SiretDto, ConventionReadDto>, conventionReadDto) => {
        const dateFromCurrentConvention =
          acc[conventionReadDto.siret]?.dateValidation;
        const dateFromIncomingConvention = conventionReadDto.dateValidation;

        if (
          !acc[conventionReadDto.siret] ||
          (dateFromCurrentConvention &&
            dateFromIncomingConvention &&
            isBefore(
              new Date(dateFromCurrentConvention),
              new Date(dateFromIncomingConvention),
            ))
        )
          return {
            ...acc,
            [conventionReadDto.siret]: conventionReadDto,
          };

        return acc;
      },
      {},
    );

    return Object.values(latestConventionsBySiret);
  }

  #addAgencyDataToConvention = async (
    convention: ConventionDto,
  ): Promise<ConventionReadDto> => {
    const agency = this.agencyRepository.agencies.find(
      (agency) => agency.id === convention.agencyId,
    );

    if (!agency)
      throw errors.agency.notFound({ agencyId: convention.agencyId });

    const referedAgency =
      agency.refersToAgencyId &&
      this.agencyRepository.agencies.find(
        (agency) => agency.id === agency.refersToAgencyId,
      );

    const { counsellorIds, validatorIds } = toPairs(agency.usersRights).reduce<{
      counsellorIds: UserId[];
      validatorIds: UserId[];
    }>(
      (acc, item) => {
        const [userId, userRights] = item;

        return {
          counsellorIds: [
            ...acc.counsellorIds,
            ...(userRights?.roles.includes("counsellor") ? [userId] : []),
          ],
          validatorIds: [
            ...acc.validatorIds,
            ...(userRights?.roles.includes("validator") ? [userId] : []),
          ],
        };
      },
      { counsellorIds: [], validatorIds: [] },
    );

    const counsellors = await this.userRepository.getByIds(
      counsellorIds,
      "inclusionConnect",
    );
    const validators = await this.userRepository.getByIds(
      validatorIds,
      "inclusionConnect",
    );

    return {
      ...convention,
      agencyName: agency.name,
      agencyDepartment: agency.address.departmentCode,
      agencyKind: agency.kind,
      agencySiret: agency.agencySiret,
      agencyCounsellorEmails: counsellors.map(({ email }) => email),
      agencyValidatorEmails: validators.map(({ email }) => email),
      agencyRefersTo: referedAgency
        ? {
            id: referedAgency.id,
            name: referedAgency.name,
            kind: referedAgency.kind,
          }
        : undefined,
    };
  };
}

const makeApplyFiltersToConventions =
  ({
    startDateLessOrEqual,
    startDateGreater,
    withStatuses,
    dateSubmissionEqual,
    dateSubmissionSince,
    withSirets,
  }: GetConventionsFilters) =>
  (convention: ConventionDto) =>
    (
      [
        ({ dateStart }) =>
          startDateLessOrEqual
            ? new Date(dateStart) <= startDateLessOrEqual
            : true,
        ({ dateStart }) =>
          startDateGreater ? new Date(dateStart) > startDateGreater : true,
        ({ dateSubmission }) =>
          dateSubmissionEqual
            ? new Date(dateSubmission).getTime() ===
              dateSubmissionEqual.getTime()
            : true,
        ({ dateSubmission }) =>
          dateSubmissionSince
            ? new Date(dateSubmission).getTime() >=
              dateSubmissionSince.getTime()
            : true,
        ({ status }) =>
          withStatuses && withStatuses.length > 0
            ? withStatuses.includes(status)
            : true,

        ({ siret }) =>
          withSirets && withSirets.length > 0
            ? withSirets.includes(siret)
            : true,
      ] satisfies Array<(convention: ConventionDto) => boolean>
    ).every((filter) => filter(convention));
