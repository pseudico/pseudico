import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DatabaseBootstrapService,
  SearchIndexService,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath
} from "@local-work-os/db";
import { afterEach, describe, expect, it } from "vitest";
import { createDiagnosticsIpcHandlers } from "../../src/main/ipc/diagnosticsHandlers";

describe("diagnostics IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("requires an open workspace", async () => {
    const handlers = createDiagnosticsIpcHandlers({
      getCurrentWorkspace: () => null
    });

    await expect(
      handlers.handleRunWorkspaceIntegrityCheck(undefined)
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_ERROR",
        message: "No workspace is open."
      }
    });
  });

  it("runs a workspace integrity report for the current workspace", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-diagnostics-ipc-"));
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);

    await new DatabaseBootstrapService().bootstrapWorkspaceDatabase({
      databasePath,
      workspaceId: "workspace_1",
      workspaceName: "Personal"
    });

    const connection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    try {
      new SearchIndexService({ connection }).rebuildWorkspaceIndex("workspace_1");
    } finally {
      connection.close();
    }

    const handlers = createDiagnosticsIpcHandlers({
      getCurrentWorkspace: () => ({
        id: "workspace_1",
        name: "Personal",
        rootPath: tempRoot!,
        openedAt: "2026-05-01T00:00:00.000Z",
        schemaVersion: 1
      })
    });

    await expect(
      handlers.handleRunWorkspaceIntegrityCheck({
        workspaceId: "workspace_1"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        workspaceId: "workspace_1",
        status: "healthy",
        sections: expect.arrayContaining([
          expect.objectContaining({
            kind: "system_rows"
          })
        ])
      }
    });
  });
});
