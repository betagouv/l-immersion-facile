import type { ColumnType, Generated, JSONColumnType } from "kysely";
import type {
  AbsoluteUrl,
  ConventionId,
  DateTimeIsoString,
  DiscussionStatus,
  Email,
} from "shared";
import type { SubscriberErrorFeedback } from "../../../../domains/core/api-consumer/ports/SubscribersGateway";
import type {
  BroadcastFeedbackResponse,
  ConventionBroadcastRequestParams,
} from "../../../../domains/core/saved-errors/ports/BroadcastFeedbacksRepository";

export interface Database {
  actors: Actors;
  agencies: Agencies;
  agency_groups__agencies: AgencyGroupsAgencies;
  agency_groups: AgencyGroups;
  api_consumers_subscriptions: ApiConsumersSubscriptions;
  api_consumers: ApiConsumers;
  broadcast_feedbacks: BroadcastFeedbacks;
  convention_external_ids: ConventionExternalIds;
  conventions_to_sync_with_pe: ConventionsToSyncWithPe;
  conventions: Conventions;
  delegation_contacts: DelegationContacts;
  discussions: Discussions;
  establishment_lead_events: EstablishmentLeadEvents;
  establishments__users: EstablishmentsUsers;
  establishments_deleted: EstablishmentsDeleted;
  establishments_location_infos: EstablishmentsLocationInfos;
  establishments_location_positions: EstablishmentsLocationPositions;
  establishments: Establishments;
  exchanges: Exchanges;
  feature_flags: FeatureFlags;
  groups__sirets: GroupsSirets;
  groups: Groups;
  immersion_assessments: ImmersionAssessments;
  immersion_offers: ImmersionOffers;
  marketing_establishment_contacts: MarketingEstablishmentContacts;
  notifications_email_attachments: NotificationsEmailAttachments;
  notifications_email_recipients: NotificationsEmailRecipients;
  notifications_email: NotificationsEmail;
  notifications_sms: NotificationsSms;
  nps: Nps;
  outbox_failures: OutboxFailures;
  outbox_publications: OutboxPublications;
  outbox: Outbox;
  partners_pe_connect: PartnersFtConnect;
  public_appellations_data: PublicAppellationsData;
  public_department_region: PublicDepartmentRegion;
  public_naf_classes_2008_old: PublicNafClasses2008; // TO DELETE
  public_naf_rev2_niveaux: PublicNafRev2Niveaux;
  public_naf_rev2_sections: PublicNafRev2Sections;
  public_naf_rev2_sous_classes: PublicNafRev2SousClasses;
  public_romes_data: PublicRomesData;
  searches_made__appellation_code: SearchesMadeAppellationCode;
  searches_made__naf_code: SearchesMadeNafCode;
  searches_made: SearchesMade;
  short_links: ShortLinks;
  users__agencies: UsersAgencies;
  users_admins: UsersAdmins;
  users_ongoing_oauths: OngoingOauths;
  users: Users;
  view_appellations_dto: ViewAppellationsDto;
}

type JsonArray = JsonValue[];

type JsonObject = {
  [K in string]?: JsonValue;
};

type JsonPrimitive = boolean | null | number | string;
type JsonValue = JsonArray | JsonObject | JsonPrimitive;
type Json = ColumnType<JsonValue, string, string>;
type Timestamp = ColumnType<Date, Date | string, Date | string>;

type WithAcquisition = {
  acquisition_campaign: string | null;
  acquisition_keyword: string | null;
};

type ImmersionObjectives =
  | "Confirmer un projet professionnel"
  | "Découvrir un métier ou un secteur d'activité"
  | "Initier une démarche de recrutement";

type InternshipKind = "immersion" | "mini-stage-cci";

type NumberEmployeesRange =
  | ""
  | "0"
  | "1-2"
  | "3-5"
  | "6-9"
  | "10-19"
  | "20-49"
  | "50-99"
  | "100-199"
  | "200-249"
  | "250-499"
  | "500-999"
  | "1000-1999"
  | "2000-4999"
  | "5000-9999"
  | "+10000";

