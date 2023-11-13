import { ColumnType, Generated } from "kysely";
import { InternshipKind } from "kysely-codegen/dist/db";
import { AbsoluteUrl } from "shared";

export interface Database {
  actors: Actors;
  conventions: Conventions;
  convention_external_ids: ConventionExternalIds;
  discussions: Discussions;
  exchanges: Exchanges;
  groups: Groups;
  groups__sirets: GroupsSirets;
  agencies: Agencies;
  saved_errors: SavedErrors;
}

type JsonArray = JsonValue[];

type JsonObject = {
  [K in string]?: JsonValue;
};

type JsonPrimitive = boolean | null | number | string;
type JsonValue = JsonArray | JsonObject | JsonPrimitive;
type Json = ColumnType<JsonValue, string, string>;
type Timestamp = ColumnType<Date, Date | string, Date | string>;

type ImmersionObjectives =
  | "Confirmer un projet professionnel"
  | "Découvrir un métier ou un secteur d'activité"
  | "Initier une démarche de recrutement";

interface Discussions {
  id: string;
  siret: string;
  contact_method: string;
  potential_beneficiary_first_name: string;
  potential_beneficiary_last_name: string;
  potential_beneficiary_email: string;
  created_at: Timestamp;
  potential_beneficiary_phone: string | null;
  immersion_objective: ImmersionObjectives | null;
  potential_beneficiary_resume_link: string | null;
  appellation_code: number;
  establishment_contact_email: string;
  establishment_contact_first_name: string;
  establishment_contact_last_name: string;
  establishment_contact_phone: string;
  establishment_contact_job: string;
  establishment_contact_copy_emails: Json;
  street_number_and_address: string;
  postcode: string;
  department_code: string;
  city: string;
  business_name: string;
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

interface Agencies {
  id: string;
  name: string;
  counsellor_emails: Json;
  validator_emails: Json;
  admin_emails: Json;
  questionnaire_url: string;
  email_signature: string;
  legacy_address: string | null;
  position: Generated<string>;
  created_at: Generated<Timestamp>;
  updated_at: Generated<Timestamp>;
  status: Generated<string>;
  kind: string;
  agency_siret: string | null;
  code_safir: string | null;
  logo_url: string | null;
  street_number_and_address: string;
  post_code: string;
  city: string;
  department_code: string;
  refers_to_agency_id: string | null;
}

interface SavedErrors {
  id: Generated<number>;
  service_name: string;
  message: string;
  params: Record<string, unknown> | null;
  occurred_at: Timestamp;
  handled_by_agency: Generated<boolean>;
}

// prettier-ignore
type ConventionObjectiveType = "Confirmer un projet professionnel" | "Découvrir un métier ou un secteur d'activité" | "Initier une démarche de recrutement";

// prettier-ignore
type ConventionStatusType = "ACCEPTED_BY_COUNSELLOR" | "ACCEPTED_BY_VALIDATOR" | "CANCELLED" | "DEPRECATED" | "DRAFT" | "IN_REVIEW" | "PARTIALLY_SIGNED" | "READY_TO_SIGN" | "REJECTED";

interface ConventionExternalIds {
  convention_id: string | null;
  external_id: Generated<number>;
}

interface Conventions {
  id: string;
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
