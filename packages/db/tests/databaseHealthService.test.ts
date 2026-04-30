import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDatabaseConnection,
  DatabaseHealthService,
  MigrationService,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "../src";

let tempRoot: string;
let connection: DatabaseConnection | null;

describe("DatabaseHealthService", () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-db-"));
    connection = null;
  });

  afterEach(async () => {
    connection?.close();
    await rm(tempRoot, { force: true, recursive: true });
  });

  it("reports disconnected state when no database is available", async () => {
    await expect(new DatabaseHealthService().getHealthReport()).resolves.toEqual({
      connected: false,
      databasePath: null,
      schemaVersion: null,
      migrationTableAvailable: false,
      pendingMigrationCount: null,
      error: "No database connection or path is available."
    });
  });

  it("reports pending migration health for a valid un-migrated connection", async () => {
    connection = await createDatabaseConnection({
      databasePath: resolveWorkspaceDatabasePath(tempRoot)
    });

    await expect(
      new DatabaseHealthService({ connection }).getHealthReport()
    ).resolves.toEqual({
      connected: true,
      databasePath: connection.databasePath,
      schemaVersion: 0,
      migrationTableAvailable: true,
      pendingMigrationCount: 1,
      error: null
    });
  });

  it("reports schema version after migrations run", async () => {
    connection = await createDatabaseConnection({
      databasePath: resolveWorkspaceDatabasePath(tempRoot)
    });
    new MigrationService({ connection }).runPendingMigrations();

    await expect(
      new DatabaseHealthService({ connection }).getHealthReport()
    ).resolves.toEqual({
      connected: true,
      databasePath: connection.databasePath,
      schemaVersion: 1,
      migrationTableAvailable: true,
      pendingMigrationCount: 0,
      error: null
    });
  });

  it("does not create a missing database during path-only health checks", async () => {
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);

    const health = await new DatabaseHealthService({ databasePath }).getHealthReport();

    expect(health).toMatchObject({
      connected: false,
      databasePath,
      schemaVersion: null,
      migrationTableAvailable: false,
      pendingMigrationCount: null
    });
  });
});