interface Discussions extends WithAcquisition {
  id: string;
  siret: string;
  contact_method: string;
  created_at: Timestamp;
  potential_beneficiary_first_name: string;
  potential_beneficiary_last_name: string;
  potential_beneficiary_email: string;
  potential_beneficiary_phone: string | null;
  potential_beneficiary_resume_link: string | null;
  potential_beneficiary_has_working_experience: boolean | null;
  potential_beneficiary_experience_additional_information: string | null;
  potential_beneficiary_date_preferences: string | null;
  establishment_contact_email: string;
  establishment_contact_first_name: string;
  establishment_contact_last_name: string;
  establishment_contact_phone: string;
  establishment_contact_job: string;
  establishment_contact_copy_emails: Json;
  appellation_code: number;
  immersion_objective: ImmersionObjectives | null;
  street_number_and_address: string;
  postcode: string;
  department_code: string;
  city: string;
  business_name: string;
  convention_id: ConventionId | null;
  status: DiscussionStatus;
  rejection_kind: string | null;
  rejection_reason: string | null;
}

type ExchangeRole = "establishment" | "potentialBeneficiary";

interface Exchanges {
  discussion_id: string;
  message: string;
  sender: ExchangeRole;
  recipient: ExchangeRole;
  sent_at: Timestamp;
  subject: Generated<string>;
  id: Generated<number>;
  attachments: Generated<Json>;
}

interface Groups {
  slug: string;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  name: string;
  hero_header_title: string;
  hero_header_description: string;
  hero_header_logo_url: AbsoluteUrl | null;
  hero_header_background_color: string | null;
  tint_color: string | null;
}

interface GroupsSirets {
  group_slug: string;
  siret: string;
}

interface Agencies extends WithAcquisition {
  id: string;
  name: string;
  questionnaire_url: string | null;
  email_signature: string;
  legacy_address: string | null;
  position: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  status: Generated<string>;
  kind: string;
  agency_siret: string;
  code_safir: string | null;
  logo_url: string | null;
  street_number_and_address: string;
  post_code: string;
  city: string;
  department_code: string;
  covered_departments: Json;
  refers_to_agency_id: string | null;
  rejection_justification: string | null;
}

export interface BroadcastFeedbacks {
  id: Generated<number>;
  consumer_id: string | null;
  consumer_name: string;
  service_name: string;
  subscriber_error_feedback: JSONColumnType<SubscriberErrorFeedback> | null;
  request_params: JSONColumnType<ConventionBroadcastRequestParams>;
  occurred_at: Timestamp;
  handled_by_agency: Generated<boolean>;
  response: JSONColumnType<BroadcastFeedbackResponse> | null;
}

type ConventionObjectiveType =
  | "Confirmer un projet professionnel"
  | "Découvrir un métier ou un secteur d'activité"
  | "Initier une démarche de recrutement";

type ConventionStatusType =
  | "ACCEPTED_BY_COUNSELLOR"
  | "ACCEPTED_BY_VALIDATOR"
  | "CANCELLED"
  | "DEPRECATED"
  | "DRAFT"
  | "IN_REVIEW"
  | "PARTIALLY_SIGNED"
  | "READY_TO_SIGN"
  | "REJECTED";

interface ConventionExternalIds {
  convention_id: string | null;
  external_id: Generated<number>;
}

interface Conventions extends WithAcquisition {
  id: ConventionId;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  status: ConventionStatusType;
  agency_id: string;
  date_submission: Timestamp;
  date_start: Timestamp;
  date_end: Timestamp;
  siret: string;
  business_name: string;
  schedule: Json;
  individual_protection: boolean;
  sanitary_prevention: boolean;
  sanitary_prevention_description: string;
  immersion_address: string;
  immersion_objective: ConventionObjectiveType;
  immersion_activities: string;
  immersion_skills: string;
  work_conditions: string | null;
  immersion_appellation: number;
  date_validation: Timestamp | null;
  internship_kind: InternshipKind;
  beneficiary_id: number;
  establishment_tutor_id: number;
  establishment_representative_id: number;
  beneficiary_representative_id: number | null;
  beneficiary_current_employer_id: number | null;
  business_advantages: string | null;
  status_justification: string | null;
  validators: Json | null;
  renewed_from: string | null;
  renewed_justification: string | null;
  date_approval: Timestamp | null;
  establishment_number_employees: NumberEmployeesRange | null;
  individual_protection_description: Generated<string>;
}

interface ConventionsToSyncWithPe {
  id: string;
  status: string;
  process_date: Timestamp | null;
  reason: string | null;
}

interface Actors {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  signed_at: Timestamp | null;
  extra_fields: Json | null;
  id: Generated<number>;
}

interface PartnersFtConnect {
  user_pe_external_id: string;
  convention_id: Generated<string>;
  firstname: string | null;
  lastname: string | null;
  email: string | null;
  type: string | null;
}

