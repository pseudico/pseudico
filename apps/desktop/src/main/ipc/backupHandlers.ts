import { createReadStream } from "node:fs";
import { copyFile, readFile, readdir, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, resolve } from "node:path";
import {
  BackupSchedulerService,
  BackupService,
  RestoreService,
  type BackupManifest,
  type BackupManifestAttachment,
  type ScheduledBackupTrigger,
  type WorkspaceExportV1,
  type BackupSnapshotSummary as FeatureBackupSnapshotSummary
} from "@local-work-os/features";
import {
  createDatabaseConnection,
  MigrationService,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type BackupSnapshotSummary,
  type BackupSchedulerSettings,
  type BackupSchedulerStatus,
  type CreateManualBackupInput,
  type ListBackupsForWorkspacePathInput,
  type ListBackupsInput,
  type ManualBackupSnapshotSummary,
  type RunAutomaticBackupInput,
  type AutomaticBackupRunSummary,
  type RestoreBackupToNewWorkspaceInput,
  type RestoreBackupFromWorkspacePathInput,
  type RestoreValidationSummary,
  type RestoreWorkspaceSummary,
  type RestoreExportToNewWorkspaceInput,
  type UpdateBackupSchedulerSettingsInput,
  type ValidateRestoreSourceInput
} from "../../preload/api";
import {
  WORKSPACE_DATABASE_RELATIVE_PATH,
  createIsoTimestamp,
  createWorkspaceManifest
} from "../services/workspace/WorkspaceManifest";
import {
  assertSafeWorkspaceRootPath,
  ensureDirectory,
  ensureDirectoryInsideWorkspace,
  localPathExists,
  normalizeLocalPath,
  readTextFileInsideWorkspace,
  resolveInsideWorkspace,
  writeTextFileInsideWorkspace
} from "../services/safeFileSystem";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
> &
  Partial<Pick<WorkspaceFileSystemService, "openWorkspace">>;

