import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, parse, relative, resolve } from "node:path";
import { WorkspaceFileSystemError } from "./workspace/WorkspaceFileSystemError";

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
  const targetPath = resolve(safeRoot, workspaceRelativePath);
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
