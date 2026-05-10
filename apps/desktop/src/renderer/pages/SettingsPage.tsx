import {
  Archive,
  FileJson,
  FileSpreadsheet,
  Keyboard,
  Palette,
  Plus,
  RefreshCw,
  ShieldCheck,
  Upload,
  Trash2
} from "lucide-react";
import {
  createShortcutRegistry,
  defaultShortcutDescriptors,
  type RegisteredShortcut
} from "@local-work-os/core";
import { useEffect, useState, type FormEvent } from "react";
import {
  CategoryBadge,
  EmptyState,
  ErrorState,
  formatUserError
} from "@local-work-os/ui";
import { WorkspaceHealthPanel } from "./WorkspaceHealthPanel";
import {
  refreshCurrentWorkspace,
  useWorkspaceStore
} from "../state/workspaceStore";
import { desktopApiClient } from "../api/desktopApiClient";
import { showToast } from "../shell/toastStore";
import { useAppearanceSettings } from "../theme/ThemeProvider";
import type {
  AppearanceDensityPreference,
  AppearanceFontSizePreference,
  AppearanceThemePreference,
  BackupSnapshotSummary,
  CategorySummary,
  ImportValidationSummary,
  LocalWorkOsApi,
  RestoreWorkspaceSummary,
  WorkspaceIntegritySummary
} from "../../preload/api";

type SettingsPageProps = {
  apiClient?: LocalWorkOsApi;
  initialCategories?: CategorySummary[];
};

const defaultCategoryColor = "#2c6b8f";
const shortcutGroups = groupShortcuts(
  createShortcutRegistry(defaultShortcutDescriptors).list()
);

type AppearanceDraft = {
  theme: AppearanceThemePreference;
  density: AppearanceDensityPreference;
  fontSize: AppearanceFontSizePreference;
};

