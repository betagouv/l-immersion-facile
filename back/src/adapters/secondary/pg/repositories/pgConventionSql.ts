import {
  ConventionId,
  ConventionReadDto,
  conventionReadSchema,
  parseZodSchemaAndLogErrorOnParsingFailure,
} from "shared";
import { createLogger } from "../../../../utils/logger";
import { executeKyselyRawSqlQuery, KyselyDb } from "../kysely/kyselyUtils";

const buildSignatoriesObject = `JSON_BUILD_OBJECT(
      'beneficiary' , JSON_BUILD_OBJECT(
        'role', 'beneficiary',
        'firstName', b.first_name,
        'lastName', b.last_name,
        'email', b.email,
        'phone', b.phone,
        'signedAt', date_to_iso(b.signed_at),
        'isRqth', CASE WHEN (b.extra_fields ->> 'isRqth' IS NOT NULL) THEN (b.extra_fields ->> 'isRqth')::boolean ELSE NULL END,
        'emergencyContact', b.extra_fields ->> 'emergencyContact',
        'emergencyContactPhone', b.extra_fields ->> 'emergencyContactPhone',
        'emergencyContactEmail', b.extra_fields ->> 'emergencyContactEmail',
        'federatedIdentity', CASE WHEN  (p.user_pe_external_id IS NOT NULL) THEN JSON_BUILD_OBJECT(
          'provider','peConnect',
          'token', p.user_pe_external_id,
          'payload', CASE WHEN (p.email IS NOT NULL) THEN JSON_BUILD_OBJECT(
            'advisor', JSON_BUILD_OBJECT(
              'email',p.email,
              'firstName', p.firstname,
              'lastName',p.lastname,
              'type', p.type
            )
          ) ELSE NULL END 
        ) ELSE NULL END,
        'levelOfEducation', CASE WHEN  (b.extra_fields ->> 'levelOfEducation' IS NOT NULL) THEN b.extra_fields ->> 'levelOfEducation' ELSE NULL END,
        'financiaryHelp', CASE WHEN  (b.extra_fields ->> 'financiaryHelp' IS NOT NULL) THEN b.extra_fields ->> 'financiaryHelp' ELSE NULL END,
        'birthdate', CASE WHEN  (b.extra_fields ->> 'birthdate' IS NOT NULL) THEN b.extra_fields ->> 'birthdate' ELSE '1970-01-01T12:00:00.000Z' END
      ),
      'beneficiaryCurrentEmployer' , CASE WHEN bce IS NULL THEN NULL ELSE JSON_BUILD_OBJECT(
        'role', 'beneficiary-current-employer',
        'firstName', bce.first_name,
        'lastName', bce.last_name,
        'email', bce.email,
        'phone', bce.phone,
        'job', bce.extra_fields ->> 'job',
        'businessSiret', bce.extra_fields ->> 'businessSiret',
        'businessName', bce.extra_fields ->> 'businessName',
        'signedAt', date_to_iso(bce.signed_at),
        'businessAddress', bce.extra_fields ->> 'businessAddress'
      ) END,
      'establishmentRepresentative' , JSON_BUILD_OBJECT(
        'role', 'establishment-representative',
        'firstName', er.first_name,
        'lastName', er.last_name,
        'email', er.email,
        'phone', er.phone,
        'signedAt', date_to_iso(er.signed_at)
      ),
      'beneficiaryRepresentative' , CASE WHEN br IS NULL THEN NULL ELSE JSON_BUILD_OBJECT(
        'role', 'beneficiary-representative',
        'firstName', br.first_name,
        'lastName', br.last_name,
        'email', br.email,
        'phone', br.phone,
        'signedAt', date_to_iso(br.signed_at)
      ) END
    )`;

const buildDto = `JSON_STRIP_NULLS(
  JSON_BUILD_OBJECT(
    'id', conventions.id,
    'status', conventions.status,
    'dateValidation', date_to_iso(date_validation),
    'dateSubmission', date_to_iso(date_submission),
    'dateStart',  date_to_iso(date_start),
    'dateEnd', date_to_iso(date_end),
    'signatories', ${buildSignatoriesObject},
    'siret', siret,
    'schedule', schedule,
    'businessName', business_name,
    'workConditions', work_conditions,
    'agencyId', agency_id,
    'agencyName', agencies.name,
    'agencyKind', agencies.kind,
    'agencyDepartment', agencies.department_code,
    'agencySiret', agencies.agency_siret,
    'agencyRefersTo', CASE WHEN agencies.refers_to_agency_id IS NOT NULL 
      THEN JSON_BUILD_OBJECT(
        'id', agencies.refers_to_agency_id,
        'name', referring_agencies.name
        ) 
      ELSE NULL 
      END,
    'individualProtection', individual_protection,
    'sanitaryPrevention', sanitary_prevention,
    'sanitaryPreventionDescription', sanitary_prevention_description,
    'immersionAddress', immersion_address,
    'immersionObjective', immersion_objective,
    'immersionAppellation', JSON_BUILD_OBJECT(
      'appellationCode', vad.appellation_code::text,
      'appellationLabel', vad.appellation_label,
      'romeCode', vad.rome_code,
      'romeLabel', vad.rome_label
    ),
    'immersionActivities', immersion_activities,
    'immersionSkills', immersion_skills,
    'internshipKind', internship_kind,
    'businessAdvantages', business_advantages,
    'statusJustification', status_justification,
    'establishmentTutor' , JSON_BUILD_OBJECT(
      'role', 'establishment-tutor',
      'firstName', et.first_name,
      'lastName', et.last_name,
      'email', et.email,
      'phone', et.phone,
      'job', et.extra_fields ->> 'job'
    ),
    'validators', validators,
    'renewed', CASE WHEN renewed_from IS NOT NULL THEN JSON_BUILD_OBJECT(
      'from', renewed_from,
      'justification', renewed_justification
    ) ELSE NULL END
))`;

export const selectAllConventionDtosById = `SELECT conventions.id, ${buildDto} as dto 
  FROM conventions
  LEFT JOIN actors AS b ON b.id = conventions.beneficiary_id
  LEFT JOIN actors AS br ON br.id = conventions.beneficiary_representative_id
  LEFT JOIN actors AS bce ON bce.id = conventions.beneficiary_current_employer_id
  LEFT JOIN actors AS er ON er.id = conventions.establishment_representative_id
  LEFT JOIN partners_pe_connect AS p ON p.convention_id = conventions.id
  LEFT JOIN actors as et ON et.id = conventions.establishment_tutor_id
  LEFT JOIN view_appellations_dto AS vad ON vad.appellation_code = conventions.immersion_appellation
  LEFT JOIN agencies ON agencies.id = conventions.agency_id
  LEFT JOIN agencies as referring_agencies ON agencies.refers_to_agency_id = referring_agencies.id
`;

const getReadConventionByIdQuery = `
  ${selectAllConventionDtosById} WHERE conventions.id = $1`;

export const getReadConventionById = async (
  transaction: KyselyDb,
  conventionId: ConventionId,
): Promise<ConventionReadDto | undefined> => {
  const pgResult = await executeKyselyRawSqlQuery<{ dto: unknown }>(
    transaction,
    getReadConventionByIdQuery,
    [conventionId],
  );
  const pgConvention = pgResult.rows.at(0);

  return (
    pgConvention &&
    parseZodSchemaAndLogErrorOnParsingFailure(
      conventionReadSchema,
      pgConvention.dto,
      createLogger(__filename),
      {},
    )
  );
};
