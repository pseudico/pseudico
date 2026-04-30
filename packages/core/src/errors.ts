export type LocalWorkOsErrorCode =
  | "INVALID_INPUT"
  | "INVALID_PATH"
  | "WORKSPACE_ERROR";

export class LocalWorkOsError extends Error {
  readonly code: LocalWorkOsErrorCode;

  constructor(code: LocalWorkOsErrorCode, message: string) {
    super(message);
    this.name = "LocalWorkOsError";
    this.code = code;
  }
}
