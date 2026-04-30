import { mkdtemp, rm } from "node:fs/promises";
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
});
