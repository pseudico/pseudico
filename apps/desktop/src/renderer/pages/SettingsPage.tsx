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
  initialBackups?: BackupSnapshotSummary[];
  initialBackupMessage?: string | null;
  initialCategories?: CategorySummary[];
  initialExportMessage?: string | null;
  initialMaintenanceJobs?: MaintenanceJobSummary[];
  initialRestoreSummary?: RestoreWorkspaceSummary | null;
  initialRestoreTargetPath?: string;
  initialSelectedRestoreBackupId?: string | null;
  initialSection?: SettingsSectionId;
};

const defaultCategoryColor = "#2c6b8f";
const shortcutGroups = groupShortcuts(
  createShortcutRegistry(defaultShortcutDescriptors).list()
);

type SettingsSectionId =
  | "overview"
  | "appearance"
  | "backup"
  | "privacy"
  | "importsExports"
  | "advanced"
  | "organization";

const settingsSections: Array<{
  id: SettingsSectionId;
  title: string;
  description: string;
  secondary?: boolean;
}> = [
  {
    id: "overview",
    title: "Overview",
    description: "Start with daily settings and safe next actions."
  },
  {
    id: "appearance",
    title: "Appearance & readability",
    description: "Theme, density, font size, locale, and shortcuts."
  },
  {
    id: "backup",
    title: "Backup & restore",
    description: "Create local backups and restore into a new workspace."
  },
  {
    id: "privacy",
    title: "Privacy & local-only",
    description: "Understand local boundaries and optional network controls."
  },
  {
    id: "organization",
    title: "Categories / metadata",
    description: "Manage operator-facing organisation labels."
  },
  {
    id: "importsExports",
    title: "Imports & exports",
    description: "Move data in or out using local files.",
    secondary: true
  },
  {
    id: "advanced",
    title: "Advanced maintenance",
    description: "Troubleshoot health, search, attachments, and database care.",
    secondary: true
  }
];

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
  initialBackups = [],
  initialBackupMessage = null,
  initialCategories = [],
  initialExportMessage = null,
  initialMaintenanceJobs = [],
  initialRestoreSummary = null,
  initialRestoreTargetPath = "",
  initialSelectedRestoreBackupId = null,
  initialSection = "overview"
}: SettingsPageProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const appearance = useAppearanceSettings();
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>(initialSection);
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
  const [restoreTargetPickerBusy, setRestoreTargetPickerBusy] = useState(false);
  const [backups, setBackups] = useState<BackupSnapshotSummary[]>(initialBackups);
  const [backupSchedulerSettings, setBackupSchedulerSettings] =
    useState<BackupSchedulerSettings | null>(null);
  const [backupSchedulerStatus, setBackupSchedulerStatus] =
    useState<BackupSchedulerStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(
    initialBackupMessage
  );
  const [exportMessage, setExportMessage] = useState<string | null>(
    initialExportMessage
  );
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [restoreTargetPath, setRestoreTargetPath] = useState(
    initialRestoreTargetPath
  );
  const [restoreExportPath, setRestoreExportPath] = useState("");
  const [selectedRestoreBackupId, setSelectedRestoreBackupId] =
    useState<string | null>(initialSelectedRestoreBackupId);
  const [restoreSummary, setRestoreSummary] =
    useState<RestoreWorkspaceSummary | null>(initialRestoreSummary);
  const [diagnosticsBusy, setDiagnosticsBusy] = useState(false);
  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const [maintenanceJobs, setMaintenanceJobs] =
    useState<MaintenanceJobSummary[]>(initialMaintenanceJobs);
  const [settingsActivity, setSettingsActivity] = useState<
    SettingsActivityItem[]
  >(() => {
    const initialActivity = getRecentSettingsActivity({
      backupMessage: initialBackupMessage,
      exportMessage: initialExportMessage,
      maintenanceJobs: initialMaintenanceJobs,
      restoreMessage:
        initialRestoreSummary === null
          ? null
          : `Backup restored into ${initialRestoreSummary.targetWorkspaceRootPath}.`
    });

    return initialActivity.length === 0
      ? persistedSettingsActivity
      : initialActivity;
  });
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

  function recordSettingsActivity(item: SettingsActivityItem): void {
    setSettingsActivity((current) => {
      const next = [
        item,
        ...current.filter((activity) => activity.id !== item.id)
      ].slice(0, 4);
      persistedSettingsActivity = next;
      return next;
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
    recordSettingsActivity({
      id: "backup",
      label: "Backup",
      message,
      section: "backup",
      tone: "success"
    });
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

  async function rebuildSearchIndex(): Promise<void> {
    if (currentWorkspace === null) {
      setUserError("Open a workspace before rebuilding search.");
      return;
    }

    setMaintenanceBusy(true);
    setError(null);

    const result = await apiClient.diagnostics.runMaintenanceJob({
      workspaceId: currentWorkspace.id,
      operations: ["rebuild_search_index"]
    });

    setMaintenanceBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Search rebuild failed");
      return;
    }

    setMaintenanceJobs((current) => [
      result.data,
      ...current.filter((job) => job.id !== result.data.id)
    ]);
    recordSettingsActivity({
      id: `maintenance-${result.data.id}`,
      label: "Search rebuild",
      message: formatMaintenanceActivityMessage(result.data),
      section: "advanced",
      tone: result.data.status === "completed" ? "success" : "error"
    });
    showToast(
      result.data.status === "completed"
        ? `Search index rebuilt: ${result.data.searchReindex?.indexedItemCount ?? 0} item(s), ${result.data.searchReindex?.indexedAttachmentCount ?? 0} attachment(s).`
        : `Search rebuild failed: ${result.data.error ?? "unknown error"}.`,
      {
        title: "Search maintenance",
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
    recordSettingsActivity({
      id: "export",
      label: "Export",
      message,
      section: "importsExports",
      tone: "success"
    });
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
    recordSettingsActivity({
      id: "export",
      label: "Export",
      message,
      section: "importsExports",
      tone: "success"
    });
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
    recordSettingsActivity({
      id: "export",
      label: "Export",
      message,
      section: "importsExports",
      tone: "success"
    });
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

  async function chooseRestoreTargetFolder(): Promise<void> {
    if (apiClient.backup.chooseRestoreTargetFolder === undefined) {
      setUserError(
        "Folder picker is not available in this build. Use the advanced path field only if support asks you to."
      );
      return;
    }

    setRestoreTargetPickerBusy(true);
    setError(null);

    const result = await apiClient.backup.chooseRestoreTargetFolder(
      currentWorkspace === null
        ? undefined
        : { defaultPath: `${currentWorkspace.rootPath}-restored` }
    );

    setRestoreTargetPickerBusy(false);

    if (!result.ok) {
      setUserError(result.error, "Restore folder picker failed");
      return;
    }

    if (result.data === null) {
      return;
    }

    setRestoreTargetPath(result.data);
    setRestoreMessage(`Restore destination set to ${result.data}.`);
  }

  function previewRestoreBackup(backup: BackupSnapshotSummary): void {
    setSelectedRestoreBackupId(backup.id);
    setRestoreSummary(null);
    setRestoreMessage(null);
    setError(null);
  }

  async function restoreBackup(backup: BackupSnapshotSummary): Promise<void> {
    if (restoreTargetPath.trim().length === 0) {
      setUserError("Choose a restore destination folder before restoring.");
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
    recordSettingsActivity({
      id: "restore",
      label: "Restore",
      message,
      section: "backup",
      tone: "success"
    });
    showToast(message, {
      title: "Restore complete",
      tone: "success"
    });
    void refreshCurrentWorkspace(apiClient);
  }

  async function openRestoredWorkspace(summary: RestoreWorkspaceSummary): Promise<void> {
    const result = await apiClient.workspace.openWorkspace({
      rootPath: summary.targetWorkspaceRootPath
    });

    if (!result.ok) {
      setUserError(result.error, "Open restored workspace failed");
      return;
    }

    const message = `Opened restored workspace at ${result.data.rootPath}.`;
    setRestoreMessage(message);
    showToast(message, { title: "Restored workspace opened", tone: "success" });
    void refreshCurrentWorkspace(apiClient);
  }

  async function revealRestoredWorkspace(
    summary: RestoreWorkspaceSummary
  ): Promise<void> {
    if (apiClient.backup.revealRestoredWorkspaceFolder === undefined) {
      setUserError("Folder reveal is not available in this build.");
      return;
    }

    const result = await apiClient.backup.revealRestoredWorkspaceFolder({
      rootPath: summary.targetWorkspaceRootPath
    });

    if (!result.ok) {
      setUserError(result.error, "Show restored folder failed");
    }
  }

  async function revealBackupFolder(sourcePath: string | null): Promise<void> {
    if (sourcePath === null) {
      setUserError("This restore summary does not include a backup source path.");
      return;
    }

    if (apiClient.backup.revealBackupFolder === undefined) {
      setUserError("Folder reveal is not available in this build.");
      return;
    }

    const result = await apiClient.backup.revealBackupFolder({
      backupRelativePath: sourcePath
    });

    if (!result.ok) {
      setUserError(result.error, "Show backup folder failed");
    }
  }

  async function restoreWorkspaceExport(): Promise<void> {
    if (restoreExportPath.trim().length === 0) {
      setUserError("Enter a workspace export JSON file path before restoring.");
      return;
    }

    if (restoreTargetPath.trim().length === 0) {
      setUserError("Choose a restore destination folder before restoring.");
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
    recordSettingsActivity({
      id: "restore",
      label: "Restore",
      message,
      section: "backup",
      tone: "success"
    });
    showToast(message, {
      title: "Restore complete",
      tone: "success"
    });
    void refreshCurrentWorkspace(apiClient);
  }

  const selectedRestoreBackup =
    selectedRestoreBackupId === null
      ? null
      : backups.find((backup) => backup.id === selectedRestoreBackupId) ?? null;
  return (
    <section className="settings-layout">
      <div className="page-heading">
        <p className="top-eyebrow">Settings</p>
        <h2>{t("settings.page.title")}</h2>
        <p>
          {currentWorkspace === null
            ? "Open a workspace to adjust local-only preferences, backup safety, and organisation settings."
            : `Local workspace: ${currentWorkspace.rootPath}`}
        </p>
      </div>

      <nav className="settings-section-nav" aria-label="Settings sections">
        {settingsSections.map((section) => (
          <button
            aria-pressed={activeSection === section.id}
            className={
              activeSection === section.id
                ? "settings-section-tab settings-section-tab-active"
                : section.secondary
                  ? "settings-section-tab settings-section-tab-secondary"
                  : "settings-section-tab"
            }
            key={section.id}
            type="button"
            onClick={() => setActiveSection(section.id)}
          >
            <strong>{section.title}</strong>
            <span>{section.description}</span>
          </button>
        ))}
      </nav>

      {error === null ? null : <ErrorState error={error} title="Settings error" />}

      {settingsActivity.length === 0 ? null : (
        <SettingsActivitySummary
          items={settingsActivity}
          onOpenSection={setActiveSection}
        />
      )}

      {activeSection === "overview" ? (
        <section className="settings-overview-panel" aria-label="Settings overview">
          <div className="settings-overview-hero">
            <div>
              <p className="top-eyebrow">Operator settings</p>
              <h3>Start with comfort, safety, and local trust.</h3>
              <p className="muted-text">
                Settings is organised by what you are trying to do. Everyday
                preferences and recovery controls are first; import/export and
                maintenance tools stay available when deliberately opened.
              </p>
            </div>
            <button
              className="primary-button"
              type="button"
              onClick={() => setActiveSection("backup")}
            >
              Open Backup &amp; Restore
            </button>
          </div>
          <div className="settings-intent-grid">
            <article className="settings-intent-card settings-intent-card-primary">
              <Palette size={20} aria-hidden="true" />
              <h4>Appearance &amp; readability</h4>
              <p>Use this to adjust the visible app for daily reading, scanning, and input comfort.</p>
              <button type="button" onClick={() => setActiveSection("appearance")}>Adjust appearance</button>
            </article>
            <article className="settings-intent-card settings-intent-card-primary">
              <Archive size={20} aria-hidden="true" />
              <h4>Backup &amp; restore</h4>
              <p>Create a local backup or restore into a new workspace. This will not overwrite your current workspace.</p>
              <button type="button" onClick={() => setActiveSection("backup")}>Review backups</button>
            </article>
            <article className="settings-intent-card settings-intent-card-primary">
              <ShieldCheck size={20} aria-hidden="true" />
              <h4>Privacy &amp; local-only</h4>
              <p>Confirm that telemetry and cloud sync are off, and choose any optional network-capable features deliberately.</p>
              <button type="button" onClick={() => setActiveSection("privacy")}>Review privacy</button>
            </article>
            <article className="settings-intent-card">
              <Plus size={20} aria-hidden="true" />
              <h4>Categories / metadata</h4>
              <p>Manage the labels that help organise projects, contacts, tasks, notes, and files.</p>
              <button type="button" onClick={() => setActiveSection("organization")}>Manage categories</button>
            </article>
            <article className="settings-intent-card settings-intent-card-secondary">
              <Upload size={20} aria-hidden="true" />
              <h4>Imports &amp; exports</h4>
              <p>Advanced: use when moving local files in or out of Pseudico, not for everyday planning.</p>
              <button type="button" onClick={() => setActiveSection("importsExports")}>Open imports &amp; exports</button>
            </article>
            <article className="settings-intent-card settings-intent-card-secondary">
              <Wrench size={20} aria-hidden="true" />
              <h4>Advanced maintenance</h4>
              <p>Advanced: use only when troubleshooting search, attachments, workspace health, or maintenance jobs.</p>
              <button type="button" onClick={() => setActiveSection("advanced")}>Open maintenance</button>
            </article>
          </div>
        </section>
      ) : null}

      {activeSection === "appearance" ? (
        <>
      <section className="backup-management-panel" aria-label="Appearance and readability">
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
        </>
      ) : null}

      {activeSection === "privacy" ? (
      <section className="backup-management-panel" aria-label="Privacy and network">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Privacy &amp; local-only</h3>
            <p className="muted-text">
              Pseudico keeps your workspace on this device. Optional
              network-capable features are off by default and only run when you
              deliberately enable them for this local workspace.
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
      ) : null}

      {activeSection === "appearance" ? (
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
      ) : null}

      {activeSection === "advanced" ? (
        <>
      <WorkspaceHealthPanel workspace={currentWorkspace} />
      <section className="backup-management-panel" aria-label="Advanced diagnostics">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Advanced diagnostics</h3>
            <p className="muted-text">
              Advanced: use when search, attachments, or saved views look wrong.
              Results explain what was checked before you decide what to repair.
            </p>
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
            <button
              className="secondary-button compact-button"
              disabled={maintenanceBusy || currentWorkspace === null}
              type="button"
              onClick={() => void rebuildSearchIndex()}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Rebuild search index
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
            <h3>Advanced maintenance</h3>
            <p className="muted-text">
              Advanced: use only when troubleshooting or preparing risky local
              cleanup. Pseudico creates a backup preflight before write
              maintenance, and orphan cleanup quarantines files under
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
        </>
      ) : null}

      {activeSection === "backup" ? (
      <section className="backup-management-panel backup-restore-panel" aria-label="Backup and restore">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Backup &amp; restore</h3>
            <p className="muted-text">
              Use this to create local backup snapshots and restore a backup
              into a fresh workspace folder. This will not overwrite your
              current workspace.
            </p>
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

        <div className="restore-destination-card" aria-label="Restore destination">
          <div>
            <strong>1. Choose where the restored workspace will be created</strong>
            <p className="muted-text">
              Current workspace: {currentWorkspace?.rootPath ?? "No workspace open"}.
              Restore always creates a separate local workspace and will not
              overwrite the workspace you are using now.
            </p>
          </div>
          <div className="top-actions">
            <button
              className="primary-button"
              disabled={restoreBusy || restoreTargetPickerBusy}
              type="button"
              onClick={() => void chooseRestoreTargetFolder()}
            >
              <FolderOpen size={17} aria-hidden="true" />
              {restoreTargetPickerBusy ? "Choosing..." : "Choose restore folder"}
            </button>
          </div>
          <div className="restore-destination-path">
            <span>Restore destination</span>
            <strong>
              {restoreTargetPath.trim().length === 0
                ? "No folder chosen yet"
                : restoreTargetPath}
            </strong>
          </div>
          <details className="advanced-disclosure">
            <summary>Advanced: paste a destination path instead</summary>
            <label>
              <span>Destination folder path</span>
              <input
                disabled={restoreBusy}
                placeholder="C:\\Users\\you\\Local Work OS Restored"
                value={restoreTargetPath}
                onChange={(event) => setRestoreTargetPath(event.target.value)}
              />
            </label>
          </details>
        </div>

        <div className="backup-list" aria-label="Backup list">
          <div className="backup-list-heading">
            <strong>2. Pick the backup to restore</strong>
            <span>Newest backups appear first with database and attachment status.</span>
          </div>
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
                selected={selectedRestoreBackupId === backup.id}
                onPreview={previewRestoreBackup}
              />
            ))
          )}
        </div>
        {selectedRestoreBackup === null ? null : (
          <RestorePreviewPanel
            backup={selectedRestoreBackup}
            currentWorkspaceRootPath={currentWorkspace?.rootPath ?? null}
            restoreBusy={restoreBusy}
            targetRootPath={restoreTargetPath.trim()}
            onChooseTarget={chooseRestoreTargetFolder}
            onRestore={restoreBackup}
          />
        )}
        {restoreMessage === null ? null : (
          <p className="form-message form-message-ok">{restoreMessage}</p>
        )}
        {restoreSummary === null ? null : (
          <RestoreSummaryPanel
            summary={restoreSummary}
            onOpenRestoredWorkspace={openRestoredWorkspace}
            onRevealBackupFolder={revealBackupFolder}
            onRevealRestoredWorkspace={revealRestoredWorkspace}
          />
        )}
      </section>
      ) : null}

      {activeSection === "importsExports" ? (
        <>
      <section className="export-management-panel" aria-label="Imports and exports - imports">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Imports from local files</h3>
            <p className="muted-text">
              Preview local files before importing. Operator-facing Markdown and
              CSV/TSV imports create local tasks, contacts, projects, notes, and
              attachments through the existing write flows.
            </p>
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
              className="secondary-button compact-button"
              disabled={importBusy}
              type="button"
              onClick={() => void validateWorkspaceImport()}
            >
              <Upload size={16} aria-hidden="true" />
              Validate portable JSON import
            </button>
          </div>
        </div>

        <div className="category-form" aria-label="Markdown folder import wizard">
          <label>
            <span>Markdown folder path</span>
            <input
              disabled={importBusy}
              placeholder="C:\\Users\\you\\imports\\project-notes"
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

        <details
          className="advanced-disclosure advanced-restore-disclosure"
          aria-label="Advanced portable data restore"
        >
          <summary>Advanced portable data restore from JSON export</summary>
          <p className="muted-text">
            Use this only when deliberately restoring a portable workspace JSON
            export. Normal recovery should use the backup restore guide above.
          </p>
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
          <label>
            <span>New restore workspace folder</span>
            <input
              disabled={restoreBusy}
              placeholder="C:\\Users\\you\\Local Work OS Restored"
              value={restoreTargetPath}
              onChange={(event) => setRestoreTargetPath(event.target.value)}
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
        </details>

        {restoreMessage === null ? null : (
          <p className="form-message form-message-ok">{restoreMessage}</p>
        )}
        {restoreSummary === null ? null : (
          <RestoreSummaryPanel
            summary={restoreSummary}
            onOpenRestoredWorkspace={openRestoredWorkspace}
            onRevealBackupFolder={revealBackupFolder}
            onRevealRestoredWorkspace={revealRestoredWorkspace}
          />
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
            <h3>Advanced optional IMAP import</h3>
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
      <section className="export-management-panel" aria-label="Imports and exports - exports">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Exports to local files</h3>
            <p className="muted-text">
              Use this to create local files you control. Portable JSON and
              bundles are advanced recovery/exchange formats, not cloud sync.
            </p>
          </div>
          <div className="top-actions">
            <button
              className="secondary-button compact-button"
              disabled={exportBusy || currentWorkspace === null}
              type="button"
              onClick={() => void exportWorkspaceJson()}
            >
              <FileJson size={16} aria-hidden="true" />
              Export portable JSON
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
              className="secondary-button compact-button"
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
        </>
      ) : null}

      {activeSection === "organization" ? (
      <section className="category-management-panel" aria-label="Categories and metadata">
        <div className="panel-heading-actions">
          <div className="panel-heading">
            <h3>Categories / metadata</h3>
            <p className="muted-text">
              Use this to maintain the organisation labels that help group work
              across projects, contacts, tasks, notes, files, and searches.
            </p>
          </div>
        </div>

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
      ) : null}
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

type SettingsActivityItem = {
  id: string;
  label: string;
  message: string;
  section: SettingsSectionId;
  tone: "success" | "error" | "info";
};

let persistedSettingsActivity: SettingsActivityItem[] = [];

function SettingsActivitySummary({
  items,
  onOpenSection
}: {
  items: SettingsActivityItem[];
  onOpenSection: (section: SettingsSectionId) => void;
}): React.JSX.Element {
  return (
    <section className="settings-activity-summary" aria-label="Recent Settings activity">
      <div>
        <p className="top-eyebrow">Recent Settings activity</p>
        <h3>What just happened stays visible here.</h3>
        <p className="muted-text">
          Backup, export, restore, and search maintenance results remain
          findable after their toast disappears.
        </p>
      </div>
      <div className="settings-activity-list">
        {items.map((item) => (
          <article
            className={`settings-activity-item settings-activity-${item.tone}`}
            key={item.id}
          >
            <div>
              <strong>{item.label}</strong>
              <span>{item.message}</span>
            </div>
            <button
              className="secondary-button compact-button"
              type="button"
              onClick={() => onOpenSection(item.section)}
            >
              Review
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function getRecentSettingsActivity({
  backupMessage,
  exportMessage,
  maintenanceJobs,
  restoreMessage
}: {
  backupMessage: string | null;
  exportMessage: string | null;
  maintenanceJobs: MaintenanceJobSummary[];
  restoreMessage: string | null;
}): SettingsActivityItem[] {
  const items: SettingsActivityItem[] = [];

  if (backupMessage !== null) {
    items.push({
      id: "backup",
      label: "Backup",
      message: backupMessage,
      section: "backup",
      tone: "success"
    });
  }

  if (restoreMessage !== null) {
    items.push({
      id: "restore",
      label: "Restore",
      message: restoreMessage,
      section: "backup",
      tone: "success"
    });
  }

  if (exportMessage !== null) {
    items.push({
      id: "export",
      label: "Export",
      message: exportMessage,
      section: "importsExports",
      tone: "success"
    });
  }

  const latestSearchMaintenance = maintenanceJobs.find((job) =>
    job.operations.includes("rebuild_search_index")
  );

  if (latestSearchMaintenance !== undefined) {
    items.push({
      id: `maintenance-${latestSearchMaintenance.id}`,
      label: "Search rebuild",
      message: formatMaintenanceActivityMessage(latestSearchMaintenance),
      section: "advanced",
      tone: latestSearchMaintenance.status === "completed" ? "success" : "error"
    });
  }

  return items.slice(0, 4);
}

function formatMaintenanceActivityMessage(job: MaintenanceJobSummary): string {
  if (job.status === "failed") {
    return `Search maintenance failed: ${job.error ?? "unknown error"}.`;
  }

  if (job.searchReindex === null) {
    return `Maintenance completed at ${formatDiagnosticDate(job.completedAt)}.`;
  }

  return `Search index rebuilt at ${formatDiagnosticDate(job.completedAt)}: ${job.searchReindex.indexedItemCount} item(s), ${job.searchReindex.indexedAttachmentCount} attachment(s).`;
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

function RestorePreviewPanel({
  backup,
  currentWorkspaceRootPath,
  onChooseTarget,
  onRestore,
  restoreBusy,
  targetRootPath
}: {
  backup: BackupSnapshotSummary;
  currentWorkspaceRootPath: string | null;
  onChooseTarget: () => Promise<void>;
  onRestore: (backup: BackupSnapshotSummary) => Promise<void>;
  restoreBusy: boolean;
  targetRootPath: string;
}): React.JSX.Element {
  const canRestore =
    targetRootPath.length > 0 &&
    backup.databaseRelativePath !== null &&
    backup.manifestRelativePath !== null;

  return (
    <div className="restore-preview-card" aria-label="Restore preview">
      <div>
        <strong>3. Review restore before it runs</strong>
        <p className="muted-text">
          Pseudico will create a new local workspace from this backup. It will
          block unsafe targets such as the active workspace.
        </p>
      </div>
      <dl className="restore-preview-grid">
        <div>
          <dt>Current workspace</dt>
          <dd>{currentWorkspaceRootPath ?? "No workspace open"}</dd>
        </div>
        <div>
          <dt>Backup source</dt>
          <dd>{backup.relativePath}</dd>
        </div>
        <div>
          <dt>Backup date</dt>
          <dd>{formatBackupDate(backup.createdAt)}</dd>
        </div>
        <div>
          <dt>Included data</dt>
          <dd>
            {backup.databaseSizeBytes === null
              ? "Database copy missing"
              : `${formatBytes(backup.databaseSizeBytes)} database`}
            ; {backup.attachmentCount} attachment record(s),{" "}
            {formatBytes(backup.totalAttachmentBytes)} manifest total
          </dd>
        </div>
        <div>
          <dt>Restore destination</dt>
          <dd>
            {targetRootPath.length === 0
              ? "Choose a destination folder before restoring."
              : targetRootPath}
          </dd>
        </div>
        <div>
          <dt>Safety policy</dt>
          <dd>New workspace only; current workspace is not overwritten.</dd>
        </div>
      </dl>
      <div className="top-actions">
        {targetRootPath.length === 0 ? (
          <button
            className="secondary-button"
            disabled={restoreBusy}
            type="button"
            onClick={() => void onChooseTarget()}
          >
            <FolderOpen size={17} aria-hidden="true" />
            Choose destination first
          </button>
        ) : null}
        <button
          className="primary-button"
          disabled={!canRestore || restoreBusy}
          type="button"
          onClick={() => void onRestore(backup)}
        >
          <Archive size={17} aria-hidden="true" />
          {restoreBusy ? "Restoring..." : "Restore into new workspace"}
        </button>
      </div>
    </div>
  );
}

function RestoreSummaryPanel({
  onOpenRestoredWorkspace,
  onRevealBackupFolder,
  onRevealRestoredWorkspace,
  summary
}: {
  onOpenRestoredWorkspace: (summary: RestoreWorkspaceSummary) => Promise<void>;
  onRevealBackupFolder: (sourcePath: string | null) => Promise<void>;
  onRevealRestoredWorkspace: (summary: RestoreWorkspaceSummary) => Promise<void>;
  summary: RestoreWorkspaceSummary;
}): React.JSX.Element {
  const warningCount = summary.issues.filter(
    (issue) => issue.severity === "warning"
  ).length;

  return (
    <div className="restore-success-card" aria-label="Restore summary">
      <div className="backup-list-row">
        <div>
          <strong>Restore complete: new workspace created</strong>
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
      <div className="top-actions">
        <button
          className="primary-button"
          type="button"
          onClick={() => void onOpenRestoredWorkspace(summary)}
        >
          <FolderOpen size={17} aria-hidden="true" />
          Open restored workspace
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void onRevealRestoredWorkspace(summary)}
        >
          Show restored folder
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => void onRevealBackupFolder(summary.sourcePath)}
        >
          Show backup folder
        </button>
      </div>
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
    description: "Allow opted-in link widgets to load sandboxed remote HTTP(S) pages."
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
  onPreview,
  restoreBusy,
  selected
}: {
  backup: BackupSnapshotSummary;
  onPreview: (backup: BackupSnapshotSummary) => void;
  restoreBusy: boolean;
  selected: boolean;
}): React.JSX.Element {
  return (
    <div
      className={
        selected ? "backup-list-row backup-list-row-selected" : "backup-list-row"
      }
    >
      <div>
        <strong>
          {formatBackupDate(backup.createdAt)}
          {selected ? " — selected for restore" : ""}
        </strong>
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
          onClick={() => onPreview(backup)}
        >
          Preview restore
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
