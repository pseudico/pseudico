import { copyFile, readdir, rename, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";

import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  BackupService,
  FileAttachmentService,
  IntegrityCheckService,
  MaintenanceService,
  SavedViewDiagnosticsService,
  type SavedViewDiagnosticsReport,
  type SavedViewRepairResult,
  type WorkspaceIntegrityReport
} from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type RepairAttachmentInput,
  type RepairAttachmentSummary,
  type RepairSavedViewQueryInput,
  type ListMaintenanceJobsInput,
  type MaintenanceJobSummary,
  type RepairSavedViewQuerySummary,
  type RunMaintenanceJobInput,
  type RunWorkspaceIntegrityCheckInput,
  type SavedViewDiagnosticsSummary,
  type WorkspaceIntegritySummary,
  type WorkspaceSummary
} from "../../preload/api";
import {
  calculateChecksum,
  ensureDirectoryInsideWorkspace,
  localPathExists,
  resolveInsideWorkspace,
  writeTextFileInsideWorkspace,
  restoreAttachmentFileFromReplacement
} from "../services/safeFileSystem";
import {
  WORKSPACE_DATABASE_RELATIVE_PATH,
  createIsoTimestamp
} from "../services/workspace/WorkspaceManifest";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type DiagnosticsIpcHandlers = {
  handleRunWorkspaceIntegrityCheck: (
    input: unknown
  ) => Promise<ApiResult<WorkspaceIntegritySummary>>;
  handleRepairAttachment: (
    input: unknown
  ) => Promise<ApiResult<RepairAttachmentSummary | null>>;
  handleRunSavedViewDiagnostics: (
    input: unknown
  ) => Promise<ApiResult<SavedViewDiagnosticsSummary>>;
  handleRepairSavedViewQuery: (
    input: unknown
  ) => Promise<ApiResult<RepairSavedViewQuerySummary>>;
  handleRunMaintenanceJob: (
    input: unknown
  ) => Promise<ApiResult<MaintenanceJobSummary>>;
  handleListMaintenanceJobs: (
    input: unknown
  ) => Promise<ApiResult<MaintenanceJobSummary[]>>;
};

export type DiagnosticsIpcPlatform = {
  chooseReplacementPath: () => Promise<string | null>;
};

