import { existsSync } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  createDatabaseConnection,
  MigrationService,
  migrations,
  type DatabaseConnection,
  type MigrationRunResult
} from "../src";
import type { MigrationFixtureDefinition } from "./migrationFixtures";

export type MigrationFixtureRunResult = {
  fixture: MigrationFixtureDefinition;
  databasePath: string;
  backupsDirectoryPath: string;
  migrationResult: MigrationRunResult;
};

export async function createMigrationFixtureDatabase(input: {
  fixture: MigrationFixtureDefinition;
  databasePath: string;
}): Promise<void> {
  await mkdir(dirname(input.databasePath), { recursive: true });

  const connection = await createDatabaseConnection({
    databasePath: input.databasePath
  });

  try {
    new MigrationService({
      connection,
      migrations: migrations.filter(
        (migration) => migration.version <= input.fixture.version
      ),
      now: () => new Date("2026-05-14T00:00:00.000Z")
    }).runPendingMigrations();
    input.fixture.seed(connection);
    connection.sqlite.pragma("wal_checkpoint(FULL)");
  } finally {
    connection.close();
  }
}

export async function runMigrationFixture(input: {
  fixture: MigrationFixtureDefinition;
  workspaceRootPath: string;
}): Promise<MigrationFixtureRunResult> {
  const databasePath = join(
    input.workspaceRootPath,
    "data",
    "local-work-os.sqlite"
  );
  const backupsDirectoryPath = join(input.workspaceRootPath, "backups");

  await createMigrationFixtureDatabase({
    fixture: input.fixture,
    databasePath
  });
  await mkdir(backupsDirectoryPath, { recursive: true });

  const connection = await createDatabaseConnection({
    databasePath,
    fileMustExist: true
  });

  let migrationResult: MigrationRunResult;

  try {
    migrationResult = new MigrationService({
      connection,
      now: () => new Date("2026-05-14T01:00:00.000Z")
    }).runPendingMigrations({
      backupBeforeMigration: {
        backupsDirectoryPath,
        label: input.fixture.name
      }
    });
    input.fixture.assertUpgraded(connection);
  } finally {
    connection.close();
  }

  return {
    fixture: input.fixture,
    databasePath,
    backupsDirectoryPath,
    migrationResult
  };
}

export async function assertMigrationBackup(input: {
  result: MigrationFixtureRunResult;
  expectedVersion: number;
}): Promise<void> {
  const backupPath = input.result.migrationResult.backup?.path;

  if (backupPath === undefined) {
    throw new Error("Expected migration fixture run to create a backup.");
  }

  if (!existsSync(backupPath)) {
    throw new Error(`Expected migration backup to exist: ${backupPath}`);
  }

  const connection = await createDatabaseConnection({
    databasePath: backupPath,
    fileMustExist: true,
    readonly: true
  });

  try {
    const version = new MigrationService({
      connection,
      migrations: migrations.filter(
        (migration) => migration.version <= input.expectedVersion
      )
    }).getCurrentSchemaVersion();

    if (version !== input.expectedVersion) {
      throw new Error(
        `Expected backup schema version ${input.expectedVersion}, received ${version}.`
      );
    }
  } finally {
    connection.close();
  }
}

export async function cleanupMigrationFixtureWorkspace(
  workspaceRootPath: string
): Promise<void> {
  if (!workspaceRootPath.includes("local-work-os-migration-fixture-")) {
    throw new Error(
      "Refusing to clean up a path that does not look like a migration fixture workspace."
    );
  }

  await rm(workspaceRootPath, { force: true, recursive: true });
}

export function readMigrationVersion(connection: DatabaseConnection): number {
  return new MigrationService({ connection }).getCurrentSchemaVersion();
}
