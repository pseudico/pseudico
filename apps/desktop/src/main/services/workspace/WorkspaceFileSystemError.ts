export type WorkspaceFileSystemErrorCode =
  | "INVALID_INPUT"
  | "INVALID_PATH"
  | "WORKSPACE_ERROR";

export class WorkspaceFileSystemError extends Error {
  readonly code: WorkspaceFileSystemErrorCode;

  constructor(code: WorkspaceFileSystemErrorCode, message: string) {
    super(message);
    this.name = "WorkspaceFileSystemError";
    this.code = code;
  }
}