interface ViewAppellationsDto {
  appellation_code: number | null;
  appellation_label: string | null;
  rome_code: string | null;
  rome_label: string | null;
}

type EstablishmentLeadEventsKind =
  | "registration-accepted"
  | "registration-refused"
  | "reminder-sent"
  | "to-be-reminded";

type NotificationKind = "email" | "sms";

interface EstablishmentLeadEvents {
  siret: string;
  kind: EstablishmentLeadEventsKind;
  occurred_at: Timestamp;
  convention_id: string | null;
  notification_id: string | null;
  notification_kind: NotificationKind | null;
}

interface ApiConsumers {
  id: string;
  name: string;
  description: string | null;
  created_at: Timestamp;
  expiration_date: Timestamp;
  contact_emails: string[];
  contact_first_name: string;
  contact_last_name: string;
  contact_job: string;
  contact_phone: string;
  rights: Generated<Json>;
}

interface ApiConsumersSubscriptions {
  id: string;
  created_at: Generated<Timestamp>;
  right_name: string;
  callback_url: string;
  callback_headers: Json;
  consumer_id: string;
  subscribed_event: string;
}

interface Users {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  created_at: Generated<string>;
  updated_at: Generated<Timestamp>;
  inclusion_connect_sub: string | null;
  pro_connect_sub: string | null;
}

interface OngoingOauths {
  state: string;
  nonce: string;
  provider: string;
  user_id: string | null;
  external_id: string | null;
  access_token: string | null;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
}

type EstablishmentStatus = "DEACTIVATED_FOR_LACK_OF_RESPONSES";

interface Establishments extends WithAcquisition {
  additional_information: Generated<string | null>;
  is_max_discussions_for_period_reached: Generated<boolean>;
  created_at: Timestamp;
  customized_name: string | null;
  fit_for_disabled_workers: boolean;
  is_commited: boolean | null;
  is_open: Generated<boolean>;
  last_insee_check_date: Timestamp | null;
  legacy_address: string | null;
  max_contacts_per_month: number;
  naf_code: string | null;
  naf_nomenclature: string | null;
  contact_mode: ContactMode;
  name: string | null;
  next_availability_date: Timestamp | null;
  number_employees: string | null;
  searchable_by_job_seekers: boolean;
  searchable_by_students: boolean;
  siret: string;
  source_provider: string;
  update_date: Timestamp;
  website: Generated<string | null>;
  score: Generated<number>;
  status: EstablishmentStatus | null;
  status_updated_at: Timestamp | null;
}

interface PublicAppellationsData {
  ogr_appellation: Generated<number>;
  code_rome: string;
  legacy_code_rome_v3: string | null;
  libelle_appellation_long: string;
  libelle_appellation_court: string;
  libelle_appellation_long_tsvector: string | null;
  libelle_appellation_long_without_special_char: string;
}

interface PublicRomesData {
  code_rome: string;
  libelle_rome: string;
  libelle_rome_tsvector: string | null;
}

interface EstablishmentsLocationPositions {
  id: string;
  position: string;
}

type EstablishmentsLocationInfos = {
  id: string;
  establishment_siret: string;
  post_code: string;
  city: string;
  street_number_and_address: string;
  department_code: string;
  lat: number;
  lon: number;
};

interface ImmersionOffers {
  siret: string;
  created_at: Generated<Timestamp>;
  update_date: Generated<Timestamp>;
  score: Generated<number | null>;
  appellation_code: number;
}

type ContactMode = "EMAIL" | "IN_PERSON" | "PHONE";

interface EstablishmentsUsers {
  siret: string;
  user_id: string;
  role: string;
  job: string | null;
  phone: string | null;
}

type AgencyGroupKind = "france-travail";

type AgencyGroupScope = "direction-régionale" | "direction-territoriale";

interface AgencyGroups {
  id: Generated<number>;
  siret: string;
  name: string;
  email: string | null;
  cc_emails: Json | null;
  departments: Json;
  kind: AgencyGroupKind;
  scope: AgencyGroupScope;
  code_safir: string;
}

interface AgencyGroupsAgencies {
  agency_group_id: number;
  agency_id: string;
}

type EventStatus =
  | "failed-but-will-retry"
  | "failed-to-many-times"
  | "in-process"
  | "never-published"
  | "published"
  | "to-republish";

interface Outbox {
  id: string;
  occurred_at: Timestamp;
  was_quarantined: Generated<boolean | null>;
  topic: string;
  payload: Json;
  status: EventStatus;
}

