import {
  Beneficiary,
  BeneficiaryCurrentEmployer,
  BeneficiaryRepresentative,
  ConventionDto,
  ConventionId,
  Email,
  EstablishmentRepresentative,
  EstablishmentTutor,
  InternshipKind,
  isBeneficiaryStudent,
  isEstablishmentTutorIsEstablishmentRepresentative,
} from "shared";
import { ConventionRepository } from "../../../../domain/convention/ports/ConventionRepository";
import { ConflictError } from "../../../primary/helpers/httpErrors";
import { executeKyselyRawSqlQuery, KyselyDb } from "../kysely/kyselyUtils";
import { getReadConventionById } from "./pgConventionSql";

export const beneficiaryCurrentEmployerIdColumnName =
  "beneficiary_current_employer_id";

const beneficiaryRepresentativeIdColumnName = "beneficiary_representative_id";

export class PgConventionRepository implements ConventionRepository {
  constructor(private transaction: KyselyDb) {}

  public async deprecateConventionsWithoutDefinitiveStatusEndedSince(
    endedSince: Date,
  ) {
    const result = await executeKyselyRawSqlQuery(
      this.transaction,
      `
      UPDATE conventions
      SET status = 'DEPRECATED', status_justification = 'Devenu obsolète car statut ' || status || ' alors que la date de fin est dépassée depuis longtemps'
      WHERE id IN (
        SELECT id FROM conventions
        WHERE date_end <= $1
        AND status NOT IN ('REJECTED','CANCELLED','DEPRECATED','ACCEPTED_BY_VALIDATOR')
      )
      `,
      [endedSince],
    );
    return Number(result.numAffectedRows);
  }

  public async getById(
    conventionId: ConventionId,
  ): Promise<ConventionDto | undefined> {
    const readDto = await getReadConventionById(this.transaction, conventionId);
    if (!readDto) return;
    const { agencyName, agencyDepartment, agencyKind, ...dto } = readDto;
    return dto;
  }

  public async getIdsByEstablishmentRepresentativeEmail(
    email: Email,
  ): Promise<ConventionId[]> {
    const result = await executeKyselyRawSqlQuery<{ id: ConventionId }>(
      this.transaction,
      `
     SELECT conventions.id
     FROM conventions
     LEFT JOIN actors on conventions.establishment_representative_id = actors.id
     WHERE actors.email = $1
      `,
      [email],
    );

    return result.rows.map(({ id }) => id);
  }

  public async save(convention: ConventionDto): Promise<void> {
    const alreadyExistingConvention = await this.getById(convention.id);
    if (alreadyExistingConvention)
      throw new ConflictError(
        `Convention with id ${convention.id} already exists`,
      );

    // prettier-ignore
    const { signatories: { beneficiary, beneficiaryRepresentative, establishmentRepresentative,beneficiaryCurrentEmployer }, id: conventionId, status, agencyId, dateSubmission, dateStart, dateEnd, dateValidation, siret, businessName, schedule, individualProtection, sanitaryPrevention, sanitaryPreventionDescription, immersionAddress, immersionObjective, immersionAppellation, immersionActivities, immersionSkills, workConditions, internshipKind,establishmentTutor,businessAdvantages, statusJustification , renewed} =
        convention

    // Insert signatories and remember their id
    const beneficiaryId = await this.#insertBeneficiary(beneficiary);
    const establishmentTutorId = await this.#insertEstablishmentTutor(
      establishmentTutor,
    );

