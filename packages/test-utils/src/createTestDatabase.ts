import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type TestDatabaseHandle = {
  workspaceRootPath: string;
  databasePath: string;
  cleanup: () => Promise<void>;
};

export async function createTestDatabase(): Promise<TestDatabaseHandle> {
  const workspaceRootPath = await mkdtemp(join(tmpdir(), "local-work-os-db-"));
  const dataPath = join(workspaceRootPath, "data");
  const databasePath = join(dataPath, "local-work-os.sqlite");

  await mkdir(dataPath, { recursive: true });

  return {
    workspaceRootPath,
    databasePath,
    cleanup: async () => {
      await rm(workspaceRootPath, { force: true, recursive: true });
    }
  };
}
