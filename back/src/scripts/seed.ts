import { AppConfig } from "../config/bootstrap/appConfig";
import {
  AppDependencies,
  createAppDependencies,
} from "../config/bootstrap/createAppDependencies";
import { KyselyDb, makeKyselyDb } from "../config/pg/kysely/kyselyUtils";
import { agencySeed } from "./seed/agencySeed";
import { conventionSeed } from "./seed/conventionSeed";
import { establishmentSeed } from "./seed/establishmentSeed";
import { featureFlagsSeed } from "./seed/featureFlagSeed";
import { userSeed } from "./seed/userSeed";

const executeSeedTasks = async (db: KyselyDb, deps: AppDependencies) => {
  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log("Seed start");

  await userSeed(db);

  await deps.uowPerformer.perform(async (uow) => {
    await featureFlagsSeed(uow);
    const agencyIds = await agencySeed(uow);
    await establishmentSeed(uow);
    await conventionSeed(uow, agencyIds);
  });

  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log("Seed end");
};

const resetDb = async (db: KyselyDb) => {
  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log("Reset Db start");

  await db.deleteFrom("immersion_assessments").execute();
  await db.deleteFrom("api_consumers_subscriptions").execute();
  await db.deleteFrom("api_consumers").execute();
  await db.deleteFrom("users_ongoing_oauths").execute();
  await db.deleteFrom("users").execute();
  await db.deleteFrom("users_admins").execute();
  await db.deleteFrom("conventions").execute();
  await db.deleteFrom("agency_groups__agencies").execute();
  await db.deleteFrom("agency_groups").execute();
  await db.deleteFrom("agencies").execute();
  await db.deleteFrom("discussions").execute();
  await db.deleteFrom("establishments__users").execute();
  await db.deleteFrom("establishments").execute();
  await db.deleteFrom("groups").execute();
  await db.deleteFrom("feature_flags").execute();
  await db.deleteFrom("notifications_email_recipients").execute();
  await db.deleteFrom("notifications_email_attachments").execute();
  await db.deleteFrom("notifications_email").execute();
  await db.deleteFrom("notifications_sms").execute();
  await db.deleteFrom("outbox_failures").execute();
  await db.deleteFrom("outbox_publications").execute();
  await db.deleteFrom("outbox").execute();

  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log("Reset Db done");
};

const seed = async () => {
  const deps = await createAppDependencies(AppConfig.createFromEnv());
  const pool = deps.getPgPoolFn();
  const db = makeKyselyDb(pool);

  await resetDb(db);
  await executeSeedTasks(db, deps);

  await pool.end();
  await deps.gateways.disconnectCache();

  // biome-ignore lint/suspicious/noConsoleLog: <explanation>
  console.log("Pool end");
};

seed()
  .then(() => {
    // biome-ignore lint/suspicious/noConsoleLog: <explanation>
    console.log("Seeding script ended !");
  })
  .catch((err) => {
    console.error("Something went wrong with seed script : ", err);
    process.exit(1);
  });

// un lien rapide pour pas remplir le formulaire à la main en local (avec le siret france merguez, et l'agence pole emploi paris défini dans cette seed)
// http://localhost:3000/demande-immersion?email=john.doe%40mail.mo&firstName=John&lastName=Doe&phone=0202020202&financiaryHelp=&emergencyContact=&emergencyContactPhone=&isRqth=false&birthdate=2000-10-10&agencyDepartment=75&siret=34493368400021&businessName=FRANCE%20MERGUEZ%20DISTRIBUTION&businessAdvantages=&etFirstName=Bob&etLastName=Le%20tuteur&etJob=Tuteur&etPhone=0303030303&etEmail=bob.letuteur%40mail.com&erFirstName=Bob&erLastName=Le%20tuteur&erPhone=0303030303&erEmail=bob.letuteur%40mail.com&immersionAddress=ZI%20VILLETANEUSE%206%20RUE%20RAYMOND%20BROSSE%2093430%20VILLETANEUSE&agencyId=aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa&immersionObjective=Confirmer%20un%20projet%20professionnel&immersionActivities=Charcuttage%20de%20comp%C3%AAt.&immersionSkills=&sanitaryPreventionDescription=&workConditions=&sanitaryPrevention=false&individualProtection=false&dateStart=2023-06-09&dateEnd=2023-06-10T00%3A00%3A00.000Z&schedule=%7B%22totalHours%22%3A6%2C%22workedDays%22%3A2%2C%22isSimple%22%3Atrue%2C%22selectedIndex%22%3A0%2C%22complexSchedule%22%3A%5B%7B%22date%22%3A%222023-06-09T00%3A00%3A00.000Z%22%2C%22timePeriods%22%3A%5B%7B%22start%22%3A%2209%3A00%22%2C%22end%22%3A%2212%3A00%22%7D%5D%7D%2C%7B%22date%22%3A%222023-06-10T00%3A00%3A00.000Z%22%2C%22timePeriods%22%3A%5B%7B%22start%22%3A%2209%3A00%22%2C%22end%22%3A%2212%3A00%22%7D%5D%7D%5D%7D&immersionAppellation=%7B%22romeCode%22%3A%22D1103%22%2C%22romeLabel%22%3A%22Charcuterie%20-%20traiteur%22%2C%22appellationCode%22%3A%2211741%22%2C%22appellationLabel%22%3A%22Charcutier%20%2F%20Charcuti%C3%A8re%22%7D
