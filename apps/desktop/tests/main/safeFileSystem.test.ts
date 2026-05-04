import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  calculateChecksum,
  copyFileIntoWorkspace,
  resolveInsideWorkspace,
  validateWorkspaceRelativePath
} from "../../src/main/services/safeFileSystem";

let tempRoot: string;

describe("safe file system attachment helpers", () => {
  beforeEach(async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "local-work-os-safe-fs-"));
    await mkdir(join(tempRoot, "workspace"), { recursive: true });
  });

  afterEach(async () => {
    await rm(tempRoot, { force: true, recursive: true });
  });

  it("validates workspace-relative paths and rejects traversal", () => {
    expect(
      validateWorkspaceRelativePath("attachments\\2026\\05\\a\\file.txt")
    ).toBe("attachments/2026/05/a/file.txt");
    expect(() => validateWorkspaceRelativePath("../outside.txt")).toThrow(
      "Workspace-relative path must stay inside the workspace."
    );
    expect(() =>
      resolveInsideWorkspace(join(tempRoot, "workspace"), "attachments/../../x")
    ).toThrow("Workspace-relative path must stay inside the workspace.");
  });

  it("copies files into attachment storage with checksum and size metadata", async () => {
    const sourcePath = join(tempRoot, "source.txt");
    await writeFile(sourcePath, "local file contents", "utf8");

    const copied = await copyFileIntoWorkspace({
      workspaceRootPath: join(tempRoot, "workspace"),
      sourcePath,
      attachmentId: "attachment_1",
      createdAt: new Date("2026-05-04T00:00:00.000Z")
    });

    expect(copied).toMatchObject({
      attachmentId: "attachment_1",
      originalName: "source.txt",
      storedName: "source.txt",
      storagePath: "attachments/2026/05/attachment_1/source.txt",
      sizeBytes: 19
    });
    expect(copied.checksum).toBe(await calculateChecksum(sourcePath));
    await expect(
      readFile(
        join(
          tempRoot,
          "workspace",
          "attachments",
          "2026",
          "05",
          "attachment_1",
          "source.txt"
        ),
        "utf8"
      )
    ).resolves.toBe("local file contents");
  });

  it("rejects directory sources", async () => {
    const directoryPath = join(tempRoot, "source-directory");
    await mkdir(directoryPath);

    await expect(
      copyFileIntoWorkspace({
        workspaceRootPath: join(tempRoot, "workspace"),
        sourcePath: directoryPath,
        attachmentId: "attachment_1"
      })
    ).rejects.toThrow("Source path must point to a file.");
    await expect(stat(directoryPath).then((stats) => stats.isDirectory())).resolves.toBe(
      true
    );
  });
});