export function createDiagnosticsIpcHandlers(
  workspaceService: CurrentWorkspaceService,
  platform: DiagnosticsIpcPlatform = {
    chooseReplacementPath: async () => null
  }
): DiagnosticsIpcHandlers {
  return {
    async handleRunWorkspaceIntegrityCheck(input) {
      if (!isRunWorkspaceIntegrityCheckInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "runWorkspaceIntegrityCheck accepts an optional workspaceId string."
        );
      }

      return await withIntegrityCheckService(
        workspaceService,
        async (context) => {
          const workspaceId = resolveWorkspaceId(input?.workspaceId, context.workspace);
          const report =
            await context.integrityCheckService.runWorkspaceIntegrityCheck(
              workspaceId
            );

          return apiOk(toWorkspaceIntegritySummary(report));
        }
      );
    },

    async handleRepairAttachment(input) {
      if (!isRepairAttachmentInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "repairAttachment requires an attachmentId string."
        );
      }

      const replacementPath = input.replacementPath ?? await platform.chooseReplacementPath();

      if (replacementPath === null) {
        return apiOk(null);
      }

      return await withIntegrityCheckService(
        workspaceService,
        async ({ connection, workspace }) => {
          const fileService = new FileAttachmentService({ connection });
          const attachment = fileService.getAttachmentById(input.attachmentId);

          if (attachment === null) {
            return apiError("WORKSPACE_ERROR", "Attachment was not found.");
          }

          const replacementFile = await restoreAttachmentFileFromReplacement({
            workspaceRootPath: workspace.rootPath,
            attachmentStoragePath: attachment.storagePath,
            sourcePath: replacementPath
          });
          const result = await fileService.repairAttachmentFile({
            attachmentId: attachment.id,
            replacementFile
          });

          return apiOk({
            attachmentId: result.attachment.id,
            itemId: result.attachment.itemId,
            exists: true,
            storagePath: result.attachment.storagePath,
            checksum: result.attachment.checksum,
            sizeBytes: result.attachment.sizeBytes
          });
        }
      );
    },

    async handleRunSavedViewDiagnostics(input) {
      if (!isOptionalString(input)) {
        return apiError(
          "INVALID_INPUT",
          "runSavedViewDiagnostics accepts an optional workspaceId string."
        );
      }

      return await withIntegrityCheckService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(
          typeof input === "string" ? input : undefined,
          context.workspace
        );
        const report = new SavedViewDiagnosticsService({
          connection: context.connection
        }).diagnoseWorkspace(workspaceId);

        return apiOk(toSavedViewDiagnosticsSummary(report));
      });
    },

    async handleRepairSavedViewQuery(input) {
      if (!isRepairSavedViewQueryInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "repairSavedViewQuery requires a savedViewId string."
        );
      }

      return await withIntegrityCheckService(workspaceService, async (context) => {
        const result = await new SavedViewDiagnosticsService({
          connection: context.connection
        }).repairSavedView(input.savedViewId);

        if (result.savedView.workspaceId !== context.workspace.id) {
          throw new Error("Saved view workspace must match the current workspace.");
        }

        return apiOk(toRepairSavedViewQuerySummary(result));
      });
    },

    async handleRunMaintenanceJob(input) {
      if (!isRunMaintenanceJobInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "runMaintenanceJob accepts workspaceId, operations, and requireBackup."
        );
      }

      return await withIntegrityCheckService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input?.workspaceId, context.workspace);
        const service = new MaintenanceService({
          connection: context.connection,
          fileSystem: {
            listWorkspaceFilesUnder: async (workspaceRelativePath) =>
              await listWorkspaceFilesUnder(
                context.workspace.rootPath,
                workspaceRelativePath
              ),
            workspacePathExists: async (workspaceRelativePath) =>
              await localPathExists(
                resolveInsideWorkspace(context.workspace.rootPath, workspaceRelativePath)
              ),
            workspaceFileSize: async (workspaceRelativePath) =>
              (
                await stat(
                  resolveInsideWorkspace(context.workspace.rootPath, workspaceRelativePath)
                )
              ).size,
            workspaceFileChecksum: async (workspaceRelativePath) =>
              await calculateChecksum(
                resolveInsideWorkspace(context.workspace.rootPath, workspaceRelativePath)
              ),
            writeWorkspaceJson: async (workspaceRelativePath, value) => {
              await writeTextFileInsideWorkspace(
                context.workspace.rootPath,
                workspaceRelativePath,
                `${JSON.stringify(value, null, 2)}\n`
              );
            },
            moveWorkspaceFile: async (sourceRelativePath, destinationRelativePath) => {
              const sourcePath = resolveInsideWorkspace(
                context.workspace.rootPath,
                sourceRelativePath
              );
              const destinationPath = resolveInsideWorkspace(
                context.workspace.rootPath,
                destinationRelativePath
              );

              await ensureDirectoryInsideWorkspace(
                context.workspace.rootPath,
                dirnameRelativePath(destinationRelativePath)
              );
              await rename(sourcePath, destinationPath);
            }
          },
          createBackup: async () => {
            const backupRelativePath = createMaintenanceBackupRelativePath(new Date());
            const backup = await new BackupService({
              connection: context.connection,
              fileSystem: {
                async copyDatabase({ sourceRelativePath, destinationRelativePath }) {
                  const sourcePath = resolveInsideWorkspace(
                    context.workspace.rootPath,
                    sourceRelativePath
                  );
                  const destinationPath = resolveInsideWorkspace(
                    context.workspace.rootPath,
                    destinationRelativePath
                  );

                  await ensureDirectoryInsideWorkspace(
                    context.workspace.rootPath,
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
                    context.workspace.rootPath,
                    manifestRelativePath,
                    `${JSON.stringify(manifest, null, 2)}\n`
                  );
                }
              }
            }).createManualBackup({
              workspaceId,
              workspaceName: context.workspace.name,
              databaseRelativePath: WORKSPACE_DATABASE_RELATIVE_PATH,
              backupRelativePath,
              backupDatabaseRelativePath: `${backupRelativePath}/local-work-os.sqlite`,
              manifestRelativePath: `${backupRelativePath}/attachment-manifest.json`
            });

            return { id: backup.id, relativePath: backup.relativePath };
          }
        });

        return apiOk(await service.runMaintenanceJob({
          workspaceId,
          ...(input?.operations === undefined ? {} : { operations: input.operations }),
          requireBackup: input?.requireBackup ?? true
        }));
      });
    },

    async handleListMaintenanceJobs(input) {
      if (!isListMaintenanceJobsInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "listMaintenanceJobs accepts optional workspaceId and limit."
        );
      }

      return await withIntegrityCheckService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input?.workspaceId, context.workspace);
        const service = new MaintenanceService({
          connection: context.connection
        });

        return apiOk(service.listJobLogs(workspaceId, input?.limit));
      });
    }
  };
}

