import { stat } from "node:fs/promises";
import { PrintService } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type PrintPdfInput,
  type PrintPdfSummary,
  type WorkspaceSummary
} from "../../preload/api";
import {
  ensureDirectoryInsideWorkspace,
  resolveInsideWorkspace,
  writeBinaryFileInsideWorkspace
} from "../services/safeFileSystem";
import { ElectronPrintService } from "../services/PrintService";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

export type PrintIpcHandlers = {
  handlePrintPdf: (input: unknown) => Promise<ApiResult<PrintPdfSummary>>;
};

export function createPrintIpcHandlers(
  workspaceService: CurrentWorkspaceService,
  now: () => Date = () => new Date(),
  electronPrintService = new ElectronPrintService()
): PrintIpcHandlers {
  return {
    async handlePrintPdf(input) {
      if (!isPrintPdfInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "printPdf requires itemIds or a containerId, plus an optional title."
        );
      }

      return await withPrintService(
        workspaceService,
        async ({ service, workspace }) => {
          const workspaceId = input.workspaceId ?? workspace.id;

          if (workspaceId !== workspace.id) {
            return apiError(
              "WORKSPACE_ERROR",
              "Print workspaceId must match the current workspace."
            );
          }

          const document = service.buildPrintHtml({
            workspaceId,
            ...(input.title === undefined ? {} : { title: input.title }),
            ...(input.itemIds === undefined ? {} : { itemIds: input.itemIds }),
            ...(input.containerId === undefined ? {} : { containerId: input.containerId })
          });
          const pdfBytes = await electronPrintService.renderPdf({
            html: document.html
          });
          const relativePath = createPrintPdfRelativePath(
            document.generatedAt,
            document.title
          );

          await ensureDirectoryInsideWorkspace(workspace.rootPath, "exports");
          await writeBinaryFileInsideWorkspace(
            workspace.rootPath,
            relativePath,
            pdfBytes
          );

          const sizeBytes = (await stat(
            resolveInsideWorkspace(workspace.rootPath, relativePath)
          )).size;
          const result = service.recordPrintPdfExport({
            workspaceId,
            relativePath,
            sizeBytes,
            sourceType: document.sourceType,
            sourceId: document.sourceId,
            itemCount: document.itemCount
          });

          return apiOk(toPrintPdfSummary(result));
        },
        now
      );
    }
  };
}

async function withPrintService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    service: PrintService;
    workspace: WorkspaceSummary;
  }) => Promise<ApiResult<T>>,
  now: () => Date
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
      service: new PrintService({ connection, now }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Print operation failed."
    );
  } finally {
    connection.close();
  }
}

function toPrintPdfSummary(result: {
  id: string;
  workspaceId: string;
  createdAt: string;
  relativePath: string;
  sizeBytes: number;
  sourceType: string;
  sourceId: string;
  itemCount: number;
}): PrintPdfSummary {
  return {
    id: result.id,
    workspaceId: result.workspaceId,
    createdAt: result.createdAt,
    relativePath: result.relativePath,
    sizeBytes: result.sizeBytes,
    sourceType: result.sourceType as PrintPdfSummary["sourceType"],
    sourceId: result.sourceId,
    itemCount: result.itemCount
  };
}

function isPrintPdfInput(input: unknown): input is PrintPdfInput {
  return (
    isRecord(input) &&
    (input.workspaceId === undefined || isNonEmptyString(input.workspaceId)) &&
    (input.title === undefined || isNonEmptyString(input.title)) &&
    (input.containerId === undefined || isNonEmptyString(input.containerId)) &&
    (input.itemIds === undefined ||
      (Array.isArray(input.itemIds) && input.itemIds.every(isNonEmptyString))) &&
    (isNonEmptyString(input.containerId) ||
      (Array.isArray(input.itemIds) && input.itemIds.length > 0))
  );
}

function createPrintPdfRelativePath(createdAt: string, title: string): string {
  return `exports/${createdAt.replace(/[:.]/g, "-")}-${slugifyFileName(title)}-print.pdf`;
}

function slugifyFileName(value: string): string {
  const slug = value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);

  return slug.length === 0 ? "view" : slug;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
