import {
  createTestWorkspace,
  type CreateTestWorkspaceInput,
  type TestWorkspaceManifest,
  type TestWorkspacePaths
} from "./createTestWorkspace";

export type TestDatabaseHandle = {
  manifest: TestWorkspaceManifest;
  paths: TestWorkspacePaths;
  workspaceRootPath: string;
  databasePath: string;
  cleanup: () => Promise<void>;
};

export async function createTestDatabase(
  input: CreateTestWorkspaceInput = {}
): Promise<TestDatabaseHandle> {
  const workspace = await createTestWorkspace({
    ...input,
    rootPrefix: input.rootPrefix ?? "local-work-os-db-"
  });

  return {
    manifest: workspace.manifest,
    paths: workspace.paths,
    workspaceRootPath: workspace.workspaceRootPath,
    databasePath: workspace.paths.databasePath,
    cleanup: workspace.cleanup
  };
}
