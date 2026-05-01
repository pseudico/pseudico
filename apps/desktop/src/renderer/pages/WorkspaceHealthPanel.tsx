import { Activity, Database, FolderCheck, SearchCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type {
  DatabaseHealthStatus,
  LocalWorkOsApi,
  WorkspaceSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";

type WorkspaceHealthPanelProps = {
  apiClient?: LocalWorkOsApi;
  workspace: WorkspaceSummary | null;
};

export function useDatabaseHealth(
  workspace: WorkspaceSummary | null,
  apiClient: LocalWorkOsApi = desktopApiClient
): {
  health: DatabaseHealthStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [health, setHealth] = useState<DatabaseHealthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (workspace === null) {
      setHealth(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await apiClient.database.getHealthStatus();

      if (!result.ok) {
        setError(result.error.message);
        setHealth(null);
        return;
      }

      setHealth(result.data);
      setError(result.data.error);
    } finally {
      setLoading(false);
    }
  }, [apiClient, workspace]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    health,
    loading,
    error,
    refresh
  };
}

export function WorkspaceHealthPanel({
  apiClient = desktopApiClient,
  workspace
}: WorkspaceHealthPanelProps): React.JSX.Element {
  const { health, loading, error, refresh } = useDatabaseHealth(
    workspace,
    apiClient
  );

  return (
    <WorkspaceHealthSummary
      error={error}
      health={health}
      loading={loading}
      onRefresh={() => {
        void refresh();
      }}
      workspace={workspace}
    />
  );
}

export function WorkspaceHealthSummary({
  error,
  health,
  loading,
  onRefresh,
  workspace
}: {
  error: string | null;
  health: DatabaseHealthStatus | null;
  loading: boolean;
  onRefresh?: () => void;
  workspace: WorkspaceSummary | null;
}): React.JSX.Element {
  if (workspace === null) {
    return (
      <section className="health-panel" aria-label="Workspace health">
        <div className="panel-heading">
          <FolderCheck size={18} aria-hidden="true" />
          <h2>No workspace open</h2>
        </div>
        <p className="muted-text">
          Create or open a local workspace to view database health.
        </p>
      </section>
    );
  }

  const rows = [
    {
      label: "Workspace",
      value: workspace.name,
      detail: workspace.rootPath,
      ok: health?.workspaceExists ?? false
    },
    {
      label: "Database",
      value: health?.connected ? "Connected" : "Disconnected",
      detail: health?.databasePath ?? "No database path available",
      ok: health?.connected ?? false
    },
    {
      label: "Schema version",
      value: String(health?.schemaVersion ?? workspace.schemaVersion ?? "Unknown"),
      detail: "Current local database schema",
      ok: (health?.schemaVersion ?? workspace.schemaVersion) !== null
    },
    {
      label: "Inbox",
      value: booleanLabel(health?.inboxExists),
      detail: "System Inbox seed row",
      ok: health?.inboxExists ?? false
    },
    {
      label: "Default dashboard",
      value: booleanLabel(health?.defaultDashboardExists),
      detail: "Workspace dashboard seed row",
      ok: health?.defaultDashboardExists ?? false
    },
    {
      label: "Activity log",
      value: booleanLabel(health?.activityLogAvailable),
      detail: "Workspace activity trail",
      ok: health?.activityLogAvailable ?? false
    },
    {
      label: "Search index",
      value: booleanLabel(health?.searchIndexAvailable),
      detail: "Local searchable projection table",
      ok: health?.searchIndexAvailable ?? false
    }
  ];

  return (
    <section className="health-panel" aria-label="Workspace health">
      <div className="panel-heading panel-heading-actions">
        <div>
          <Database size={18} aria-hidden="true" />
          <h2>Workspace health</h2>
        </div>
        {onRefresh === undefined ? null : (
          <button
            type="button"
            className="secondary-button compact-button"
            disabled={loading}
            onClick={onRefresh}
          >
            <Activity size={16} aria-hidden="true" />
            Refresh
          </button>
        )}
      </div>

      {loading ? <p className="muted-text">Checking local database...</p> : null}
      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      <dl className="health-grid">
        {rows.map((row) => (
          <div className="health-row" key={row.label}>
            <dt>
              <StatusIndicator ok={row.ok} />
              <span>{row.label}</span>
            </dt>
            <dd>
              <strong>{row.value}</strong>
              <span>{row.detail}</span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="health-footer">
        <SearchCheck size={16} aria-hidden="true" />
        <span>All checks run through the typed preload API.</span>
      </div>
    </section>
  );
}

function StatusIndicator({ ok }: { ok: boolean }): React.JSX.Element {
  return (
    <span
      className={ok ? "status-dot" : "status-dot status-dot-warning"}
      aria-hidden="true"
    />
  );
}

function booleanLabel(value: boolean | undefined): string {
  if (value === undefined) {
    return "Unknown";
  }

  return value ? "Yes" : "No";
}
