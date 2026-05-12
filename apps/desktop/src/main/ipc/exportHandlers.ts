import { stat } from "node:fs/promises";
import {
  ExportService,
  type TextExportResult as FeatureTextExportResult,
  type WorkspaceJsonExportResult as FeatureWorkspaceJsonExportResult
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
  type ExportProjectMarkdownInput,
  type ExportPlanningSummaryMarkdownInput,
  type ExportTasksCsvInput,
  type ExportWorkspaceJsonInput,
  type TextExportSummary,
  type WorkspaceJsonExportSummary
} from "../../preload/api";
import {
  ensureDirectoryInsideWorkspace,
  resolveInsideWorkspace,
  writeTextFileInsideWorkspace
} from "../services/safeFileSystem";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

export type ExportIpcHandlers = {
  handleExportWorkspaceJson: (
    input: unknown
  ) => Promise<ApiResult<WorkspaceJsonExportSummary>>;
  handleExportProjectMarkdown: (
    input: unknown
  ) => Promise<ApiResult<TextExportSummary>>;
  handleExportTasksCsv: (input: unknown) => Promise<ApiResult<TextExportSummary>>;
  handleExportPlanningSummaryMarkdown: (
    input: unknown
  ) => Promise<ApiResult<TextExportSummary>>;
};

export function createExportIpcHandlers(
  workspaceService: CurrentWorkspaceService,
  now: () => Date = () => new Date()
): ExportIpcHandlers {
  return {
    async handleExportWorkspaceJson(input) {
      if (!isOptionalExportWorkspaceJsonInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "exportWorkspaceJson accepts an optional workspaceId string."
        );
      }

      return await withExportService(
        workspaceService,
        now,
        async ({ service, workspace }) => {
          const workspaceId = input?.workspaceId ?? workspace.id;

          if (workspaceId !== workspace.id) {
            return apiError(
              "WORKSPACE_ERROR",
              "Export workspaceId must match the current workspace."
            );
          }

          const result = await service.exportWorkspaceJson({
            workspaceId
          });

          return apiOk(toExportSummary(result));
        }
      );
    },
    async handleExportProjectMarkdown(input) {
      if (!isExportProjectMarkdownInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "exportProjectMarkdown requires a projectId string."
        );
      }

      return await withExportService(
        workspaceService,
        now,
        async ({ service }) => {
          const result = await service.exportProjectMarkdown({
            projectId: input.projectId
          });

          return apiOk(toTextExportSummary(result));
        }
      );
    },

    async handleExportPlanningSummaryMarkdown(input) {
      if (!isOptionalExportPlanningSummaryMarkdownInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "exportPlanningSummaryMarkdown accepts optional workspaceId and date fields."
        );
      }

      return await withExportService(
        workspaceService,
        now,
        async ({ service, workspace }) => {
          const workspaceId = input?.workspaceId ?? workspace.id;

          if (workspaceId !== workspace.id) {
            return apiError(
              "WORKSPACE_ERROR",
              "Export workspaceId must match the current workspace."
            );
          }

          const result = await service.exportPlanningSummaryMarkdown({
            workspaceId,
            ...(input?.date === undefined ? {} : { date: input.date })
          });

          return apiOk(toTextExportSummary(result));
        }
      );
    },
    async handleExportTasksCsv(input) {
      if (!isOptionalExportTasksCsvInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "exportTasksCsv accepts an optional workspaceId string and csv or tsv format."
        );
      }

      return await withExportService(
        workspaceService,
        now,
        async ({ service, workspace }) => {
          const workspaceId = input?.workspaceId ?? workspace.id;

          if (workspaceId !== workspace.id) {
            return apiError(
              "WORKSPACE_ERROR",
              "Export workspaceId must match the current workspace."
            );
          }

          const result = await service.exportTasksCsv({
            workspaceId,
            format: input?.format ?? "csv"
          });

          return apiOk(toTextExportSummary(result));
        }
      );
    }
  };
}

async function withExportService<T>(
  workspaceService: CurrentWorkspaceService,
  now: () => Date,
  operation: (context: {
    connection: DatabaseConnection;
    service: ExportService;
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
    const service = new ExportService({
      connection,
      now,
      fileSystem: {
        async writeJsonExport({ exportRelativePath, contents }) {
          await ensureDirectoryInsideWorkspace(workspace.rootPath, "exports");
          await writeTextFileInsideWorkspace(
            workspace.rootPath,
            exportRelativePath,
            contents
          );

          return {
            sizeBytes: (await stat(
              resolveInsideWorkspace(workspace.rootPath, exportRelativePath)
            )).size
          };
        },
        async writeTextExport({ exportRelativePath, contents }) {
          await ensureDirectoryInsideWorkspace(workspace.rootPath, "exports");
          await writeTextFileInsideWorkspace(
            workspace.rootPath,
            exportRelativePath,
            contents
          );

          return {
            sizeBytes: (await stat(
              resolveInsideWorkspace(workspace.rootPath, exportRelativePath)
            )).size
          };
        }
      }
    });

    return await operation({ connection, service, workspace });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Export operation failed."
    );
  } finally {
    connection.close();
  }
}

function isOptionalExportWorkspaceJsonInput(
  input: unknown
): input is ExportWorkspaceJsonInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)))
  );
}

function isExportProjectMarkdownInput(
  input: unknown
): input is ExportProjectMarkdownInput {
  return isRecord(input) && isNonEmptyString(input.projectId);
}

function isOptionalExportPlanningSummaryMarkdownInput(
  input: unknown
): input is ExportPlanningSummaryMarkdownInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
      (input.date === undefined || typeof input.date === "string" || input.date instanceof Date))
  );
}

function isOptionalExportTasksCsvInput(
  input: unknown
): input is ExportTasksCsvInput | undefined {
  return (
    input === undefined ||
    (isRecord(input) &&
      (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
      (input.format === undefined ||
        input.format === "csv" ||
        input.format === "tsv"))
  );
}

function toExportSummary(
  result: FeatureWorkspaceJsonExportResult
): WorkspaceJsonExportSummary {
  return {
    id: result.id,
    workspaceId: result.workspaceId,
    createdAt: result.createdAt,
    relativePath: result.relativePath,
    sizeBytes: result.sizeBytes,
    schemaVersion: result.schemaVersion,
    itemCount: result.itemCount,
    attachmentCount: result.attachmentCount,
    totalAttachmentBytes: result.totalAttachmentBytes
  };
}

function toTextExportSummary(result: FeatureTextExportResult): TextExportSummary {
  return {
    id: result.id,
    workspaceId: result.workspaceId,
    createdAt: result.createdAt,
    relativePath: result.relativePath,
    sizeBytes: result.sizeBytes,
    kind: result.kind,
    sourceId: result.sourceId,
    rowCount: result.rowCount
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
