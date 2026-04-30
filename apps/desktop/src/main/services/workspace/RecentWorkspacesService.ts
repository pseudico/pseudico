import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { RecentWorkspaceEntry } from "./WorkspaceManifest";

const MAX_RECENT_WORKSPACES = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRecentWorkspaceEntry(value: unknown): value is RecentWorkspaceEntry {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.rootPath === "string" &&
    typeof value.lastOpenedAt === "string"
  );
}

export class RecentWorkspacesService {
  readonly storageFilePath: string;

  constructor(storageFilePath: string) {
    this.storageFilePath = storageFilePath;
  }

  async listRecentWorkspaces(): Promise<RecentWorkspaceEntry[]> {
    try {
      const contents = await readFile(this.storageFilePath, "utf8");
      const parsed = JSON.parse(contents) as unknown;

      if (!isRecord(parsed) || !Array.isArray(parsed.recentWorkspaces)) {
        return [];
      }

      return parsed.recentWorkspaces.filter(isRecentWorkspaceEntry);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return [];
      }

      if (error instanceof SyntaxError) {
        return [];
      }

      throw error;
    }
  }

  async rememberRecentWorkspace(entry: RecentWorkspaceEntry): Promise<void> {
    const existing = await this.listRecentWorkspaces();
    const withoutCurrent = existing.filter(
      (recent) => recent.rootPath !== entry.rootPath
    );
    const recentWorkspaces = [entry, ...withoutCurrent].slice(
      0,
      MAX_RECENT_WORKSPACES
    );

    await mkdir(dirname(this.storageFilePath), { recursive: true });
    await writeFile(
      this.storageFilePath,
      `${JSON.stringify({ recentWorkspaces }, null, 2)}\n`,
      "utf8"
    );
  }
}
