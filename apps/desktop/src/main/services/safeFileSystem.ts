import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createAttachmentStorageRelativePath } from "@local-work-os/core";
import {
  basename,
  dirname,
  isAbsolute,
  parse,
  relative,
  resolve
} from "node:path";
import { WorkspaceFileSystemError } from "./workspace/WorkspaceFileSystemError";

export type CopyFileIntoWorkspaceInput = {
  workspaceRootPath: string;
  sourcePath: string;
  attachmentId: string;
  createdAt?: Date;
};

export type CopiedWorkspaceFile = {
  attachmentId: string;
  originalName: string;
  storedName: string;
  storagePath: string;
  sizeBytes: number;
  checksum: string;
};

function hasNullByte(value: string): boolean {
  return value.includes("\0");
}

export function normalizeLocalPath(input: string): string {
  const trimmed = input.trim();

  if (trimmed.length === 0 || hasNullByte(trimmed)) {
    throw new WorkspaceFileSystemError(
      "INVALID_PATH",
      "Path must be a non-empty local path."
    );
  }

  return resolve(trimmed);
}

export function assertSafeWorkspaceRootPath(input: string): string {
  const workspaceRootPath = normalizeLocalPath(input);

  if (!isAbsolute(workspaceRootPath)) {
    throw new WorkspaceFileSystemError(
      "INVALID_PATH",
      "Workspace path must be absolute."
    );
  }

  if (workspaceRootPath === parse(workspaceRootPath).root) {
    throw new WorkspaceFileSystemError(
      "INVALID_PATH",
      "Workspace path cannot be a filesystem root."
    );
  }

  return workspaceRootPath;
}

export function resolveInsideWorkspace(
  workspaceRootPath: string,
  workspaceRelativePath: string
): string {
  const safeRoot = assertSafeWorkspaceRootPath(workspaceRootPath);
  const safeRelativePath = validateWorkspaceRelativePath(workspaceRelativePath);
  const targetPath = resolve(safeRoot, safeRelativePath);
  const relativePath = relative(safeRoot, targetPath);

  if (
    relativePath === ".." ||
    relativePath.startsWith(`..\\`) ||
    relativePath.startsWith("../") ||
    isAbsolute(relativePath)
  ) {
    throw new WorkspaceFileSystemError(
      "INVALID_PATH",
      "Workspace-relative path must stay inside the workspace."
    );
  }

  return targetPath;
}

export function validateWorkspaceRelativePath(input: string): string {
  const trimmed = input.trim();

  if (trimmed.length === 0 || hasNullByte(trimmed) || isAbsolute(trimmed)) {
    throw new WorkspaceFileSystemError(
      "INVALID_PATH",
      "Workspace-relative path must be a non-empty relative path."
    );
  }

  const normalized = trimmed.replace(/\\/g, "/");
  const segments = normalized.split("/");

  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".." ||
        /^[a-zA-Z]:$/.test(segment)
    )
  ) {
    throw new WorkspaceFileSystemError(
      "INVALID_PATH",
      "Workspace-relative path must stay inside the workspace."
    );
  }

  return segments.join("/");
}

export async function localPathExists(localPath: string): Promise<boolean> {
  try {
    await stat(localPath);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}

export async function isDirectory(localPath: string): Promise<boolean> {
  try {
    return (await stat(localPath)).isDirectory();
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}

export async function ensureDirectory(localPath: string): Promise<void> {
  await mkdir(localPath, { recursive: true });
}

export async function ensureDirectoryInsideWorkspace(
  workspaceRootPath: string,
  workspaceRelativePath: string
): Promise<string> {
  const directoryPath = resolveInsideWorkspace(
    workspaceRootPath,
    workspaceRelativePath
  );
  await ensureDirectory(directoryPath);

  return directoryPath;
}

export async function readTextFileInsideWorkspace(
  workspaceRootPath: string,
  workspaceRelativePath: string
): Promise<string> {
  return readFile(
    resolveInsideWorkspace(workspaceRootPath, workspaceRelativePath),
    "utf8"
  );
}

export async function writeTextFileInsideWorkspace(
  workspaceRootPath: string,
  workspaceRelativePath: string,
  contents: string
): Promise<void> {
  const filePath = resolveInsideWorkspace(workspaceRootPath, workspaceRelativePath);
  await ensureDirectory(dirname(filePath));
  await writeFile(filePath, contents, "utf8");
}

export async function calculateChecksum(localPath: string): Promise<string> {
  const filePath = normalizeLocalPath(localPath);
  const stats = await stat(filePath);

  if (!stats.isFile()) {
    throw new WorkspaceFileSystemError(
      "INVALID_PATH",
      "Checksum path must point to a file."
    );
  }

  return await new Promise((resolveChecksum, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolveChecksum(hash.digest("hex")));
  });
}

export async function copyFileIntoWorkspace(
  input: CopyFileIntoWorkspaceInput
): Promise<CopiedWorkspaceFile> {
  const sourcePath = normalizeLocalPath(input.sourcePath);
  const sourceStats = await stat(sourcePath);

  if (!sourceStats.isFile()) {
    throw new WorkspaceFileSystemError(
      "INVALID_PATH",
      "Source path must point to a file."
    );
  }

  const createdAt = input.createdAt ?? new Date();
  const year = createdAt.getFullYear().toString().padStart(4, "0");
  const month = (createdAt.getMonth() + 1).toString().padStart(2, "0");
  const originalName = basename(sourcePath);
  const storedName = sanitizeStoredFileName(originalName, input.attachmentId);
  const storagePath = createAttachmentStorageRelativePath({
    layout: {
      year,
      month,
      attachmentId: input.attachmentId
    },
    storedName
  });
  const destinationPath = resolveInsideWorkspace(
    input.workspaceRootPath,
    storagePath
  );

  await ensureDirectory(dirname(destinationPath));
  await copyFile(sourcePath, destinationPath);

  const copiedStats = await stat(destinationPath);

  return {
    attachmentId: input.attachmentId,
    originalName,
    storedName,
    storagePath: validateWorkspaceRelativePath(storagePath),
    sizeBytes: copiedStats.size,
    checksum: await calculateChecksum(destinationPath)
  };
}

function sanitizeStoredFileName(originalName: string, fallbackName: string): string {
  const sanitized = originalName
    .split("")
    .map((character) => (isUnsafeFileNameCharacter(character) ? "_" : character))
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");

  return sanitized.length === 0 ? fallbackName : sanitized;
}

function isUnsafeFileNameCharacter(character: string): boolean {
  return (
    character.charCodeAt(0) < 32 ||
    character === "<" ||
    character === ">" ||
    character === ":" ||
    character === "\"" ||
    character === "/" ||
    character === "\\" ||
    character === "|" ||
    character === "?" ||
    character === "*"
  );
}
