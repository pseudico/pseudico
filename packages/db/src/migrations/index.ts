import { initialSchemaSql } from "./0001_initial_schema";
import { contactFieldsSql } from "./0002_contact_fields";
import type { MigrationDefinition } from "../services/MigrationService";

export const migrations: MigrationDefinition[] = [
  {
    version: 1,
    name: "initial_schema",
    sql: initialSchemaSql,
    checksum: "pse-16-initial-schema-v1"
  },
  {
    version: 2,
    name: "contact_fields",
    sql: contactFieldsSql,
    checksum: "pse-68-contact-fields-v1"
  }
];
