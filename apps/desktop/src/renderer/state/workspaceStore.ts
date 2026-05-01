import { useSyncExternalStore } from "react";
import type { LocalWorkOsApi, WorkspaceSummary } from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";

export type WorkspaceStoreState = {
  currentWorkspace: WorkspaceSummary | null;
  loading: boolean;
  error: string | null;
};

const initialState: WorkspaceStoreState = {
  currentWorkspace: null,
  loading: false,
  error: null
};

let state = initialState;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setState(patch: Partial<WorkspaceStoreState>): void {
  state = {
    ...state,
    ...patch
  };
  emit();
}

export const workspaceStore = {
  getSnapshot: () => state,
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setCurrentWorkspace(currentWorkspace: WorkspaceSummary | null): void {
    setState({
      currentWorkspace,
      error: null
    });
  },
  setLoading(loading: boolean): void {
    setState({ loading });
  },
  setError(error: string | null): void {
    setState({ error });
  },
  reset(): void {
    state = initialState;
    emit();
  }
};

export function useWorkspaceStore(): WorkspaceStoreState {
  return useSyncExternalStore(
    workspaceStore.subscribe,
    workspaceStore.getSnapshot,
    workspaceStore.getSnapshot
  );
}

export async function refreshCurrentWorkspace(
  apiClient: LocalWorkOsApi = desktopApiClient
): Promise<WorkspaceSummary | null> {
  workspaceStore.setLoading(true);

  try {
    const result = await apiClient.workspace.getCurrentWorkspace();

    if (!result.ok) {
      workspaceStore.setError(result.error.message);
      return null;
    }

    workspaceStore.setCurrentWorkspace(result.data);
    return result.data;
  } finally {
    workspaceStore.setLoading(false);
  }
}
