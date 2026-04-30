import {
  apiError,
  apiOk,
  type ApiResult,
  type CreateWorkspaceInput,
  type OpenWorkspaceInput,
  type RecentWorkspace,
  type WorkspaceSummary
} from "../../preload/api";

const workspaceImplementationMessage =
  "Workspace filesystem operations are reserved for LWO-M1-003.";

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

export function handleCreateWorkspace(
  input: unknown
): ApiResult<WorkspaceSummary> {
  if (!validateCreateWorkspaceInput(input)) {
    return apiError(
      "INVALID_INPUT",
      "createWorkspace requires non-empty name and rootPath fields."
    );
  }

  return apiError("NOT_IMPLEMENTED", workspaceImplementationMessage);
}

export function handleOpenWorkspace(
  input: unknown
): ApiResult<WorkspaceSummary> {
  if (!validateOpenWorkspaceInput(input)) {
    return apiError(
      "INVALID_INPUT",
      "openWorkspace requires a non-empty rootPath field."
    );
  }

  return apiError("NOT_IMPLEMENTED", workspaceImplementationMessage);
}

export function handleGetCurrentWorkspace(): ApiResult<WorkspaceSummary | null> {
  return apiOk(null);
}

export function handleListRecentWorkspaces(): ApiResult<RecentWorkspace[]> {
  return apiOk([]);
}
