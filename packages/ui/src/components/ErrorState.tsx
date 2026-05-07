import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export type UserErrorLike = {
  code?: unknown;
  error?: unknown;
  message?: unknown;
};

export type ErrorStateProps = {
  action?: ReactNode;
  error: unknown;
  title?: string;
};

export function formatUserError(error: unknown): string {
  if (error === null || error === undefined) {
    return "Something went wrong.";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object") {
    const errorLike = error as UserErrorLike;

    if (errorLike.error !== undefined) {
      return formatUserError(errorLike.error);
    }

    if (typeof errorLike.message === "string" && errorLike.message.length > 0) {
      if (errorLike.code === "WORKSPACE_ERROR") {
        return `Workspace problem: ${errorLike.message}`;
      }

      if (errorLike.code === "IPC_ERROR") {
        return `Local app bridge error: ${errorLike.message}`;
      }

      return errorLike.message;
    }
  }

  return "Something went wrong.";
}

export function ErrorState({
  action,
  error,
  title = "Unable to load this view"
}: ErrorStateProps): React.JSX.Element {
  return (
    <div className="error-state" role="alert">
      <AlertTriangle size={24} aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{formatUserError(error)}</p>
      </div>
      {action === undefined ? null : (
        <div className="error-state-action">{action}</div>
      )}
    </div>
  );
}
