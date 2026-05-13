import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ActivityLogRepository,
  AttachmentRepository,
  ContainerRepository,
  DatabaseBootstrapService,
  ItemRepository,
  createDatabaseConnection,
  resolveWorkspaceDatabasePath
} from "@local-work-os/db";
import { afterEach, describe, expect, it } from "vitest";
import { createExportIpcHandlers } from "../../src/main/ipc/exportHandlers";

describe("export IPC handlers", () => {
  let tempRoot: string | null = null;

  afterEach(async () => {
    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("requires an open workspace", async () => {
    const handlers = createExportIpcHandlers({
      getCurrentWorkspace: () => null
    });

    await expect(
      handlers.handleExportWorkspaceJson(undefined)
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: "WORKSPACE_ERROR",
        message: "No workspace is open."
      }
    });
  });

  it("exports workspace JSON and logs export_created for the current workspace", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-export-ipc-"));
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
      new ContainerRepository(connection).create({
        id: "container_project_1",
        workspaceId: "workspace_1",
        type: "project",
        name: "Launch Plan",
        slug: "launch-plan",
        timestamp: "2026-05-01T00:00:00.000Z"
      });
      const item = new ItemRepository(connection).create({
        id: "item_file_1",
        workspaceId: "workspace_1",
        containerId: "container_project_1",
        type: "file",
        title: "Brief.pdf",
        timestamp: "2026-05-01T00:00:00.000Z"
      });
      new AttachmentRepository(connection).create({
        id: "attachment_1",
        workspaceId: "workspace_1",
        itemId: item.id,
        originalName: "Brief.pdf",
        storedName: "Brief.pdf",
        sizeBytes: 14,
        checksum: "a".repeat(64),
        storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
        timestamp: "2026-05-01T00:00:00.000Z"
      });
    } finally {
      connection.close();
    }

    const handlers = createExportIpcHandlers(
      {
        getCurrentWorkspace: () => ({
          id: "workspace_1",
          name: "Personal",
          rootPath: tempRoot!,
          openedAt: "2026-05-01T00:00:00.000Z",
          schemaVersion: 1
        })
      },
      () => new Date("2026-05-01T00:00:00.000Z")
    );
    const created = await handlers.handleExportWorkspaceJson({
      workspaceId: "workspace_1"
    });

    expect(created).toMatchObject({
      ok: true,
      data: {
        workspaceId: "workspace_1",
        relativePath: "exports/2026-05-01T00-00-00-000Z-workspace-export.json",
        schemaVersion: 1,
        itemCount: 1,
        attachmentCount: 1,
        totalAttachmentBytes: 14
      }
    });

    if (!created.ok) {
      throw new Error(created.error.message);
    }

    const exportPath = join(tempRoot, created.data.relativePath);
    await expect(stat(exportPath)).resolves.toMatchObject({
      size: created.data.sizeBytes
    });

    const parsed = JSON.parse(await readFile(exportPath, "utf8")) as {
      data: { items: unknown[] };
      attachmentManifest: { attachmentCount: number };
    };
    expect(parsed.data.items).toHaveLength(1);
    expect(parsed.attachmentManifest.attachmentCount).toBe(1);

    const verifyConnection = await createDatabaseConnection({
      databasePath,
      fileMustExist: true
    });

    try {
      expect(
        new ActivityLogRepository(verifyConnection).listForTarget(
          "export",
          created.data.id
        )
      ).toMatchObject([{ action: "export_created" }]);
    } finally {
      verifyConnection.close();
    }
  });

  it("exports the portable HTML/CSV/TSV/Markdown bundle inside the workspace", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-export-bundle-ipc-"));
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
      new ContainerRepository(connection).create({
        id: "container_project_1",
        workspaceId: "workspace_1",
        type: "project",
        name: "Launch Plan",
        slug: "launch-plan",
        timestamp: "2026-05-01T00:00:00.000Z"
      });
    } finally {
      connection.close();
    }

    const handlers = createExportIpcHandlers(
      {
        getCurrentWorkspace: () => ({
          id: "workspace_1",
          name: "Personal",
          rootPath: tempRoot!,
          openedAt: "2026-05-01T00:00:00.000Z",
          schemaVersion: 1
        })
      },
      () => new Date("2026-05-01T00:00:00.000Z")
    );
    const created = await handlers.handleExportHtmlCsvTsvMarkdownBundle({
      workspaceId: "workspace_1"
    });

    expect(created).toMatchObject({
      ok: true,
      data: {
        workspaceId: "workspace_1",
        relativePath:
          "exports/2026-05-01T00-00-00-000Z-personal-export-bundle",
        kind: "html_csv_tsv_markdown_bundle",
        containerCount: 1
      }
    });

    if (!created.ok) {
      throw new Error(created.error.message);
    }

    const manifestPath = join(tempRoot, created.data.relativePath, "manifest.json");
    await expect(stat(manifestPath)).resolves.toMatchObject({
      size: expect.any(Number)
    });
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      kind: string;
      files: Array<{ relativePath: string }>;
    };
    expect(manifest.kind).toBe("html_csv_tsv_markdown_bundle");
    expect(manifest.files.map((file) => file.relativePath)).toContain(
      `${created.data.relativePath}/html/index.html`
    );
    await expect(
      stat(join(tempRoot, created.data.relativePath, "containers/project-launch-plan.md"))
    ).resolves.toMatchObject({ size: expect.any(Number) });
  });
});