export type BackupIpcHandlers = {
  handleCreateManualBackup: (
    input: unknown
  ) => Promise<ApiResult<ManualBackupSnapshotSummary>>;
  handleListBackups: (
    input: unknown
  ) => Promise<ApiResult<BackupSnapshotSummary[]>>;
  handleListBackupsForWorkspacePath: (
    input: unknown
  ) => Promise<ApiResult<BackupSnapshotSummary[]>>;
  handleGetAutomaticBackupSettings: (
    input: unknown
  ) => Promise<ApiResult<{
    settings: BackupSchedulerSettings;
    status: BackupSchedulerStatus;
  }>>;
  handleUpdateAutomaticBackupSettings: (
    input: unknown
  ) => Promise<ApiResult<{
    settings: BackupSchedulerSettings;
    status: BackupSchedulerStatus;
  }>>;
  handleRunAutomaticBackupCheck: (
    input: unknown
  ) => Promise<ApiResult<AutomaticBackupRunSummary>>;
  handleValidateRestoreSource: (
    input: unknown
  ) => Promise<ApiResult<RestoreValidationSummary>>;
  handleRestoreBackupToNewWorkspace: (
    input: unknown
  ) => Promise<ApiResult<RestoreWorkspaceSummary>>;
  handleRestoreBackupFromWorkspacePath: (
    input: unknown
  ) => Promise<ApiResult<RestoreWorkspaceSummary>>;
  handleRestoreExportToNewWorkspace: (
    input: unknown
  ) => Promise<ApiResult<RestoreWorkspaceSummary>>;
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
        },
        now
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
        },
        now
      );
    },

    async handleListBackupsForWorkspacePath(input) {
      if (!isListBackupsForWorkspacePathInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "listBackupsForWorkspacePath requires a non-empty rootPath field."
        );
      }

      try {
        const workspaceRootPath = assertSafeWorkspaceRootPath(input.rootPath);
        const backups = await listBackupSnapshots(workspaceRootPath);

        return apiOk(backups);
      } catch (error) {
        return apiError(
          "WORKSPACE_ERROR",
          error instanceof Error
            ? error.message
            : "Could not list backups for workspace path."
        );
      }
    },

    async handleGetAutomaticBackupSettings(input) {
      if (!isOptionalListBackupsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "getAutomaticBackupSettings accepts an optional workspaceId string."
        );
      }

      return await withBackupService(
        workspaceService,
        async ({ connection, workspace }) => {
          const workspaceId = input?.workspaceId ?? workspace.id;

          if (workspaceId !== workspace.id) {
            return apiError(
              "WORKSPACE_ERROR",
              "Backup workspaceId must match the current workspace."
            );
          }

          const scheduler = new BackupSchedulerService({
            connection,
            now
          });

          return apiOk({
            settings: scheduler.getSettings(workspaceId),
            status: scheduler.getStatus(workspaceId)
          });
        },
        now
      );
    },

    async handleUpdateAutomaticBackupSettings(input) {
      if (!isUpdateBackupSchedulerSettingsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateAutomaticBackupSettings requires workspaceId and valid backup settings."
        );
      }

      return await withBackupService(
        workspaceService,
        async ({ connection, workspace }) => {
          if (input.workspaceId !== workspace.id) {
            return apiError(
              "WORKSPACE_ERROR",
              "Backup workspaceId must match the current workspace."
            );
          }

          const scheduler = new BackupSchedulerService({
            connection,
            now
          });
          const settings = await scheduler.updateSettings(input);

          return apiOk({
            settings,
            status: scheduler.getStatus(input.workspaceId)
          });
        },
        now
      );
    },

    async handleRunAutomaticBackupCheck(input) {
      if (!isRunAutomaticBackupInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "runAutomaticBackupCheck requires a workspaceId and scheduler trigger."
        );
      }

      return await withBackupService(
        workspaceService,
        async ({ connection, service, workspace }) => {
          if (input.workspaceId !== workspace.id) {
            return apiError(
              "WORKSPACE_ERROR",
              "Backup workspaceId must match the current workspace."
            );
          }

          const scheduler = new BackupSchedulerService({
            connection,
            now
          });
          const backups = await listBackupSnapshots(workspace.rootPath);
          const summary = await scheduler.runAutomaticBackup({
            workspaceId: input.workspaceId,
            trigger: input.trigger,
            backups,
            createBackup: async (kind) => {
              const backupRelativePath = createBackupRelativePath(now(), kind);

              return await service.createManualBackup({
                workspaceId: input.workspaceId,
                workspaceName: workspace.name,
                databaseRelativePath: WORKSPACE_DATABASE_RELATIVE_PATH,
                backupRelativePath,
                backupDatabaseRelativePath: `${backupRelativePath}/local-work-os.sqlite`,
                manifestRelativePath: `${backupRelativePath}/attachment-manifest.json`,
                kind,
                actorType: "system"
              });
            },
            deleteBackup: async (backup) => {
              await deleteBackupSnapshot(workspace.rootPath, backup.relativePath);
            }
          });

          return apiOk(summary);
        },
        now
      );
    },

    async handleValidateRestoreSource(input) {
      if (!isValidateRestoreSourceInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "validateRestoreSource requires a backupRelativePath or filePath source."
        );
      }

      return await withCurrentWorkspace(workspaceService, async (workspace) => {
        if (input.sourceType === "backup") {
          const snapshot = await readBackupSnapshot(
            workspace.rootPath,
            input.backupRelativePath
          );

          if (snapshot.manifest === null) {
            return apiError(
              "WORKSPACE_ERROR",
              "Backup manifest is missing or invalid."
            );
          }

          const connection = await createDatabaseConnection({
            databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
            fileMustExist: true
          });

          try {
            return apiOk(
              new RestoreService({ connection }).validateRestoreSource({
                sourceType: "backup",
                sourcePath: input.backupRelativePath,
                manifest: snapshot.manifest,
                databaseSizeBytes: snapshot.databaseSizeBytes
              })
            );
          } finally {
            connection.close();
          }
        }

        const exportData = JSON.parse(
          await readFile(normalizeLocalPath(input.filePath), "utf8")
        ) as unknown;
        const connection = await createDatabaseConnection({
          databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
          fileMustExist: true
        });

        try {
          return apiOk(
            new RestoreService({ connection }).validateRestoreSource({
              sourceType: "workspace_export",
              sourcePath: normalizeLocalPath(input.filePath),
              exportData
            })
          );
        } finally {
          connection.close();
        }
      });
    },

    async handleRestoreBackupToNewWorkspace(input) {
      if (!isRestoreBackupToNewWorkspaceInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "restoreBackupToNewWorkspace requires backupRelativePath and targetRootPath."
        );
      }

      return await withCurrentWorkspace(workspaceService, async (workspace) => {
        return await restoreBackupFromWorkspaceRoot({
          workspaceService,
          sourceWorkspaceRootPath: workspace.rootPath,
          backupRelativePath: input.backupRelativePath,
          targetRootPath: input.targetRootPath,
          now
        });
      });
    },

    async handleRestoreBackupFromWorkspacePath(input) {
      if (!isRestoreBackupFromWorkspacePathInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "restoreBackupFromWorkspacePath requires sourceWorkspaceRootPath, backupRelativePath, and targetRootPath."
        );
      }

      try {
        return await restoreBackupFromWorkspaceRoot({
          workspaceService,
          sourceWorkspaceRootPath: input.sourceWorkspaceRootPath,
          backupRelativePath: input.backupRelativePath,
          targetRootPath: input.targetRootPath,
          now
        });
      } catch (error) {
        return apiError(
          "WORKSPACE_ERROR",
          error instanceof Error ? error.message : "Backup restore failed."
        );
      }
    },

    async handleRestoreExportToNewWorkspace(input) {
      if (!isRestoreExportToNewWorkspaceInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "restoreExportToNewWorkspace requires filePath and targetRootPath."
        );
      }

      return await withCurrentWorkspace(workspaceService, async (workspace) => {
        const filePath = normalizeLocalPath(input.filePath);
        const exportData = JSON.parse(
          await readFile(filePath, "utf8")
        ) as WorkspaceExportV1;
        const validationConnection = await createDatabaseConnection({
          databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
          fileMustExist: true
        });

        try {
          const validation = new RestoreService({
            connection: validationConnection
          }).validateRestoreSource({
            sourceType: "workspace_export",
            sourcePath: filePath,
            exportData
          });

          if (!validation.valid || validation.workspace === null) {
            return apiError(
              "INVALID_INPUT",
              "Workspace export has blocking restore issues."
            );
          }
        } finally {
          validationConnection.close();
        }

        const targetRootPath = await prepareRestoreTarget(
          input.targetRootPath,
          workspace.rootPath
        );
        await createRestoreWorkspaceStructure(targetRootPath);
        await writeTextFileInsideWorkspace(
          targetRootPath,
          "workspace.json",
          `${JSON.stringify(
            createWorkspaceManifest({
              id: exportData.workspace.id,
              name: exportData.workspace.name,
              createdAt: now()
            }),
            null,
            2
          )}\n`
        );

        const connection = await createDatabaseConnection({
          databasePath: resolveWorkspaceDatabasePath(targetRootPath)
        });

        try {
          new MigrationService({ connection }).runPendingMigrations();
          const attachmentCopy = await copyRestoreAttachments({
            sourceWorkspaceRootPath: workspace.rootPath,
            targetWorkspaceRootPath: targetRootPath,
            attachments: exportData.attachmentManifest.attachments
          });
          const result = await new RestoreService({
            connection,
            now
          }).restoreExportToNewWorkspace({
            exportData,
            sourcePath: filePath,
            targetWorkspaceRootPath: targetRootPath,
            copiedAttachmentCount: attachmentCopy.copiedAttachmentCount,
            missingAttachmentCount: attachmentCopy.missingAttachmentCount
          });
          connection.close();
          if (workspaceService.openWorkspace !== undefined) {
            await workspaceService.openWorkspace({ rootPath: targetRootPath });
          }

          return apiOk(result);
        } finally {
          connection.close();
        }
      });
    }
  };
}

