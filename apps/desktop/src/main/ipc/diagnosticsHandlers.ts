import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  FileAttachmentService,
  IntegrityCheckService,
  type WorkspaceIntegrityReport
} from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type RepairAttachmentInput,
  type RepairAttachmentSummary,
  type RunWorkspaceIntegrityCheckInput,
  type WorkspaceIntegritySummary,
  type WorkspaceSummary
} from "../../preload/api";
import {
  calculateChecksum,
  localPathExists,
  resolveInsideWorkspace,
  restoreAttachmentFileFromReplacement
} from "../services/safeFileSystem";
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

function isRepairAttachmentInput(input: unknown): input is RepairAttachmentInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.attachmentId) &&
    isOptionalString(input.replacementPath)
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && value.trim().length > 0);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
