import { mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RecentWorkspacesService } from "../../src/main/services/workspace/RecentWorkspacesService";
import {
  GITKEEP_WORKSPACE_DIRECTORIES,
  REQUIRED_WORKSPACE_DIRECTORIES,
  WORKSPACE_MANIFEST_FILE,
  type WorkspaceManifest
} from "../../src/main/services/workspace/WorkspaceManifest";
import { WorkspaceFileSystemService } from "../../src/main/services/workspace/WorkspaceFileSystemService";

let tempRoot: string;
let now = new Date("2026-04-30T00:00:00.000Z");

function createService(): WorkspaceFileSystemService {
  return new WorkspaceFileSystemService({
    recentWorkspacesService: new RecentWorkspacesService(
      join(tempRoot, "app-user-data", "recent-workspaces.json")
    ),
    now: () => now
  });
}

async function expectDirectory(path: string): Promise<void> {
  await expect(stat(path).then((stats) => stats.isDirectory())).resolves.toBe(
    true
  );
}

describe("WorkspaceFileSystemService", () => {
  beforeEach(async () => {
    tempRoot = join(
      await mkdtemp(join(tmpdir(), "local-work-os-")),
      "workspace-test"
    );
    await mkdir(tempRoot, { recursive: true });
    now = new Date("2026-04-30T00:00:00.000Z");
  });

  afterEach(async () => {
    await rm(tempRoot, { force: true, recursive: true });
  });

  it("creates a local workspace manifest and folder structure", async () => {
    const service = createService();
    const workspaceRootPath = join(tempRoot, "Personal Work");

    const summary = await service.createWorkspace({
      name: " Personal Work ",
      rootPath: workspaceRootPath
    });

    expect(summary).toMatchObject({
      name: "Personal Work",
      rootPath: workspaceRootPath,
      openedAt: "2026-04-30T00:00:00.000Z",
      schemaVersion: 1
    });
    expect(summary.id).toMatch(/^workspace_/);

    const manifest = JSON.parse(
      await readFile(join(workspaceRootPath, WORKSPACE_MANIFEST_FILE), "utf8")
    ) as WorkspaceManifest;

    expect(manifest).toMatchObject({
      id: summary.id,
      name: "Personal Work",
      schemaVersion: 1,
      createdAt: "2026-04-30T00:00:00.000Z",
      lastOpenedAt: "2026-04-30T00:00:00.000Z",
      app: {
        name: "Local Work OS",
        workspaceFormat: 1
      }
    });

    for (const directory of REQUIRED_WORKSPACE_DIRECTORIES) {
      await expectDirectory(join(workspaceRootPath, directory));
    }

    for (const directory of GITKEEP_WORKSPACE_DIRECTORIES) {
      await expect(
        readFile(join(workspaceRootPath, directory, ".gitkeep"), "utf8")
      ).resolves.toBe("");
    }
  });

  it("validates, repairs, and opens an existing workspace", async () => {
    const service = createService();
    const workspaceRootPath = join(tempRoot, "Existing");
    await service.createWorkspace({ name: "Existing", rootPath: workspaceRootPath });
    await rm(join(workspaceRootPath, "attachments"), {
      force: true,
      recursive: true
    });

    const brokenValidation = await service.validateWorkspace({
      rootPath: workspaceRootPath
    });

    expect(brokenValidation.ok).toBe(false);
    expect(brokenValidation.problems).toContainEqual(
      expect.objectContaining({
        code: "REQUIRED_DIRECTORY_MISSING",
        repairable: true,
        severity: "error"
      })
    );

    now = new Date("2026-04-30T01:00:00.000Z");
    const opened = await service.openWorkspace({ rootPath: workspaceRootPath });

    expect(opened.openedAt).toBe("2026-04-30T01:00:00.000Z");
    await expectDirectory(join(workspaceRootPath, "attachments"));
    await expect(
      readFile(join(workspaceRootPath, "attachments", ".gitkeep"), "utf8")
    ).resolves.toBe("");

    expect(service.getCurrentWorkspace()).toEqual(opened);
  });

  it("detects missing workspace manifests", async () => {
    const service = createService();
    const workspaceRootPath = join(tempRoot, "NotAWorkspace");
    await mkdir(workspaceRootPath);

    const validation = await service.validateWorkspace({
      rootPath: workspaceRootPath
    });

    expect(validation.ok).toBe(false);
    expect(validation.problems).toContainEqual(
      expect.objectContaining({
        code: "MANIFEST_MISSING",
        severity: "error",
        repairable: false
      })
    );
  });

  it("rejects unsafe workspace roots", async () => {
    const service = createService();

    await expect(
      service.createWorkspace({ name: "Bad", rootPath: "  " })
    ).rejects.toThrow("Path must be a non-empty local path.");

    const validation = await service.validateWorkspace({
      rootPath: "  "
    });

    expect(validation.ok).toBe(false);
    expect(validation.problems[0]).toMatchObject({
      code: "INVALID_WORKSPACE_PATH",
      repairable: false
    });
  });

  it("stores recent workspaces outside the workspace folder", async () => {
    const service = createService();
    const workspaceRootPath = join(tempRoot, "Recent");

    await service.createWorkspace({
      name: "Recent",
      rootPath: workspaceRootPath
    });

    const recent = await service.listRecentWorkspaces();

    expect(recent).toEqual([
      {
        name: "Recent",
        rootPath: workspaceRootPath,
        lastOpenedAt: "2026-04-30T00:00:00.000Z"
      }
    ]);
    const storedRecent = JSON.parse(
      await readFile(join(tempRoot, "app-user-data", "recent-workspaces.json"), "utf8")
    ) as { recentWorkspaces: Array<{ rootPath: string }> };

    expect(storedRecent.recentWorkspaces[0]?.rootPath).toBe(workspaceRootPath);
  });
});
