import { mkdir, readFile, stat, writeFile, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../../src/renderer/App";
import type {
  BackupFileSystemAdapter,
  ExportFileSystemAdapter
} from "@local-work-os/features";
import type { TestWorkspaceHandle } from "@local-work-os/test-utils";

export function launchDesktopAppForTest(route = "/welcome"): string {
  return renderToString(
    <MemoryRouter initialEntries={[route]}>
      <AppRoutes />
    </MemoryRouter>
  );
}

export function createSmokeBackupFileSystem(
  workspace: TestWorkspaceHandle
): BackupFileSystemAdapter {
  return {
    async copyDatabase(input) {
      const source = resolveWorkspaceRelativePath(
        workspace,
        input.sourceRelativePath
      );
      const destination = resolveWorkspaceRelativePath(
        workspace,
        input.destinationRelativePath
      );

      await mkdir(dirname(destination), { recursive: true });
      await copyFile(source, destination);

      return {
        sizeBytes: (await stat(destination)).size
      };
    },
    async writeManifest(input) {
      await writeWorkspaceRelativeFile(
        workspace,
        input.manifestRelativePath,
        `${JSON.stringify(input.manifest, null, 2)}\n`
      );
    }
  };
}

export function createSmokeExportFileSystem(
  workspace: TestWorkspaceHandle
): ExportFileSystemAdapter {
  return {
    async writeJsonExport(input) {
      return writeWorkspaceRelativeFile(
        workspace,
        input.exportRelativePath,
        input.contents
      );
    },
    async writeTextExport(input) {
      return writeWorkspaceRelativeFile(
        workspace,
        input.exportRelativePath,
        input.contents
      );
    }
  };
}

export async function readWorkspaceRelativeFile(
  workspace: TestWorkspaceHandle,
  relativePath: string
): Promise<string> {
  return readFile(resolveWorkspaceRelativePath(workspace, relativePath), "utf8");
}

async function writeWorkspaceRelativeFile(
  workspace: TestWorkspaceHandle,
  relativePath: string,
  contents: string
): Promise<{ sizeBytes: number }> {
  const targetPath = resolveWorkspaceRelativePath(workspace, relativePath);

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, contents);

  return {
    sizeBytes: Buffer.byteLength(contents)
  };
}

function resolveWorkspaceRelativePath(
  workspace: TestWorkspaceHandle,
  relativePath: string
): string {
  const normalized = relativePath.replace(/\\/g, "/");

  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`Smoke test path must be workspace-relative: ${relativePath}`);
  }

  return join(workspace.workspaceRootPath, ...normalized.split("/"));
}
