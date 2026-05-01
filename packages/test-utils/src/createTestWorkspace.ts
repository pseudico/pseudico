import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const TEST_WORKSPACE_DATABASE_FILE_NAME = "local-work-os.sqlite";
export const TEST_WORKSPACE_DIRECTORIES = [
  "data",
  "attachments",
  "backups",
  "exports",
  "logs"
] as const;

export type TestWorkspacePaths = {
  workspaceRootPath: string;
  manifestPath: string;
  dataPath: string;
  databasePath: string;
  attachmentsPath: string;
  backupsPath: string;
  exportsPath: string;
  logsPath: string;
};

export type TestWorkspaceManifest = {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: string;
  lastOpenedAt: string;
  app: {
    name: "Local Work OS";
    workspaceFormat: 1;
  };
};

export type TestWorkspaceHandle = {
  manifest: TestWorkspaceManifest;
  paths: TestWorkspacePaths;
  workspaceRootPath: string;
  cleanup: () => Promise<void>;
};

export type CreateTestWorkspaceInput = {
  id?: string;
  name?: string;
  rootPrefix?: string;
  schemaVersion?: number;
  timestamp?: string;
};

export async function createTestWorkspace(
  input: CreateTestWorkspaceInput = {}
): Promise<TestWorkspaceHandle> {
  const workspaceRootPath = await mkdtemp(
    join(tmpdir(), input.rootPrefix ?? "local-work-os-workspace-")
  );
  const paths = createTestWorkspacePaths(workspaceRootPath);
  const timestamp = input.timestamp ?? "2026-05-01T00:00:00.000Z";
  const manifest: TestWorkspaceManifest = {
    id: input.id ?? "workspace_test",
    name: input.name ?? "Test Workspace",
    schemaVersion: input.schemaVersion ?? 1,
    createdAt: timestamp,
    lastOpenedAt: timestamp,
    app: {
      name: "Local Work OS",
      workspaceFormat: 1
    }
  };

  await Promise.all(
    TEST_WORKSPACE_DIRECTORIES.map((directory) =>
      mkdir(join(workspaceRootPath, directory), { recursive: true })
    )
  );
  await Promise.all(
    ["attachments", "backups", "exports", "logs"].map((directory) =>
      writeFile(join(workspaceRootPath, directory, ".gitkeep"), "")
    )
  );
  await writeFile(paths.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    manifest,
    paths,
    workspaceRootPath,
    cleanup: () => cleanupTestWorkspace(workspaceRootPath)
  };
}

export function createTestWorkspacePaths(
  workspaceRootPath: string
): TestWorkspacePaths {
  const dataPath = join(workspaceRootPath, "data");

  return {
    workspaceRootPath,
    manifestPath: join(workspaceRootPath, "workspace.json"),
    dataPath,
    databasePath: join(dataPath, TEST_WORKSPACE_DATABASE_FILE_NAME),
    attachmentsPath: join(workspaceRootPath, "attachments"),
    backupsPath: join(workspaceRootPath, "backups"),
    exportsPath: join(workspaceRootPath, "exports"),
    logsPath: join(workspaceRootPath, "logs")
  };
}

export async function cleanupTestWorkspace(
  workspaceRootPath: string
): Promise<void> {
  if (!workspaceRootPath.includes("local-work-os-")) {
    throw new Error(
      "Refusing to clean up a path that does not look like a Local Work OS test workspace."
    );
  }

  if (existsSync(workspaceRootPath)) {
    await rm(workspaceRootPath, { force: true, recursive: true });
  }
}
