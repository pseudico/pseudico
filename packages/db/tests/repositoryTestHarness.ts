import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createDatabaseConnection,
  MigrationService,
  resolveWorkspaceDatabasePath,
  WorkspaceRepository,
  type DatabaseConnection
} from "../src";

export const TEST_TIMESTAMP = "2026-04-30T00:00:00.000Z";
export const TEST_TIMESTAMP_LATER = "2026-04-30T01:00:00.000Z";

export type RepositoryTestDatabase = {
  connection: DatabaseConnection;
  cleanup: () => Promise<void>;
};

export async function createRepositoryTestDatabase(): Promise<RepositoryTestDatabase> {
  const tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-repository-"));
  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(tempRoot)
  });

  new MigrationService({ connection }).runPendingMigrations();

  return {
    connection,
    cleanup: async () => {
      connection.close();
      await rm(tempRoot, { force: true, recursive: true });
    }
  };
}

export function seedWorkspace(connection: DatabaseConnection, id = "workspace_1"): void {
  new WorkspaceRepository(connection).create({
    id,
    name: "Personal Work",
    schemaVersion: 1,
    timestamp: TEST_TIMESTAMP
  });
}
