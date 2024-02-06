import { AuthenticatedUser } from "shared";
import { AuthenticatedUserRepository } from "../../../../domain/generic/OAuth/ports/AuthenticatedUserRepositiory";
import { KyselyDb, executeKyselyRawSqlQuery } from "../kysely/kyselyUtils";

type PersistenceAuthenticatedUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
};

export class PgAuthenticatedUserRepository
  implements AuthenticatedUserRepository
{
  constructor(private transaction: KyselyDb) {}

  public async findByEmail(
    email: string,
  ): Promise<AuthenticatedUser | undefined> {
    const response =
      await executeKyselyRawSqlQuery<PersistenceAuthenticatedUser>(
        this.transaction,
        `
      SELECT * FROM authenticated_users WHERE email = $1
      `,
        [email],
      );
    return toAuthenticatedUser(response.rows[0]);
  }

  public async save(user: AuthenticatedUser): Promise<void> {
    const { id, email, firstName, lastName } = user;
    const existingUser = await this.findByEmail(user.email);
    if (existingUser) {
      if (
        existingUser.firstName === firstName &&
        existingUser.lastName === lastName
      )
        return;

      await executeKyselyRawSqlQuery(
        this.transaction,
        `
        UPDATE authenticated_users
        SET first_name=$2, last_name=$3, updated_at=now()
        WHERE email=$1
        `,
        [email, firstName, lastName],
      );
    } else {
      await executeKyselyRawSqlQuery(
        this.transaction,
        `
      INSERT INTO authenticated_users(id, email, first_name, last_name) VALUES ($1, $2, $3, $4 )
      `,
        [id, email, firstName, lastName],
      );
    }
  }
}

const toAuthenticatedUser = (
  raw?: PersistenceAuthenticatedUser,
): AuthenticatedUser | undefined =>
  raw && {
    id: raw.id,
    email: raw.email,
    firstName: raw.first_name,
    lastName: raw.last_name,
  };