async function withBackupService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    service: BackupService;
    workspace: NonNullable<ReturnType<CurrentWorkspaceService["getCurrentWorkspace"]>>;
  }) => Promise<ApiResult<T>>,
  now: () => Date = () => new Date()
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
      now,
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
            sizeBytes: (await stat(destinationPath)).size,
            checksum: await createFileChecksum(destinationPath)
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

async function withCurrentWorkspace<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (
    workspace: NonNullable<ReturnType<CurrentWorkspaceService["getCurrentWorkspace"]>>
  ) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiError("WORKSPACE_ERROR", "No workspace is open.");
  }

  try {
    return await operation(workspace);
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Restore operation failed."
    );
  }
}

async function restoreBackupFromWorkspaceRoot(input: {
  workspaceService: CurrentWorkspaceService;
  sourceWorkspaceRootPath: string;
  backupRelativePath: string;
  targetRootPath: string;
  now: () => Date;
}): Promise<ApiResult<RestoreWorkspaceSummary>> {
  const sourceWorkspaceRootPath = assertSafeWorkspaceRootPath(
    input.sourceWorkspaceRootPath
  );
  const snapshot = await readBackupSnapshot(
    sourceWorkspaceRootPath,
    input.backupRelativePath
  );

  if (snapshot.manifest === null || snapshot.databaseRelativePath === null) {
    return apiError(
      "WORKSPACE_ERROR",
      "Backup restore requires a manifest and database copy."
    );
  }

  const targetRootPath = await prepareRestoreTarget(
    input.targetRootPath,
    sourceWorkspaceRootPath
  );
  await createRestoreWorkspaceStructure(targetRootPath);
  await copyFile(
    resolveInsideWorkspace(sourceWorkspaceRootPath, snapshot.databaseRelativePath),
    resolveInsideWorkspace(targetRootPath, WORKSPACE_DATABASE_RELATIVE_PATH)
  );
  const attachmentCopy = await copyRestoreAttachments({
    sourceWorkspaceRootPath,
    targetWorkspaceRootPath: targetRootPath,
    attachments: snapshot.manifest.attachments
  });
  await writeTextFileInsideWorkspace(
    targetRootPath,
    "workspace.json",
    `${JSON.stringify(
      createWorkspaceManifest({
        id: snapshot.manifest.workspaceId,
        name: snapshot.manifest.workspaceName,
        createdAt: input.now()
      }),
      null,
      2
    )}\n`
  );

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(targetRootPath),
    fileMustExist: true
  });

  try {
    const result = await new RestoreService({
      connection,
      now: input.now
    }).restoreBackupToNewWorkspace({
      manifest: snapshot.manifest,
      sourcePath: input.backupRelativePath,
      targetWorkspaceRootPath: targetRootPath,
      copiedAttachmentCount: attachmentCopy.copiedAttachmentCount,
      missingAttachmentCount: attachmentCopy.missingAttachmentCount
    });
    connection.close();
    if (input.workspaceService.openWorkspace !== undefined) {
      await input.workspaceService.openWorkspace({ rootPath: targetRootPath });
    }

    return apiOk(result);
  } finally {
    connection.close();
  }
}

