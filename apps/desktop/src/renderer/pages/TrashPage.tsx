import { RefreshCw, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { EmptyState, ErrorState, formatAustralianDateTime, formatUserError } from "@local-work-os/ui";
import { desktopApiClient } from "../api/desktopApiClient";
import { showToast } from "../shell/toastStore";
import {
  refreshCurrentWorkspace,
  useWorkspaceStore
} from "../state/workspaceStore";
import type {
  LocalWorkOsApi,
  TrashEntrySummary,
  TrashTargetTypeSummary
} from "../../preload/api";

type TrashPageProps = {
  apiClient?: LocalWorkOsApi;
  initialEntries?: TrashEntrySummary[];
};

export function TrashPage({
  apiClient = desktopApiClient,
  initialEntries
}: TrashPageProps = {}): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const [entries, setEntries] = useState<TrashEntrySummary[]>(initialEntries ?? []);
  const [loading, setLoading] = useState(initialEntries === undefined);
  const [busyTarget, setBusyTarget] = useState<string | null>(null);
  const [clearBusy, setClearBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => groupTrash(entries), [entries]);

  useEffect(() => {
    void refreshCurrentWorkspace(apiClient);
  }, [apiClient]);

  useEffect(() => {
    if (initialEntries !== undefined) {
      return;
    }

    if (currentWorkspace === null) {
      setEntries([]);
      setLoading(false);
      return;
    }

    let active = true;
    void loadTrash(active);

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, initialEntries]);

  async function loadTrash(active = true): Promise<void> {
    if (currentWorkspace === null) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const result = await apiClient.trash!.listTrash({
      workspaceId: currentWorkspace.id
    });

    if (!active) {
      return;
    }

    setLoading(false);
    if (!result.ok) {
      setUserError(result.error, "Trash unavailable");
      return;
    }

    setEntries(result.data);
  }

  async function restoreEntry(entry: TrashEntrySummary): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before restoring Trash records.");
      return;
    }

    setBusyTarget(`${entry.targetType}:${entry.id}`);
    setError(null);
    const result = await apiClient.trash!.restoreTrash({
      workspaceId: currentWorkspace.id,
      targetType: entry.targetType,
      targetId: entry.id
    });
    setBusyTarget(null);

    if (!result.ok) {
      setUserError(result.error, "Restore failed");
      return;
    }

    setEntries((current) =>
      current.filter(
        (candidate) =>
          candidate.id !== entry.id || candidate.targetType !== entry.targetType
      )
    );
    const text = `Restored ${entry.title} from Trash.`;
    setMessage(text);
    showToast(text, { title: "Trash restored", tone: "success" });
  }

  async function clearTrash(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before clearing Trash.");
      return;
    }

    if (!confirmClear) {
      setUserError("Confirm the backup preflight before clearing Trash.");
      return;
    }

    setClearBusy(true);
    setError(null);
    setMessage(null);
    const result = await apiClient.trash!.clearTrash({
      workspaceId: currentWorkspace.id,
      confirmed: true
    });
    setClearBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Clear Trash failed");
      return;
    }

    setEntries([]);
    setConfirmClear(false);
    const text = `Created backup ${result.data.backupSnapshotId} and cleared ${result.data.clearedCount} Trash record${result.data.clearedCount === 1 ? "" : "s"}.`;
    setMessage(text);
    showToast(text, { title: "Trash cleared", tone: "success" });
  }

  function setUserError(error: unknown, title = "Trash action failed"): void {
    const formatted = formatUserError(error);
    setError(formatted);
    showToast(formatted, { title, tone: "error" });
  }

  if (currentWorkspace === null) {
    return (
      <section className="content-page trash-page" data-space-budget-surface="maintenance-trash">
        <PageHeader onRefresh={() => void refreshCurrentWorkspace(apiClient)} />
        <EmptyState
          icon={<Trash2 size={24} aria-hidden="true" />}
          title="Open a workspace to use Trash"
          description="Soft-deleted local records appear here after a workspace is open."
        />
      </section>
    );
  }

  return (
    <section className="content-page trash-page" data-space-budget-surface="maintenance-trash">
      <PageHeader onRefresh={() => void loadTrash()} />

      <div className="trash-toolbar" aria-label="Trash controls">
        <div>
          <strong>{entries.length}</strong> recoverable records
          <p>Restore individual records or clear Trash after an automatic local backup.</p>
        </div>
        <button
          className="danger-button"
          disabled={clearBusy || entries.length === 0 || !confirmClear}
          onClick={() => void clearTrash()}
          type="button"
        >
          <ShieldCheck size={16} aria-hidden="true" />
          {clearBusy ? "Backing up?" : "Clear Trash"}
        </button>
      </div>

      <label className="trash-confirm-row">
        <input
          checked={confirmClear}
          disabled={entries.length === 0 || clearBusy}
          onChange={(event) => setConfirmClear(event.currentTarget.checked)}
          type="checkbox"
        />
        Create a local backup first, then permanently purge the soft-deleted records shown here.
      </label>

      {message === null ? null : <p className="form-message form-message-ok">{message}</p>}
      {error === null ? null : <ErrorState error={error} title="Trash action failed" />}

      {loading ? (
        <p className="form-message">Loading Trash?</p>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<Trash2 size={24} aria-hidden="true" />}
          title="Trash is empty"
          description="Deleted projects, contacts, items, list rows, and attachments will appear here for recovery."
        />
      ) : (
        <div className="trash-groups">
          {grouped.map((group) => (
            <section className="trash-group" key={group.targetType}>
              <h3>{formatTargetType(group.targetType)}</h3>
              <div className="trash-list">
                {group.entries.map((entry) => (
                  <TrashRow
                    busy={busyTarget === `${entry.targetType}:${entry.id}`}
                    entry={entry}
                    key={`${entry.targetType}:${entry.id}`}
                    onRestore={restoreEntry}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function PageHeader({ onRefresh }: { onRefresh: () => void }): React.JSX.Element {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">Local recovery</p>
        <h1>Trash</h1>
        <p>Review soft-deleted local records, restore mistakes, or clear Trash after a backup preflight.</p>
      </div>
      <button className="secondary-button" onClick={onRefresh} type="button">
        <RefreshCw size={16} aria-hidden="true" />
        Refresh
      </button>
    </header>
  );
}

function TrashRow({
  busy,
  entry,
  onRestore
}: {
  busy: boolean;
  entry: TrashEntrySummary;
  onRestore: (entry: TrashEntrySummary) => Promise<void>;
}): React.JSX.Element {
  return (
    <article className="trash-row">
      <div>
        <strong>{entry.title}</strong>
        <p>{entry.subtitle ?? formatTargetType(entry.targetType)}</p>
        <div className="trash-row-meta">
          <span>Deleted {formatDate(entry.deletedAt)}</span>
          {entry.originalContainerName === null ? null : (
            <span>From {entry.originalContainerName}</span>
          )}
          {entry.parentItemTitle === null ? null : (
            <span>Parent {entry.parentItemTitle}</span>
          )}
        </div>
      </div>
      <button
        className="secondary-button"
        disabled={busy}
        onClick={() => void onRestore(entry)}
        type="button"
      >
        <RotateCcw size={16} aria-hidden="true" />
        {busy ? "Restoring?" : "Restore"}
      </button>
    </article>
  );
}

function groupTrash(entries: TrashEntrySummary[]): Array<{
  targetType: TrashTargetTypeSummary;
  entries: TrashEntrySummary[];
}> {
  const order: TrashTargetTypeSummary[] = ["container", "item", "list_item", "attachment"];
  return order
    .map((targetType) => ({
      targetType,
      entries: entries.filter((entry) => entry.targetType === targetType)
    }))
    .filter((group) => group.entries.length > 0);
}

function formatTargetType(targetType: TrashTargetTypeSummary): string {
  switch (targetType) {
    case "container":
      return "Containers";
    case "item":
      return "Items";
    case "list_item":
      return "List items";
    case "attachment":
      return "Attachments";
  }
}

function formatDate(value: string): string {
  return formatAustralianDateTime(value);
}
