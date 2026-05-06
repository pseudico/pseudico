import {
  Archive,
  FileJson,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { CategoryBadge } from "@local-work-os/ui";
import { WorkspaceHealthPanel } from "./WorkspaceHealthPanel";
import {
  refreshCurrentWorkspace,
  useWorkspaceStore
} from "../state/workspaceStore";
import { desktopApiClient } from "../api/desktopApiClient";
import type {
  BackupSnapshotSummary,
  CategorySummary,
  LocalWorkOsApi
} from "../../preload/api";

type SettingsPageProps = {
  apiClient?: LocalWorkOsApi;
  initialCategories?: CategorySummary[];
};

const defaultCategoryColor = "#2c6b8f";

export function SettingsPage({
  apiClient = desktopApiClient,
  initialCategories = []
}: SettingsPageProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const [categories, setCategories] =
    useState<CategorySummary[]>(initialCategories);
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultCategoryColor);
  const [description, setDescription] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [backups, setBackups] = useState<BackupSnapshotSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  useEffect(() => {
    void refreshCurrentWorkspace(apiClient);
  }, [apiClient]);

  useEffect(() => {
    if (currentWorkspace === null) {
      setBackups([]);
      return;
    }

    let active = true;

    async function loadSettingsData(): Promise<void> {
      setError(null);
      const [categoryResult, backupResult] = await Promise.all([
        apiClient.categories.list(currentWorkspace!.id),
        apiClient.backup.listBackups({ workspaceId: currentWorkspace!.id })
      ]);

      if (!active) {
        return;
      }

      if (!categoryResult.ok) {
        setError(categoryResult.error.message);
        return;
      }

      if (!backupResult.ok) {
        setError(backupResult.error.message);
        return;
      }

      setCategories(categoryResult.data);
      setBackups(backupResult.data);
    }

    void loadSettingsData();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace]);

  async function createCategory(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (currentWorkspace === null) {
      setError("Open a workspace before creating categories.");
      return;
    }

    if (name.trim().length === 0) {
      setError("Category name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await apiClient.categories.create({
      workspaceId: currentWorkspace.id,
      name,
      color,
      description: description.length === 0 ? null : description
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCategories((current) => [...current, result.data].sort(compareCategories));
    setName("");
    setDescription("");
    setColor(defaultCategoryColor);
  }

  async function updateCategory(
    category: CategorySummary,
    patch: Partial<Pick<CategorySummary, "color" | "description" | "name">>
  ): Promise<void> {
    setBusyId(category.id);
    setError(null);

    const result = await apiClient.categories.update({
      categoryId: category.id,
      ...patch
    });

    setBusyId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCategories((current) =>
      current
        .map((candidate) =>
          candidate.id === result.data.id ? result.data : candidate
        )
        .sort(compareCategories)
    );
  }

  async function deleteCategory(categoryId: string): Promise<void> {
    setBusyId(categoryId);
    setError(null);

    const result = await apiClient.categories.delete(categoryId);

    setBusyId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCategories((current) =>
      current.filter((category) => category.id !== categoryId)
    );
  }

  async function refreshBackups(): Promise<void> {
    if (currentWorkspace === null) {
      setError("Open a workspace before listing backups.");
      return;
    }

    setBackupBusy(true);
    setError(null);

    const result = await apiClient.backup.listBackups({
      workspaceId: currentWorkspace.id
    });

    setBackupBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setBackups(result.data);
  }

  async function createManualBackup(): Promise<void> {
    if (currentWorkspace === null) {
      setError("Open a workspace before creating a backup.");
      return;
    }

    setBackupBusy(true);
    setBackupMessage(null);
    setError(null);

    const result = await apiClient.backup.createManualBackup({
      workspaceId: currentWorkspace.id
    });

    setBackupBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setBackups((current) =>
      [result.data, ...current.filter((backup) => backup.id !== result.data.id)].sort(
        compareBackups
      )
    );
    setBackupMessage(`Backup created at ${result.data.relativePath}.`);
  }

  async function exportWorkspaceJson(): Promise<void> {
    if (currentWorkspace === null) {
      setError("Open a workspace before exporting workspace JSON.");
      return;
    }

    setExportBusy(true);
    setExportMessage(null);
    setError(null);

    const result = await apiClient.export.exportWorkspaceJson({
      workspaceId: currentWorkspace.id
    });

    setExportBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setExportMessage(
      `Workspace JSON export created at ${result.data.relativePath}.`
    );
  }

  async function exportTasks(format: "csv" | "tsv"): Promise<void> {
    if (currentWorkspace === null) {
      setError("Open a workspace before exporting tasks.");
      return;
    }

    setExportBusy(true);
    setExportMessage(null);
    setError(null);

    const result = await apiClient.export.exportTasksCsv({
      workspaceId: currentWorkspace.id,
      format
    });

    setExportBusy(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setExportMessage(
      `Task ${format.toUpperCase()} export created at ${result.data.relativePath}.`
    );
  }

  return (
    <section className="settings-layout">
      <div className="page-heading">
        <p className="top-eyebrow">Settings</p>
        <h2>Workspace settings</h2>
        <p>
          {currentWorkspace === null
            ? "Open a workspace to view local database details."
            : currentWorkspace.rootPath}
        </p>
      </div>
      <WorkspaceHealthPanel workspace={currentWorkspace} />
      <section className="backup-management-panel" aria-label="Backups">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Backups</h3>
          </div>
          <div className="top-actions">
            <button
              className="secondary-button compact-button"
              disabled={backupBusy || currentWorkspace === null}
              type="button"
              onClick={() => void refreshBackups()}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Refresh
            </button>
            <button
              className="primary-button compact-button"
              disabled={backupBusy || currentWorkspace === null}
              type="button"
              onClick={() => void createManualBackup()}
            >
              <Archive size={16} aria-hidden="true" />
              Create backup
            </button>
          </div>
        </div>

        {backupMessage === null ? null : (
          <p className="form-message">{backupMessage}</p>
        )}

        <div className="backup-list" aria-label="Backup list">
          {backups.length === 0 ? (
            <p className="muted-text">No backups yet.</p>
          ) : (
            backups.map((backup) => (
              <BackupListRow key={backup.id} backup={backup} />
            ))
          )}
        </div>
      </section>
      <section className="export-management-panel" aria-label="Exports">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Exports</h3>
          </div>
          <div className="top-actions">
            <button
              className="primary-button compact-button"
              disabled={exportBusy || currentWorkspace === null}
              type="button"
              onClick={() => void exportWorkspaceJson()}
            >
              <FileJson size={16} aria-hidden="true" />
              Export JSON
            </button>
            <button
              className="secondary-button compact-button"
              disabled={exportBusy || currentWorkspace === null}
              type="button"
              onClick={() => void exportTasks("csv")}
            >
              <FileSpreadsheet size={16} aria-hidden="true" />
              Export tasks CSV
            </button>
            <button
              className="secondary-button compact-button"
              disabled={exportBusy || currentWorkspace === null}
              type="button"
              onClick={() => void exportTasks("tsv")}
            >
              <FileSpreadsheet size={16} aria-hidden="true" />
              Export tasks TSV
            </button>
          </div>
        </div>

        {exportMessage === null ? (
          <p className="muted-text">No workspace JSON export created this session.</p>
        ) : (
          <p className="form-message">{exportMessage}</p>
        )}
      </section>
      <section className="category-management-panel" aria-label="Categories">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Categories</h3>
          </div>
        </div>

        {error === null ? null : (
          <p className="form-message form-message-error">{error}</p>
        )}

        <form className="category-form" onSubmit={createCategory}>
          <label>
            <span>Name</span>
            <input
              disabled={saving || currentWorkspace === null}
              placeholder="Client, Finance, Research"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            <span>Color</span>
            <input
              disabled={saving || currentWorkspace === null}
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </label>
          <label>
            <span>Description</span>
            <input
              disabled={saving || currentWorkspace === null}
              placeholder="Optional local classification note"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <button
            className="primary-button"
            disabled={saving || currentWorkspace === null}
            type="submit"
          >
            <Plus size={17} aria-hidden="true" />
            Add
          </button>
        </form>

        <div className="category-list" aria-label="Category list">
          {categories.length === 0 ? (
            <p className="muted-text">No categories yet.</p>
          ) : (
            categories.map((category) => (
              <CategoryListRow
                key={category.id}
                busy={busyId === category.id}
                category={category}
                onDelete={deleteCategory}
                onUpdate={updateCategory}
              />
            ))
          )}
        </div>
      </section>
      <aside className="local-only-panel" aria-label="Local-only status">
        <ShieldCheck size={20} aria-hidden="true" />
        <div>
          <h3>Local-only boundary</h3>
          <p>No cloud sync, hosted accounts, telemetry, or remote storage.</p>
        </div>
      </aside>
    </section>
  );
}

function CategoryListRow({
  busy,
  category,
  onDelete,
  onUpdate
}: {
  busy: boolean;
  category: CategorySummary;
  onDelete: (categoryId: string) => Promise<void>;
  onUpdate: (
    category: CategorySummary,
    patch: Partial<Pick<CategorySummary, "color" | "description" | "name">>
  ) => Promise<void>;
}): React.JSX.Element {
  return (
    <div className="category-list-row">
      <div className="category-list-main">
        <CategoryBadge category={category} />
        <span>{category.description ?? "No description"}</span>
      </div>
      <input
        aria-label={`Rename ${category.name}`}
        defaultValue={category.name}
        disabled={busy}
        onBlur={(event) => {
          if (event.target.value !== category.name) {
            void onUpdate(category, { name: event.target.value });
          }
        }}
      />
      <div className="top-actions">
        <input
          aria-label={`Color for ${category.name}`}
          disabled={busy}
          type="color"
          value={category.color}
          onChange={(event) =>
            void onUpdate(category, { color: event.target.value })
          }
        />
        <button
          className="secondary-button compact-button"
          disabled={busy}
          type="button"
          onClick={() => void onDelete(category.id)}
        >
          <Trash2 size={16} aria-hidden="true" />
          Delete
        </button>
      </div>
    </div>
  );
}

function compareCategories(left: CategorySummary, right: CategorySummary): number {
  return left.name.localeCompare(right.name);
}

function BackupListRow({
  backup
}: {
  backup: BackupSnapshotSummary;
}): React.JSX.Element {
  return (
    <div className="backup-list-row">
      <div>
        <strong>{formatBackupDate(backup.createdAt)}</strong>
        <span>{backup.relativePath}</span>
      </div>
      <div className="backup-list-meta">
        <span>{backup.attachmentCount} attachments</span>
        <span>{formatBytes(backup.totalAttachmentBytes)} manifest total</span>
        <span>
          {backup.databaseSizeBytes === null
            ? "Database copy missing"
            : `${formatBytes(backup.databaseSizeBytes)} database`}
        </span>
      </div>
    </div>
  );
}

function compareBackups(
  left: BackupSnapshotSummary,
  right: BackupSnapshotSummary
): number {
  return right.createdAt.localeCompare(left.createdAt);
}

function formatBackupDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
