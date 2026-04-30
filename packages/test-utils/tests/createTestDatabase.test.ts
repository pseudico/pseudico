import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestDatabase } from "../src";

describe("createTestDatabase", () => {
  it("creates a temporary workspace database path and cleans it up", async () => {
    const testDatabase = await createTestDatabase();
    const { databasePath, workspaceRootPath } = testDatabase;

    try {
      expect(databasePath).toBe(
        join(workspaceRootPath, "data", "local-work-os.sqlite")
      );
      await writeFile(databasePath, "");
      expect(existsSync(databasePath)).toBe(true);
    } finally {
      await testDatabase.cleanup();
    }

    expect(existsSync(workspaceRootPath)).toBe(false);
  });
});
