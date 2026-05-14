import type { DatabaseConnection } from "../src";
import { expect } from "vitest";

export type MigrationFixtureDefinition = {
  name: string;
  version: number;
  seed: (connection: DatabaseConnection) => void;
  assertUpgraded: (connection: DatabaseConnection) => void;
};

const timestamp = "2026-05-14T00:00:00.000Z";

export const migrationFixtures: MigrationFixtureDefinition[] = [
  {
    name: "v1 foundation workspace with task data",
    version: 1,
    seed: (connection) => {
      seedFoundationRows(connection, 1);
    },
    assertUpgraded: (connection) => {
      expectRow(connection, "workspaces", "workspace_fixture", {
        name: "Fixture Workspace",
        schema_version: 1
      });
      expectRow(connection, "containers", "container_project", {
        type: "project",
        name: "Migration Project"
      });
      expectRow(connection, "items", "item_task", {
        type: "task",
        title: "Preserve migrated task"
      });
      expectRowByKey(connection, "task_details", "item_id", "item_task", {
        task_status: "open",
        due_at: "2026-05-20T09:00:00.000Z"
      });
      expect(countRows(connection, "comments")).toBe(0);
      expect(tableExists(connection, "imap_import_jobs")).toBe(true);
    }
  },
  {
    name: "v8 workflow and attachment version data",
    version: 8,
    seed: (connection) => {
      seedFoundationRows(connection, 8);
      seedAttachmentVersionRows(connection);
      seedWorkflowRows(connection);
    },
    assertUpgraded: (connection) => {
      expectRow(connection, "attachments", "attachment_fixture", {
        original_name: "proposal.pdf",
        storage_path: "attachments/proposal.pdf"
      });
      expectRow(connection, "attachment_versions", "attachment_version_fixture", {
        attachment_id: "attachment_fixture",
        version_number: 1,
        checksum: "fixture-checksum-v1"
      });
      expectRow(connection, "workflow_definitions", "workflow_fixture", {
        trigger_type: "manual",
        status: "enabled"
      });
      expectRow(connection, "workflow_runs", "workflow_run_fixture", {
        trigger_type: "manual",
        status: "completed",
        rollback_status: null
      });
      expect(tableExists(connection, "container_media")).toBe(true);
      expect(tableExists(connection, "imap_imported_messages")).toBe(true);
    }
  },
  {
    name: "v20 comments calendar and rollback metadata",
    version: 20,
    seed: (connection) => {
      seedFoundationRows(connection, 20);
      seedCommentRows(connection);
      seedCalendarRows(connection);
      seedWorkflowRows(connection, {
        rollbackStatus: "not_available",
        rollbackActivityIdsJson: "[]"
      });
    },
    assertUpgraded: (connection) => {
      expectRow(connection, "comments", "comment_fixture", {
        target_type: "item",
        target_id: "item_task",
        body: "Preserve local comment"
      });
      expectRow(connection, "calendar_sources", "calendar_source_fixture", {
        source_type: "file",
        network_enabled: 0
      });
      expectRow(connection, "calendar_events", "calendar_event_fixture", {
        external_uid: "fixture-event@example.test",
        title: "Fixture calendar event"
      });
      expectRow(connection, "workflow_runs", "workflow_run_fixture", {
        rollback_status: "not_available",
        rollback_activity_ids_json: "[]"
      });
      expect(tableExists(connection, "imap_import_jobs")).toBe(true);
    }
  }
];