async function withIntegrityCheckService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    integrityCheckService: IntegrityCheckService;
    workspace: WorkspaceSummary;
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
    return await operation({
      connection,
      integrityCheckService: new IntegrityCheckService({
        connection,
        fileSystem: {
          workspacePathExists: async (workspaceRelativePath) =>
            await localPathExists(
              resolveInsideWorkspace(workspace.rootPath, workspaceRelativePath)
            ),
          workspaceFileChecksum: async (workspaceRelativePath) =>
            await calculateChecksum(
              resolveInsideWorkspace(workspace.rootPath, workspaceRelativePath)
            )
        }
      }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Integrity check failed."
    );
  } finally {
    connection.close();
  }
}

function resolveWorkspaceId(
  requestedWorkspaceId: string | undefined,
  currentWorkspace: WorkspaceSummary
): string {
  if (
    requestedWorkspaceId !== undefined &&
    requestedWorkspaceId !== currentWorkspace.id
  ) {
    throw new Error("Diagnostics workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function toWorkspaceIntegritySummary(
  report: WorkspaceIntegrityReport
): WorkspaceIntegritySummary {
  return report;
}

function toSavedViewDiagnosticsSummary(
  report: SavedViewDiagnosticsReport
): SavedViewDiagnosticsSummary {
  return {
    workspaceId: report.workspaceId,
    checkedAt: report.checkedAt,
    total: report.total,
    ok: report.ok,
    warnings: report.warnings,
    errors: report.errors,
    repairable: report.repairable,
    entries: report.entries.map((entry) => ({
      savedViewId: entry.savedView.id,
      name: entry.savedView.name,
      type: entry.savedView.type,
      status: entry.status,
      issues: entry.issues,
      repairable: entry.repairedQueryJson !== null
    }))
  };
}

function toRepairSavedViewQuerySummary(
  result: SavedViewRepairResult
): RepairSavedViewQuerySummary {
  return {
    savedViewId: result.savedView.id,
    name: result.savedView.name,
    changed: result.changed,
    issueCount: result.issues.length
  };
}


async function listWorkspaceFilesUnder(
  workspaceRootPath: string,
  workspaceRelativePath: string
): Promise<string[]> {
  const root = resolveInsideWorkspace(workspaceRootPath, workspaceRelativePath);

  if (!(await localPathExists(root))) {
    return [];
  }

  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const childRelativePath = `${workspaceRelativePath.replace(/\\/g, "/").replace(/\/$/, "")}/${entry.name}`;

    if (entry.isDirectory()) {
      files.push(...(await listWorkspaceFilesUnder(workspaceRootPath, childRelativePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(childRelativePath);
    }
  }

  return files;
}

function createMaintenanceBackupRelativePath(date: Date): string {
  return `backups/${createIsoTimestamp(date).replace(/[:.]/g, "-")}-maintenance`;
}

function dirnameRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/");
  const index = normalized.lastIndexOf("/");

  return index === -1 ? "." : normalized.slice(0, index);
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

function isRepairAttachmentInput(input: unknown): input is RepairAttachmentInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.attachmentId) &&
    isOptionalString(input.replacementPath)
  );
}

function isRunMaintenanceJobInput(
  input: unknown
): input is RunMaintenanceJobInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      isOptionalString(input.workspaceId) &&
      (input.requireBackup === undefined || typeof input.requireBackup === "boolean") &&
      (input.operations === undefined ||
        (Array.isArray(input.operations) &&
          input.operations.every((operation) =>
            typeof operation === "string" &&
            [
              "sqlite_integrity_check",
              "attachment_manifest_audit",
              "rebuild_search_index",
              "vacuum",
              "orphan_attachment_scan",
              "orphan_attachment_cleanup"
            ].includes(operation)
          ))))
  );
}

function isListMaintenanceJobsInput(
  input: unknown
): input is ListMaintenanceJobsInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      isOptionalString(input.workspaceId) &&
      (input.limit === undefined || typeof input.limit === "number"))
  );
}

function isRunWorkspaceIntegrityCheckInput(
  input: unknown
): input is RunWorkspaceIntegrityCheckInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) && isOptionalString(input.workspaceId))
  );
}

function isRepairSavedViewQueryInput(
  input: unknown
): input is RepairSavedViewQueryInput {
  return isRecord(input) && isNonEmptyString(input.savedViewId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.trim().length > 0);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