interface Nps {
  id: Generated<number>;
  convention_id: string | null;
  role: string | null;
  score: number | null;
  would_have_done_without_if: boolean | null;
  comments: string | null;
  raw_result: Json;
  respondent_id: string;
  response_id: string;
  created_at: Generated<Timestamp>;
}

interface SearchesMadeAppellationCode {
  search_made_id: string;
  appellation_code: Generated<string | null>;
}

interface SearchesMadeNafCode {
  search_made_id: string;
  naf_code: string;
}

type SortedBy = "date" | "distance" | "score";
type SearchableBy = "jobSeekers" | "students";

interface SearchesMade extends WithAcquisition {
  address: string | null;
  api_consumer_name: string | null;
  department_code: string | null;
  distance: number | null;
  gps: string | null;
  id: string;
  lat: number | null;
  lon: number | null;
  needstobesearched: boolean | null;
  number_of_results: number | null;
  searchable_by: SearchableBy | null;
  sorted_by: Generated<SortedBy | null>;
  update_date: Generated<Timestamp | null>;
  voluntary_to_immersion: boolean | null;
}

interface UsersAgencies {
  user_id: string;
  agency_id: string;
  roles: Json;
  is_notified_by_email: boolean;
}

interface DelegationContacts {
  province: string;
  created_at: Generated<Timestamp | null>;
  updated_at: Generated<Timestamp | null>;
  email: string;
}

interface UsersAdmins {
  user_id: string;
}

interface NotificationsEmail {
  id: string;
  email_kind: string;
  created_at: Timestamp;
  convention_id: string | null;
  establishment_siret: string | null;
  agency_id: string | null;
  params: Json | null;
  reply_to_name: string | null;
  reply_to_email: string | null;
  sender_email: string | null;
  sender_name: string | null;
}

interface NotificationsEmailAttachments {
  id: Generated<number>;
  notifications_email_id: string;
  attachment: Json;
}

type RecipientType = "cc" | "to";

interface NotificationsEmailRecipients {
  notifications_email_id: string;
  email: string;
  recipient_type: RecipientType;
}

interface NotificationsSms {
  id: string;
  sms_kind: string;
  created_at: Timestamp;
  recipient_phone: string;
  convention_id: string | null;
  establishment_siret: string | null;
  agency_id: string | null;
  params: Json | null;
}

interface OutboxFailures {
  id: Generated<number>;
  publication_id: number;
  subscription_id: string;
  error_message: string | null;
}

interface OutboxPublications {
  id: Generated<number>;
  event_id: string;
  published_at: Timestamp;
}

interface FeatureFlags {
  flag_name: string;
  is_active: boolean;
  kind: Generated<string>;
  value: Json | null;
}

// TO DELETE
interface PublicNafClasses2008 {
  class_id: string;
  class_label: string;
  group_id: string;
  group_label: string;
  division_id: string;
  division_label: string;
  section_id: string;
  section_label: string;
}

interface PublicNafRev2Sections {
  code: string;
  libelle: string;
}

interface PublicNafRev2SousClasses {
  code: string;
  libelle: string;
  naf_code: string;
}

interface PublicNafRev2Niveaux {
  code_sous_classe: string;
  code_classe: string;
  code_groupe: string;
  code_division: string;
  code_section: string;
}

interface PublicDepartmentRegion {
  department_code: Generated<string>;
  department_name: Generated<string>;
  region_name: Generated<string>;
  shape_backup: string | null;
  shape: string | null;
}

interface EstablishmentsDeleted {
  siret: string | null;
  created_at: Timestamp;
  deleted_at: Timestamp;
}

interface ImmersionAssessments {
  convention_id: string;
  status: string;
  number_of_hours_actually_made: number | null;
  last_day_of_presence: Timestamp | null;
  number_of_missed_hours: number | null;
  ended_with_a_job: boolean;
  type_of_contract: string | null;
  contract_start_date: Timestamp | null;
  establishment_advices: string;
  establishment_feedback: string;
  created_at: Generated<Timestamp | null>;
  updated_at: Generated<Timestamp | null>;
}

interface ShortLinks {
  short_link_id: string;
  url: string;
  created_at: Generated<Timestamp>;
}

interface MarketingEstablishmentContacts {
  siret: string;
  email: string;
  contact_history: JSONColumnType<
    {
      firstName: string; //PRENOM
      lastName: string; //NOM
      email: Email;
      createdAt: DateTimeIsoString;
    }[]
  >;
}
