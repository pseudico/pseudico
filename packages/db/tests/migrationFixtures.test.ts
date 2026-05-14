import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDatabaseConnection, migrations, MigrationService } from "../src";
import { migrationFixtures } from "./migrationFixtures";
import {
  assertMigrationBackup,
  cleanupMigrationFixtureWorkspace,
  runMigrationFixture
} from "./migrationTestRunner";

let workspaceRoots: string[] = [];

describe("migration fixtures", () => {
  afterEach(async () => {
    await Promise.all(workspaceRoots.map(cleanupMigrationFixtureWorkspace));
    workspaceRoots = [];
  });

  for (const fixture of migrationFixtures) {
    it(`upgrades ${fixture.name} to the current schema and preserves data`, async () => {
      const workspaceRootPath = await mkdtemp(
        join(tmpdir(), "local-work-os-migration-fixture-")
      );
      workspaceRoots.push(workspaceRootPath);

      const result = await runMigrationFixture({
        fixture,
        workspaceRootPath
      });

      expect(result.migrationResult.currentVersion).toBe(
        migrations.at(-1)?.version
      );
      expect(result.migrationResult.appliedMigrations.map((migration) => migration.version))
        .toEqual(
          migrations
            .filter((migration) => migration.version > fixture.version)
            .map((migration) => migration.version)
        );
      expect(result.migrationResult.backup).toMatchObject({
        fromVersion: fixture.version,
        toVersion: migrations.at(-1)?.version
      });
      await assertMigrationBackup({
        result,
        expectedVersion: fixture.version
      });

      const connection = await createDatabaseConnection({
        databasePath: result.databasePath,
        fileMustExist: true,
        readonly: true
      });

      try {
        expect(new MigrationService({ connection }).getCurrentSchemaVersion()).toBe(
          migrations.at(-1)?.version
        );
      } finally {
        connection.close();
      }
    });
  }
});
