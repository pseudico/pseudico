import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runPackageSmoke } from "../../src/main/packageSmoke";
import type { App } from "electron";

let tempRoot: string | null = null;
const previousResultPath = process.env.LOCAL_WORK_OS_PACKAGE_SMOKE_RESULT;

describe("package smoke mode", () => {
  afterEach(async () => {
    if (previousResultPath === undefined) {
      delete process.env.LOCAL_WORK_OS_PACKAGE_SMOKE_RESULT;
    } else {
      process.env.LOCAL_WORK_OS_PACKAGE_SMOKE_RESULT = previousResultPath;
    }

    if (tempRoot !== null) {
      await rm(tempRoot, { force: true, recursive: true });
      tempRoot = null;
    }
  });

  it("verifies packaged workspace, attachment, external open, and backup paths", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-package-smoke-test-"));
    const resultPath = join(tempRoot, "result.json");
    process.env.LOCAL_WORK_OS_PACKAGE_SMOKE_RESULT = resultPath;

    await runPackageSmoke(createFakeApp(tempRoot));

    const result = JSON.parse(await readFile(resultPath, "utf8")) as {
      ok: boolean;
      appBundlePath: string;
      workspaceRootPath: string;
      databasePath: string;
      attachmentPath: string;
      openedAttachmentPath: string;
      revealedAttachmentPath: string;
      backupRelativePath: string;
      backupDatabasePath: string;
    };

    expect(result).toMatchObject({
      ok: true,
      backupRelativePath: "backups/2026-05-07T00-03-00-000Z"
    });
    expect(result.databasePath).toContain(result.workspaceRootPath);
    expect(result.attachmentPath).toContain(result.workspaceRootPath);
    expect(result.backupDatabasePath).toContain(result.workspaceRootPath);
    expect(result.openedAttachmentPath).toBe(result.attachmentPath);
    expect(result.revealedAttachmentPath).toBe(result.attachmentPath);
    expect(result.databasePath).not.toContain(result.appBundlePath);
    expect(result.attachmentPath).not.toContain(result.appBundlePath);
    expect(result.backupDatabasePath).not.toContain(result.appBundlePath);
  });
});

function createFakeApp(rootPath: string): App {
  const appBundlePath = resolve(rootPath, "Local Work OS", "resources", "app.asar");
  const userDataPath = resolve(rootPath, "user-data");

  return {
    getAppPath: () => appBundlePath,
    getPath: (name: string) => {
      if (name !== "userData") {
        throw new Error(`Unexpected app path: ${name}`);
      }

      return userDataPath;
    }
  } as App;
}
