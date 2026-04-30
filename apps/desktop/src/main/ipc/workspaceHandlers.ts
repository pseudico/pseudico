import {
  apiError,
  apiOk,
  type ApiResult,
  type CreateWorkspaceInput,
  type OpenWorkspaceInput,
  type RecentWorkspace,
  type ValidateWorkspaceInput,
  type WorkspaceSummary,
  type WorkspaceValidationResult
} from "../../preload/api";
import { WorkspaceFileSystemError } from "../services/workspace/WorkspaceFileSystemError";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateCreateWorkspaceInput(
  input: unknown
): input is CreateWorkspaceInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.name) &&
    isNonEmptyString(input.rootPath)
  );
}

function validateOpenWorkspaceInput(input: unknown): input is OpenWorkspaceInput {
  return isRecord(input) && isNonEmptyString(input.rootPath);
}

function validateValidateWorkspaceInput(
  input: unknown
): input is ValidateWorkspaceInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.rootPath) &&
    (input.repair === undefined || typeof input.repair === "boolean")
  );
}

function workspaceError<T>(error: unknown): ApiResult<T> {
  if (error instanceof WorkspaceFileSystemError) {
    return apiError(
      error.code === "INVALID_INPUT" || error.code === "INVALID_PATH"
        ? "INVALID_INPUT"
        : "WORKSPACE_ERROR",
      error.message
    );
  }

  return apiError(
    "WORKSPACE_ERROR",
    error instanceof Error ? error.message : "Workspace operation failed."
  );
}

export type WorkspaceIpcHandlers = {
  handleCreateWorkspace: (
    input: unknown
  ) => Promise<ApiResult<WorkspaceSummary>>;
  handleOpenWorkspace: (input: unknown) => Promise<ApiResult<WorkspaceSummary>>;
  handleValidateWorkspace: (
    input: unknown
  ) => Promise<ApiResult<WorkspaceValidationResult>>;
  handleGetCurrentWorkspace: () => ApiResult<WorkspaceSummary | null>;
  handleListRecentWorkspaces: () => Promise<ApiResult<RecentWorkspace[]>>;
};

export function createWorkspaceIpcHandlers(
  workspaceService: WorkspaceFileSystemService
): WorkspaceIpcHandlers {
  return {
    async handleCreateWorkspace(input) {
      if (!validateCreateWorkspaceInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createWorkspace requires non-empty name and rootPath fields."
        );
      }

      try {
        return apiOk(await workspaceService.createWorkspace(input));
      } catch (error) {
        return workspaceError(error);
      }
    },

    async handleOpenWorkspace(input) {
      if (!validateOpenWorkspaceInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "openWorkspace requires a non-empty rootPath field."
        );
      }

      try {
        return apiOk(await workspaceService.openWorkspace(input));
      } catch (error) {
        return workspaceError(error);
      }
    },

    async handleValidateWorkspace(input) {
      if (!validateValidateWorkspaceInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "validateWorkspace requires a non-empty rootPath field and optional repair boolean."
        );
      }

      try {
        return apiOk(await workspaceService.validateWorkspace(input));
      } catch (error) {
        return workspaceError(error);
      }
    },

    handleGetCurrentWorkspace() {
      return apiOk(workspaceService.getCurrentWorkspace());
    },

    async handleListRecentWorkspaces() {
      return apiOk(await workspaceService.listRecentWorkspaces());
    }
  };
}
