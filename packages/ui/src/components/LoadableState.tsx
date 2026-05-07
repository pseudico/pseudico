import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";

export type LoadableState = {
  empty?: boolean;
  emptyDescription?: string;
  emptyTitle?: string;
  error?: unknown;
  loading?: boolean;
  loadingLabel?: string;
};

export function renderLoadableState(
  state: LoadableState
): ReactNode | null {
  if (state.loading === true) {
    return (
      <div className="loading-state" aria-busy="true">
        <Loader2 size={18} aria-hidden="true" />
        <span>{state.loadingLabel ?? "Loading..."}</span>
      </div>
    );
  }

  if (state.error !== null && state.error !== undefined) {
    return <ErrorState error={state.error} />;
  }

  if (state.empty === true) {
    return (
      <EmptyState
        description={state.emptyDescription ?? "Content will appear here."}
        title={state.emptyTitle ?? "Nothing to show"}
      />
    );
  }

  return null;
}
