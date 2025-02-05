import { values } from "ramda";
import { InclusionConnectedUserBuilder, UserBuilder } from "shared";
import { KyselyDb } from "../../config/pg/kysely/kyselyUtils";

export const seedUsers = {
  icUser: new InclusionConnectedUserBuilder()
    .withIsAdmin(false)
    .withCreatedAt(new Date("2024-04-29"))
    .withEmail("recette+playwright@immersion-facile.beta.gouv.fr")
    .withFirstName("Prénom IcUser")
    .withLastName("Nom IcUser")
    .withId("e9dce090-f45e-46ce-9c58-4fbbb3e494ba")
    .withExternalId("e9dce090-f45e-46ce-9c58-4fbbb3e494ba")
    .build(),
  adminUser: new InclusionConnectedUserBuilder()
    .withIsAdmin(true)
    .withCreatedAt(new Date("2024-04-30"))
    .withEmail("admin+playwright@immersion-facile.beta.gouv.fr")
    .withFirstName("Prénom Admin")
    .withLastName("Nom Admin")
    .withId("7f5cfde7-80b3-4ea1-bf3e-1711d0876161")
    .withExternalId("7f5cfde7-80b3-4ea1-bf3e-1711d0876161")
    .build(),
  franceMerguezUser: new UserBuilder()
    .withId("11111111-2222-4000-2222-111111111111")
    .withFirstName("Daniella")
    .withLastName("Velàzquez")
    .withEmail("recette+merguez@immersion-facile.beta.gouv.fr")
    .build(),
  decathlonUser: new UserBuilder()
    .withId("cccccccc-cccc-4000-cccc-cccccccccccc")
    .withEmail("decathlon@mail.com")
    .build(),
};

export const userSeed = async (db: KyselyDb) => {
  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log("inclusionConnectUserSeed start ...");

  await db
    .insertInto("users")
    .values(
      values(seedUsers).map((user) => ({
        id: user.id,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        inclusion_connect_sub: user.externalId,
        pro_connect_sub: null,
        created_at: user.createdAt,
      })),
    )
    .execute();

  await db
    .insertInto("users_admins")
    .values({
      user_id: seedUsers.adminUser.id,
    })
    .execute();

  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log("inclusionConnectUserSeed end");
};