async function prepareRestoreTarget(
  requestedRootPath: string,
  activeWorkspaceRootPath: string
): Promise<string> {
  const targetRootPath = assertSafeWorkspaceRootPath(requestedRootPath);

  if (resolve(targetRootPath) === resolve(activeWorkspaceRootPath)) {
    throw new Error("Restore target cannot be the active workspace.");
  }

  if (await localPathExists(resolveInsideWorkspace(targetRootPath, "workspace.json"))) {
    throw new Error("Restore target already contains a workspace.json file.");
  }

  if (
    await localPathExists(
      resolveInsideWorkspace(targetRootPath, WORKSPACE_DATABASE_RELATIVE_PATH)
    )
  ) {
    throw new Error("Restore target already contains a workspace database.");
  }

  return targetRootPath;
}

async function createRestoreWorkspaceStructure(
  targetRootPath: string
): Promise<void> {
  await ensureDirectory(targetRootPath);
  await Promise.all(
    ["data", "attachments", "backups", "exports", "logs"].map((directory) =>
      ensureDirectoryInsideWorkspace(targetRootPath, directory)
    )
  );
}

async function copyRestoreAttachments(input: {
  sourceWorkspaceRootPath: string;
  targetWorkspaceRootPath: string;
  attachments: BackupManifestAttachment[];
}): Promise<{ copiedAttachmentCount: number; missingAttachmentCount: number }> {
  let copiedAttachmentCount = 0;
  let missingAttachmentCount = 0;

  for (const attachment of input.attachments) {
    const sourcePath = resolveInsideWorkspace(
      input.sourceWorkspaceRootPath,
      attachment.storagePath
    );

    if (!(await localPathExists(sourcePath))) {
      missingAttachmentCount += 1;
      continue;
    }

    await ensureDirectoryInsideWorkspace(
      input.targetWorkspaceRootPath,
      dirnameRelativePath(attachment.storagePath)
    );
    await copyFile(
      sourcePath,
      resolveInsideWorkspace(input.targetWorkspaceRootPath, attachment.storagePath)
    );
    copiedAttachmentCount += 1;
  }

  return { copiedAttachmentCount, missingAttachmentCount };
}

