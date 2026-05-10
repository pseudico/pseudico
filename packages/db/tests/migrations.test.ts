import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDatabaseConnection,
  MigrationService,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "../src";

const requiredTables = [
  "workspaces",
  "app_settings",
  "containers",
  "container_tabs",
  "items",
  "task_details",
  "list_details",
  "list_items",
  "note_details",
  "links",
  "attachments",
  "attachment_versions",
  "workflow_definitions",
  "workflow_runs",
  "container_media",
  "tags",
  "taggings",
  "categories",
  "contact_fields",
  "recurrence_rules",
  "reminder_policies",
  "reminder_events",
  "templates",
  "relationships",
  "saved_views",
  "dashboards",
  "dashboard_widgets",
  "daily_plans",
  "daily_plan_items",
  "activity_log",
  "search_index"
];

const requiredIndexes = [
  "idx_containers_workspace_type",
  "idx_container_tabs_container",
  "idx_container_tabs_visibility",
  "idx_contact_fields_container_order",
  "idx_recurrence_rules_active_task",
  "idx_recurrence_rules_workspace_next",
  "idx_reminder_policies_active_task",
  "idx_reminder_events_due",
  "idx_templates_workspace_kind",
  "idx_attachment_versions_attachment",
  "idx_workflow_definitions_workspace_status",
  "idx_workflow_runs_workspace_created",
  "idx_items_container_order",
  "idx_task_details_due",
  "idx_taggings_target",
  "idx_activity_log_workspace_created",
  "idx_search_index_target"
];

let tempRoot: string;
let connection: DatabaseConnection | null;

describe("schema migrations", () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-db-"));
    connection = await createDatabaseConnection({
      databasePath: resolveWorkspaceDatabasePath(tempRoot)
    });
  });

  afterEach(async () => {
    connection?.close();
    await rm(tempRoot, { force: true, recursive: true });
  });

  it("runs on an empty database and records schema version ten", () => {
    const service = new MigrationService({ connection: connection! });

    expect(service.runPendingMigrations()).toMatchObject({
      appliedMigrations: [
        {
          version: 1,
          name: "initial_schema",
          checksum: "pse-16-initial-schema-v1"
        },
        {
          version: 2,
          name: "contact_fields",
          checksum: "pse-68-contact-fields-v1"
        },
        {
          version: 3,
          name: "reminders",
          checksum: "pse-72-reminders-v1"
        },
        {
          version: 4,
          name: "templates",
          checksum: "pse-76-templates-v1"
        },
        {
          version: 5,
          name: "container_templates",
          checksum: "pse-77-container-templates-v1"
        },
        {
          version: 6,
          name: "recurrence",
          checksum: "pse-78-recurrence-v1"
        },
        {
          version: 7,
          name: "attachment_versions",
          checksum: "pse-80-attachment-versions-v1"
        },
        {
          version: 8,
          name: "workflows",
          checksum: "pse-81-workflows-v1"
        },
        {
          version: 9,
          name: "container_media",
          checksum: "pse-102-container-media-v1"
        },
        {
          version: 10,
          name: "tab_visibility",
          checksum: "pse-107-tab-visibility-v1"
        }
      ],
      currentVersion: 10
    });
    expect(service.getCurrentSchemaVersion()).toBe(10);
    expect(service.runPendingMigrations()).toEqual({
      appliedMigrations: [],
      currentVersion: 10
    });
  });

  it("creates required foundation tables and indexes", () => {
    new MigrationService({ connection: connection! }).runPendingMigrations();

    expect(listSqliteObjects("table")).toEqual(expect.arrayContaining(requiredTables));
    expect(listSqliteObjects("index")).toEqual(expect.arrayContaining(requiredIndexes));
  });

  it("accepts minimal workspace, container, item, and activity rows", () => {
    new MigrationService({ connection: connection! }).runPendingMigrations();

    const now = "2026-04-30T00:00:00.000Z";

    connection!.sqlite
      .prepare(
        `insert into workspaces (id, name, schema_version, created_at, updated_at)
         values (?, ?, ?, ?, ?)`
      )
      .run("workspace_1", "Personal Work", 1, now, now);
    connection!.sqlite
      .prepare(
        `insert into containers (
          id, workspace_id, type, name, slug, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?)`
      )
      .run("container_1", "workspace_1", "contact", "Alex Chen", "alex-chen", now, now);
    connection!.sqlite
      .prepare(
        `insert into contact_fields (
          id, workspace_id, container_id, label, value, type, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "contact_field_1",
        "workspace_1",
        "container_1",
        "Email",
        "alex@example.com",
        "email",
        now,
        now
      );
    connection!.sqlite
      .prepare(
        `insert into container_tabs (
          id, workspace_id, container_id, name, is_default, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?)`
      )
      .run("tab_1", "workspace_1", "container_1", "Main", 1, now, now);
    connection!.sqlite
      .prepare(
        `insert into items (
          id, workspace_id, container_id, container_tab_id, type, title, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "item_1",
        "workspace_1",
        "container_1",
        "tab_1",
        "task",
        "Draft proposal",
        now,
        now
      );
    connection!.sqlite
      .prepare(
        `insert into activity_log (
          id, workspace_id, actor_type, action, target_type, target_id, after_json, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "activity_1",
        "workspace_1",
        "system",
        "created",
        "item",
        "item_1",
        '{"title":"Draft proposal"}',
        now
      );

    expect(
      connection!.sqlite
        .prepare("select count(*) as count from activity_log where workspace_id = ?")
        .get("workspace_1")
    ).toMatchObject({ count: 1 });
    expect(
      connection!.sqlite
        .prepare("select hidden_at from container_tabs where id = ?")
        .get("tab_1")
    ).toMatchObject({ hidden_at: null });
    expect(
      connection!.sqlite
        .prepare("select count(*) as count from contact_fields where workspace_id = ?")
        .get("workspace_1")
    ).toMatchObject({ count: 1 });
  });

  it("enforces foreign keys for item container ownership", () => {
    new MigrationService({ connection: connection! }).runPendingMigrations();

    const now = "2026-04-30T00:00:00.000Z";
    connection!.sqlite
      .prepare(
        `insert into workspaces (id, name, schema_version, created_at, updated_at)
         values (?, ?, ?, ?, ?)`
      )
      .run("workspace_1", "Personal Work", 1, now, now);

    expect(() => {
      connection!.sqlite
        .prepare(
          `insert into items (
            id, workspace_id, container_id, type, title, created_at, updated_at
          ) values (?, ?, ?, ?, ?, ?, ?)`
        )
        .run("item_1", "workspace_1", "missing_container", "task", "Bad task", now, now);
    }).toThrow();
  });
});

function listSqliteObjects(type: "index" | "table"): string[] {
  return (
    connection!.sqlite
      .prepare("select name from sqlite_master where type = ? order by name")
      .all(type) as Array<{ name: string }>
  ).map((row) => row.name);
}
