import { param, ValueSerializer } from "type-route";
import { AppellationDto, ScheduleDto } from "shared";

export type AuthorizedGroupSlugs = (typeof authorizedGroupSlugs)[number];

export const authorizedGroupSlugs = ["decathlon"] as const;

export type StandardPageSlugs = (typeof standardPageSlugs)[number];

export const standardPageSlugs = [
  "mentions-legales",
  "cgu",
  "politique-de-confidentialite",
  "declaration-accessibilite",
  "plan-du-site",
  "obligations-des-parties",
] as const;

export const adminTabs = [
  "conventions",
  "events",
  "agency-validation",
  "exports",
  "notifications",
  "technical-options",
  "email-preview",
  "establishment-batch",
] as const;

export type AdminTab = (typeof adminTabs)[number];

export const isAdminTab = (input: string): input is AdminTab =>
  adminTabs.includes(input as AdminTab);

export const adminTabSerializer: ValueSerializer<AdminTab> = {
  parse: (raw) => raw as AdminTab,
  stringify: (tab) => tab,
};

export const standardPagesSerializer: ValueSerializer<StandardPageSlugs> = {
  parse: (raw) => raw as StandardPageSlugs,
  stringify: (page) => page,
};

export const groupsSerializer: ValueSerializer<AuthorizedGroupSlugs> = {
  parse: (raw) => raw as AuthorizedGroupSlugs,
  stringify: (page) => page,
};

const scheduleSerializer: ValueSerializer<ScheduleDto> = {
  parse: (raw) => JSON.parse(raw),
  stringify: (schedule) => JSON.stringify(schedule),
};

const appellationDtoSerializer: ValueSerializer<AppellationDto> = {
  parse: (raw) => JSON.parse(raw),
  stringify: (appellationDto) => JSON.stringify(appellationDto),
};

export type ConventionInUrl = Partial<{
  [K in keyof ConventionQueryParams]: ConventionQueryParams[K]["~internal"]["valueSerializer"] extends ValueSerializer<
    infer T
  >
    ? T
    : never;
}>;

export type ConventionFormKeysInUrl = keyof ConventionQueryParams;
type ConventionQueryParams = typeof conventionValuesFromUrl;

export const conventionValuesFromUrl = {
  fedId: param.query.optional.string,
  fedIdProvider: param.query.optional.string,
  email: param.query.optional.string,
  firstName: param.query.optional.string,
  lastName: param.query.optional.string,
  phone: param.query.optional.string,
  financiaryHelp: param.query.optional.string,
  led: param.query.optional.string,
  emergencyContact: param.query.optional.string,
  emergencyContactPhone: param.query.optional.string,
  emergencyContactEmail: param.query.optional.string,
  isRqth: param.query.optional.boolean,
  birthdate: param.query.optional.string,
  agencyDepartment: param.query.optional.string,

  brEmail: param.query.optional.string,
  brFirstName: param.query.optional.string,
  brLastName: param.query.optional.string,
  brPhone: param.query.optional.string,

  bceEmail: param.query.optional.string,
  bceFirstName: param.query.optional.string,
  bceLastName: param.query.optional.string,
  bcePhone: param.query.optional.string,
  bceSiret: param.query.optional.string,
  bceBusinessName: param.query.optional.string,
  bceJob: param.query.optional.string,
  bceBusinessAddress: param.query.optional.string,

  siret: param.query.optional.string,
  businessName: param.query.optional.string,
  businessAdvantages: param.query.optional.string,
  etFirstName: param.query.optional.string,
  etLastName: param.query.optional.string,
  etJob: param.query.optional.string,
  etPhone: param.query.optional.string,
  etEmail: param.query.optional.string,
  erFirstName: param.query.optional.string,
  erLastName: param.query.optional.string,
  erPhone: param.query.optional.string,
  erEmail: param.query.optional.string,
  immersionAddress: param.query.optional.string,
  agencyId: param.query.optional.string,

  immersionObjective: param.query.optional.string,
  immersionActivities: param.query.optional.string,
  immersionSkills: param.query.optional.string,
  sanitaryPreventionDescription: param.query.optional.string,
  workConditions: param.query.optional.string,

  sanitaryPrevention: param.query.optional.boolean,
  individualProtection: param.query.optional.boolean,

  dateStart: param.query.optional.string,
  dateEnd: param.query.optional.string,

  schedule: param.query.optional.ofType(scheduleSerializer),
  immersionAppellation: param.query.optional.ofType(appellationDtoSerializer),
};
