import {
  Archive,
  FileJson,
  FileSpreadsheet,
  FolderOpen,
  Keyboard,
  Mail,
  Palette,
  Plus,
  RefreshCw,
  ShieldCheck,
  Upload,
  Trash2,
  Wrench
} from "lucide-react";
import {
  createShortcutRegistry,
  defaultShortcutDescriptors,
  formatLocalizedDateTime,
  formatLocalizedNumber,
  t,
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
  BackupSchedulerSettings,
  BackupSchedulerStatus,
  BackupSnapshotSummary,
  CategorySummary,
  CsvImportExecuteSummary,
  CsvImportPreviewSummary,
  CsvImportTargetType,
  EmailTaskImportSummary,
  ImportValidationSummary,
  LocalWorkOsApi,
  MarkdownFolderImportExecuteSummary,
  MarkdownFolderImportPreviewSummary,
  MaintenanceJobSummary,
  PrivacyNetworkSettingsSummary,
  RestoreWorkspaceSummary,
  SavedViewDiagnosticsSummary,
  UpdatePrivacyNetworkSettingsInput,
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

type PrivacyNetworkDraft = Required<
  Pick<
    UpdatePrivacyNetworkSettingsInput,
    | "metadataFetchEnabled"
    | "webWidgetsEnabled"
    | "icsUrlImportEnabled"
    | "imapImportEnabled"
    | "browserCaptureEnabled"
  >
>;

const defaultPrivacyNetworkSettings: PrivacyNetworkSettingsSummary = {
  workspaceId: "",
  metadataFetchEnabled: false,
  webWidgetsEnabled: false,
  icsUrlImportEnabled: false,
  imapImportEnabled: false,
  browserCaptureEnabled: false,
  telemetryEnabled: false,
  telemetryNotice:
    "Local Work OS does not include telemetry or analytics. Optional network features stay off until explicitly enabled.",
  updatedAt: null
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
  const [privacySettings, setPrivacySettings] =
    useState<PrivacyNetworkSettingsSummary>(defaultPrivacyNetworkSettings);
  const [privacyDraft, setPrivacyDraft] = useState<PrivacyNetworkDraft>(
    toPrivacyNetworkDraft(defaultPrivacyNetworkSettings)
  );
  const [privacySaving, setPrivacySaving] = useState(false);
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
  const [backupSchedulerSettings, setBackupSchedulerSettings] =
    useState<BackupSchedulerSettings | null>(null);
  const [backupSchedulerStatus, setBackupSchedulerStatus] =
    useState<BackupSchedulerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [restoreTargetPath, setRestoreTargetPath] = useState("");
  const [restoreExportPath, setRestoreExportPath] = useState("");
  const [restoreSummary, setRestoreSummary] =
    useState<RestoreWorkspaceSummary | null>(null);
  const [diagnosticsBusy, setDiagnosticsBusy] = useState(false);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const [maintenanceJobs, setMaintenanceJobs] = useState<MaintenanceJobSummary[]>([]);
  const [repairingAttachmentId, setRepairingAttachmentId] = useState<string | null>(null);
  const [diagnosticsReport, setDiagnosticsReport] =
    useState<WorkspaceIntegritySummary | null>(null);
  const [savedViewDiagnosticsReport, setSavedViewDiagnosticsReport] =
    useState<SavedViewDiagnosticsSummary | null>(null);
  const [repairingSavedViewId, setRepairingSavedViewId] = useState<string | null>(null);
  const [importSummary, setImportSummary] =
    useState<ImportValidationSummary | null>(null);
  const [emailImportSummary, setEmailImportSummary] =
    useState<EmailTaskImportSummary | null>(null);
  const [csvImportPath, setCsvImportPath] = useState("");
  const [csvImportTarget, setCsvImportTarget] =
    useState<CsvImportTargetType>("task");
  const [csvImportPreview, setCsvImportPreview] =
    useState<CsvImportPreviewSummary | null>(null);
  const [csvImportSummary, setCsvImportSummary] =
    useState<CsvImportExecuteSummary | null>(null);
  const [markdownFolderPath, setMarkdownFolderPath] = useState("");
  const [markdownFolderPreview, setMarkdownFolderPreview] =
    useState<MarkdownFolderImportPreviewSummary | null>(null);
  const [markdownFolderSummary, setMarkdownFolderSummary] =
    useState<MarkdownFolderImportExecuteSummary | null>(null);

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
      setBackupSchedulerSettings(null);
      setBackupSchedulerStatus(null);
      setMaintenanceJobs([]);
      setPrivacySettings(defaultPrivacyNetworkSettings);
      setPrivacyDraft(toPrivacyNetworkDraft(defaultPrivacyNetworkSettings));
      return;
    }

    let active = true;

    async function loadSettingsData(): Promise<void> {
      setError(null);
      const [
        categoryResult,
        backupResult,
        backupSettingsResult,
        maintenanceResult,
        privacyResult
      ] = await Promise.all([
        apiClient.categories.list(currentWorkspace!.id),
        apiClient.backup.listBackups({ workspaceId: currentWorkspace!.id }),
        apiClient.backup.getAutomaticBackupSettings({
          workspaceId: currentWorkspace!.id
        }),
        apiClient.diagnostics.listMaintenanceJobs({
          workspaceId: currentWorkspace!.id
        }),
        apiClient.privacy?.getSettings(currentWorkspace!.id) ??
          Promise.resolve({
            ok: true as const,
            data: {
              ...defaultPrivacyNetworkSettings,
              workspaceId: currentWorkspace!.id
            }
          })
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

      if (!backupSettingsResult.ok) {
        setUserError(
          backupSettingsResult.error,
          "Backup scheduler unavailable"
        );
        return;
      }

      if (!maintenanceResult.ok) {
        setUserError(maintenanceResult.error, "Maintenance logs unavailable");
        return;
      }

      if (!privacyResult.ok) {
        setUserError(privacyResult.error, "Privacy settings unavailable");
        return;
      }

      setCategories(categoryResult.data);
      setBackups(backupResult.data);
      setBackupSchedulerSettings(backupSettingsResult.data.settings);
      setBackupSchedulerStatus(backupSettingsResult.data.status);
      setMaintenanceJobs(maintenanceResult.data);
      setPrivacySettings(privacyResult.data);
      setPrivacyDraft(toPrivacyNetworkDraft(privacyResult.data));
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

  async function savePrivacyNetworkSettings(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (currentWorkspace === null) {
      setUserError("Open a workspace before changing privacy settings.");
      return;
    }

    if (apiClient.privacy === undefined) {
      setUserError("Privacy settings API is not available.");
      return;
    }

    setPrivacySaving(true);
    setError(null);

    const result = await apiClient.privacy.updateSettings({
      workspaceId: currentWorkspace.id,
      ...privacyDraft
    });

    setPrivacySaving(false);

    if (!result.ok) {
      setUserError(result.error, "Privacy update failed");
      return;
    }

    setPrivacySettings(result.data);
    setPrivacyDraft(toPrivacyNetworkDraft(result.data));
    showToast("Privacy and network preferences saved.", {
      title: "Privacy updated",
      tone: "success"
    });
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

  async function saveAutomaticBackupSettings(): Promise<void> {
    if (currentWorkspace === null || backupSchedulerSettings === null) {
      setUserError("Open a workspace before updating backup settings.");
      return;
    }

    setBackupBusy(true);
    setBackupMessage(null);
    setError(null);

    const result = await apiClient.backup.updateAutomaticBackupSettings({
      workspaceId: currentWorkspace.id,
      enabled: backupSchedulerSettings.enabled,
      intervalHours: backupSchedulerSettings.intervalHours,
      runOnAppClose: backupSchedulerSettings.runOnAppClose,
      runBeforeMigration: backupSchedulerSettings.runBeforeMigration,
      retention: backupSchedulerSettings.retention
    });

    setBackupBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Backup scheduler update failed");
      return;
    }

    setBackupSchedulerSettings(result.data.settings);
    setBackupSchedulerStatus(result.data.status);
    setBackupMessage("Automatic backup settings saved.");
    showToast("Automatic backup settings saved.", {
      title: "Backups",
      tone: "success"
    });
  }

  async function runAutomaticBackupCheck(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before checking automatic backups.");
      return;
    }

    setBackupBusy(true);
    setBackupMessage(null);
    setError(null);

    const result = await apiClient.backup.runAutomaticBackupCheck({
      workspaceId: currentWorkspace.id,
      trigger: "manual_check"
    });

    setBackupBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Automatic backup check failed");
      return;
    }

    setBackupSchedulerSettings(result.data.settings);
    setBackupSchedulerStatus(result.data.status);

    setBackups((current) =>
      [
        ...(result.data.createdBackup === null
          ? []
          : [result.data.createdBackup]),
        ...current.filter((backup) =>
          !result.data.retentionDeletedBackups.some(
            (deleted) => deleted.relativePath === backup.relativePath
          ) &&
          (result.data.createdBackup === null ||
            backup.id !== result.data.createdBackup.id)
        )
      ].sort(compareBackups)
    );

    const message =
      result.data.createdBackup === null
        ? `Automatic backup skipped: ${result.data.skippedReason ?? "not due"}.`
        : `Automatic backup created at ${result.data.createdBackup.relativePath}; removed ${result.data.retentionDeletedBackups.length} old automatic backup(s).`;

    setBackupMessage(message);
    showToast(message, {
      title: "Automatic backups",
      tone: result.data.createdBackup === null ? "info" : "success"
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
    const savedViewResult = await apiClient.diagnostics.runSavedViewDiagnostics(
      currentWorkspace.id
    );

    setDiagnosticsBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Diagnostics failed");
      return;
    }

    if (!savedViewResult.ok) {
      setUserError(savedViewResult.error, "Saved-view diagnostics failed");
      return;
    }

    setDiagnosticsReport(result.data);
    setSavedViewDiagnosticsReport(savedViewResult.data);
    showToast(
      result.data.status === "healthy" && savedViewResult.data.errors === 0
        ? "Workspace diagnostics passed."
        : `${result.data.issueCount + savedViewResult.data.errors + savedViewResult.data.warnings} workspace diagnostics issue(s) found.`,
      {
        title: "Diagnostics complete",
        tone:
          result.data.status === "healthy" && savedViewResult.data.errors === 0
            ? "success"
            : "error"
      }
    );
  }

  async function repairSavedViewQuery(savedViewId: string): Promise<void> {
    setRepairingSavedViewId(savedViewId);
    setError(null);

    const result = await apiClient.diagnostics.repairSavedViewQuery({ savedViewId });

    setRepairingSavedViewId(null);

    if (!result.ok) {
      setUserError(result.error, "Saved-view repair failed");
      return;
    }

    showToast(
      result.data.changed
        ? `Repaired ${result.data.name}.`
        : `${result.data.name} did not need repair.`,
      {
        title: "Saved view diagnostics",
        tone: "success"
      }
    );
    await runWorkspaceDiagnostics();
  }

  async function repairMissingAttachment(attachmentId: string): Promise<void> {
    setRepairingAttachmentId(attachmentId);
    setError(null);

    const result = await apiClient.diagnostics.repairAttachment({ attachmentId });

    setRepairingAttachmentId(null);

    if (!result.ok) {
      setUserError(result.error, "Attachment repair failed");
      return;
    }

    if (result.data === null) {
      showToast("No replacement file selected.", {
        title: "Repair cancelled",
        tone: "info"
      });
      return;
    }

    showToast("Attachment file repaired locally.", {
      title: "Attachment repaired",
      tone: "success"
    });
    await runWorkspaceDiagnostics();
  }

  async function refreshMaintenanceJobs(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before listing maintenance jobs.");
      return;
    }

    setMaintenanceBusy(true);
    setError(null);

    const result = await apiClient.diagnostics.listMaintenanceJobs({
      workspaceId: currentWorkspace.id
    });

    setMaintenanceBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Maintenance logs unavailable");
      return;
    }

    setMaintenanceJobs(result.data);
  }

  async function runMaintenanceJob(cleanupOrphans = false): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before running maintenance.");
      return;
    }

    setMaintenanceBusy(true);
    setError(null);

    const result = await apiClient.diagnostics.runMaintenanceJob({
      workspaceId: currentWorkspace.id,
      requireBackup: true,
      operations: cleanupOrphans ? [
        "attachment_manifest_audit",
        "orphan_attachment_scan",
        "orphan_attachment_cleanup"
      ] : [
        "sqlite_integrity_check",
        "attachment_manifest_audit",
        "orphan_attachment_scan",
        "rebuild_search_index",
        "vacuum"
      ]
    });

    setMaintenanceBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Maintenance failed");
      return;
    }

    setMaintenanceJobs((current) => [
      result.data,
      ...current.filter((job) => job.id !== result.data.id)
    ]);
    if (result.data.backup !== null) {
      await refreshBackups();
    }
    showToast(
      result.data.status === "completed"
        ? cleanupOrphans
          ? "Orphan attachment cleanup completed after creating a local backup."
          : "Maintenance completed after creating a local backup."
        : `Maintenance failed: ${result.data.error ?? "unknown error"}.`,
      {
        title: "Maintenance",
        tone: result.data.status === "completed" ? "success" : "error"
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

  async function exportAdvancedBundle(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before exporting a portable bundle.");
      return;
    }

    setExportBusy(true);
    setExportMessage(null);
    setError(null);

    const result =
      apiClient.export.exportHtmlCsvTsvMarkdownBundle === undefined
        ? {
            ok: false as const,
            error: {
              code: "IPC_ERROR" as const,
              message: "HTML/CSV/TSV/Markdown export bundle API is not available."
            }
          }
        : await apiClient.export.exportHtmlCsvTsvMarkdownBundle({
            workspaceId: currentWorkspace.id
          });

    setExportBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Export failed");
      return;
    }

    const message = `Portable export bundle created at ${result.data.relativePath} with ${result.data.fileCount} file(s).`;
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

  async function importEmailMessages(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before importing email files.");
      return;
    }

    setImportBusy(true);
    setEmailImportSummary(null);
    setError(null);

    const result =
      apiClient.import.chooseAndImportEmailsAsTasks === undefined
        ? {
            ok: false as const,
            error: {
              code: "IPC_ERROR" as const,
              message: "Email import API is not available."
            }
          }
        : await apiClient.import.chooseAndImportEmailsAsTasks({
            workspaceId: currentWorkspace.id,
            extractTags: true
          });

    setImportBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Email import failed");
      return;
    }

    setEmailImportSummary(result.data);
    if (result.data !== null) {
      showToast(
        `Imported ${result.data.importedCount} email task(s) into Inbox.`,
        {
          title: "Email import complete",
          tone: result.data.issues.length === 0 ? "success" : "info"
        }
      );
    }
  }

  async function chooseAndPreviewMarkdownFolder(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before importing Markdown folders.");
      return;
    }

    setImportBusy(true);
    setMarkdownFolderPreview(null);
    setMarkdownFolderSummary(null);
    setError(null);

    const result =
      apiClient.import.chooseAndPreviewMarkdownFolderImport === undefined
        ? {
            ok: false as const,
            error: {
              code: "IPC_ERROR" as const,
              message: "Markdown folder import preview API is not available."
            }
          }
        : await apiClient.import.chooseAndPreviewMarkdownFolderImport({
            workspaceId: currentWorkspace.id
          });

    setImportBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Markdown folder preview failed");
      return;
    }

    setMarkdownFolderPreview(result.data);
    setMarkdownFolderSummary(null);
    if (result.data !== null) {
      setMarkdownFolderPath(result.data.sourceRootPath ?? markdownFolderPath);
      showToast(
        result.data.valid
          ? `Previewed ${result.data.creatableCount} Markdown folder item(s).`
          : `Markdown folder preview found ${result.data.errorCount} error(s).`,
        {
          title: "Markdown folder preview",
          tone: result.data.valid ? "success" : "error"
        }
      );
    }
  }

  async function previewMarkdownFolderPath(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before importing Markdown folders.");
      return;
    }

    if (markdownFolderPath.trim().length === 0) {
      setUserError("Enter a Markdown folder path before previewing.");
      return;
    }

    setImportBusy(true);
    setMarkdownFolderPreview(null);
    setMarkdownFolderSummary(null);
    setError(null);

    const result =
      apiClient.import.previewMarkdownFolderImport === undefined
        ? {
            ok: false as const,
            error: {
              code: "IPC_ERROR" as const,
              message: "Markdown folder import preview API is not available."
            }
          }
        : await apiClient.import.previewMarkdownFolderImport({
            workspaceId: currentWorkspace.id,
            folderPath: markdownFolderPath.trim()
          });

    setImportBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Markdown folder preview failed");
      return;
    }

    setMarkdownFolderPreview(result.data);
    showToast(
      result.data.valid
        ? `Previewed ${result.data.creatableCount} Markdown folder item(s).`
        : `Markdown folder preview found ${result.data.errorCount} error(s).`,
      {
        title: "Markdown folder preview",
        tone: result.data.valid ? "success" : "error"
      }
    );
  }

  async function importMarkdownFolder(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before importing Markdown folders.");
      return;
    }

    const folderPath = markdownFolderPreview?.sourceRootPath ?? markdownFolderPath.trim();
    if (folderPath.length === 0) {
      setUserError("Preview or enter a Markdown folder path before importing.");
      return;
    }

    setImportBusy(true);
    setError(null);

    const result =
      apiClient.import.importMarkdownFolder === undefined
        ? {
            ok: false as const,
            error: {
              code: "IPC_ERROR" as const,
              message: "Markdown folder import API is not available."
            }
          }
        : await apiClient.import.importMarkdownFolder({
            workspaceId: currentWorkspace.id,
            folderPath
          });

    setImportBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Markdown folder import failed");
      return;
    }

    setMarkdownFolderSummary(result.data);
    setMarkdownFolderPreview(result.data);
    showToast(`Imported ${result.data.importedCount} Markdown folder record(s).`, {
      title: "Markdown folder import complete",
      tone: result.data.errorCount === 0 ? "success" : "error"
    });
  }

  async function previewCsvImport(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before importing CSV/TSV files.");
      return;
    }

    if (csvImportPath.trim().length === 0) {
      setUserError("Enter a CSV or TSV file path before previewing.");
      return;
    }

    setImportBusy(true);
    setCsvImportPreview(null);
    setCsvImportSummary(null);
    setError(null);

    const result =
      apiClient.import.previewDelimitedFileImport === undefined
        ? {
            ok: false as const,
            error: {
              code: "IPC_ERROR" as const,
              message: "CSV/TSV import preview API is not available."
            }
          }
        : await apiClient.import.previewDelimitedFileImport({
            workspaceId: currentWorkspace.id,
            filePath: csvImportPath.trim(),
            targetType: csvImportTarget,
            conflictStrategy: "skip_existing",
            missingContainerStrategy: "create_project"
          });

    setImportBusy(false);

    if (!result.ok) {
      setUserError(result.error, "CSV/TSV import preview failed");
      return;
    }

    setCsvImportPreview(result.data);
    showToast(
      result.data.valid
        ? `Previewed ${result.data.creatableCount} creatable row(s).`
        : `CSV/TSV preview found ${result.data.errorCount} error(s).`,
      {
        title: "CSV/TSV import preview",
        tone: result.data.valid ? "success" : "error"
      }
    );
  }

  async function importCsvRows(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before importing CSV/TSV files.");
      return;
    }

    if (csvImportPath.trim().length === 0) {
      setUserError("Enter a CSV or TSV file path before importing.");
      return;
    }

    setImportBusy(true);
    setError(null);

    const result =
      apiClient.import.importDelimitedFile === undefined
        ? {
            ok: false as const,
            error: {
              code: "IPC_ERROR" as const,
              message: "CSV/TSV import API is not available."
            }
          }
        : await apiClient.import.importDelimitedFile({
            workspaceId: currentWorkspace.id,
            filePath: csvImportPath.trim(),
            targetType: csvImportTarget,
            conflictStrategy: "skip_existing",
            missingContainerStrategy: "create_project"
          });

    setImportBusy(false);

    if (!result.ok) {
      setUserError(result.error, "CSV/TSV import failed");
      return;
    }

    setCsvImportSummary(result.data);
    setCsvImportPreview(result.data);
    showToast(`Imported ${result.data.importedCount} row(s).`, {
      title: "CSV/TSV import complete",
      tone: result.data.errorCount === 0 ? "success" : "error"
    });
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
        <h2>{t("settings.page.title")}</h2>
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

      <section className="backup-management-panel" aria-label={t("settings.locale.title")}>
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>{t("settings.locale.title")}</h3>
            <p className="muted-text">{t("settings.locale.description")}</p>
          </div>
          <Keyboard size={20} aria-hidden="true" />
        </div>
        <div className="backup-list" aria-label={t("settings.locale.placeholder")}>
          <div className="backup-list-row">
            <div>
              <strong>{t("settings.locale.value")}</strong>
              <span>{t("settings.locale.placeholder")}</span>
            </div>
            <div className="backup-list-meta">
              <span>
                {t("settings.locale.dateExampleLabel")}:{" "}
                {formatLocalizedDateTime("2026-05-14T09:30:00.000Z")}
              </span>
              <span>
                {t("settings.locale.numberExampleLabel")}:{" "}
                {formatLocalizedNumber(12345.67)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="backup-management-panel" aria-label="Privacy and network">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Privacy &amp; Network</h3>
            <p className="muted-text">
              Optional network-capable features are off by default and must be
              enabled explicitly for this local workspace.
            </p>
          </div>
          <ShieldCheck size={20} aria-hidden="true" />
        </div>
        <div className="backup-list-row">
          <div>
            <strong>No telemetry</strong>
            <span>{privacySettings.telemetryNotice}</span>
          </div>
          <div className="backup-list-meta">
            <span>Telemetry: off</span>
            <span>Cloud sync: not included</span>
          </div>
        </div>
        <form className="appearance-settings-form" onSubmit={savePrivacyNetworkSettings}>
          {privacyNetworkOptions.map((option) => (
            <label className="settings-checkbox-label" key={option.field}>
              <input
                checked={privacyDraft[option.field]}
                disabled={privacySaving || currentWorkspace === null}
                type="checkbox"
                onChange={(event) =>
                  setPrivacyDraft((current) => ({
                    ...current,
                    [option.field]: event.target.checked
                  }))
                }
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
            </label>
          ))}
          <button
            className="primary-button compact-button"
            disabled={privacySaving || currentWorkspace === null}
            type="submit"
          >
            Save privacy settings
          </button>
        </form>
        <p className="form-helper">
          Current network controls: {formatEnabledPrivacyFeatures(privacySettings)}.
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
          <>
            <DiagnosticsSummaryPanel
              repairBusyAttachmentId={repairingAttachmentId}
              report={diagnosticsReport}
              onRepairAttachment={repairMissingAttachment}
            />
            {savedViewDiagnosticsReport === null ? null : (
              <SavedViewDiagnosticsPanel
                repairBusySavedViewId={repairingSavedViewId}
                report={savedViewDiagnosticsReport}
                onRepairSavedView={repairSavedViewQuery}
              />
            )}
          </>
        )}
      </section>
      <section className="backup-management-panel" aria-label="Maintenance">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Maintenance</h3>
            <p className="muted-text">
              Run local SQLite integrity, attachment manifest audit, orphan
              attachment scan, search reindex, and VACUUM with a backup preflight
              before write maintenance. Cleanup quarantines orphan files under
              logs/maintenance instead of deleting them.
            </p>
          </div>
          <div className="top-actions">
            <button
              className="secondary-button compact-button"
              disabled={maintenanceBusy || currentWorkspace === null}
              type="button"
              onClick={() => void refreshMaintenanceJobs()}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Refresh logs
            </button>
            <button
              className="primary-button compact-button"
              disabled={maintenanceBusy || currentWorkspace === null}
              type="button"
              onClick={() => void runMaintenanceJob()}
            >
              <Wrench size={16} aria-hidden="true" />
              Run maintenance
            </button>
            <button
              className="secondary-button compact-button"
              disabled={maintenanceBusy || currentWorkspace === null}
              type="button"
              onClick={() => void runMaintenanceJob(true)}
            >
              <Archive size={16} aria-hidden="true" />
              Quarantine orphans
            </button>
          </div>
        </div>
        {maintenanceJobs.length === 0 ? (
          <EmptyState
            description="Maintenance job progress and results will appear after the first run."
            title="No maintenance jobs yet"
          />
        ) : (
          <MaintenanceJobsPanel jobs={maintenanceJobs} />
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

        {backupSchedulerSettings === null ? null : (
          <div className="category-form" aria-label="Automatic backup settings">
            <label className="checkbox-label">
              <input
                checked={backupSchedulerSettings.enabled}
                disabled={backupBusy}
                type="checkbox"
                onChange={(event) =>
                  setBackupSchedulerSettings({
                    ...backupSchedulerSettings,
                    enabled: event.target.checked
                  })
                }
              />
              <span>Enable automatic backups</span>
            </label>
            <label>
              <span>Interval hours</span>
              <input
                disabled={backupBusy}
                min={1}
                max={168}
                type="number"
                value={backupSchedulerSettings.intervalHours}
                onChange={(event) =>
                  setBackupSchedulerSettings({
                    ...backupSchedulerSettings,
                    intervalHours: Number(event.target.value)
                  })
                }
              />
            </label>
            <label className="checkbox-label">
              <input
                checked={backupSchedulerSettings.runOnAppClose}
                disabled={backupBusy}
                type="checkbox"
                onChange={(event) =>
                  setBackupSchedulerSettings({
                    ...backupSchedulerSettings,
                    runOnAppClose: event.target.checked
                  })
                }
              />
              <span>Also check when the app closes</span>
            </label>
            <label className="checkbox-label">
              <input
                checked={backupSchedulerSettings.runBeforeMigration}
                disabled={backupBusy}
                type="checkbox"
                onChange={(event) =>
                  setBackupSchedulerSettings({
                    ...backupSchedulerSettings,
                    runBeforeMigration: event.target.checked
                  })
                }
              />
              <span>Always back up before migrations</span>
            </label>
            <label>
              <span>Keep automatic backups</span>
              <input
                disabled={backupBusy}
                min={1}
                type="number"
                value={backupSchedulerSettings.retention.maxCount}
                onChange={(event) =>
                  setBackupSchedulerSettings({
                    ...backupSchedulerSettings,
                    retention: {
                      ...backupSchedulerSettings.retention,
                      maxCount: Number(event.target.value)
                    }
                  })
                }
              />
            </label>
            <label>
              <span>Max age days</span>
              <input
                disabled={backupBusy}
                min={1}
                type="number"
                value={backupSchedulerSettings.retention.maxAgeDays}
                onChange={(event) =>
                  setBackupSchedulerSettings({
                    ...backupSchedulerSettings,
                    retention: {
                      ...backupSchedulerSettings.retention,
                      maxAgeDays: Number(event.target.value)
                    }
                  })
                }
              />
            </label>
            <label>
              <span>Max size MiB</span>
              <input
                disabled={backupBusy}
                min={1}
                type="number"
                value={Math.round(
                  backupSchedulerSettings.retention.maxSizeBytes /
                    (1024 * 1024)
                )}
                onChange={(event) =>
                  setBackupSchedulerSettings({
                    ...backupSchedulerSettings,
                    retention: {
                      ...backupSchedulerSettings.retention,
                      maxSizeBytes: Number(event.target.value) * 1024 * 1024
                    }
                  })
                }
              />
            </label>
            <button
              className="secondary-button"
              disabled={backupBusy || currentWorkspace === null}
              type="button"
              onClick={() => void saveAutomaticBackupSettings()}
            >
              Save automatic backup settings
            </button>
            <button
              className="secondary-button"
              disabled={backupBusy || currentWorkspace === null}
              type="button"
              onClick={() => void runAutomaticBackupCheck()}
            >
              Run due check now
            </button>
          </div>
        )}

        {backupSchedulerStatus === null ? null : (
          <p className="muted-text">
            Automatic backup status: last successful{" "}
            {backupSchedulerStatus.lastSuccessfulBackupAt === null
              ? "never"
              : formatBackupDate(backupSchedulerStatus.lastSuccessfulBackupAt)}
            ; next run{" "}
            {backupSchedulerStatus.nextRunAt === null
              ? "not scheduled"
              : formatBackupDate(backupSchedulerStatus.nextRunAt)}
            ; last cleanup removed{" "}
            {backupSchedulerStatus.lastRetentionDeletedCount} backup(s).
          </p>
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
            <button
              className="primary-button compact-button"
              disabled={exportBusy || currentWorkspace === null}
              type="button"
              onClick={() => void exportAdvancedBundle()}
            >
              <Archive size={16} aria-hidden="true" />
              Export portable bundle
            </button>
          </div>
        </div>

        {exportMessage === null ? (
          <EmptyState
            description="JSON, CSV/TSV, and HTML/Markdown bundle export results will appear here for this session."
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
              className="secondary-button compact-button"
              disabled={importBusy || currentWorkspace === null}
              type="button"
              onClick={() => void importEmailMessages()}
            >
              <Upload size={16} aria-hidden="true" />
              Import EML/Maildir to Inbox
            </button>
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

        <div className="category-form" aria-label="Markdown folder import wizard">
          <label>
            <span>Markdown folder path</span>
            <input
              disabled={importBusy}
              placeholder="C:\Users\you\imports\project-notes"
              value={markdownFolderPath}
              onChange={(event) => setMarkdownFolderPath(event.target.value)}
            />
          </label>
          <button
            className="secondary-button"
            disabled={importBusy || currentWorkspace === null}
            type="button"
            onClick={() => void chooseAndPreviewMarkdownFolder()}
          >
            <FolderOpen size={17} aria-hidden="true" />
            Choose folder
          </button>
          <button
            className="secondary-button"
            disabled={importBusy || currentWorkspace === null}
            type="button"
            onClick={() => void previewMarkdownFolderPath()}
          >
            <FileJson size={17} aria-hidden="true" />
            Preview folder
          </button>
          <button
            className="primary-button"
            disabled={
              importBusy ||
              currentWorkspace === null ||
              markdownFolderPreview === null ||
              !markdownFolderPreview.valid
            }
            type="button"
            onClick={() => void importMarkdownFolder()}
          >
            <Upload size={17} aria-hidden="true" />
            Import previewed folder
          </button>
        </div>

        {markdownFolderPreview === null ? null : (
          <MarkdownFolderImportSummaryPanel
            preview={markdownFolderPreview}
            summary={markdownFolderSummary}
          />
        )}

        <div className="category-form" aria-label="CSV or TSV import wizard">
          <label>
            <span>CSV/TSV file path</span>
            <input
              disabled={importBusy}
              placeholder="C:\\Users\\you\\imports\\tasks.csv"
              value={csvImportPath}
              onChange={(event) => setCsvImportPath(event.target.value)}
            />
          </label>
          <label>
            <span>Import as</span>
            <select
              disabled={importBusy}
              value={csvImportTarget}
              onChange={(event) =>
                setCsvImportTarget(event.target.value as CsvImportTargetType)
              }
            >
              <option value="task">Tasks</option>
              <option value="contact">Contacts</option>
              <option value="project">Projects</option>
            </select>
          </label>
          <button
            className="secondary-button"
            disabled={importBusy || currentWorkspace === null}
            type="button"
            onClick={() => void previewCsvImport()}
          >
            <FileSpreadsheet size={17} aria-hidden="true" />
            Preview CSV/TSV
          </button>
          <button
            className="primary-button"
            disabled={
              importBusy ||
              currentWorkspace === null ||
              csvImportPreview === null ||
              !csvImportPreview.valid
            }
            type="button"
            onClick={() => void importCsvRows()}
          >
            <Upload size={17} aria-hidden="true" />
            Import previewed rows
          </button>
        </div>

        {csvImportPreview === null ? null : (
          <CsvImportSummaryPanel
            preview={csvImportPreview}
            summary={csvImportSummary}
          />
        )}

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
        {emailImportSummary === null ? null : (
          <div className="backup-list" aria-label="Email import summary">
            <article className="backup-card">
              <div>
                <strong>
                  Imported {emailImportSummary.importedCount} email task(s)
                </strong>
                <p className="muted-text">
                  Originals were copied into local attachments.{" "}
                  {emailImportSummary.skippedCount} skipped;{" "}
                  {emailImportSummary.issues.length} issue(s).
                </p>
              </div>
              <ul>
                {emailImportSummary.importedTasks.slice(0, 5).map((task) => (
                  <li key={task.itemId}>
                    {task.title}
                    {task.attachmentId === null ? "" : " — original attached"}
                  </li>
                ))}
              </ul>
            </article>
          </div>
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
      <section className="export-management-panel" aria-label="Optional local IMAP import">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Optional local IMAP import</h3>
            <p className="muted-text">
              IMAP import is a local-only adapter-backed capability. Account settings
              exclude passwords, duplicate messages are skipped, and live mailbox
              import stays disabled until an OS keychain IMAP adapter is configured.
            </p>
          </div>
          <Mail size={20} aria-hidden="true" />
        </div>
        <div className="backup-list-row">
          <div>
            <strong>Adapter required</strong>
            <span>
              Use EML/Maildir import today; IMAP connection testing and unread/labelled
              imports are service-backed for the next desktop adapter slice.
            </span>
          </div>
          <div className="backup-list-meta">
            <span>No password storage in SQLite</span>
            <span>Duplicate protected</span>
          </div>
        </div>
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

function MaintenanceJobsPanel({
  jobs
}: {
  jobs: MaintenanceJobSummary[];
}): React.JSX.Element {
  return (
    <div className="backup-list" aria-label="Maintenance job logs">
      {jobs.slice(0, 5).map((job) => (
        <div className="backup-list-row" key={job.id}>
          <div>
            <strong>
              {job.status === "completed" ? "Maintenance completed" : "Maintenance failed"}
            </strong>
            <span>
              {formatDiagnosticDate(job.completedAt)} - {job.operations.join(", ")}
            </span>
            {job.error === null ? null : (
              <span className="form-message form-message-error">{job.error}</span>
            )}
          </div>
          <div className="backup-list-meta">
            <span>{job.backup === null ? "No backup" : `Backup ${job.backup.id}`}</span>
            <span>
              {job.sqliteIntegrity === null
                ? "Integrity not run"
                : job.sqliteIntegrity.ok
                  ? "Integrity ok"
                  : "Integrity issues"}
            </span>
            <span>
              {job.attachmentManifestAudit === null
                ? "Manifest audit not run"
                : job.attachmentManifestAudit.status === "healthy"
                  ? "Manifest healthy"
                  : `${getAttachmentManifestIssueCount(job)} manifest issue(s)`}
            </span>
            <span>
              {job.orphanAttachmentScan === null
                ? "Orphan scan not run"
                : `${job.orphanAttachmentScan.orphanedRelativePaths.length} orphan file(s)`}
            </span>
            <span>
              {job.orphanAttachmentCleanup === null
                ? "Cleanup not run"
                : `${job.orphanAttachmentCleanup.quarantinedFileCount} quarantined`}
            </span>
            <span>{job.vacuum?.completed ? "Vacuumed" : "Vacuum not run"}</span>
          </div>
          {job.attachmentManifestAudit === null ? null : (
            <span className="muted-text">
              Manifest report:{" "}
              {job.attachmentManifestAudit.manifestRelativePath ?? "not written"}
            </span>
          )}
          {job.entries.map((entry) => (
            <span key={`${job.id}:${entry.step}`} className="muted-text">
              {entry.status}: {entry.message}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function getAttachmentManifestIssueCount(job: MaintenanceJobSummary): number {
  const audit = job.attachmentManifestAudit;

  if (audit === null) {
    return 0;
  }

  return (
    audit.missingReferencedPaths.length +
    audit.orphanedRelativePaths.length +
    audit.unsafeReferencedPaths.length +
    audit.sizeMismatches.length +
    audit.checksumMismatches.length
  );
}

function DiagnosticsSummaryPanel({
  repairBusyAttachmentId,
  report,
  onRepairAttachment
}: {
  repairBusyAttachmentId: string | null;
  report: WorkspaceIntegritySummary;
  onRepairAttachment: (attachmentId: string) => Promise<void>;
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
          {section.issues.slice(0, 5).map((issue) => (
            <div
              className={
                issue.severity === "error"
                  ? "form-message form-message-error"
                  : "form-message"
              }
              key={`${section.kind}:${issue.code}:${issue.targetId}:${issue.relatedId}`}
            >
              <span>{issue.message}</span>
              {issue.code === "attachment_file_missing" ? (
                <button
                  className="secondary-button compact-button"
                  disabled={repairBusyAttachmentId === issue.targetId}
                  type="button"
                  onClick={() => void onRepairAttachment(issue.targetId)}
                >
                  {repairBusyAttachmentId === issue.targetId ? "Repairing..." : "Locate replacement"}
                </button>
              ) : null}
            </div>
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

function MarkdownFolderImportSummaryPanel({
  preview,
  summary
}: {
  preview: MarkdownFolderImportPreviewSummary;
  summary: MarkdownFolderImportExecuteSummary | null;
}): React.JSX.Element {
  return (
    <div className="backup-list" aria-label="Markdown folder import summary">
      <div className="backup-list-row">
        <div>
          <strong>
            {preview.valid ? "Markdown folder preview ready" : "Markdown folder import blocked"}
          </strong>
          <span>
            {preview.projectName}: {preview.markdownCount} note(s), {preview.fileCount} file(s), {preview.tabCount} tab(s)
          </span>
          <span>
            Obsidian metadata: {preview.frontmatterCount} frontmatter file(s), {preview.tagCount} tag(s),{" "}
            {preview.wikilinkCount} wiki-link(s), {preview.resolvedAttachmentEmbedCount}/{preview.attachmentEmbedCount} embed(s) resolved
          </span>
        </div>
        <div className="backup-list-meta">
          <span>{preview.headingCount} heading(s)</span>
          <span>{preview.unsupportedCount} unsupported</span>
          <span>{preview.errorCount} errors</span>
          <span>{preview.warningCount} warnings</span>
        </div>
      </div>
      {summary === null ? null : (
        <p className="form-message form-message-ok">
          Imported {summary.importedCount} record(s) at {formatDiagnosticDate(summary.importedAt)}.
        </p>
      )}
      {preview.rows.slice(0, 6).map((row) => (
        <div className="backup-list-row" key={`${row.kind}:${row.relativePath}`}>
          <div>
            <strong>{row.title}</strong>
            <span>{row.kind} from {row.relativePath}</span>
          </div>
          <div className="backup-list-meta">
            <span>{row.targetTabName}</span>
            <span>{row.action}</span>
          </div>
        </div>
      ))}
      {preview.issues.slice(0, 5).map((issue) => (
        <p
          className={
            issue.severity === "error"
              ? "form-message form-message-error"
              : "form-message"
          }
          key={`${issue.relativePath}:${issue.code}:${issue.message}`}
        >
          {issue.relativePath ?? "Folder"}: {issue.message}
        </p>
      ))}
    </div>
  );
}

function CsvImportSummaryPanel({
  preview,
  summary
}: {
  preview: CsvImportPreviewSummary;
  summary: CsvImportExecuteSummary | null;
}): React.JSX.Element {
  return (
    <div className="backup-list" aria-label="CSV import summary">
      <div className="backup-list-row">
        <div>
          <strong>
            {preview.valid ? "CSV/TSV preview ready" : "CSV/TSV import blocked"}
          </strong>
          <span>
            {preview.rowCount} row(s), {preview.creatableCount} creatable,{" "}
            {preview.skippedCount} duplicate skip(s)
          </span>
        </div>
        <div className="backup-list-meta">
          <span>{preview.targetType}</span>
          <span>{preview.format.toUpperCase()}</span>
          <span>{preview.errorCount} errors</span>
          <span>{preview.warningCount} warnings</span>
        </div>
      </div>
      <p className="muted-text">
        Mapping:{" "}
        {Object.entries(preview.mapping)
          .map(([field, header]) => `${field} ← ${header}`)
          .join(", ") || "No fields mapped"}
      </p>
      {summary === null ? null : (
        <p className="form-message form-message-ok">
          Imported {summary.importedCount} row(s) at {formatDiagnosticDate(summary.importedAt)}.
        </p>
      )}
      {preview.rows.slice(0, 5).map((row) => (
        <div className="backup-list-row" key={row.rowNumber}>
          <div>
            <strong>
              Row {row.rowNumber}: {row.title || "(missing title)"}
            </strong>
            <span>
              {row.action === "skip" ? "Will skip duplicate" : "Will create"}{" "}
              {row.containerName === null ? "" : `in ${row.containerName}`}
            </span>
          </div>
          <div className="backup-list-meta">
            <span>{row.tags.length} tag(s)</span>
            <span>{row.categoryName ?? "No category"}</span>
          </div>
        </div>
      ))}
      {preview.issues.slice(0, 5).map((issue) => (
        <p
          className={
            issue.severity === "error"
              ? "form-message form-message-error"
              : "form-message"
          }
          key={`${issue.rowNumber}:${issue.code}:${issue.message}`}
        >
          {issue.rowNumber === null ? "File" : `Row ${issue.rowNumber}`}:{" "}
          {issue.message}
        </p>
      ))}
    </div>
  );
}

function SavedViewDiagnosticsPanel({
  repairBusySavedViewId,
  report,
  onRepairSavedView
}: {
  repairBusySavedViewId: string | null;
  report: SavedViewDiagnosticsSummary;
  onRepairSavedView: (savedViewId: string) => Promise<void>;
}): React.JSX.Element {
  const problemEntries = report.entries.filter((entry) => entry.status !== "ok");

  return (
    <div className="backup-list" aria-label="Saved view diagnostics summary">
      <div className="backup-list-row">
        <div>
          <strong>
            {report.errors === 0 && report.warnings === 0
              ? "Saved views healthy"
              : "Saved-view query issues found"}
          </strong>
          <span>{formatDiagnosticDate(report.checkedAt)}</span>
        </div>
        <div className="backup-list-meta">
          <span>{report.total} checked</span>
          <span>{report.errors} errors</span>
          <span>{report.warnings} warnings</span>
          <span>{report.repairable} repairable</span>
        </div>
      </div>
      {problemEntries.length === 0 ? (
        <EmptyState
          description="Saved-view query JSON, references, and schema versions are valid."
          title="No saved-view repairs needed"
        />
      ) : (
        problemEntries.map((entry) => (
          <div className="backup-list-row" key={entry.savedViewId}>
            <div>
              <strong>{entry.name}</strong>
              <span>{entry.type}</span>
            </div>
            <div className="diagnostics-issue-list">
              {entry.issues.map((issue, index) => (
                <span key={`${issue.code}-${issue.value ?? index}`}>
                  {issue.severity}: {issue.message}
                </span>
              ))}
              {entry.repairable ? (
                <button
                  className="secondary-button compact-button"
                  disabled={repairBusySavedViewId === entry.savedViewId}
                  type="button"
                  onClick={() => void onRepairSavedView(entry.savedViewId)}
                >
                  {repairBusySavedViewId === entry.savedViewId
                    ? "Repairing..."
                    : "Repair query"}
                </button>
              ) : null}
            </div>
          </div>
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

const privacyNetworkOptions: Array<{
  field: keyof PrivacyNetworkDraft;
  label: string;
  description: string;
}> = [
  {
    field: "metadataFetchEnabled",
    label: "Link metadata fetch",
    description: "Allow optional title/description/favicon fetching for web links."
  },
  {
    field: "webWidgetsEnabled",
    label: "Web widgets",
    description: "Allow saved dashboard web links to be opened from widget cards."
  },
  {
    field: "icsUrlImportEnabled",
    label: "ICS URL import",
    description: "Allow calendar feeds to be imported from explicit http(s) URLs."
  },
  {
    field: "imapImportEnabled",
    label: "IMAP import",
    description: "Allow local adapter-backed mailbox connection tests and imports."
  },
  {
    field: "browserCaptureEnabled",
    label: "Browser capture",
    description: "Allow the local browser capture bridge to accept paired captures."
  }
];

function toPrivacyNetworkDraft(
  settings: PrivacyNetworkSettingsSummary
): PrivacyNetworkDraft {
  return {
    metadataFetchEnabled: settings.metadataFetchEnabled,
    webWidgetsEnabled: settings.webWidgetsEnabled,
    icsUrlImportEnabled: settings.icsUrlImportEnabled,
    imapImportEnabled: settings.imapImportEnabled,
    browserCaptureEnabled: settings.browserCaptureEnabled
  };
}

function formatEnabledPrivacyFeatures(
  settings: PrivacyNetworkSettingsSummary
): string {
  const enabled = privacyNetworkOptions
    .filter((option) => settings[option.field])
    .map((option) => option.label);

  return enabled.length === 0 ? "all optional network features off" : enabled.join(", ");
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
        <span>
          {backup.relativePath}
          {backup.kind === undefined ? "" : ` · ${formatBackupKind(backup.kind)}`}
        </span>
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

function formatBackupKind(kind: BackupSnapshotSummary["kind"]): string {
  return kind === "pre_migration"
    ? "pre-migration"
    : kind ?? "manual";
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
