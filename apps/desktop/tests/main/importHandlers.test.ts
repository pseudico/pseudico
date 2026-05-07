import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createImportIpcHandlers } from "../../src/main/ipc/importHandlers";

describe("import IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("validates a selected workspace JSON export without requiring an open workspace", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-import-ipc-"));
    const exportPath = join(tempRoot, "workspace-export.json");
    await writeFile(exportPath, JSON.stringify(createWorkspaceExport()), "utf8");

    const handlers = createImportIpcHandlers();
    const result = await handlers.handleValidateWorkspaceExportJson({
      filePath: exportPath
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        valid: true,
        workspace: {
          id: "workspace_1"
        },
        targetPolicy: {
          mode: "new_workspace_only",
          canApplyToActiveWorkspace: false
        }
      }
    });
  });

  it("uses the chooser platform and reports cancellation as null", async () => {
    const handlers = createImportIpcHandlers({
      chooseExportJsonPath: async () => null
    });

    await expect(
      handlers.handleChooseAndValidateWorkspaceExportJson()
    ).resolves.toEqual({
      ok: true,
      data: null
    });
  });

  it("rejects non-JSON file paths before reading", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-import-ipc-"));
    const exportPath = join(tempRoot, "workspace-export.txt");
    await writeFile(exportPath, "{}", "utf8");

    const handlers = createImportIpcHandlers();

    await expect(
      handlers.handleValidateWorkspaceExportJson({ filePath: exportPath })
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Import validation requires a JSON file."
      }
    });
  });

  it("returns validation errors for invalid JSON", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-import-ipc-"));
    const exportPath = join(tempRoot, "workspace-export.json");
    await writeFile(exportPath, "{", "utf8");

    const handlers = createImportIpcHandlers();

    await expect(
      handlers.handleValidateWorkspaceExportJson({ filePath: exportPath })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        valid: false,
        issues: [
          {
            code: "invalid_json"
          }
        ]
      }
    });
  });
});

function createWorkspaceExport(): unknown {
  const timestamp = "2026-05-06T00:00:00.000Z";

  return {
    schemaVersion: 1,
    exportedAt: timestamp,
    workspace: {
      id: "workspace_1",
      name: "Personal",
      schemaVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    data: {
      containers: [
        {
          id: "container_1",
          workspaceId: "workspace_1",
          type: "project",
          name: "Project",
          slug: "project",
          description: null,
          status: "active",
          categoryId: null,
          color: null,
          isFavorite: false,
          isSystem: false,
          sortOrder: 10,
          createdAt: timestamp,
          updatedAt: timestamp,
          archivedAt: null,
          deletedAt: null
        }
      ],
      containerTabs: [],
      items: [],
      taskDetails: [],
      noteDetails: [],
      listDetails: [],
      listItems: [],
      linkDetails: [],
      tags: [],
      taggings: [],
      categories: [],
      relationships: [],
      savedViews: [],
      dashboards: [],
      dashboardWidgets: [],
      dailyPlans: [],
      dailyPlanItems: []
    },
    attachmentManifest: {
      attachments: [],
      attachmentCount: 0,
      totalAttachmentBytes: 0
    }
  };
}

