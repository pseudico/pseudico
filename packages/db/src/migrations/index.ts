import { initialSchemaSql } from "./0001_initial_schema";
import { contactFieldsSql } from "./0002_contact_fields";
import { remindersSql } from "./0003_reminders";
import { templatesSql } from "./0004_templates";
import { containerTemplatesSql } from "./0005_container_templates";
import { recurrenceSql } from "./0006_recurrence";
import { attachmentVersionsSql } from "./0007_attachment_versions";
import { workflowsSql } from "./0008_workflows";
import { containerMediaSql } from "./0009_container_media";
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
  },
  {
    version: 3,
    name: "reminders",
    sql: remindersSql,
    checksum: "pse-72-reminders-v1"
  },
  {
    version: 4,
    name: "templates",
    sql: templatesSql,
    checksum: "pse-76-templates-v1"
  },
  {
    version: 5,
    name: "container_templates",
    sql: containerTemplatesSql,
    checksum: "pse-77-container-templates-v1"
  },
  {
    version: 6,
    name: "recurrence",
    sql: recurrenceSql,
    checksum: "pse-78-recurrence-v1"
  },
  {
    version: 7,
    name: "attachment_versions",
    sql: attachmentVersionsSql,
    checksum: "pse-80-attachment-versions-v1"
  },
  {
    version: 8,
    name: "workflows",
    sql: workflowsSql,
    checksum: "pse-81-workflows-v1"
  },
  {
    version: 9,
    name: "container_media",
    sql: containerMediaSql,
    checksum: "pse-102-container-media-v1"
  }
];