function seedFoundationRows(
  connection: DatabaseConnection,
  schemaVersion: number
): void {
  connection.sqlite
    .prepare(
      `insert into workspaces (id, name, schema_version, created_at, updated_at)
       values (?, ?, ?, ?, ?)`
    )
    .run(
      "workspace_fixture",
      "Fixture Workspace",
      schemaVersion,
      timestamp,
      timestamp
    );
  connection.sqlite
    .prepare(
      `insert into containers (
        id, workspace_id, type, name, slug, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "container_project",
      "workspace_fixture",
      "project",
      "Migration Project",
      "migration-project",
      timestamp,
      timestamp
    );
  connection.sqlite
    .prepare(
      `insert into container_tabs (
        id, workspace_id, container_id, name, is_default, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "tab_main",
      "workspace_fixture",
      "container_project",
      "Main",
      1,
      timestamp,
      timestamp
    );
  connection.sqlite
    .prepare(
      `insert into items (
        id, workspace_id, container_id, container_tab_id, type, title, body, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "item_task",
      "workspace_fixture",
      "container_project",
      "tab_main",
      "task",
      "Preserve migrated task",
      "Task body survives migration.",
      timestamp,
      timestamp
    );
  connection.sqlite
    .prepare(
      `insert into task_details (
        item_id, workspace_id, task_status, due_at, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?)`
    )
    .run(
      "item_task",
      "workspace_fixture",
      "open",
      "2026-05-20T09:00:00.000Z",
      timestamp,
      timestamp
    );
  connection.sqlite
    .prepare(
      `insert into activity_log (
        id, workspace_id, actor_type, action, target_type, target_id, after_json, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "activity_fixture",
      "workspace_fixture",
      "system",
      "fixture_seeded",
      "workspace",
      "workspace_fixture",
      "{}",
      timestamp
    );
}

function seedAttachmentVersionRows(connection: DatabaseConnection): void {
  connection.sqlite
    .prepare(
      `insert into items (
        id, workspace_id, container_id, container_tab_id, type, title, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "item_file",
      "workspace_fixture",
      "container_project",
      "tab_main",
      "file",
      "Proposal PDF",
      timestamp,
      timestamp
    );
  connection.sqlite
    .prepare(
      `insert into attachments (
        id, workspace_id, item_id, original_name, stored_name, size_bytes, checksum, storage_path, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "attachment_fixture",
      "workspace_fixture",
      "item_file",
      "proposal.pdf",
      "proposal.pdf",
      128,
      "fixture-checksum-current",
      "attachments/proposal.pdf",
      timestamp,
      timestamp
    );
  connection.sqlite
    .prepare(
      `insert into attachment_versions (
        id, workspace_id, attachment_id, version_number, original_name, stored_name, size_bytes, checksum, storage_path, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "attachment_version_fixture",
      "workspace_fixture",
      "attachment_fixture",
      1,
      "proposal.pdf",
      "proposal-v1.pdf",
      128,
      "fixture-checksum-v1",
      "attachments/versions/proposal-v1.pdf",
      timestamp
    );
}

function seedWorkflowRows(
  connection: DatabaseConnection,
  input: {
    rollbackStatus?: string;
    rollbackActivityIdsJson?: string;
  } = {}
): void {
  connection.sqlite
    .prepare(
      `insert into workflow_definitions (
        id, workspace_id, name, trigger_type, status, actions_json, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "workflow_fixture",
      "workspace_fixture",
      "Fixture workflow",
      "manual",
      "enabled",
      "[]",
      timestamp,
      timestamp
    );

  const hasRollbackColumns = columnExists(
    connection,
    "workflow_runs",
    "rollback_status"
  );

  if (hasRollbackColumns) {
    connection.sqlite
      .prepare(
        `insert into workflow_runs (
          id, workspace_id, workflow_definition_id, trigger_type, status, preview_json,
          action_results_json, started_at, completed_at, created_at,
          rollback_status, rollback_activity_ids_json
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "workflow_run_fixture",
        "workspace_fixture",
        "workflow_fixture",
        "manual",
        "completed",
        "{}",
        "[]",
        timestamp,
        timestamp,
        timestamp,
        input.rollbackStatus ?? null,
        input.rollbackActivityIdsJson ?? null
      );
    return;
  }

  connection.sqlite
    .prepare(
      `insert into workflow_runs (
        id, workspace_id, workflow_definition_id, trigger_type, status, preview_json,
        action_results_json, started_at, completed_at, created_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "workflow_run_fixture",
      "workspace_fixture",
      "workflow_fixture",
      "manual",
      "completed",
      "{}",
      "[]",
      timestamp,
      timestamp,
      timestamp
    );
}

function seedCommentRows(connection: DatabaseConnection): void {
  connection.sqlite
    .prepare(
      `insert into comments (
        id, workspace_id, target_type, target_id, body, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "comment_fixture",
      "workspace_fixture",
      "item",
      "item_task",
      "Preserve local comment",
      timestamp,
      timestamp
    );
}

function seedCalendarRows(connection: DatabaseConnection): void {
  connection.sqlite
    .prepare(
      `insert into calendar_sources (
        id, workspace_id, name, source_type, source_path, imported_at, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "calendar_source_fixture",
      "workspace_fixture",
      "Fixture Calendar",
      "file",
      "imports/calendar.ics",
      timestamp,
      timestamp,
      timestamp
    );
  connection.sqlite
    .prepare(
      `insert into calendar_events (
        id, workspace_id, source_id, external_uid, title, start_at, end_at, raw_json, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "calendar_event_fixture",
      "workspace_fixture",
      "calendar_source_fixture",
      "fixture-event@example.test",
      "Fixture calendar event",
      "2026-05-21T09:00:00.000Z",
      "2026-05-21T10:00:00.000Z",
      "{}",
      timestamp,
      timestamp
    );
}

function countRows(connection: DatabaseConnection, tableName: string): number {
  const row = connection.sqlite
    .prepare<[], { count: number }>(`select count(*) as count from ${tableName}`)
    .get();

  return row?.count ?? 0;
}

function tableExists(connection: DatabaseConnection, tableName: string): boolean {
  const row = connection.sqlite
    .prepare<[string], { name: string }>(
      "select name from sqlite_master where type = 'table' and name = ?"
    )
    .get(tableName);

  return row !== undefined;
}

function columnExists(
  connection: DatabaseConnection,
  tableName: string,
  columnName: string
): boolean {
  const columns = connection.sqlite
    .prepare<[], { name: string }>(`pragma table_info(${tableName})`)
    .all();

  return columns.some((column) => column.name === columnName);
}

function expectRow(
  connection: DatabaseConnection,
  tableName: string,
  id: string,
  expected: Record<string, unknown>
): void {
  expectRowByKey(connection, tableName, "id", id, expected);
}

function expectRowByKey(
  connection: DatabaseConnection,
  tableName: string,
  keyColumn: string,
  keyValue: string,
  expected: Record<string, unknown>
): void {
  const row = connection.sqlite
    .prepare<[string], Record<string, unknown>>(
      `select * from ${tableName} where ${keyColumn} = ?`
    )
    .get(keyValue);

  expect(row).toMatchObject(expected);
}
