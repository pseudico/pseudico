import { copyFile, readdir, stat } from "node:fs/promises";
import { basename } from "node:path";
import {
  BackupService,
  type BackupManifest,
  type BackupSnapshotSummary as FeatureBackupSnapshotSummary
} from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type BackupSnapshotSummary,
  type CreateManualBackupInput,
  type ListBackupsInput,
  type ManualBackupSnapshotSummary
} from "../../preload/api";
import {
  WORKSPACE_DATABASE_RELATIVE_PATH,
  createIsoTimestamp
} from "../services/workspace/WorkspaceManifest";
import {
  ensureDirectoryInsideWorkspace,
  localPathExists,
  readTextFileInsideWorkspace,
  resolveInsideWorkspace,
  writeTextFileInsideWorkspace
} from "../services/safeFileSystem";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

export type BackupIpcHandlers = {
  handleCreateManualBackup: (
    input: unknown
  ) => Promise<ApiResult<ManualBackupSnapshotSummary>>;
  handleListBackups: (
    input: unknown
  ) => Promise<ApiResult<BackupSnapshotSummary[]>>;
};

export function createBackupIpcHandlers(
  workspaceService: CurrentWorkspaceService,
  now: () => Date = () => new Date()
): BackupIpcHandlers {
  return {
    async handleCreateManualBackup(input) {
      if (!isOptionalCreateManualBackupInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createManualBackup accepts an optional workspaceId string."
        );
      }

      return await withBackupService(
        workspaceService,
        async ({ connection, service, workspace }) => {
          const workspaceId = input?.workspaceId ?? workspace.id;

          if (workspaceId !== workspace.id) {
            return apiError(
              "WORKSPACE_ERROR",
              "Backup workspaceId must match the current workspace."
            );
          }

          const backupRelativePath = createBackupRelativePath(now());
          const snapshot = await service.createManualBackup({
            workspaceId,
            workspaceName: workspace.name,
            databaseRelativePath: WORKSPACE_DATABASE_RELATIVE_PATH,
            backupRelativePath,
            backupDatabaseRelativePath: `${backupRelativePath}/local-work-os.sqlite`,
            manifestRelativePath: `${backupRelativePath}/attachment-manifest.json`
          });

          void connection;

          return apiOk(snapshot);
        }
      );
    },

    async handleListBackups(input) {
      if (!isOptionalListBackupsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "listBackups accepts an optional workspaceId string."
        );
      }

      return await withBackupService(
        workspaceService,
        async ({ service, workspace }) => {
          const workspaceId = input?.workspaceId ?? workspace.id;

          if (workspaceId !== workspace.id) {
            return apiError(
              "WORKSPACE_ERROR",
              "Backup workspaceId must match the current workspace."
            );
          }

          const backups = await listBackupSnapshots(workspace.rootPath);

          return apiOk(service.listBackups({ workspaceId, backups }));
        }
      );
    }
  };
}

async function withBackupService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    service: BackupService;
    workspace: NonNullable<ReturnType<CurrentWorkspaceService["getCurrentWorkspace"]>>;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiError("WORKSPACE_ERROR", "No workspace is open.");
  }

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
    fileMustExist: true
  });

  try {
    const service = new BackupService({
      connection,
      fileSystem: {
        async copyDatabase({ sourceRelativePath, destinationRelativePath }) {
          const sourcePath = resolveInsideWorkspace(
            workspace.rootPath,
            sourceRelativePath
          );
          const destinationPath = resolveInsideWorkspace(
            workspace.rootPath,
            destinationRelativePath
          );

          await ensureDirectoryInsideWorkspace(
            workspace.rootPath,
            dirnameRelativePath(destinationRelativePath)
          );
          await copyFile(sourcePath, destinationPath);

          return {
            sizeBytes: (await stat(destinationPath)).size
          };
        },
        async writeManifest({ manifestRelativePath, manifest }) {
          await writeTextFileInsideWorkspace(
            workspace.rootPath,
            manifestRelativePath,
            `${JSON.stringify(manifest, null, 2)}\n`
          );
        }
      }
    });

    return await operation({ connection, service, workspace });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Backup operation failed."
    );
  } finally {
    connection.close();
  }
}

async function listBackupSnapshots(
  workspaceRootPath: string
): Promise<FeatureBackupSnapshotSummary[]> {
  await ensureDirectoryInsideWorkspace(workspaceRootPath, "backups");

  const backupsPath = resolveInsideWorkspace(workspaceRootPath, "backups");
  const entries = await readdir(backupsPath, { withFileTypes: true });
  const summaries = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const relativePath = `backups/${entry.name}`;
        const manifestRelativePath = `${relativePath}/attachment-manifest.json`;
        const databaseRelativePath = `${relativePath}/local-work-os.sqlite`;
        const manifest = await readBackupManifestIfPresent(
          workspaceRootPath,
          manifestRelativePath
        );
        const databaseSizeBytes = await readFileSizeIfPresent(
          workspaceRootPath,
          databaseRelativePath
        );

        return {
          id: manifest?.id ?? entry.name,
          workspaceId: manifest?.workspaceId ?? "",
          createdAt: manifest?.createdAt ?? backupNameToTimestamp(entry.name),
          relativePath,
          databaseRelativePath:
            databaseSizeBytes === null ? null : databaseRelativePath,
          manifestRelativePath: manifest === null ? null : manifestRelativePath,
          attachmentCount: manifest?.attachmentCount ?? 0,
          totalAttachmentBytes: manifest?.totalAttachmentBytes ?? 0,
          databaseSizeBytes
        };
      })
  );

  return summaries;
}

async function readBackupManifestIfPresent(
  workspaceRootPath: string,
  manifestRelativePath: string
): Promise<BackupManifest | null> {
  if (
    !(await localPathExists(
      resolveInsideWorkspace(workspaceRootPath, manifestRelativePath)
    ))
  ) {
    return null;
  }

  const parsed = JSON.parse(
    await readTextFileInsideWorkspace(workspaceRootPath, manifestRelativePath)
  ) as unknown;

  return isBackupManifest(parsed) ? parsed : null;
}

async function readFileSizeIfPresent(
  workspaceRootPath: string,
  relativePath: string
): Promise<number | null> {
  const localPath = resolveInsideWorkspace(workspaceRootPath, relativePath);

  if (!(await localPathExists(localPath))) {
    return null;
  }

  return (await stat(localPath)).size;
}

function createBackupRelativePath(date: Date): string {
  return `backups/${createIsoTimestamp(date).replace(/[:.]/g, "-")}`;
}

function backupNameToTimestamp(name: string): string {
  return basename(name).replace(
    /^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3}Z)$/,
    "$1:$2:$3.$4"
  );
}

function dirnameRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");

  return index === -1 ? "." : normalized.slice(0, index);
}

function isOptionalCreateManualBackupInput(
  input: unknown
): input is CreateManualBackupInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)))
  );
}

function isOptionalListBackupsInput(
  input: unknown
): input is ListBackupsInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)))
  );
}

function isBackupManifest(value: unknown): value is BackupManifest {
  return (
    isRecord(value) &&
    value.kind === "manual" &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.workspaceId) &&
    isNonEmptyString(value.workspaceName) &&
    isNonEmptyString(value.createdAt) &&
    isRecord(value.database) &&
    Array.isArray(value.attachments) &&
    typeof value.attachmentCount === "number" &&
    typeof value.totalAttachmentBytes === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
