import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  IntegrityCheckService,
  type WorkspaceIntegrityReport
} from "@local-work-os/features";
import {
  apiError,
  apiOk,
  type ApiResult,
  type RunWorkspaceIntegrityCheckInput,
  type WorkspaceIntegritySummary,
  type WorkspaceSummary
} from "../../preload/api";
import {
  localPathExists,
  resolveInsideWorkspace
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
};

export function createDiagnosticsIpcHandlers(
  workspaceService: CurrentWorkspaceService
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
