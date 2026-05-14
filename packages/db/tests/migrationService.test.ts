import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDatabaseConnection,
  MigrationService,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type MigrationDefinition
} from "../src";

let tempRoot: string;
let connection: DatabaseConnection | null;

async function openConnection(): Promise<DatabaseConnection> {
  return createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(tempRoot)
  });
}

describe("MigrationService", () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-db-"));
    connection = await openConnection();
  });

  afterEach(async () => {
    connection?.close();
    await rm(tempRoot, { force: true, recursive: true });
  });

  it("reports version zero and no pending migrations on an empty DB", () => {
    expect(connection).not.toBeNull();
    const service = new MigrationService({ connection: connection!, migrations: [] });

    expect(service.getCurrentSchemaVersion()).toBe(0);
    expect(service.getMigrationStatus()).toEqual({
      currentVersion: 0,
      latestVersion: 0,
      appliedMigrations: [],
      pendingMigrations: []
    });
    expect(service.runPendingMigrations()).toEqual({
      appliedMigrations: [],
      currentVersion: 0
    });
  });

  it("runs pending SQL migrations transactionally and records status", () => {
    const migrations: MigrationDefinition[] = [
      {
        version: 1,
        name: "create_test_table",
        sql: "create table test_records (id text primary key);",
        checksum: "test-checksum"
      }
    ];
    const service = new MigrationService({
      connection: connection!,
      migrations,
      now: () => new Date("2026-04-30T00:00:00.000Z")
    });

    expect(service.getMigrationStatus().pendingMigrations).toEqual(migrations);
    expect(service.runPendingMigrations()).toEqual({
      appliedMigrations: [
        {
          version: 1,
          name: "create_test_table",
          appliedAt: "2026-04-30T00:00:00.000Z",
          checksum: "test-checksum"
        }
      ],
      currentVersion: 1
    });
    expect(service.getCurrentSchemaVersion()).toBe(1);
    expect(
      connection.sqlite
        .prepare("select name from sqlite_master where type = 'table' and name = ?")
        .get("test_records")
    ).toMatchObject({ name: "test_records" });
    expect(service.getMigrationStatus().pendingMigrations).toEqual([]);
  });

  it("creates a backup before migrating an existing older database", async () => {
    const migrations: MigrationDefinition[] = [
      {
        version: 1,
        name: "create_test_table",
        sql: "create table test_records (id text primary key, name text not null);",
        checksum: "test-checksum-v1"
      },
      {
        version: 2,
        name: "add_test_record_flag",
        sql: "alter table test_records add column flagged integer not null default 0;",
        checksum: "test-checksum-v2"
      }
    ];

    new MigrationService({
      connection: connection!,
      migrations: [migrations[0]!],
      now: () => new Date("2026-04-30T00:00:00.000Z")
    }).runPendingMigrations();
    connection!.sqlite
      .prepare("insert into test_records (id, name) values (?, ?)")
      .run("record_1", "Existing data");

    const backupsDirectoryPath = join(tempRoot, "backups");
    await mkdir(backupsDirectoryPath, { recursive: true });

    const result = new MigrationService({
      connection: connection!,
      migrations,
      now: () => new Date("2026-05-01T00:00:00.000Z")
    }).runPendingMigrations({
      backupBeforeMigration: {
        backupsDirectoryPath,
        label: "test upgrade"
      }
    });

    expect(result.currentVersion).toBe(2);
    expect(result.backup).toMatchObject({
      fromVersion: 1,
      toVersion: 2,
      createdAt: "2026-05-01T00:00:00.000Z"
    });
    expect(result.backup?.path).toContain("local-work-os-test-upgrade-v1-to-v2");
    expect(existsSync(result.backup!.path)).toBe(true);
    expect(
      connection!.sqlite.prepare("select flagged from test_records where id = ?").get(
        "record_1"
      )
    ).toMatchObject({ flagged: 0 });

    const backupConnection = await createDatabaseConnection({
      databasePath: result.backup!.path,
      fileMustExist: true,
      readonly: true
    });

    try {
      expect(
        backupConnection.sqlite
          .prepare("select name from test_records where id = ?")
          .get("record_1")
      ).toMatchObject({ name: "Existing data" });
      expect(() =>
        backupConnection.sqlite.prepare("select flagged from test_records").all()
      ).toThrow();
    } finally {
      backupConnection.close();
    }
  });

  it("refuses to run when a workspace was migrated by a newer app version", () => {
    connection!.sqlite.exec(`
      create table local_work_os_migrations (
        version integer primary key,
        name text not null,
        applied_at text not null,
        checksum text
      );
    `);
    connection!.sqlite
      .prepare(
        `insert into local_work_os_migrations (version, name, applied_at, checksum)
         values (?, ?, ?, ?)`
      )
      .run(999, "future_schema", "2026-05-01T00:00:00.000Z", "future");

    const service = new MigrationService({
      connection: connection!,
      migrations: [
        {
          version: 1,
          name: "supported_schema",
          sql: "create table supported (id text primary key);"
        }
      ]
    });

    expect(() => service.getMigrationStatus()).toThrow(
      "Workspace schema version 999 is newer than this app supports (latest 1); refusing to migrate."
    );
    expect(() => service.runPendingMigrations()).toThrow(
      "Workspace schema version 999 is newer than this app supports (latest 1); refusing to migrate."
    );
  });
});