    const establishmentRepresentativeId =
      isEstablishmentTutorIsEstablishmentRepresentative(convention)
        ? establishmentTutorId
        : await this.#insertEstablishmentRepresentative(
            establishmentRepresentative,
          );

    const beneficiaryRepresentativeId =
      beneficiaryRepresentative &&
      (await this.#insertBeneficiaryRepresentative(beneficiaryRepresentative));

    const beneficiaryCurrentEmployerId =
      beneficiaryCurrentEmployer &&
      (await this.#insertBeneficiaryCurrentEmployer(
        beneficiaryCurrentEmployer,
      ));

    const query_insert_convention = `INSERT INTO conventions(
          id, status, agency_id, date_submission, date_start, date_end, date_validation, siret, business_name, schedule, individual_protection,
          sanitary_prevention, sanitary_prevention_description, immersion_address, immersion_objective, immersion_appellation, immersion_activities, immersion_skills, work_conditions, internship_kind, business_advantages,
          beneficiary_id, establishment_tutor_id, establishment_representative_id, beneficiary_representative_id, ${beneficiaryCurrentEmployerIdColumnName}, status_justification, renewed_from, renewed_justification
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`;

    // prettier-ignore
    await executeKyselyRawSqlQuery(
      this.transaction,
      query_insert_convention,
      [conventionId, status, agencyId, dateSubmission, dateStart, dateEnd, dateValidation, siret, businessName, schedule, individualProtection, sanitaryPrevention, sanitaryPreventionDescription, immersionAddress, immersionObjective, immersionAppellation.appellationCode, immersionActivities, immersionSkills, workConditions, internshipKind, businessAdvantages,
                                                      beneficiaryId, establishmentTutorId, establishmentRepresentativeId, beneficiaryRepresentativeId,beneficiaryCurrentEmployerId, statusJustification, renewed?.from, renewed?.justification
    ]);
  }

  public async update(
    convention: ConventionDto,
  ): Promise<ConventionId | undefined> {
    // prettier-ignore
    const { signatories: { beneficiary, beneficiaryRepresentative, beneficiaryCurrentEmployer }, id, establishmentTutor } =
      convention

    const establishment_tutor_id = await this.#updateEstablishmentTutor(
      id,
      establishmentTutor,
    );

    const beneficiaryCurrentEmployerId =
      await this.#insertOrUpdateBeneficiaryCurrentEmployerIfExists(
        beneficiaryCurrentEmployer,
        id,
      );

    await this.#updateBeneficiary(id, beneficiary);

    const beneficiaryRepresentativeId =
      await this.#insertOrUpdateBeneficiaryRepresentativeIfExists(
        beneficiaryRepresentative,
        id,
      );

    await this.#updateConvention({
      convention,
      establishment_tutor_id,
      establishment_representative_id:
        await this.#getEstablishmentRepresentativeId({
          convention,
          establishment_tutor_id,
        }),
      beneficiary_current_employer_id: beneficiaryCurrentEmployerId,
      beneficiary_representative_id: beneficiaryRepresentativeId,
    });

    return convention.id;
  }

  async #establishmentTutorAndRepresentativeHaveSameId(
    id: ConventionId,
  ): Promise<boolean> {
    const getConventionEstablishmentTutorAndRepresentativeQuery = `
    SELECT establishment_tutor_id,establishment_representative_id
    FROM conventions
    WHERE id=$1`;
    const queryReturn = await executeKyselyRawSqlQuery<{
      establishment_tutor_id: number;
      establishment_representative_id: number;
    }>(
      this.transaction,
      getConventionEstablishmentTutorAndRepresentativeQuery,
      [id],
    );
    const result = queryReturn.rows.at(0);
    if (result)
      return (
        result.establishment_tutor_id === result.establishment_representative_id
      );
    throw new Error(`No convention with id '${id}'.`);
  }

  async #getBeneficiaryCurrentEmployerId(
    id: ConventionId,
  ): Promise<number | null> {
    const getBeneficiaryCurrentEmployerQuery = `  
        SELECT ${beneficiaryCurrentEmployerIdColumnName}
        FROM conventions 
        WHERE conventions.id=$1
        `;

    const getResult = await executeKyselyRawSqlQuery<{
      beneficiary_current_employer_id: number | null;
    }>(this.transaction, getBeneficiaryCurrentEmployerQuery, [id]);
    const result = getResult.rows.at(0);
    if (result) return result.beneficiary_current_employer_id;
    throw missingReturningRowError();
  }

  async #getBeneficiaryRepresentativeId(id: ConventionId) {
    const getBeneficiaryRepresentativeQuery = `  
        SELECT ${beneficiaryRepresentativeIdColumnName}
        FROM conventions 
        WHERE conventions.id=$1
        `;
    // prettier-ignore
    const getResult = await executeKyselyRawSqlQuery<{
      beneficiary_representative_id:number|null
    }>(this.transaction, getBeneficiaryRepresentativeQuery, [ id]);
    const result = getResult.rows.at(0);
    if (result) return result.beneficiary_representative_id;
    throw missingReturningRowError();
  }

  async #getEstablishmentRepresentativeId({
    convention,
    establishment_tutor_id,
  }: {
    convention: ConventionDto;
    establishment_tutor_id: number;
  }) {
    const {
      id,
      signatories: { establishmentRepresentative },
      establishmentTutor,
    } = convention;

    if (
      // Tutor and establishment representative are same person (but may have different IDs)
      isEstablishmentTutorIsEstablishmentRepresentative(convention)
    )
      return establishmentRepresentative.signedAt
        ? this.#updateEstablishmentTutor(
            id,
            establishmentTutor,
            establishmentRepresentative.signedAt,
          )
        : establishment_tutor_id;

    if (await this.#establishmentTutorAndRepresentativeHaveSameId(id)) {
      return this.#insertEstablishmentRepresentative(
        establishmentRepresentative,
      );
    }

    return this.#updateEstablishmentRepresentative(
      id,
      establishmentRepresentative,
    );
  }

  async #insertBeneficiary(
    beneficiary: Beneficiary<InternshipKind>,
  ): Promise<number> {
    const studentFields = getStudentFields(beneficiary);

    const query_insert_beneficiary = `
        INSERT into actors(first_name, last_name, email, phone, signed_at, extra_fields)
        VALUES($1, $2, $3, $4, $5, JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
            'emergencyContact', $6::text,
            'emergencyContactPhone', $7::text,
            'birthdate', $8::text,
            'emergencyContactEmail', $9::text,
            'levelOfEducation', $10::text,
            'financiaryHelp', $11::text,
            'isRqth', $12::boolean,
            'schoolName', $13::text,
            'schoolPostcode', $14::text
            )))
        RETURNING id;
      `;
    // prettier-ignore
    const insertReturn = await executeKyselyRawSqlQuery<{id:number}>(
      this.transaction,
      query_insert_beneficiary,
      [ beneficiary.firstName, beneficiary.lastName, beneficiary.email, beneficiary.phone, beneficiary.signedAt, beneficiary.emergencyContact, beneficiary.emergencyContactPhone, beneficiary.birthdate, beneficiary.emergencyContactEmail,studentFields.levelOfEducation, beneficiary.financiaryHelp, beneficiary.isRqth, studentFields.schoolName, studentFields.schoolPostcode]);
    const result = insertReturn.rows.at(0);
    if (result) return result.id;
    throw missingReturningRowError();
  }

  async #insertBeneficiaryCurrentEmployer(
    beneficiaryCurrentEmployer: BeneficiaryCurrentEmployer,
  ) {
    const query_insert_beneficiary_current_employer = `
        INSERT into actors (first_name, last_name, email, phone, signed_at, extra_fields)
        VALUES($1, $2, $3, $4, $5, JSON_STRIP_NULLS(JSON_BUILD_OBJECT('businessName', $6::text,'businessSiret', $7::text,'job', $8::text, 'businessAddress', $9::text)))
        RETURNING id;
      `;
    const insertReturn = await executeKyselyRawSqlQuery<{ id: number }>(
      this.transaction,
      query_insert_beneficiary_current_employer,
      [
        beneficiaryCurrentEmployer.firstName,
        beneficiaryCurrentEmployer.lastName,
        beneficiaryCurrentEmployer.email,
        beneficiaryCurrentEmployer.phone,
        beneficiaryCurrentEmployer.signedAt,
        beneficiaryCurrentEmployer.businessName,
        beneficiaryCurrentEmployer.businessSiret,
        beneficiaryCurrentEmployer.job,
        beneficiaryCurrentEmployer.businessAddress,
      ],
    );
    const result = insertReturn.rows.at(0);
    if (result) return result.id;
    throw missingReturningRowError();
  }

  async #insertBeneficiaryRepresentative(
    beneficiaryRepresentative: BeneficiaryRepresentative,
  ): Promise<number> {
    const query_insert_beneficiary_representative = `
        INSERT into actors (first_name, last_name, email, phone, signed_at)
        VALUES($1, $2, $3, $4, $5)
        RETURNING id;
      `;
    // prettier-ignore
    const insertReturn = await executeKyselyRawSqlQuery<{ id: number }>( this.transaction, query_insert_beneficiary_representative, [ beneficiaryRepresentative.firstName, beneficiaryRepresentative.lastName, beneficiaryRepresentative.email, beneficiaryRepresentative.phone, beneficiaryRepresentative.signedAt, ]);
    const result = insertReturn.rows.at(0);
    if (result) return result.id;
    throw missingReturningRowError();
  }

  async #insertEstablishmentRepresentative(
    establishmentRepresentative: EstablishmentRepresentative,
  ): Promise<number> {
    const query_insert_establishment_representative = `
        INSERT into actors (first_name, last_name, email, phone, signed_at)
        VALUES($1, $2, $3, $4, $5)
        RETURNING id;
      `;
    // prettier-ignore
    const insertReturn = await executeKyselyRawSqlQuery<{ id: number }>( this.transaction, query_insert_establishment_representative,[ establishmentRepresentative.firstName, establishmentRepresentative.lastName, establishmentRepresentative.email, establishmentRepresentative.phone, establishmentRepresentative.signedAt, ]);
    const result = insertReturn.rows.at(0);
    if (result) return result.id;
    throw missingReturningRowError();
  }

  async #insertEstablishmentTutor(
    establishmentTutor: EstablishmentTutor,
  ): Promise<number> {
    const query_insert_establishment_tutor = `
        INSERT into actors (first_name, last_name, email, phone, extra_fields)
        VALUES($1, $2, $3, $4, JSON_STRIP_NULLS(JSON_BUILD_OBJECT('job', $5::text)))
        RETURNING id;
      `;
    // prettier-ignore
    const insertReturn = await executeKyselyRawSqlQuery<{ id: number }>(
      this.transaction,
      query_insert_establishment_tutor,
      [ establishmentTutor.firstName, establishmentTutor.lastName, establishmentTutor.email, establishmentTutor.phone, establishmentTutor.job, ]);
    const result = insertReturn.rows.at(0);
    if (result) return result.id;
    throw missingReturningRowError();
  }

  async #insertOrUpdateBeneficiaryCurrentEmployerIfExists(
    beneficiaryCurrentEmployer: BeneficiaryCurrentEmployer | undefined,
    conventionId: ConventionId,
  ): Promise<number | null> {
    if (!beneficiaryCurrentEmployer) return null;

    const beneficiaryCurrentEmployerIdInDb =
      await this.#getBeneficiaryCurrentEmployerId(conventionId);

    return beneficiaryCurrentEmployerIdInDb === null
      ? this.#insertBeneficiaryCurrentEmployer(beneficiaryCurrentEmployer)
      : this.#updateBeneficiaryCurrentEmployer(
          conventionId,
          beneficiaryCurrentEmployer,
        );
  }

  async #insertOrUpdateBeneficiaryRepresentativeIfExists(
    beneficiaryRepresentative: BeneficiaryRepresentative | undefined,
    conventionId: ConventionId,
  ): Promise<number | null> {
    if (!beneficiaryRepresentative) return null;

    const beneficiaryRepresentativeId =
      await this.#getBeneficiaryRepresentativeId(conventionId);

    return beneficiaryRepresentativeId === null
      ? this.#insertBeneficiaryRepresentative(beneficiaryRepresentative)
      : this.#updateBeneficiaryRepresentative(
          conventionId,
          beneficiaryRepresentative,
        );
  }

  async #updateBeneficiary(
    id: ConventionId,
    beneficiary: Beneficiary<InternshipKind>,
  ) {
    const studentFields = getStudentFields(beneficiary);

    const updateBeneficiaryQuery = `  
    UPDATE actors
      SET first_name=$2,  last_name=$3, email=$4, phone=$5, signed_at=$6,
          extra_fields=JSON_STRIP_NULLS(JSON_BUILD_OBJECT(
              'emergencyContact', $7::text,
              'emergencyContactPhone', $8::text,
              'birthdate', $9::text,
              'emergencyContactEmail', $10::text,
              'levelOfEducation', $11::text,
              'financiaryHelp', $12::text,
              'isRqth', $13::boolean,
              'schoolName', $14::text,
              'schoolPostcode', $15::text
              ))
      FROM conventions 
      WHERE conventions.id=$1 AND actors.id = conventions.beneficiary_id`;
    // prettier-ignore
    await executeKyselyRawSqlQuery(
      this.transaction,
      updateBeneficiaryQuery,
      [ id, beneficiary.firstName, beneficiary.lastName, beneficiary.email, beneficiary.phone, beneficiary.signedAt, beneficiary.emergencyContact, beneficiary.emergencyContactPhone, beneficiary.birthdate, beneficiary.emergencyContactEmail, studentFields.levelOfEducation, beneficiary.financiaryHelp, beneficiary.isRqth, studentFields.schoolName, studentFields.schoolPostcode ]);
  }

  async #updateBeneficiaryCurrentEmployer(
    id: ConventionId,
    beneficiaryCurrentEmployer: BeneficiaryCurrentEmployer,
  ): Promise<number> {
    const updateBeneficiaryCurrentEmployerQuery = `  
        UPDATE actors
          SET first_name=$2,  last_name=$3, email=$4, phone=$5, signed_at=$6, extra_fields=JSON_STRIP_NULLS(JSON_BUILD_OBJECT('businessName', $7::text,'businessSiret', $8::text,'job', $9::text, 'businessAddress', $10::text))
        FROM conventions 
        WHERE conventions.id=$1 AND actors.id = conventions.${beneficiaryCurrentEmployerIdColumnName}
        RETURNING actors.id
        `;
    const updateReturn = await executeKyselyRawSqlQuery(
      this.transaction,
      updateBeneficiaryCurrentEmployerQuery,
      [
        id,
        beneficiaryCurrentEmployer.firstName,
        beneficiaryCurrentEmployer.lastName,
        beneficiaryCurrentEmployer.email,
        beneficiaryCurrentEmployer.phone,
        beneficiaryCurrentEmployer.signedAt,
        beneficiaryCurrentEmployer.businessName,
        beneficiaryCurrentEmployer.businessSiret,
        beneficiaryCurrentEmployer.job,
        beneficiaryCurrentEmployer.businessAddress,
      ],
    );
    const result = updateReturn.rows.at(0);
    if (result) return result.id;
    throw missingReturningRowError();
  }

  async #updateBeneficiaryRepresentative(
    id: ConventionId,
    beneficiaryRepresentative: BeneficiaryRepresentative,
  ) {
    const updateBeneficiaryRepresentativeQuery = `  
        UPDATE actors
          SET first_name=$2,  last_name=$3, email=$4, phone=$5, signed_at=$6
        FROM conventions 
        WHERE conventions.id=$1 AND actors.id = conventions.beneficiary_representative_id
        RETURNING actors.id`;

    // prettier-ignore
    const queryResult = await executeKyselyRawSqlQuery<{ id: number }>(
      this.transaction,
      updateBeneficiaryRepresentativeQuery,
      [ id, beneficiaryRepresentative.firstName, beneficiaryRepresentative.lastName, beneficiaryRepresentative.email, beneficiaryRepresentative.phone, beneficiaryRepresentative.signedAt, ]);
    const result = queryResult.rows.at(0);
    if (result) return result.id;
    throw missingReturningRowError();
  }

  async #updateConvention({
    convention,
    establishment_tutor_id,
    establishment_representative_id,
    beneficiary_current_employer_id,
    beneficiary_representative_id,
  }: {
    convention: ConventionDto;
    establishment_tutor_id: number;
    establishment_representative_id: number;
    beneficiary_current_employer_id: number | null;
    beneficiary_representative_id: number | null;
  }) {
    const updateConventionQuery = `  
      UPDATE conventions
        SET status=$2,  
            agency_id=$3, 
            date_submission=$4, date_start=$5, date_end=$6, date_validation=$7, 
            siret=$8,
            business_name=$9, 
            schedule=$10, individual_protection=$11, sanitary_prevention=$12, sanitary_prevention_description=$13, immersion_address=$14,
            immersion_objective=$15, immersion_appellation=$16, immersion_activities=$17, immersion_skills=$18, work_conditions=$19, status_justification=$25,
            updated_at=now(),
            establishment_tutor_id=$20, establishment_representative_id=$21, ${beneficiaryCurrentEmployerIdColumnName}=$22, ${beneficiaryRepresentativeIdColumnName}=$23, business_advantages=$24, validators=$26
      WHERE id=$1`;
    // prettier-ignore
    await executeKyselyRawSqlQuery(
      this.transaction,
      updateConventionQuery,
      [ convention.id, convention.status, convention.agencyId, convention.dateSubmission, convention.dateStart, convention.dateEnd, convention.dateValidation, convention.siret, convention.businessName, convention.schedule, convention.individualProtection, convention.sanitaryPrevention, convention.sanitaryPreventionDescription, convention.immersionAddress, convention.immersionObjective, convention.immersionAppellation.appellationCode, convention.immersionActivities, convention.immersionSkills, convention.workConditions, establishment_tutor_id,establishment_representative_id,beneficiary_current_employer_id, beneficiary_representative_id,convention.businessAdvantages,convention.statusJustification, convention.validators ]
    );
  }

  async #updateEstablishmentRepresentative(
    id: ConventionId,
    establishmentRepresentative: EstablishmentRepresentative,
  ): Promise<number> {
    const updateEstablishmentRepresentativeQuery = `  
      UPDATE actors
        SET first_name=$2, last_name=$3, email=$4, phone=$5, signed_at=$6
        FROM conventions 
        WHERE conventions.id=$1 AND actors.id = conventions.establishment_representative_id
        RETURNING actors.id
    `;
    // prettier-ignore
    const updateReturn = await executeKyselyRawSqlQuery<{ id: number }>(
      this.transaction,
      updateEstablishmentRepresentativeQuery,
      [ id, establishmentRepresentative.firstName, establishmentRepresentative.lastName, establishmentRepresentative.email, establishmentRepresentative.phone, establishmentRepresentative.signedAt, ]
    );
    const result = updateReturn.rows.at(0);
    if (result) return result.id;
    throw missingReturningRowError();
  }

  async #updateEstablishmentTutor(
    id: ConventionId,
    establishmentTutor: EstablishmentTutor,
    signedAt?: string,
  ): Promise<number> {
    const updateEstablishmentTutorQuery = `  
      UPDATE actors
        SET first_name=$2,  last_name=$3, email=$4, phone=$5, signed_at=$7,
          extra_fields=JSON_STRIP_NULLS(JSON_BUILD_OBJECT('job', $6::text))
        FROM conventions 
        WHERE conventions.id=$1 AND actors.id = conventions.establishment_tutor_id
        RETURNING actors.id
    `;
    // prettier-ignore
    const updateReturn = await executeKyselyRawSqlQuery<{ id: number }>(
      this.transaction,
      updateEstablishmentTutorQuery,
      [ id, establishmentTutor.firstName, establishmentTutor.lastName, establishmentTutor.email, establishmentTutor.phone, establishmentTutor.job, signedAt]
    );
    const result = updateReturn.rows.at(0);
    if (result) return result.id;
    throw missingReturningRowError();
  }
}
const missingReturningRowError = (): Error =>
  new Error(`Missing rows on update return`);

const getStudentFields = (
  beneficiary: Beneficiary<InternshipKind>,
):
  | Pick<
      Beneficiary<"mini-stage-cci">,
      "levelOfEducation" | "schoolName" | "schoolPostcode"
    >
  | Record<string, never> =>
  isBeneficiaryStudent(beneficiary)
    ? {
        levelOfEducation: beneficiary.levelOfEducation,
        schoolPostcode: beneficiary.schoolPostcode,
        schoolName: beneficiary.schoolName,
      }
    : {};