async function readBackupSnapshot(
  workspaceRootPath: string,
  backupRelativePath: string
): Promise<{
  manifest: BackupManifest | null;
  databaseRelativePath: string | null;
  databaseSizeBytes: number | null;
}> {
  const normalizedBackupPath = backupRelativePath.replace(/\\/g, "/");

  if (
    !normalizedBackupPath.startsWith("backups/") ||
    normalizedBackupPath.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error("Backup source must stay inside workspace backups.");
  }

  const manifestRelativePath = `${normalizedBackupPath}/attachment-manifest.json`;
  const databaseRelativePath = `${normalizedBackupPath}/local-work-os.sqlite`;
  const manifest = await readBackupManifestIfPresent(
    workspaceRootPath,
    manifestRelativePath
  );
  const databaseSizeBytes = await readFileSizeIfPresent(
    workspaceRootPath,
    databaseRelativePath
  );

  return {
    manifest,
    databaseRelativePath: databaseSizeBytes === null ? null : databaseRelativePath,
    databaseSizeBytes
  };
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
          databaseSizeBytes,
          ...(manifest?.kind === undefined ? {} : { kind: manifest.kind })
        };
      })
  );

  return summaries;
}

async function deleteBackupSnapshot(
  workspaceRootPath: string,
  backupRelativePath: string
): Promise<void> {
  const normalizedBackupPath = backupRelativePath.replace(/\\/g, "/");

  if (
    !normalizedBackupPath.startsWith("backups/") ||
    normalizedBackupPath.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error("Backup retention cleanup must stay inside workspace backups.");
  }

  await rm(resolveInsideWorkspace(workspaceRootPath, normalizedBackupPath), {
    force: true,
    recursive: true
  });
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

function createBackupRelativePath(
  date: Date,
  kind: "manual" | "automatic" | "pre_migration" = "manual"
): string {
  const suffix =
    kind === "manual" ? "" : `-${kind === "pre_migration" ? "pre-migration" : kind}`;

  return `backups/${createIsoTimestamp(date).replace(/[:.]/g, "-")}${suffix}`;
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

function isListBackupsForWorkspacePathInput(
  input: unknown
): input is ListBackupsForWorkspacePathInput {
  return isRecord(input) && isNonEmptyString(input.rootPath);
}

function isValidateRestoreSourceInput(
  input: unknown
): input is ValidateRestoreSourceInput {
  return (
    isRecord(input) &&
    ((input.sourceType === "backup" &&
      isNonEmptyString(input.backupRelativePath)) ||
      (input.sourceType === "workspace_export" && isNonEmptyString(input.filePath)))
  );
}

function isRestoreBackupToNewWorkspaceInput(
  input: unknown
): input is RestoreBackupToNewWorkspaceInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.backupRelativePath) &&
    isNonEmptyString(input.targetRootPath)
  );
}

function isRestoreBackupFromWorkspacePathInput(
  input: unknown
): input is RestoreBackupFromWorkspacePathInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.sourceWorkspaceRootPath) &&
    isNonEmptyString(input.backupRelativePath) &&
    isNonEmptyString(input.targetRootPath)
  );
}

function isRestoreExportToNewWorkspaceInput(
  input: unknown
): input is RestoreExportToNewWorkspaceInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.filePath) &&
    isNonEmptyString(input.targetRootPath)
  );
}

function isBackupManifest(value: unknown): value is BackupManifest {
  return (
    isRecord(value) &&
    (value.kind === "manual" ||
      value.kind === "automatic" ||
      value.kind === "pre_migration") &&
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

function isUpdateBackupSchedulerSettingsInput(
  input: unknown
): input is UpdateBackupSchedulerSettingsInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.workspaceId) &&
    (input.enabled === undefined || typeof input.enabled === "boolean") &&
    (input.intervalHours === undefined || typeof input.intervalHours === "number") &&
    (input.runOnAppClose === undefined ||
      typeof input.runOnAppClose === "boolean") &&
    (input.runBeforeMigration === undefined ||
      typeof input.runBeforeMigration === "boolean") &&
    (input.retention === undefined || isRetentionSettingsPatch(input.retention))
  );
}

function isRetentionSettingsPatch(value: unknown): boolean {
  return (
    isRecord(value) &&
    (value.maxCount === undefined || typeof value.maxCount === "number") &&
    (value.maxAgeDays === undefined || typeof value.maxAgeDays === "number") &&
    (value.maxSizeBytes === undefined ||
      typeof value.maxSizeBytes === "number")
  );
}

function isRunAutomaticBackupInput(
  input: unknown
): input is RunAutomaticBackupInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.workspaceId) &&
    isScheduledBackupTrigger(input.trigger)
  );
}

function isScheduledBackupTrigger(
  value: unknown
): value is ScheduledBackupTrigger {
  return (
    value === "app_open" ||
    value === "interval" ||
    value === "app_close" ||
    value === "pre_migration" ||
    value === "manual_check"
  );
}

async function createFileChecksum(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = createReadStream(filePath);

  await new Promise<void>((resolvePromise, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });

  return hash.digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
