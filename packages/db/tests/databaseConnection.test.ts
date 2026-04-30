import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  WORKSPACE_DATABASE_RELATIVE_PATH
} from "../src";

let tempRoot: string;

describe("database connection", () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-db-"));
  });

  afterEach(async () => {
    await rm(tempRoot, { force: true, recursive: true });
  });

  it("resolves the workspace SQLite path under the data directory", () => {
    expect(WORKSPACE_DATABASE_RELATIVE_PATH).toBe(
      join("data", "local-work-os.sqlite")
    );
    expect(resolveWorkspaceDatabasePath(tempRoot)).toBe(
      join(tempRoot, "data", "local-work-os.sqlite")
    );
  });

  it("opens a SQLite database file in workspace storage", async () => {
    const databasePath = resolveWorkspaceDatabasePath(tempRoot);
    const connection = await createDatabaseConnection({ databasePath });

    try {
      expect(connection.databasePath).toBe(databasePath);
      expect(connection.sqlite.open).toBe(true);
      expect(existsSync(databasePath)).toBe(true);
      expect(connection.sqlite.pragma("foreign_keys", { simple: true })).toBe(1);
    } finally {
      connection.close();
    }
  });

  it("fails clearly when fileMustExist is true for a missing database", async () => {
    await mkdir(join(tempRoot, "data"), { recursive: true });

    await expect(
      createDatabaseConnection({
        databasePath: resolveWorkspaceDatabasePath(tempRoot),
        fileMustExist: true
      })
    ).rejects.toThrow();
  });
});
