import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createTestDatabase,
  createTestWorkspace,
  makeTestIds,
  seedTestData
} from "../src";

describe("test workspace utilities", () => {
  it("creates a temporary workspace fixture and cleans it up", async () => {
    const testWorkspace = await createTestWorkspace({
      id: "workspace_1",
      name: "Personal Work",
      timestamp: "2026-05-01T01:00:00.000Z"
    });
    const { paths, workspaceRootPath } = testWorkspace;

    try {
      expect(paths.databasePath).toBe(
        join(workspaceRootPath, "data", "local-work-os.sqlite")
      );
      expect(existsSync(paths.manifestPath)).toBe(true);
      expect(existsSync(paths.dataPath)).toBe(true);
      expect(existsSync(paths.attachmentsPath)).toBe(true);
      expect(existsSync(paths.backupsPath)).toBe(true);
      expect(existsSync(paths.exportsPath)).toBe(true);
      expect(existsSync(paths.logsPath)).toBe(true);

      const manifest = JSON.parse(
        await readFile(paths.manifestPath, "utf8")
      ) as { id: string; name: string };
      expect(manifest).toMatchObject({
        id: "workspace_1",
        name: "Personal Work"
      });
    } finally {
      await testWorkspace.cleanup();
    }

    expect(existsSync(workspaceRootPath)).toBe(false);
  });

  it("creates a temporary database path inside the workspace fixture", async () => {
    const testDatabase = await createTestDatabase();
    const { databasePath, paths, workspaceRootPath } = testDatabase;

    try {
      expect(databasePath).toBe(paths.databasePath);
      await writeFile(databasePath, "");
      expect(existsSync(databasePath)).toBe(true);
    } finally {
      await testDatabase.cleanup();
    }

    expect(existsSync(workspaceRootPath)).toBe(false);
  });

  it("provides deterministic seed data and IDs", () => {
    const ids = makeTestIds();
    const seed = seedTestData({ workspaceName: "Seed Workspace" });

    expect(seed).toMatchObject({
      workspaceId: "workspace_test",
      workspaceName: "Seed Workspace",
      timestamp: "2026-05-01T00:00:00.000Z"
    });
    expect(ids.nextId("activity")).toBe("activity_1");
    expect(ids.nextId("container")).toBe("container_2");
    expect(ids.currentCount()).toBe(2);
  });
});
