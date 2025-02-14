/* eslint-disable @typescript-eslint/naming-convention */
import { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.renameTable("form_establishments", "__to_delete__form_establishments");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.renameTable("__to_delete__form_establishments", "form_establishments");
}