export function SettingsPage({
  apiClient = desktopApiClient,
  initialCategories = []
}: SettingsPageProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const appearance = useAppearanceSettings();
  const [categories, setCategories] =
    useState<CategorySummary[]>(initialCategories);
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceDraft>({
    theme: appearance.settings.theme,
    density: appearance.settings.density,
    fontSize: appearance.settings.fontSize
  });
  const [appearanceSaving, setAppearanceSaving] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(defaultCategoryColor);
  const [description, setDescription] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [backups, setBackups] = useState<BackupSnapshotSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [restoreTargetPath, setRestoreTargetPath] = useState("");
  const [restoreExportPath, setRestoreExportPath] = useState("");
  const [restoreSummary, setRestoreSummary] =
    useState<RestoreWorkspaceSummary | null>(null);
  const [diagnosticsBusy, setDiagnosticsBusy] = useState(false);
  const [diagnosticsReport, setDiagnosticsReport] =
    useState<WorkspaceIntegritySummary | null>(null);
  const [importSummary, setImportSummary] =
    useState<ImportValidationSummary | null>(null);

  function setUserError(error: unknown, title = "Settings action failed"): void {
    const message = formatUserError(error);
    setError(message);
    showToast(message, {
      title,
      tone: "error"
    });
  }

  useEffect(() => {
    void refreshCurrentWorkspace(apiClient);
  }, [apiClient]);

  useEffect(() => {
    setAppearanceDraft({
      theme: appearance.settings.theme,
      density: appearance.settings.density,
      fontSize: appearance.settings.fontSize
    });
  }, [
    appearance.settings.density,
    appearance.settings.fontSize,
    appearance.settings.theme
  ]);

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
        setUserError(categoryResult.error, "Categories unavailable");
        return;
      }

      if (!backupResult.ok) {
        setUserError(backupResult.error, "Backups unavailable");
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
      setUserError("Open a workspace before creating categories.");
      return;
    }

    if (name.trim().length === 0) {
      setUserError("Category name is required.");
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
      setUserError(result.error);
      return;
    }

    setCategories((current) => [...current, result.data].sort(compareCategories));
    setName("");
    setDescription("");
    setColor(defaultCategoryColor);
    showToast(`${result.data.name} category created.`, {
      title: "Category ready",
      tone: "success"
    });
  }

  async function saveAppearanceSettings(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (currentWorkspace === null) {
      setUserError("Open a workspace before changing appearance settings.");
      return;
    }

    setAppearanceSaving(true);
    setError(null);

    try {
      await appearance.updateSettings(appearanceDraft);
      showToast("Appearance preferences saved.", {
        title: "Appearance updated",
        tone: "success"
      });
    } catch (error) {
      setUserError(error, "Appearance update failed");
    } finally {
      setAppearanceSaving(false);
    }
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
      setUserError(result.error);
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
      setUserError(result.error);
      return;
    }

    setCategories((current) =>
      current.filter((category) => category.id !== categoryId)
    );
  }

  async function refreshBackups(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before listing backups.");
      return;
    }

    setBackupBusy(true);
    setError(null);

    const result = await apiClient.backup.listBackups({
      workspaceId: currentWorkspace.id
    });

    setBackupBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Backups unavailable");
      return;
    }

    setBackups(result.data);
    showToast("Backup list refreshed.", {
      title: "Backups",
      tone: "success"
    });
  }

  async function createManualBackup(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before creating a backup.");
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
      setUserError(result.error, "Backup failed");
      return;
    }

    setBackups((current) =>
      [result.data, ...current.filter((backup) => backup.id !== result.data.id)].sort(
        compareBackups
      )
    );
    const message = `Backup created at ${result.data.relativePath}.`;
    setBackupMessage(message);
    showToast(message, {
      title: "Backup complete",
      tone: "success"
    });
  }

  async function runWorkspaceDiagnostics(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before running diagnostics.");
      return;
    }

    setDiagnosticsBusy(true);
    setDiagnosticsReport(null);
    setError(null);

    const result = await apiClient.diagnostics.runWorkspaceIntegrityCheck({
      workspaceId: currentWorkspace.id
    });

    setDiagnosticsBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Diagnostics failed");
      return;
    }

    setDiagnosticsReport(result.data);
    showToast(
      result.data.status === "healthy"
        ? "Workspace diagnostics passed."
        : `${result.data.issueCount} workspace diagnostics issue(s) found.`,
      {
        title: "Diagnostics complete",
        tone: result.data.status === "healthy" ? "success" : "error"
      }
    );
  }

  async function exportWorkspaceJson(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before exporting workspace JSON.");
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
      setUserError(result.error, "Export failed");
      return;
    }

    const message = `Workspace JSON export created at ${result.data.relativePath}.`;
    setExportMessage(message);
    showToast(message, {
      title: "Export complete",
      tone: "success"
    });
  }

  async function exportTasks(format: "csv" | "tsv"): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before exporting tasks.");
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
      setUserError(result.error, "Export failed");
      return;
    }

    const message = `Task ${format.toUpperCase()} export created at ${result.data.relativePath}.`;
    setExportMessage(message);
    showToast(message, {
      title: "Export complete",
      tone: "success"
    });
  }

  async function validateWorkspaceImport(): Promise<void> {
    setImportBusy(true);
    setImportSummary(null);
    setError(null);

    const result = await apiClient.import.chooseAndValidateWorkspaceExportJson();

    setImportBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Import validation failed");
      return;
    }

    setImportSummary(result.data);
    if (result.data !== null) {
      showToast(
        result.data.valid
          ? "Workspace export JSON is valid."
          : "Workspace export JSON has blocking issues.",
        {
          title: "Import validation complete",
          tone: result.data.valid ? "success" : "error"
        }
      );
    }
  }

  async function restoreBackup(backup: BackupSnapshotSummary): Promise<void> {
    if (restoreTargetPath.trim().length === 0) {
      setUserError("Enter a new target workspace folder before restoring.");
      return;
    }

    setRestoreBusy(true);
    setRestoreMessage(null);
    setRestoreSummary(null);
    setError(null);

    const result = await apiClient.backup.restoreBackupToNewWorkspace({
      backupRelativePath: backup.relativePath,
      targetRootPath: restoreTargetPath.trim()
    });

    setRestoreBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Restore failed");
      return;
    }

    setRestoreSummary(result.data);
    const message = `Backup restored into ${result.data.targetWorkspaceRootPath}.`;
    setRestoreMessage(message);
    showToast(message, {
      title: "Restore complete",
      tone: "success"
    });
    void refreshCurrentWorkspace(apiClient);
  }

  async function restoreWorkspaceExport(): Promise<void> {
    if (restoreExportPath.trim().length === 0) {
      setUserError("Enter a workspace export JSON file path before restoring.");
      return;
    }

    if (restoreTargetPath.trim().length === 0) {
      setUserError("Enter a new target workspace folder before restoring.");
      return;
    }

    setRestoreBusy(true);
    setRestoreMessage(null);
    setRestoreSummary(null);
    setError(null);

    const result = await apiClient.backup.restoreExportToNewWorkspace({
      filePath: restoreExportPath.trim(),
      targetRootPath: restoreTargetPath.trim()
    });

    setRestoreBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Restore failed");
      return;
    }

    setRestoreSummary(result.data);
    const message = `Workspace export restored into ${result.data.targetWorkspaceRootPath}.`;
    setRestoreMessage(message);
    showToast(message, {
      title: "Restore complete",
      tone: "success"
    });
    void refreshCurrentWorkspace(apiClient);
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

      <section className="backup-management-panel" aria-label="Appearance">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Appearance</h3>
            <p className="muted-text">
              Choose local-only theme, density, and font size preferences for this workspace.
            </p>
          </div>
          <Palette size={20} aria-hidden="true" />
        </div>
        <form className="appearance-settings-form" onSubmit={saveAppearanceSettings}>
          <label>
            Theme
            <select
              disabled={appearanceSaving || currentWorkspace === null}
              value={appearanceDraft.theme}
              onChange={(event) =>
                setAppearanceDraft((current) => ({
                  ...current,
                  theme: event.target.value as AppearanceThemePreference
                }))
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label>
            Density
            <select
              disabled={appearanceSaving || currentWorkspace === null}
              value={appearanceDraft.density}
              onChange={(event) =>
                setAppearanceDraft((current) => ({
                  ...current,
                  density: event.target.value as AppearanceDensityPreference
                }))
              }
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </label>
          <label>
            Font size
            <select
              disabled={appearanceSaving || currentWorkspace === null}
              value={appearanceDraft.fontSize}
              onChange={(event) =>
                setAppearanceDraft((current) => ({
                  ...current,
                  fontSize: event.target.value as AppearanceFontSizePreference
                }))
              }
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>
          <button
            className="primary-button compact-button"
            disabled={appearanceSaving || currentWorkspace === null}
            type="submit"
          >
            Save appearance
          </button>
        </form>
        <p className="form-helper">
          Current: {appearance.settings.theme} theme, {appearance.settings.density} density,
          {appearance.settings.fontSize} font.
        </p>
      </section>

      <section className="backup-management-panel" aria-label="Keyboard shortcuts">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Keyboard shortcuts</h3>
            <p className="muted-text">
              Read-only defaults for local navigation, capture, and editor flows.
            </p>
          </div>
          <Keyboard size={20} aria-hidden="true" />
        </div>
        <div className="shortcut-help-list" data-testid="shortcut-help-list">
          {shortcutGroups.map((group) => (
            <div className="shortcut-help-group" key={group.category}>
              <h4>{group.category}</h4>
              {group.shortcuts.map((shortcut) => (
                <div className="shortcut-help-row" key={shortcut.id}>
                  <div>
                    <strong>{shortcut.title}</strong>
                    <span>{shortcut.description}</span>
                    <small>{formatShortcutScope(shortcut.scope)}</small>
                  </div>
                  <kbd>{shortcut.displayLabel}</kbd>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
      <section className="backup-management-panel" aria-label="Diagnostics">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Diagnostics</h3>
          </div>
          <div className="top-actions">
            <button
              className="primary-button compact-button"
              disabled={diagnosticsBusy || currentWorkspace === null}
              type="button"
              onClick={() => void runWorkspaceDiagnostics()}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Run audit
            </button>
          </div>
        </div>

        {diagnosticsReport === null ? (
          <EmptyState
            description="Integrity, attachment, and search-index results will appear here for this session."
            title="No diagnostics run"
          />
        ) : (
          <DiagnosticsSummaryPanel report={diagnosticsReport} />
        )}
      </section>
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

        <div className="category-form" aria-label="Restore target">
          <label>
            <span>Restore target folder</span>
            <input
              disabled={restoreBusy}
              placeholder="C:\\Users\\you\\Local Work OS Restored"
              value={restoreTargetPath}
              onChange={(event) => setRestoreTargetPath(event.target.value)}
            />
          </label>
        </div>

        <div className="backup-list" aria-label="Backup list">
          {backups.length === 0 ? (
            <EmptyState
              description="Manual backup snapshots will appear after the first local backup completes."
              title="No backups yet"
            />
          ) : (
            backups.map((backup) => (
              <BackupListRow
                key={backup.id}
                backup={backup}
                restoreBusy={restoreBusy}
                onRestore={restoreBackup}
              />
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
          <EmptyState
            description="JSON, CSV, and TSV export results will appear here for this session."
            title="No export created this session"
          />
        ) : (
          <p className="form-message">{exportMessage}</p>
        )}
      </section>
      <section className="export-management-panel" aria-label="Imports">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Imports</h3>
          </div>
          <div className="top-actions">
            <button
              className="primary-button compact-button"
              disabled={importBusy}
              type="button"
              onClick={() => void validateWorkspaceImport()}
            >
              <Upload size={16} aria-hidden="true" />
              Validate JSON import
            </button>
          </div>
        </div>

        <div className="category-form" aria-label="Restore workspace export">
          <label>
            <span>Workspace export JSON path</span>
            <input
              disabled={restoreBusy}
              placeholder="C:\\Users\\you\\Local Work OS\\exports\\workspace.json"
              value={restoreExportPath}
              onChange={(event) => setRestoreExportPath(event.target.value)}
            />
          </label>
          <button
            className="secondary-button"
            disabled={restoreBusy}
            type="button"
            onClick={() => void restoreWorkspaceExport()}
          >
            <Upload size={17} aria-hidden="true" />
            Restore export to new workspace
          </button>
        </div>

        {restoreMessage === null ? null : (
          <p className="form-message form-message-ok">{restoreMessage}</p>
        )}
        {restoreSummary === null ? null : (
          <RestoreSummaryPanel summary={restoreSummary} />
        )}

        {importSummary === null ? (
          <EmptyState
            description="JSON imports are validated for a future new workspace only."
            title="No import selected"
          />
        ) : (
          <ImportValidationSummaryPanel summary={importSummary} />
        )}
      </section>
      <section className="category-management-panel" aria-label="Categories">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Categories</h3>
          </div>
        </div>

        {error === null ? null : <ErrorState error={error} title="Settings error" />}

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

function DiagnosticsSummaryPanel({
  report
}: {
  report: WorkspaceIntegritySummary;
}): React.JSX.Element {
  return (
    <div className="backup-list" aria-label="Diagnostics summary">
      <div className="backup-list-row">
        <div>
          <strong>
            {report.status === "healthy" ? "Workspace healthy" : "Issues found"}
          </strong>
          <span>{formatDiagnosticDate(report.generatedAt)}</span>
        </div>
        <div className="backup-list-meta">
          <span>{report.checkedCount} records checked</span>
          <span>{report.issueCount} issues</span>
          <span>{report.errorCount} errors</span>
          <span>{report.warningCount} warnings</span>
        </div>
      </div>

      {report.sections.map((section) => (
        <div className="backup-list-row" key={section.kind}>
          <div>
            <strong>{section.title}</strong>
            <span>
              {section.issueCount === 0
                ? "Healthy"
                : `${section.issueCount} issue(s)`}
            </span>
          </div>
          <div className="backup-list-meta">
            <span>{section.checkedCount} checked</span>
            <span>{section.status}</span>
          </div>
          {section.issues.slice(0, 3).map((issue) => (
            <p
              className={
                issue.severity === "error"
                  ? "form-message form-message-error"
                  : "form-message"
              }
              key={`${section.kind}:${issue.code}:${issue.targetId}:${issue.relatedId}`}
            >
              {issue.message}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function ImportValidationSummaryPanel({
  summary
}: {
  summary: ImportValidationSummary;
}): React.JSX.Element {
  const errorCount = summary.issues.filter(
    (issue) => issue.severity === "error"
  ).length;
  const warningCount = summary.issues.length - errorCount;

  return (
    <div className="backup-list" aria-label="Import validation summary">
      <div className="backup-list-row">
        <div>
          <strong>{summary.valid ? "Valid export" : "Import blocked"}</strong>
          <span>
            {summary.workspace === null
              ? "Workspace metadata unavailable"
              : `${summary.workspace.name} (${summary.workspace.id})`}
          </span>
        </div>
        <div className="backup-list-meta">
          <span>{summary.counts.containers} containers</span>
          <span>{summary.counts.items} items</span>
          <span>{summary.counts.attachments} attachments</span>
          <span>
            {errorCount} errors, {warningCount} warnings
          </span>
        </div>
      </div>
      <p className="muted-text">{summary.targetPolicy.message}</p>
      {summary.issues.length === 0 ? (
        <p className="form-message">Validation passed.</p>
      ) : (
        summary.issues.slice(0, 5).map((issue) => (
          <p
            key={`${issue.path}:${issue.code}:${issue.message}`}
            className={
              issue.severity === "error"
                ? "form-message form-message-error"
                : "form-message"
            }
          >
            {issue.path}: {issue.message}
          </p>
        ))
      )}
    </div>
  );
}

function RestoreSummaryPanel({
  summary
}: {
  summary: RestoreWorkspaceSummary;
}): React.JSX.Element {
  const warningCount = summary.issues.filter(
    (issue) => issue.severity === "warning"
  ).length;

  return (
    <div className="backup-list" aria-label="Restore summary">
      <div className="backup-list-row">
        <div>
          <strong>Restored new workspace</strong>
          <span>{summary.targetWorkspaceRootPath}</span>
        </div>
        <div className="backup-list-meta">
          <span>{summary.counts.items} items</span>
          <span>{summary.copiedAttachmentCount} attachments copied</span>
          <span>{summary.missingAttachmentCount} missing attachments</span>
          <span>{warningCount} warnings</span>
        </div>
      </div>
      <p className="muted-text">{summary.targetPolicy.message}</p>
    </div>
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
  backup,
  onRestore,
  restoreBusy
}: {
  backup: BackupSnapshotSummary;
  onRestore: (backup: BackupSnapshotSummary) => Promise<void>;
  restoreBusy: boolean;
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
        <button
          className="secondary-button compact-button"
          disabled={
            restoreBusy ||
            backup.databaseRelativePath === null ||
            backup.manifestRelativePath === null
          }
          type="button"
          onClick={() => void onRestore(backup)}
        >
          Restore to new workspace
        </button>
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
  return formatDiagnosticDate(value);
}

function formatDiagnosticDate(value: string): string {
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

function groupShortcuts(shortcuts: readonly RegisteredShortcut[]): Array<{
  category: string;
  shortcuts: RegisteredShortcut[];
}> {
  const groups = new Map<string, RegisteredShortcut[]>();

  for (const shortcut of shortcuts) {
    groups.set(shortcut.category, [
      ...(groups.get(shortcut.category) ?? []),
      shortcut
    ]);
  }

  return [...groups.entries()].map(([category, groupedShortcuts]) => ({
    category,
    shortcuts: groupedShortcuts
  }));
}

function formatShortcutScope(scope: RegisteredShortcut["scope"]): string {
  return scope
    .split("-")
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}
