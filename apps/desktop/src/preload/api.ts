export type ApiErrorCode =
  | "INVALID_INPUT"
  | "IPC_ERROR"
  | "NOT_IMPLEMENTED"
  | "WORKSPACE_ERROR"
  | "UNKNOWN_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
};

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiError;
    };

export type WorkspaceSummary = {
  id: string;
  name: string;
  rootPath: string;
  openedAt: string;
  schemaVersion: number | null;
};

export type RecentWorkspace = {
  name: string;
  rootPath: string;
  lastOpenedAt: string;
};

export type WorkspaceManifest = {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: string;
  lastOpenedAt: string;
  app: {
    name: "Local Work OS";
    workspaceFormat: 1;
  };
};

export type WorkspacePaths = {
  workspaceRootPath: string;
  manifestPath: string;
  dataPath: string;
  databasePath: string;
  attachmentsPath: string;
  backupsPath: string;
  exportsPath: string;
  logsPath: string;
};

export type WorkspaceValidationProblem = {
  code: string;
  message: string;
  severity: "error" | "warning";
  repairable: boolean;
  path?: string;
};

export type WorkspaceValidationResult = {
  ok: boolean;
  workspaceRootPath: string;
  paths: WorkspacePaths;
  problems: WorkspaceValidationProblem[];
  manifest?: WorkspaceManifest;
};

export type BackupManifestAttachment = {
  id: string;
  itemId: string;
  originalName: string;
  storedName: string;
  mimeType: string | null;
  sizeBytes: number;
  checksum: string | null;
  storagePath: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BackupManifestSummary = {
  id: string;
  kind: "manual" | "automatic" | "pre_migration";
  workspaceId: string;
  workspaceName: string;
  createdAt: string;
  database: {
    sourceRelativePath: string;
    backupRelativePath: string;
    sizeBytes: number;
    checksum: string | null;
  };
  attachments: BackupManifestAttachment[];
  attachmentCount: number;
  totalAttachmentBytes: number;
};

export type BackupSnapshotSummary = {
  id: string;
  workspaceId: string;
  createdAt: string;
  relativePath: string;
  databaseRelativePath: string | null;
  manifestRelativePath: string | null;
  attachmentCount: number;
  totalAttachmentBytes: number;
  databaseSizeBytes: number | null;
  kind?: "manual" | "automatic" | "pre_migration";
};

export type ManualBackupSnapshotSummary = BackupSnapshotSummary & {
  databaseRelativePath: string;
  manifestRelativePath: string;
  databaseSizeBytes: number;
  manifest: BackupManifestSummary;
};

export type CreateManualBackupInput = {
  workspaceId?: string;
};

export type ListBackupsInput = {
  workspaceId?: string;
};

export type ScheduledBackupTrigger =
  | "app_open"
  | "interval"
  | "app_close"
  | "pre_migration"
  | "manual_check";

export type BackupRetentionSettings = {
  maxCount: number;
  maxAgeDays: number;
  maxSizeBytes: number;
};

export type BackupSchedulerSettings = {
  workspaceId: string;
  enabled: boolean;
  intervalHours: number;
  runOnAppClose: boolean;
  runBeforeMigration: boolean;
  retention: BackupRetentionSettings;
  updatedAt: string | null;
};

export type BackupSchedulerStatus = {
  workspaceId: string;
  lastCheckedAt: string | null;
  lastRunAt: string | null;
  lastSuccessfulBackupAt: string | null;
  lastBackupId: string | null;
  lastError: string | null;
  nextRunAt: string | null;
  lastRetentionDeletedCount: number;
  updatedAt: string | null;
};

export type BackupSchedulerSettingsSummary = {
  settings: BackupSchedulerSettings;
  status: BackupSchedulerStatus;
};

export type UpdateBackupSchedulerSettingsInput = {
  workspaceId: string;
  enabled?: boolean;
  intervalHours?: number;
  runOnAppClose?: boolean;
  runBeforeMigration?: boolean;
  retention?: Partial<BackupRetentionSettings>;
};

export type RunAutomaticBackupInput = {
  workspaceId: string;
  trigger: ScheduledBackupTrigger;
};

export type BackupRetentionDeletionSummary = {
  id: string;
  relativePath: string;
  createdAt: string;
  reason: "count" | "age" | "size";
};

export type AutomaticBackupRunSummary = {
  workspaceId: string;
  trigger: ScheduledBackupTrigger;
  due: boolean;
  skippedReason: string | null;
  createdBackup: ManualBackupSnapshotSummary | null;
  retentionDeletedBackups: BackupRetentionDeletionSummary[];
  settings: BackupSchedulerSettings;
  status: BackupSchedulerStatus;
};

export type RestoreIssueSummary = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

export type RestoreValidationSummary = {
  valid: boolean;
  sourceType: "backup" | "workspace_export";
  sourcePath: string | null;
  workspace: {
    id: string;
    name: string;
    schemaVersion: number | null;
  } | null;
  counts: {
    containers: number;
    items: number;
    listItems: number;
    attachments: number;
  };
  targetPolicy: {
    mode: "new_workspace_only";
    canApplyToActiveWorkspace: false;
    message: string;
  };
  issues: RestoreIssueSummary[];
};

export type RestoreWorkspaceSummary = RestoreValidationSummary & {
  restoredAt: string;
  targetWorkspaceRootPath: string;
  copiedAttachmentCount: number;
  missingAttachmentCount: number;
  searchIndex: {
    indexedContainerCount: number;
    indexedItemCount: number;
    indexedListItemCount: number;
    indexedAttachmentCount: number;
  };
};

export type RestoreBackupToNewWorkspaceInput = {
  backupRelativePath: string;
  targetRootPath: string;
};

export type ListBackupsForWorkspacePathInput = {
  rootPath: string;
};

export type RestoreBackupFromWorkspacePathInput = {
  sourceWorkspaceRootPath: string;
  backupRelativePath: string;
  targetRootPath: string;
};

export type RestoreExportToNewWorkspaceInput = {
  filePath: string;
  targetRootPath: string;
};

export type ValidateRestoreSourceInput =
  | {
      sourceType: "backup";
      backupRelativePath: string;
    }
  | {
      sourceType: "workspace_export";
      filePath: string;
    };

export type WorkspaceJsonExportSummary = {
  id: string;
  workspaceId: string;
  createdAt: string;
  relativePath: string;
  sizeBytes: number;
  schemaVersion: number;
  itemCount: number;
  attachmentCount: number;
  totalAttachmentBytes: number;
};

export type TextExportKind =
  | "project_markdown"
  | "tasks_csv"
  | "tasks_tsv"
  | "planning_summary_markdown"
  | "html_csv_tsv_markdown_bundle";

export type TextExportSummary = {
  id: string;
  workspaceId: string;
  createdAt: string;
  relativePath: string;
  sizeBytes: number;
  kind: TextExportKind;
  sourceId: string;
  rowCount: number;
};

export type ExportWorkspaceJsonInput = {
  workspaceId?: string;
};

export type ExportProjectMarkdownInput = {
  projectId: string;
};

export type ExportTasksCsvInput = {
  workspaceId?: string;
  format?: "csv" | "tsv";
};

export type ExportPlanningSummaryMarkdownInput = {
  workspaceId?: string;
  date?: string | Date;
};

export type ExportHtmlCsvTsvMarkdownBundleInput = {
  workspaceId?: string;
};

export type BundleExportFileSummary = {
  relativePath: string;
  role: string;
  mediaType: string;
  sizeBytes: number;
  sourceType?: string;
  sourceId?: string;
  rowCount?: number;
};

export type BundleExportManifestSummary = {
  schemaVersion: number;
  kind: "html_csv_tsv_markdown_bundle";
  workspace: {
    id: string;
    name: string;
    schemaVersion: number;
  };
  createdAt: string;
  files: BundleExportFileSummary[];
  counts: {
    containers: number;
    projects: number;
    contacts: number;
    tasks: number;
    lists: number;
    listItems: number;
    savedViews: number;
    collections: number;
    searchRecords: number;
    attachments: number;
    totalAttachmentBytes: number;
  };
};

export type BundleExportSummary = {
  id: string;
  workspaceId: string;
  createdAt: string;
  relativePath: string;
  sizeBytes: number;
  kind: "html_csv_tsv_markdown_bundle";
  fileCount: number;
  containerCount: number;
  taskCount: number;
  listItemCount: number;
  savedViewCount: number;
  searchRecordCount: number;
  attachmentCount: number;
  manifest: BundleExportManifestSummary;
};

export type PrintPdfInput = {
  workspaceId?: string;
  title?: string;
  itemIds?: string[];
  containerId?: string;
};

export type PrintPdfSummary = {
  id: string;
  workspaceId: string;
  createdAt: string;
  relativePath: string;
  sizeBytes: number;
  sourceType: "selected_items" | "container" | "view";
  sourceId: string;
  itemCount: number;
};

export type ImportValidationIssueSummary = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

export type ImportValidationCountsSummary = {
  containers: number;
  containerTabs: number;
  items: number;
  taskDetails: number;
  noteDetails: number;
  listDetails: number;
  listItems: number;
  linkDetails: number;
  tags: number;
  taggings: number;
  categories: number;
  relationships: number;
  savedViews: number;
  dashboards: number;
  dashboardWidgets: number;
  dailyPlans: number;
  dailyPlanItems: number;
  attachments: number;
};

export type ImportValidationSummary = {
  valid: boolean;
  sourcePath: string | null;
  schemaVersion: number | null;
  exportedAt: string | null;
  workspace: {
    id: string;
    name: string;
    schemaVersion: number;
  } | null;
  counts: ImportValidationCountsSummary;
  attachmentManifest: {
    attachmentCount: number;
    totalAttachmentBytes: number;
  } | null;
  targetPolicy: {
    mode: "new_workspace_only";
    canApplyToActiveWorkspace: false;
    message: string;
  };
  issues: ImportValidationIssueSummary[];
};

export type EmailImportIssueSummary = {
  sourcePath: string;
  code: "empty_message" | "parse_failed" | "task_create_failed" | "attachment_failed";
  message: string;
};

export type EmailImportPreviewSummary = {
  sourcePath: string;
  fileName: string;
  subject: string;
  from: string | null;
  to: string | null;
  date: string | null;
  taskTitle: string;
  bodyPreview: string;
  inlineTags: string[];
  warning: string | null;
};

export type EmailImportedTaskSummary = {
  itemId: string;
  title: string;
  sourcePath: string;
  attachmentId: string | null;
};

export type EmailTaskImportSummary = {
  workspaceId: string;
  containerId: string;
  importedAt: string;
  importedCount: number;
  skippedCount: number;
  importedTasks: EmailImportedTaskSummary[];
  issues: EmailImportIssueSummary[];
};

export type CsvImportTargetType = "task" | "contact" | "project";
export type CsvImportConflictStrategy = "create_new" | "skip_existing";
export type CsvImportMissingContainerStrategy = "create_project" | "inbox" | "error";
export type CsvImportMappingField =
  | "title"
  | "name"
  | "description"
  | "body"
  | "status"
  | "priority"
  | "startAt"
  | "dueAt"
  | "container"
  | "category"
  | "tags"
  | "email"
  | "phone"
  | "company"
  | "role"
  | "website";
export type CsvImportColumnMapping = Partial<Record<CsvImportMappingField, string>>;
export type CsvImportValidationIssueSummary = {
  severity: "error" | "warning";
  code: string;
  rowNumber: number | null;
  field?: CsvImportMappingField;
  message: string;
};
export type CsvImportPreviewRowSummary = {
  rowNumber: number;
  targetType: CsvImportTargetType;
  action: "create" | "skip";
  title: string;
  containerName: string | null;
  tags: string[];
  categoryName: string | null;
  issues: CsvImportValidationIssueSummary[];
};
export type CsvImportPreviewSummary = {
  valid: boolean;
  workspaceId: string;
  targetType: CsvImportTargetType;
  format: "csv" | "tsv";
  headers: string[];
  mapping: CsvImportColumnMapping;
  rowCount: number;
  creatableCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  issues: CsvImportValidationIssueSummary[];
  rows: CsvImportPreviewRowSummary[];
};
export type CsvImportCreatedTargetSummary = {
  targetType: CsvImportTargetType;
  id: string;
  title: string;
  rowNumber: number;
};
export type CsvImportExecuteSummary = CsvImportPreviewSummary & {
  importedAt: string;
  importedCount: number;
  created: CsvImportCreatedTargetSummary[];
};
export type CsvImportPreviewFileInput = {
  workspaceId?: string;
  filePath: string;
  targetType: CsvImportTargetType;
  mapping?: CsvImportColumnMapping;
  conflictStrategy?: CsvImportConflictStrategy;
  missingContainerStrategy?: CsvImportMissingContainerStrategy;
};
export type CsvImportExecuteFileInput = CsvImportPreviewFileInput;

export type MarkdownFolderImportValidationIssueSummary = {
  severity: "error" | "warning";
  code: string;
  relativePath: string | null;
  message: string;
};
export type MarkdownFolderImportPreviewRowSummary = {
  relativePath: string;
  kind: "directory" | "markdown" | "file" | "unsupported" | "project" | "tab" | "heading";
  action: "create" | "skip";
  title: string;
  targetTabName: string;
  issues: MarkdownFolderImportValidationIssueSummary[];
};
export type MarkdownFolderImportSourceReportSummary = {
  frontmatter: Array<{ relativePath: string; keys: string[] }>;
  tags: Array<{ relativePath: string; tags: string[] }>;
  wikilinks: Array<{ relativePath: string; titles: string[] }>;
  attachmentEmbeds: Array<{
    relativePath: string;
    rawTarget: string;
    resolvedRelativePath: string | null;
  }>;
  unsupportedCanvasFiles: Array<{ relativePath: string }>;
};
export type MarkdownFolderImportPreviewSummary = {
  valid: boolean;
  workspaceId: string;
  projectName: string;
  sourceRootPath?: string;
  rowCount: number;
  directoryCount: number;
  markdownCount: number;
  fileCount: number;
  unsupportedCount: number;
  tabCount: number;
  headingCount: number;
  frontmatterCount: number;
  tagCount: number;
  wikilinkCount: number;
  attachmentEmbedCount: number;
  resolvedAttachmentEmbedCount: number;
  creatableCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  issues: MarkdownFolderImportValidationIssueSummary[];
  rows: MarkdownFolderImportPreviewRowSummary[];
  sourceReport: MarkdownFolderImportSourceReportSummary;
};
export type MarkdownFolderImportCreatedTargetSummary = {
  targetType: "project" | "container_tab" | "item" | "attachment";
  id: string;
  title: string;
  relativePath: string;
};
export type MarkdownFolderImportExecuteSummary = MarkdownFolderImportPreviewSummary & {
  importedAt: string;
  importedCount: number;
  created: MarkdownFolderImportCreatedTargetSummary[];
};
export type MarkdownFolderImportPreviewFolderInput = {
  workspaceId?: string;
  folderPath: string;
  projectName?: string;
};
export type MarkdownFolderImportExecuteFolderInput = MarkdownFolderImportPreviewFolderInput;
export type ChooseMarkdownFolderImportInput = {
  workspaceId?: string;
  projectName?: string;
};

export type MarkdownNoteImportValidationIssueSummary = {
  severity: "error" | "warning";
  code: string;
  relativePath: string | null;
  message: string;
};
export type MarkdownNoteImportPreviewRowSummary = {
  relativePath: string;
  action: "create" | "skip";
  title: string;
  containerId: string;
  containerTabId: string | null;
  tags: string[];
  wikilinks: string[];
  issues: MarkdownNoteImportValidationIssueSummary[];
};
export type MarkdownNoteImportCreatedTargetSummary = {
  targetType: "item";
  id: string;
  title: string;
  relativePath: string;
};
export type MarkdownNoteImportPreviewSummary = {
  valid: boolean;
  workspaceId: string;
  rowCount: number;
  markdownCount: number;
  creatableCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  issues: MarkdownNoteImportValidationIssueSummary[];
  rows: MarkdownNoteImportPreviewRowSummary[];
};
export type MarkdownNoteImportExecuteSummary = MarkdownNoteImportPreviewSummary & {
  importedAt: string;
  importedCount: number;
  created: MarkdownNoteImportCreatedTargetSummary[];
};
export type MarkdownNoteImportPreviewFileInput = {
  workspaceId?: string;
  containerId: string;
  containerTabId?: string | null;
  filePaths: string[];
};
export type MarkdownNoteImportExecuteFileInput = MarkdownNoteImportPreviewFileInput;



export type MaintenanceOperation =
  | "sqlite_integrity_check"
  | "attachment_manifest_audit"
  | "rebuild_search_index"
  | "vacuum"
  | "orphan_attachment_scan"
  | "orphan_attachment_cleanup";

export type RunMaintenanceJobInput = {
  workspaceId?: string;
  operations?: MaintenanceOperation[];
  requireBackup?: boolean;
};

export type MaintenanceJobLogEntrySummary = {
  step: string;
  status: "completed" | "failed";
  message: string;
  startedAt: string;
  completedAt: string;
  details?: Record<string, unknown>;
};

export type MaintenanceJobSummary = {
  id: string;
  workspaceId: string;
  status: "completed" | "failed";
  operations: MaintenanceOperation[];
  startedAt: string;
  completedAt: string;
  backup: { id: string; relativePath: string } | null;
  sqliteIntegrity: { ok: boolean; messages: string[] } | null;
  attachmentManifestAudit: {
    status: "healthy" | "needs_attention";
    manifestRelativePath: string | null;
    scannedFileCount: number;
    referencedFileCount: number;
    missingReferencedPaths: string[];
    orphanedRelativePaths: string[];
    unsafeReferencedPaths: string[];
    sizeMismatches: Array<{
      storagePath: string;
      expectedSizeBytes: number;
      actualSizeBytes: number;
    }>;
    checksumMismatches: Array<{
      storagePath: string;
      expectedChecksum: string;
      actualChecksum: string;
    }>;
  } | null;
  searchReindex: {
    indexedContainerCount: number;
    indexedItemCount: number;
    indexedListItemCount: number;
    indexedAttachmentCount: number;
  } | null;
  vacuum: { completed: boolean } | null;
  orphanAttachmentScan: {
    scannedFileCount: number;
    referencedFileCount: number;
    orphanedRelativePaths: string[];
  } | null;
  orphanAttachmentCleanup: {
    quarantinedFileCount: number;
    quarantineRootRelativePath: string;
    quarantinedFiles: Array<{
      sourceRelativePath: string;
      quarantineRelativePath: string;
    }>;
  } | null;
  entries: MaintenanceJobLogEntrySummary[];
  error: string | null;
};

export type ListMaintenanceJobsInput = {
  workspaceId?: string;
  limit?: number;
};

export type RunWorkspaceIntegrityCheckInput = {
  workspaceId?: string;
};

export type RepairAttachmentInput = {
  attachmentId: string;
  replacementPath?: string;
};

export type RepairAttachmentSummary = {
  attachmentId: string;
  itemId: string;
  exists: boolean;
  storagePath: string;
  checksum: string | null;
  sizeBytes: number;
};

export type IntegrityCheckIssueSummary = {
  severity: "error" | "warning";
  code: string;
  message: string;
  targetType: string;
  targetId: string;
  relatedType: string | null;
  relatedId: string | null;
};

export type IntegrityCheckSectionSummary = {
  kind:
    | "system_rows"
    | "typed_item_details"
    | "taggings"
    | "relationships"
    | "attachments"
    | "attachment_duplicates"
    | "search_index";
  title: string;
  status: "healthy" | "degraded";
  checkedCount: number;
  issueCount: number;
  issues: IntegrityCheckIssueSummary[];
};

export type WorkspaceIntegritySummary = {
  workspaceId: string;
  generatedAt: string;
  status: "healthy" | "degraded";
  checkedCount: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  sections: IntegrityCheckSectionSummary[];
};

export type SavedViewDiagnosticIssueSummary = {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
  conditionIndex?: number;
  value?: string;
  repairable: boolean;
};

export type SavedViewDiagnosticEntrySummary = {
  savedViewId: string;
  name: string;
  type: string;
  status: "ok" | "warning" | "error";
  issues: SavedViewDiagnosticIssueSummary[];
  repairable: boolean;
};

export type SavedViewDiagnosticsSummary = {
  workspaceId: string;
  checkedAt: string;
  total: number;
  ok: number;
  warnings: number;
  errors: number;
  repairable: number;
  entries: SavedViewDiagnosticEntrySummary[];
};

export type RepairSavedViewQueryInput = {
  savedViewId: string;
};

export type RepairSavedViewQuerySummary = {
  savedViewId: string;
  name: string;
  changed: boolean;
  issueCount: number;
};

export type ValidateWorkspaceExportJsonInput = {
  filePath: string;
};

export type ImportEmailsAsTasksInput = {
  sourcePath: string;
  workspaceId?: string;
  containerId?: string;
  extractTags?: boolean;
};

export type ChooseAndImportEmailsInput = Omit<
  ImportEmailsAsTasksInput,
  "sourcePath"
>;

export type CreateWorkspaceInput = {
  name: string;
  rootPath: string;
};

export type OpenWorkspaceInput = {
  rootPath: string;
};

export type ValidateWorkspaceInput = {
  rootPath: string;
  repair?: boolean;
};

export type DatabaseHealthStatus = {
  connected: boolean;
  schemaVersion: number | null;
  workspaceExists: boolean;
  inboxExists: boolean;
  defaultDashboardExists: boolean;
  activityLogAvailable: boolean;
  searchIndexAvailable: boolean;
  databasePath: string | null;
  error: string | null;
};

export type ProjectStatus = "active" | "waiting" | "completed" | "archived";
export type ProjectMutableStatus = Exclude<ProjectStatus, "archived">;
export type ContactStatus = "active" | "waiting" | "completed" | "archived";
export type ContactMutableStatus = Exclude<ContactStatus, "archived">;
export type ContactFieldType =
  | "text"
  | "email"
  | "phone"
  | "website"
  | "address"
  | "date"
  | "custom";

export type ProjectSummary = {
  id: string;
  workspaceId: string;
  type: "project";
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  categoryId: string | null;
  color: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ContactSummary = {
  id: string;
  workspaceId: string;
  type: "contact";
  name: string;
  slug: string;
  description: string | null;
  status: ContactStatus;
  categoryId: string | null;
  color: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ProjectLifecycleInput = {
  projectId: string;
  confirmOpenTasks?: boolean;
};

export type ContactLifecycleInput = {
  contactId: string;
  confirmOpenTasks?: boolean;
};

export type ListContainersInput = {
  workspaceId?: string;
  includeArchived?: boolean;
};

export type ContainerDefaultView = "feed" | "tab" | "summary";
export type ContainerGroupingMode = "none" | "type" | "tab" | "status";
export type ContainerQuickAddType = "task" | "note" | "list" | "link" | "file";

export type ContainerPreferencesSummary = {
  workspaceId: string;
  containerId: string;
  updatedAt: string | null;
  defaultView: ContainerDefaultView;
  defaultTabId: string | null;
  showCompleted: boolean;
  grouping: ContainerGroupingMode;
  defaultQuickAddType: ContainerQuickAddType;
  summaryFirst: boolean;
  compactMode: boolean;
};

export type UpdateContainerPreferencesInput = Partial<
  Pick<
    ContainerPreferencesSummary,
    | "defaultView"
    | "defaultTabId"
    | "showCompleted"
    | "grouping"
    | "defaultQuickAddType"
    | "summaryFirst"
    | "compactMode"
  >
> & {
  containerId: string;
};

export type ProjectLibraryGroupingMode =
  | "none"
  | "category"
  | "tag"
  | "status"
  | "favorite"
  | "stale";
export type ContactLibraryGroupingMode =
  | "none"
  | "company"
  | "label"
  | "tag"
  | "category";
export type ContainerLibraryGroupingMode =
  | ProjectLibraryGroupingMode
  | ContactLibraryGroupingMode;
export type ContainerGroupingScope = "project" | "contact";

export type ContainerGroupingPreferencesSummary = {
  workspaceId: string;
  containerType: ContainerGroupingScope;
  mode: ContainerLibraryGroupingMode;
  collapsedGroupKeys: string[];
  updatedAt: string | null;
};

export type ContainerGroupingTargetSummary = {
  id: string;
  workspaceId: string;
  type: ContainerGroupingScope;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  categoryId: string | null;
  categoryName: string | null;
  color: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
  tags: Array<{ id: string; name: string; slug: string }>;
};

export type ContainerGroupingFacetSummary = {
  key: string;
  label: string;
  count: number;
};

export type ContainerGroupingGroupSummary = {
  key: string;
  label: string;
  count: number;
  collapsed: boolean;
  targets: ContainerGroupingTargetSummary[];
};

export type ContainerGroupingViewModelSummary = {
  workspaceId: string;
  containerType: ContainerGroupingScope;
  mode: ContainerLibraryGroupingMode;
  generatedAt: string;
  staleAfterDays: number;
  totalCount: number;
  facets: ContainerGroupingFacetSummary[];
  preferences: ContainerGroupingPreferencesSummary;
  groups: ContainerGroupingGroupSummary[];
};

export type GetContainerGroupingInput = {
  workspaceId?: string;
  containerType: ContainerGroupingScope;
  mode?: ContainerLibraryGroupingMode;
  includeArchived?: boolean;
  staleAfterDays?: number;
};

export type UpdateContainerGroupingPreferencesInput = {
  workspaceId?: string;
  containerType: ContainerGroupingScope;
  mode?: ContainerLibraryGroupingMode;
  collapsedGroupKeys?: string[];
};

export type ContainerMediaRole = "project_banner" | "contact_avatar";

export type ContainerMediaSummary = {
  id: string;
  workspaceId: string;
  containerId: string;
  attachmentId: string;
  role: ContainerMediaRole;
  thumbnailStoragePath: string | null;
  altText: string | null;
  originalName: string;
  mimeType: string | null;
  storagePath: string;
  exists: boolean;
  thumbnailExists: boolean;
  previewDataUrl: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ChooseAndSetContainerMediaInput = {
  containerId: string;
  role: ContainerMediaRole;
  altText?: string | null;
};

export type ContactFieldSummary = {
  id: string;
  workspaceId: string;
  containerId: string;
  label: string;
  value: string;
  type: ContactFieldType;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ContactDetailSummary = {
  contact: ContactSummary;
  fields: ContactFieldSummary[];
};

export type ContactTimelineFilter =
  | "all"
  | "activity"
  | "content"
  | "follow_up"
  | "relationship";

export type ContactFollowUpTaskSummary = {
  itemId: string;
  title: string;
  status: string;
  dueAt: string | null;
  priority: number | null;
  overdue: boolean;
};

export type ContactFollowUpSummary = {
  generatedAt: string;
  openFollowUpCount: number;
  overdueTaskCount: number;
  nextDueTask: ContactFollowUpTaskSummary | null;
  openFollowUps: ContactFollowUpTaskSummary[];
};

export type ContactTimelineEntrySummary = {
  id: string;
  kind:
    | "activity"
    | "task"
    | "note"
    | "file"
    | "link"
    | "list"
    | "relationship"
    | "item";
  sourceType: "activity" | "item" | "relationship";
  title: string;
  description: string | null;
  occurredAt: string;
  targetType: string;
  targetId: string;
  itemType: string | null;
  status: string | null;
  dueAt: string | null;
  overdue: boolean;
  activityAction: string | null;
  actorLabel: string | null;
  relationshipLabel: string | null;
  relatedTargetName: string | null;
};

export type ContactTimelineInput = {
  contactId: string;
  filter?: ContactTimelineFilter;
  itemTypes?: string[];
  includeCompleted?: boolean;
  limit?: number;
};

export type ContactTimelineSummary = {
  contact: ContactSummary;
  generatedAt: string;
  filter: ContactTimelineFilter;
  itemTypes: string[];
  followUpSummary: ContactFollowUpSummary;
  entries: ContactTimelineEntrySummary[];
};

export type ProjectHealthTaskSummary = {
  itemId: string;
  title: string;
  dueAt: string | null;
  taskStatus: string;
  priority: number | null;
};

export type ProjectHealthBadgeSummary = {
  kind: "overdue" | "upcoming" | "waiting" | "stale" | "no_recent_activity" | "complete";
  label: string;
  tone: "risk" | "warning" | "info" | "success" | "neutral";
};

export type ProjectHealthSummary = {
  projectId: string;
  workspaceId: string;
  name: string;
  status: string;
  color: string | null;
  generatedAt: string;
  openTaskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  upcomingTaskCount: number;
  waitingTaskCount: number;
  totalTaskCount: number;
  completionRatio: number;
  staleAfterDays: number;
  lastActivityAt: string | null;
  isStale: boolean;
  hasRecentActivity: boolean;
  nextDueTask: ProjectHealthTaskSummary | null;
  nextTask: ProjectHealthTaskSummary | null;
  healthBadges: ProjectHealthBadgeSummary[];
  recentActivity: ActivitySummary[];
};

export type InboxSummary = {
  id: string;
  workspaceId: string;
  type: "inbox";
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  categoryId: string | null;
  color: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ItemSummary = {
  id: string;
  workspaceId: string;
  containerId: string;
  containerTabId: string | null;
  type: string;
  title: string;
  body: string | null;
  categoryId: string | null;
  status: string;
  sortOrder: number;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  tags?: ItemTagSummary[];
};

export type FileAttachmentSummary = {
  id: string;
  workspaceId: string;
  itemId: string;
  originalName: string;
  storedName: string;
  mimeType: string | null;
  sizeBytes: number;
  checksum: string | null;
  storagePath: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type AttachmentPreviewKind =
  | "image"
  | "pdf"
  | "text"
  | "document"
  | "spreadsheet"
  | "presentation"
  | "archive"
  | "audio"
  | "video"
  | "unknown";

export type AttachmentPreviewSummary = {
  attachmentId: string;
  kind: AttachmentPreviewKind;
  iconLabel: string;
  extension: string | null;
  mimeType: string | null;
  sizeBytes: number;
  sizeLabel: string;
  updatedAt: string;
  missing: boolean;
  checksum: string | null;
  checksumShort: string | null;
  versionCount: number;
  latestVersionNumber: number | null;
  thumbnailStoragePath: string | null;
  thumbnailExists: boolean;
  previewDataUrl: string | null;
};

export type FileAttachmentResultSummary = {
  item: ItemSummary;
  attachment: FileAttachmentSummary;
};

export type FileItemSummary = ItemSummary & {
  type: "file";
  attachment: FileAttachmentSummary;
  missing: boolean;
  preview?: AttachmentPreviewSummary;
};

export type AttachFileToContainerInput = {
  containerId: string;
  sourcePath: string;
  workspaceId?: string;
  actorType?: "local_user" | "system" | "importer";
  containerTabId?: string | null;
  description?: string | null;
  sortOrder?: number;
};

export type AttachFileToItemInput = {
  itemId: string;
  sourcePath: string;
  actorType?: "local_user" | "system" | "importer";
  description?: string | null;
};

export type ChooseAndAttachFileInput = Omit<
  AttachFileToContainerInput,
  "sourcePath"
>;

export type UpdateFileMetadataInput = {
  attachmentId: string;
  title?: string;
  description?: string | null;
  actorType?: "local_user" | "system" | "importer";
};

export type AttachmentVersionSummary = {
  id: string;
  workspaceId: string;
  attachmentId: string;
  versionNumber: number;
  originalName: string;
  storedName: string;
  sizeBytes: number;
  checksum: string;
  storagePath: string;
  note: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type FileVersionMutationSummary = {
  attachment: FileAttachmentSummary;
  version: AttachmentVersionSummary;
};

export type CreateFileSnapshotInput = {
  attachmentId: string;
  note?: string | null;
  actorType?: "local_user" | "system" | "importer";
};

export type RestoreFileVersionInput = {
  versionId: string;
  actorType?: "local_user" | "system" | "importer";
};

export type OpenFileVersionSummary = {
  versionId: string;
  attachmentId: string;
  exists: boolean;
  storagePath: string;
};

export type VerifyAttachmentSummary = {
  attachmentId: string;
  itemId: string;
  exists: boolean;
  storagePath: string;
};

export type OpenAttachmentSummary = VerifyAttachmentSummary;

export type ItemTagSummary = {
  id: string;
  name: string;
  slug: string;
  source: "inline" | "manual" | "imported";
};

export type TaggingTargetType = "container" | "item" | "list_item";

export type AddTagToTargetInput = {
  workspaceId?: string;
  targetType: TaggingTargetType;
  targetId: string;
  name: string;
};

export type RemoveTagFromTargetInput = {
  workspaceId?: string;
  targetType: TaggingTargetType;
  targetId: string;
  name?: string;
  tagId?: string;
};

export type CategorySummary = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TagCountSummary = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  targetCount: number;
  containerCount?: number;
  itemCount?: number;
  listItemCount?: number;
};

export type CategoryCountSummary = CategorySummary & {
  targetCount: number;
  containerCount?: number;
  itemCount?: number;
  listItemCount?: number;
};

export type MetadataTargetType = "container" | "item" | "list_item";

export type MetadataTargetCategorySummary = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

export type MetadataTargetSummary = {
  targetType: MetadataTargetType;
  targetId: string;
  workspaceId: string;
  kind: string;
  title: string;
  body: string | null;
  status: string;
  category: MetadataTargetCategorySummary | null;
  tags: ItemTagSummary[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ProjectTagBrowserStatus = "active" | "waiting" | "completed" | "archived";

export type ProjectTagBrowserInput = {
  workspaceId?: string;
  tagSlugs?: string[];
  categoryId?: string | null;
  status?: ProjectTagBrowserStatus | null;
};

export type ProjectTagFacetSummary = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  projectCount: number;
};

export type ProjectCategoryFacetSummary = CategorySummary & {
  projectCount: number;
};

export type ProjectStatusFacetSummary = {
  status: ProjectTagBrowserStatus;
  projectCount: number;
};

export type ProjectTagBrowserProjectSummary = ProjectSummary & {
  category: MetadataTargetCategorySummary | null;
  tags: ItemTagSummary[];
};

export type ProjectTagBrowserSummary = {
  workspaceId: string;
  generatedAt: string;
  filters: {
    tagSlugs: string[];
    categoryId: string | null;
    status: ProjectTagBrowserStatus | null;
  };
  selectedTags: Omit<TagCountSummary, "targetCount">[];
  tagFacets: ProjectTagFacetSummary[];
  categoryFacets: ProjectCategoryFacetSummary[];
  statusFacets: ProjectStatusFacetSummary[];
  projects: ProjectTagBrowserProjectSummary[];
  totalProjectCount: number;
};

export type ContactLabelBrowserStatus =
  | "active"
  | "waiting"
  | "completed"
  | "archived";

export type ContactLabelBrowserGroupBy =
  | "company"
  | "role"
  | "location"
  | "emailDomain"
  | "category"
  | "tag"
  | "status"
  | "field";

export type ContactLabelBrowserFieldFilterInput = {
  label: string;
  value: string;
};

export type ContactLabelBrowserInput = {
  workspaceId?: string;
  fieldFilters?: ContactLabelBrowserFieldFilterInput[];
  company?: string | null;
  role?: string | null;
  location?: string | null;
  emailDomain?: string | null;
  tagSlugs?: string[];
  categoryId?: string | null;
  status?: ContactLabelBrowserStatus | null;
  groupBy?: ContactLabelBrowserGroupBy | null;
  fieldGroupLabel?: string | null;
};

export type ContactLabelFieldFacetSummary = {
  label: string;
  labelKey: string;
  value: string;
  valueKey: string;
  type: ContactFieldSummary["type"];
  contactCount: number;
};

export type ContactLabelValueFacetSummary = {
  value: string;
  valueKey: string;
  contactCount: number;
};

export type ContactLabelCategoryFacetSummary = CategorySummary & {
  contactCount: number;
};

export type ContactLabelTagFacetSummary = Omit<TagCountSummary, "targetCount"> & {
  contactCount: number;
};

export type ContactLabelStatusFacetSummary = {
  status: ContactLabelBrowserStatus;
  contactCount: number;
};

export type ContactLabelBrowserContactSummary = ContactSummary & {
  category: MetadataTargetCategorySummary | null;
  fields: Array<
    ContactFieldSummary & {
      labelKey: string;
      valueKey: string;
    }
  >;
  tags: ItemTagSummary[];
};

export type ContactLabelBrowserGroupSummary = {
  key: string;
  label: string;
  contactCount: number;
  contacts: ContactLabelBrowserContactSummary[];
};

export type ContactLabelBrowserSummary = {
  workspaceId: string;
  generatedAt: string;
  filters: {
    fieldFilters: Array<{ labelKey: string; valueKey: string }>;
    company: string | null;
    role: string | null;
    location: string | null;
    emailDomain: string | null;
    tagSlugs: string[];
    categoryId: string | null;
    status: ContactLabelBrowserStatus | null;
    groupBy: ContactLabelBrowserGroupBy;
    fieldGroupLabel: string | null;
  };
  selectedTags: Omit<TagCountSummary, "targetCount">[];
  fieldFacets: ContactLabelFieldFacetSummary[];
  companyFacets: ContactLabelValueFacetSummary[];
  roleFacets: ContactLabelValueFacetSummary[];
  locationFacets: ContactLabelValueFacetSummary[];
  emailDomainFacets: ContactLabelValueFacetSummary[];
  tagFacets: ContactLabelTagFacetSummary[];
  categoryFacets: ContactLabelCategoryFacetSummary[];
  statusFacets: ContactLabelStatusFacetSummary[];
  contacts: ContactLabelBrowserContactSummary[];
  groups: ContactLabelBrowserGroupSummary[];
  totalContactCount: number;
};

export type SearchResultKind =
  | "inbox"
  | "project"
  | "contact"
  | "task"
  | "list"
  | "note"
  | "file"
  | "link"
  | "heading"
  | "location"
  | "comment"
  | "list_item"
  | "unknown";

export type SearchWorkspaceInput = {
  workspaceId?: string;
  query: string;
  kinds?: SearchResultKind[];
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export type SaveSearchInput = {
  workspaceId?: string;
  query: string;
  name?: string;
  description?: string | null;
};

export type SearchHighlightSegmentSummary = {
  text: string;
  match: boolean;
};

export type SearchResultExcerptSummary = {
  text: string;
  segments: SearchHighlightSegmentSummary[];
};

export type SearchResultSummary = {
  id: string;
  workspaceId: string;
  targetType: "container" | "item" | "list_item" | "attachment";
  targetId: string;
  kind: SearchResultKind;
  title: string;
  body: string | null;
  status: string | null;
  tags: string[];
  category: string | null;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
  containerId: string | null;
  containerTitle: string | null;
  parentItemId: string | null;
  parentItemTitle: string | null;
  destinationPath: string | null;
  dueAt?: string | null;
  taskStatus?: string | null;
  score?: number;
  titleHighlights?: SearchHighlightSegmentSummary[];
  excerpt?: SearchResultExcerptSummary | null;
};

export type CollectionKind = "tag" | "keyword" | "custom";

export type CollectionSummary = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  kind: CollectionKind;
  tagSlug: string | null;
  keyword: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  viewMode?: ViewMode;
};

export type CollectionResultSummary = {
  targetType: "container" | "item";
  targetId: string;
  kind: string;
  title: string;
  containerId: string;
  containerType: string;
  containerTitle: string;
  categoryId: string | null;
  categoryName: string | null;
  taskStatus: string | null;
  taskPriority?: number | null;
  dueAt: string | null;
  tags: string[];
  destinationPath: string;
};

export type CollectionResultGroupSummary = {
  key: string;
  label: string;
  results: CollectionResultSummary[];
};

export type CollectionEvaluationSummary = {
  collection: CollectionSummary;
  total: number;
  results: CollectionResultSummary[];
  groups: CollectionResultGroupSummary[];
  page?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export type TodayTaskSummary = {
  itemType: "task" | "list_item";
  itemId: string;
  sourceItemId: string | null;
  workspaceId: string;
  containerId: string;
  containerTabId: string | null;
  title: string;
  body: string | null;
  categoryId: string | null;
  itemStatus: string;
  taskStatus: TaskStatus;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  timezone: string | null;
  sortOrder: number;
  plannedLane: DailyPlanLane | null;
  plannedSortOrder: number | null;
  addedManually: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DailyPlanLane = "today" | "tomorrow" | "backlog";

export type DailyPlanSummary = {
  id: string;
  workspaceId: string;
  planDate: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyPlanItemSummary = {
  id: string;
  workspaceId: string;
  dailyPlanId: string;
  itemType: "task" | "item" | "list_item";
  itemId: string;
  lane: DailyPlanLane;
  sortOrder: number;
  addedManually: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlannedTaskSummary = TodayTaskSummary & {
  planItemId: string;
  lane: DailyPlanLane;
  plannedSortOrder: number;
};

export type TodayDateRangeSummary = {
  startInclusive: string;
  endExclusive: string;
};

export type TodayPlanningModeSummary = "standard" | "top_six" | "ivy_lee";

export type TodayPreferencesSummary = {
  workspaceId: string;
  updatedAt: string | null;
  maxFocusTasks: number;
  planningMode: TodayPlanningModeSummary;
  backlogDays: number;
  showWaiting: boolean;
  showDeferred: boolean;
  showDailyCompletionSummary: boolean;
};

export type TodayFocusSummary = {
  plannedTodayCount: number;
  maxFocusTasks: number;
  limitExceeded: boolean;
  warning: string | null;
};

export type TodayCompletionSummary = {
  completedTodayCount: number;
  plannedTodayCompletedCount: number;
  show: boolean;
};

export type PlanningSummaryMetricSummary = {
  plannedCount: number;
  completedCount: number;
  snoozedCount: number;
  overdueCount: number;
};

export type PlanningSummaryGroupSummary = PlanningSummaryMetricSummary & {
  id: string | null;
  label: string;
};

export type PlanningSummaryViewSummary = {
  workspaceId: string;
  generatedAt: string;
  daily: PlanningSummaryMetricSummary & {
    localDate: string;
    plannedByLane: {
      today: number;
      tomorrow: number;
      backlog: number;
    };
  };
  weekly: {
    startDate: string;
    endDate: string;
    byProject: PlanningSummaryGroupSummary[];
    byCategory: PlanningSummaryGroupSummary[];
  };
};

export type TodayViewModelSummary = {
  workspaceId: string;
  generatedAt: string;
  localDate: string;
  backlogDays: number;
  preferences: Omit<TodayPreferencesSummary, "workspaceId" | "updatedAt">;
  focusSummary: TodayFocusSummary;
  completionSummary: TodayCompletionSummary;
  planningSummary?: PlanningSummaryViewSummary;
  ranges: {
    today: TodayDateRangeSummary;
    overdueBacklog: TodayDateRangeSummary;
    tomorrow: TodayDateRangeSummary;
  };
  dueToday: TodayTaskSummary[];
  overdueBacklog: TodayTaskSummary[];
  tomorrowPreview: TodayTaskSummary[];
};

export type TodayViewModelInput = {
  workspaceId?: string;
  date?: string | Date;
  backlogDays?: number;
};

export type UpdateTodayPreferencesInput = Partial<
  Omit<TodayPreferencesSummary, "workspaceId" | "updatedAt">
> & {
  workspaceId?: string;
};

export type DailyPlanDateInput = {
  workspaceId?: string;
  date?: string | Date;
};

export type PlanTaskInput = DailyPlanDateInput & {
  itemId: string;
  lane: DailyPlanLane;
  sortOrder?: number;
};

export type UnplanTaskInput = DailyPlanDateInput & {
  itemId: string;
  lane?: DailyPlanLane;
};

export type ReorderPlannedTaskInput = DailyPlanDateInput & {
  itemId: string;
  lane: DailyPlanLane;
  sortOrder: number;
};

export type GetPlannedTasksInput = DailyPlanDateInput & {
  lane?: DailyPlanLane;
};

export type TimelineGroupBy = "project" | "contact" | "category";

export type TimelineDateRangeSummary = {
  startInclusive: string;
  endExclusive: string;
};

export type TimelineRangeInput = {
  start: string | Date;
  end: string | Date;
};

export type TimelineStatusFilter = TaskStatus | ListItemStatus | "done";

export type TimelineFilterInput = {
  tagSlugs?: string[];
  categoryIds?: string[];
  projectIds?: string[];
  contactIds?: string[];
  statuses?: TimelineStatusFilter[];
  hideCompleted?: boolean;
};

export type TimelineViewModelInput = TimelineRangeInput & {
  workspaceId?: string;
  includeCompleted?: boolean;
  groupBy?: TimelineGroupBy;
  filters?: TimelineFilterInput;
};

export type SaveTimelineFilterInput = TimelineViewModelInput & {
  name: string;
};

export type TimelineNavigationTargetSummary = {
  targetType: "item" | "list_item";
  targetId: string;
  containerId: string;
  workspaceId: string;
  sourceItemId: string | null;
};

export type TimelineItemSummary = {
  kind: "task" | "list_item";
  itemId: string;
  workspaceId: string;
  title: string;
  body: string | null;
  containerId: string;
  containerName: string;
  containerType: string;
  containerColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  taskStatus: TaskStatus;
  itemStatus: string;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  timelineStartAt: string;
  timelineEndAt: string;
  allDay: boolean;
  completedAt: string | null;
  updatedAt: string;
  tags: { id: string; name: string; slug: string }[];
  navigationTarget: TimelineNavigationTargetSummary;
};

export type TimelineWorkloadBucketSummary = {
  date: string;
  itemCount: number;
  completedCount: number;
};

export type TimelineWorkloadSummary = {
  itemCount: number;
  activeCount: number;
  completedCount: number;
  density: TimelineWorkloadBucketSummary[];
};

export type TimelineGroupSummary = {
  key: string;
  label: string;
  groupBy: TimelineGroupBy;
  color: string | null;
  itemCount: number;
  completedCount: number;
  workload: TimelineWorkloadSummary;
  items: TimelineItemSummary[];
};

export type TimelineViewModelSummary = {
  workspaceId: string;
  generatedAt: string;
  range: TimelineDateRangeSummary;
  includeCompleted: boolean;
  groupBy: TimelineGroupBy;
  totalCount: number;
  workload: TimelineWorkloadSummary;
  filters: Required<TimelineFilterInput>;
  groups: TimelineGroupSummary[];
};

export type CalendarMonthInput = {
  workspaceId?: string;
  month: string | Date;
  includeCompleted?: boolean;
};

export type CalendarMonthRangeSummary = {
  month: string;
  startInclusive: string;
  endExclusive: string;
};

export type CalendarNavigationTargetSummary = {
  targetType: "item" | "list_item";
  targetId: string;
  containerId: string;
  workspaceId: string;
  sourceItemId: string | null;
} | {
  targetType: "calendar_event";
  targetId: string;
  workspaceId: string;
  sourceId: string;
};

export type CalendarItemSummary = {
  id: string;
  kind: "task" | "list_item" | "calendar_event";
  workspaceId: string;
  title: string;
  body: string | null;
  containerId: string;
  containerName: string;
  containerType: string;
  containerColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  status: TaskStatus | ListItemStatus | "read_only";
  itemStatus: string | null;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  completedAt: string | null;
  updatedAt: string;
  navigationTarget: CalendarNavigationTargetSummary;
};

export type CalendarDaySummary = {
  date: string;
  dayOfMonth: number;
  weekday: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  items: CalendarItemSummary[];
};

export type CalendarMonthViewModelSummary = {
  workspaceId: string;
  generatedAt: string;
  range: CalendarMonthRangeSummary;
  includeCompleted: boolean;
  totalCount: number;
  days: CalendarDaySummary[];
};

export type CalendarRescheduleItemInput = {
  workspaceId?: string;
  itemId: string;
  kind: "task" | "list_item" | "calendar_event";
  dueAt: string | null;
  startAt?: string | null;
  allDay?: boolean;
};

export type CalendarRescheduleItemSummary = {
  itemId: string;
  kind: "task" | "list_item" | "calendar_event";
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
};

export type ImportIcsFileInput = {
  workspaceId?: string;
  filePath: string;
  sourceName?: string;
};

export type ImportIcsSummary = {
  sourceId: string;
  sourceName: string;
  importedEventCount: number;
  skippedEventCount: number;
};

export type CreateTagCollectionInput = {
  workspaceId?: string;
  tagSlug: string;
  name?: string;
  description?: string | null;
};

export type CreateKeywordCollectionInput = {
  workspaceId?: string;
  query: string;
  name?: string;
  description?: string | null;
};

export type CreateMetadataCollectionInput = {
  workspaceId?: string;
  tagSlugs?: string[];
  categoryId?: string | null;
  includeArchived?: boolean;
  name?: string;
  description?: string | null;
};

export type CreateTaskInCollectionInput = CreateTaskInput & {
  collectionId: string;
};

export type CreateNoteInCollectionInput = CreateNoteInput & {
  collectionId: string;
};

export type EvaluateCollectionInput = {
  collectionId: string;
  limit?: number;
  offset?: number;
};

export type ViewMode = "list" | "timeline" | "calendar";
export type ViewModeContextType = "saved_view" | "container";
export type ViewModePreferenceSummary = {
  contextType: ViewModeContextType;
  contextId: string;
  workspaceId: string;
  mode: ViewMode;
  updatedAt: string | null;
};
export type SetViewModeInput = {
  contextType: ViewModeContextType;
  contextId: string;
  mode: ViewMode;
};

export type SmartListCriteriaInput = {
  match?: "all" | "any";
  includeItems?: boolean;
  includeContainers?: boolean;
  itemTypes?: string[];
  containerTypes?: string[];
  containerIds?: string[];
  tagSlugs?: string[];
  categoryIds?: string[];
  categoryMode?: "any" | "is" | "isEmpty" | "isNotEmpty";
  taskStatuses?: string[];
  taskPriorities?: number[];
  statuses?: string[];
  text?: string;
  attachmentFilter?: "any" | "has" | "none";
  pinnedFilter?: "any" | "pinned" | "unpinned";
  archivedFilter?: "active" | "archived" | "any";
  groupBy?: "none" | "targetType" | "type" | "container" | "category" | "status" | "dueDate";
  sortField?: "title" | "type" | "container" | "category" | "status" | "dueAt" | "createdAt" | "updatedAt";
  sortDirection?: "asc" | "desc";
  dueFilter?:
    | "any"
    | "overdue"
    | "today"
    | "tomorrow"
    | "next7Days"
    | "next30Days"
    | "noDueDate"
    | "hasDueDate"
    | "customRange";
  customDueFrom?: string;
  customDueTo?: string;
};

export type SmartListSummary = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  criteria: SmartListCriteriaInput | null;
  query: unknown;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SmartListPreviewSummary = {
  query: unknown;
  total: number;
  results: CollectionResultSummary[];
  groups: CollectionResultGroupSummary[];
  page?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
};

export type CreateSmartListInput = {
  workspaceId?: string;
  name: string;
  description?: string | null;
  criteria: SmartListCriteriaInput;
};

export type UpdateSmartListInput = {
  smartListId: string;
  name?: string;
  description?: string | null;
  criteria?: SmartListCriteriaInput;
  isFavorite?: boolean;
};

export type PreviewSmartListInput = {
  workspaceId?: string;
  criteria: SmartListCriteriaInput;
  limit?: number;
  offset?: number;
};

export type ListTargetsByMetadataInput = {
  workspaceId?: string;
  tagSlugs?: string[];
  categoryId?: string | null;
  categorySlug?: string | null;
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export type CreateCategoryInput = {
  workspaceId?: string;
  name: string;
  color: string;
  description?: string | null;
};

export type UpdateCategoryInput = {
  categoryId: string;
  name?: string;
  color?: string;
  description?: string | null;
};

export type AssignCategoryToProjectInput = {
  projectId: string;
  categoryId?: string | null;
};

export type AssignCategoryToItemInput = {
  itemId: string;
  categoryId?: string | null;
};

export type CreateProjectInput = {
  workspaceId?: string;
  name: string;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  isFavorite?: boolean;
  slug?: string;
  sortOrder?: number;
};

export type CreateProjectResult = {
  project: ProjectSummary;
  defaultTabId: string;
};

export type UpdateProjectInput = {
  projectId: string;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  isFavorite?: boolean;
  name?: string;
  slug?: string;
  sortOrder?: number;
  status?: ProjectMutableStatus;
};

export type CloneProjectInput = {
  projectId: string;
  name?: string;
  includeTabs?: boolean;
  includeItems?: boolean;
  includeTags?: boolean;
  includeRelationships?: boolean;
  resetCompleted?: boolean;
  fileMode?: "metadata_only" | "copy" | "skip";
  rebaseDates?: {
    from: string;
    to: string;
  };
};

export type ContactFieldInput = {
  label: string;
  value: string;
  type?: ContactFieldType;
  sortOrder?: number;
};

export type CreateContactInput = {
  workspaceId?: string;
  name: string;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  fields?: ContactFieldInput[];
  isFavorite?: boolean;
  slug?: string;
  sortOrder?: number;
};

export type CreateContactResult = {
  contact: ContactSummary;
  defaultTabId: string;
  fields: ContactFieldSummary[];
};

export type UpdateContactInput = {
  contactId: string;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  isFavorite?: boolean;
  name?: string;
  slug?: string;
  sortOrder?: number;
  status?: ContactMutableStatus;
};

export type CloneContactInput = Omit<CloneProjectInput, "projectId"> & {
  contactId: string;
  includeContactFields?: boolean;
};

export type AddContactFieldInput = ContactFieldInput & {
  contactId: string;
};

export type UpdateContactFieldInput = {
  fieldId: string;
  label?: string;
  value?: string;
  type?: ContactFieldType;
  sortOrder?: number;
};

export type ContainerTabSummary = {
  id: string;
  workspaceId: string;
  containerId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  hiddenAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type TabSummaryItemPreview = {
  itemId: string;
  type: string;
  title: string;
  status: string;
  preview: string | null;
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
  kind: "open_task" | "recent_content";
};

export type ContainerTabContentSummary = {
  tab: ContainerTabSummary;
  totalItemCount: number;
  openTaskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  upcomingTaskCount: number;
  noteCount: number;
  fileCount: number;
  linkCount: number;
  listCount: number;
  openTaskPreviews: TabSummaryItemPreview[];
  recentContentPreviews: TabSummaryItemPreview[];
};

export type CreateContainerTabInput = {
  containerId: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
};

export type TabTemplateSummary = {
  id: string;
  name: string;
  description: string | null;
};

export type CreateContainerTabFromTemplateInput = {
  containerId: string;
  templateId: string;
  name?: string;
};

export type RenameContainerTabInput = {
  tabId: string;
  name: string;
  description?: string | null;
};

export type ReorderContainerTabsInput = {
  containerId: string;
  tabIds: string[];
};

export type DeleteContainerTabInput = {
  tabId: string;
  itemHandling?: "reject" | "move_to_default" | "archive_items";
  targetTabId?: string | null;
};

export type MoveInboxItemToProjectInput = {
  itemId: string;
  projectId: string;
};

export type MoveItemInput = {
  itemId: string;
  targetContainerId: string;
  targetContainerTabId?: string | null;
  sortOrder?: number;
};

export type ReorderContainerItemsInput = {
  containerId: string;
  itemIds: string[];
  containerTabId?: string | null;
};

export type ReorderListItemsByIdInput = {
  listId: string;
  listItemIds: string[];
};

export type AttachDroppedFilesToContainerInput = {
  containerId: string;
  sourcePaths: string[];
  workspaceId?: string;
  containerTabId?: string | null;
  description?: string | null;
  startSortOrder?: number;
};

export type AttachDroppedFilesToItemInput = {
  itemId: string;
  sourcePaths: string[];
  description?: string | null;
};

export type ActivitySummary = {
  id: string;
  workspaceId: string;
  actorType: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
  actionLabel: string;
  actorLabel: string;
  targetLabel: string;
  description: string;
};

export type RelationshipObjectType = "container" | "item" | "list_item";

export type WikilinkTargetKind = "project" | "contact" | "item";
export type WikilinkResolutionStatus = "resolved" | "broken" | "ambiguous";

export type WikilinkTargetSummary = {
  type: RelationshipObjectType;
  id: string;
  kind: WikilinkTargetKind;
  title: string;
  containerId?: string;
  containerType?: string;
};

export type WikilinkSummary = {
  title: string;
  status: WikilinkResolutionStatus;
  target: WikilinkTargetSummary | null;
  candidates: WikilinkTargetSummary[];
};

export type RelationshipSummary = {
  id: string;
  workspaceId: string;
  sourceType: RelationshipObjectType;
  sourceId: string;
  targetType: RelationshipObjectType;
  targetId: string;
  relationType: string;
  label: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type RelationshipType =
  | "related"
  | "depends_on"
  | "blocked_by"
  | "references"
  | "belongs_to"
  | "follow_up_for";

export type RelationshipEndpointInput = {
  type: RelationshipObjectType;
  id: string;
};

export type RelationshipGraphEndpointSummary = RelationshipEndpointInput & {
  kind: "project" | "contact" | "inbox" | "item" | "list_item" | "missing";
  title: string;
  description: string | null;
  containerId: string | null;
  containerType: string | null;
  status: string | null;
  deleted: boolean;
};

export type RelationshipGraphNodeSummary = RelationshipGraphEndpointSummary & {
  depth: 0 | 1 | 2;
  directRelationshipCount: number;
  secondDegreeRelationshipCount: number;
};

export type RelationshipGraphEdgeSummary = {
  id: string;
  direction: "incoming" | "outgoing";
  depth: 1 | 2;
  relationType: RelationshipType;
  label: string | null;
  source: RelationshipGraphEndpointSummary;
  target: RelationshipGraphEndpointSummary;
  createdAt: string;
};

export type RelationshipGraphSummary = {
  root: RelationshipGraphEndpointSummary;
  relationTypes: readonly RelationshipType[];
  selectedRelationType: RelationshipType | "all";
  nodes: RelationshipGraphNodeSummary[];
  edges: RelationshipGraphEdgeSummary[];
};

export type GetRelationshipGraphInput = {
  root: RelationshipEndpointInput;
  relationType?: RelationshipType | "all";
  maxDepth?: 1 | 2;
};

export type CreateGenericRelationshipInput = {
  workspaceId?: string;
  source: RelationshipEndpointInput;
  target: RelationshipEndpointInput;
  relationType: RelationshipType;
  label?: string | null;
};

export type LinkContactToProjectInput = {
  workspaceId?: string;
  contactId: string;
  projectId: string;
};

export type ContactProjectRelationshipResult = {
  relationship: RelationshipSummary;
  changed: boolean;
};

export type RelatedContactSummary = {
  relationshipId: string;
  relationshipCreatedAt: string;
  contact: ContactSummary;
  openTaskCount: number;
  recentActivityCount: number;
  recentActivity: ActivitySummary[];
};

export type RelatedProjectSummary = {
  relationshipId: string;
  relationshipCreatedAt: string;
  project: ProjectSummary;
  openTaskCount: number;
  recentActivityCount: number;
  recentActivity: ActivitySummary[];
};

export type DashboardWidgetType =
  | "today"
  | "overdue"
  | "upcoming"
  | "favorites"
  | "recent_activity"
  | "saved_view"
  | "project_health"
  | "timeline"
  | "calendar"
  | "web"
  | "pomodoro"
  | "static_text";

export type DashboardRecordSummary = {
  id: string;
  workspaceId: string;
  name: string;
  isDefault: boolean;
  layoutJson: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type DashboardWidgetRecordSummary = {
  id: string;
  workspaceId: string;
  dashboardId: string;
  type: DashboardWidgetType | string;
  title: string | null;
  savedViewId: string | null;
  configJson: string;
  positionJson: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type DashboardNavigationTargetSummary = {
  targetType: string;
  targetId: string;
  workspaceId: string;
};

export type DashboardWidgetPageSummary = {
  limit: number;
  offset: number;
  totalCount: number;
  hasMore: boolean;
};

export type DashboardTaskWidgetItemSummary = {
  kind: "task";
  itemId: string;
  title: string;
  containerId: string;
  dueAt: string | null;
  taskStatus: string;
  priority: number | null;
  navigationTarget: DashboardNavigationTargetSummary;
};

export type DashboardProjectWidgetItemSummary = {
  kind: "project";
  projectId: string;
  name: string;
  status: string;
  color: string | null;
  navigationTarget: DashboardNavigationTargetSummary;
};

export type DashboardFavoriteWidgetItemSummary = PinnedFavoriteTargetSummary & {
  kind: "favorite";
  navigationTarget: DashboardNavigationTargetSummary & {
    path: string;
  };
};

export type DashboardActivityWidgetItemSummary = {
  kind: "activity";
  activityId: string;
  action: string;
  description: string;
  createdAt: string;
  targetNavigationTarget: DashboardNavigationTargetSummary;
};

export type DashboardProjectHealthWidgetItemSummary = ProjectHealthSummary & {
  kind: "project_health";
  navigationTarget: DashboardNavigationTargetSummary;
};

export type DashboardCalendarWidgetDaySummary = {
  date: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  itemCount: number;
  items: Array<{
    id: string;
    kind: string;
    title: string;
    startAt: string | null;
    dueAt: string | null;
    allDay: boolean;
    status: string;
  }>;
};

export type DashboardTimelineWidgetSummary = {
  range: { startInclusive: string; endExclusive: string };
  workload: {
    itemCount: number;
    activeCount: number;
    completedCount: number;
    density: Array<{ date: string; itemCount: number; completedCount: number }>;
  };
  groups: Array<{
    key: string;
    label: string;
    itemCount: number;
    completedCount: number;
    color: string | null;
  }>;
};

export type DashboardWidgetDataSummary =
  | {
      widgetType: "today" | "overdue" | "upcoming";
      generatedAt: string;
      page: DashboardWidgetPageSummary;
      items: DashboardTaskWidgetItemSummary[];
    }
  | {
      widgetType: "favorites";
      generatedAt: string;
      page: DashboardWidgetPageSummary;
      items: DashboardFavoriteWidgetItemSummary[];
    }
  | {
      widgetType: "project_health";
      generatedAt: string;
      page: DashboardWidgetPageSummary;
      items: DashboardProjectHealthWidgetItemSummary[];
    }
  | {
      widgetType: "recent_activity";
      generatedAt: string;
      page: DashboardWidgetPageSummary;
      items: DashboardActivityWidgetItemSummary[];
    }
  | {
      widgetType: "calendar";
      generatedAt: string;
      month: string;
      totalCount: number;
      days: DashboardCalendarWidgetDaySummary[];
    }
  | {
      widgetType: "timeline";
      generatedAt: string;
      summary: DashboardTimelineWidgetSummary;
    };

export type DashboardWidgetSummary = {
  widget: DashboardWidgetRecordSummary;
  data: DashboardWidgetDataSummary | null;
};

export type DashboardViewModelSummary = {
  dashboard: DashboardRecordSummary;
  widgets: DashboardWidgetSummary[];
};

export type DashboardLayoutWidgetType =
  | "today"
  | "overdue"
  | "upcoming"
  | "favorites"
  | "recent_activity"
  | "project_health"
  | "saved_view"
  | "timeline"
  | "calendar"
  | "web"
  | "pomodoro"
  | "static_text";

export type DashboardWidgetDefinitionSummary = {
  type: DashboardLayoutWidgetType;
  title: string;
  description: string;
  configurable: boolean;
  requiresSavedView: boolean;
};

export type DashboardWidgetPositionInput = {
  column: number;
  row: number;
  width?: number;
  height?: number;
};

export type GetDefaultDashboardInput = {
  workspaceId?: string;
};

export type AddDashboardWidgetInput = {
  workspaceId?: string;
  dashboardId?: string;
  type: DashboardLayoutWidgetType;
  title?: string | null;
  savedViewId?: string | null;
  config?: Record<string, unknown>;
  position?: DashboardWidgetPositionInput;
};

export type UpdateDashboardWidgetInput = {
  widgetId: string;
  title?: string | null;
  savedViewId?: string | null;
  config?: Record<string, unknown>;
  position?: DashboardWidgetPositionInput;
  sortOrder?: number;
};

export type RemoveDashboardWidgetInput = {
  widgetId: string;
};

export type ReorderDashboardWidgetsInput = {
  dashboardId: string;
  widgetIds: string[];
};

export type UpdateDashboardLayoutInput = {
  dashboardId: string;
  layout: Record<string, unknown>;
};

export type ListRecentActivityInput = {
  workspaceId?: string;
  limit?: number;
  cursor?: string | null;
};

export type ListActivityForTargetInput = {
  targetType: string;
  targetId: string;
  limit?: number;
  cursor?: string | null;
};

export type ItemInspectorSummary = {
  item: ItemSummary;
  activity: ActivitySummary[];
};

export type BulkActionOperation =
  | "move"
  | "tag"
  | "category"
  | "archive"
  | "delete"
  | "complete"
  | "export";

export type BulkActionItemSummary = {
  itemId: string;
  ok: boolean;
  item?: ItemSummary;
  reason?: string;
};

export type BulkActionSummary = {
  workspaceId: string;
  operation: BulkActionOperation;
  requestedCount: number;
  changedCount: number;
  skippedCount: number;
  items: BulkActionItemSummary[];
  activityId: string | null;
  export?: {
    format: "markdown";
    contents: string;
    itemCount: number;
  };
};

export type BulkMoveItemsInput = {
  workspaceId?: string;
  itemIds: string[];
  targetContainerId: string;
  targetContainerTabId?: string | null;
};

export type BulkTagItemsInput = {
  workspaceId?: string;
  itemIds: string[];
  tagName: string;
};

export type BulkCategorizeItemsInput = {
  workspaceId?: string;
  itemIds: string[];
  categoryId: string | null;
};

export type BulkBaseItemsInput = {
  workspaceId?: string;
  itemIds: string[];
};

export type UndoActivityInput = {
  activityId: string;
};

export type UndoApplySummary = {
  ok: boolean;
  mode: "undo" | "redo";
  operation: {
    activityId: string;
    action: string;
    targetType: string;
    targetId: string;
    kind: string;
    label: string;
  };
  activityId: string | null;
  conflict: boolean;
  message: string;
};


export type TaskStatus = "open" | "done" | "waiting" | "someday" | "deferred" | "cancelled";
export type ListItemStatus = "open" | "done" | "waiting" | "cancelled";
export type ListDisplayMode = "checklist" | "pipeline";
export type ListProgressMode = "count" | "manual" | "none";
export type NoteFormat = "markdown";

export type TaskSummary = ItemSummary & {
  type: "task";
  taskStatus: TaskStatus;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  timezone: string | null;
  reminderPolicyId?: string | null;
  taskCompletedAt: string | null;
  taskCreatedAt: string;
  taskUpdatedAt: string;
};

export type CreateTaskInput = {
  workspaceId?: string;
  containerId: string;
  title: string;
  actorType?: "local_user" | "system" | "importer";
  body?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  priority?: number | null;
  status?: TaskStatus;
  allDay?: boolean;
  timezone?: string | null;
  sortOrder?: number;
  pinned?: boolean;
};

export type UpdateTaskInput = {
  itemId: string;
  actorType?: "local_user" | "system" | "importer";
  title?: string;
  body?: string | null;
  categoryId?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  priority?: number | null;
  status?: TaskStatus;
  allDay?: boolean;
  timezone?: string | null;
  sortOrder?: number;
  pinned?: boolean;
  containerTabId?: string | null;
};

export type SnoozeTaskInput = {
  itemId: string;
  preset?: "later_today" | "tomorrow" | "next_week";
  dueAt?: string;
  date?: string | Date;
  actorType?: "local_user" | "system" | "importer";
};

export type RescheduleTaskInput = {
  itemId: string;
  dueAt: string | null;
  actorType?: "local_user" | "system" | "importer";
  startAt?: string | null;
  allDay?: boolean;
};

export type ReminderPolicySummary = {
  id: string;
  workspaceId: string;
  targetType: "item" | "list_item";
  targetId: string;
  taskItemId: string;
  anchor: "due" | "start";
  mode: "absolute" | "relative";
  leadMinutes: number | null;
  triggerAt: string;
  status: "active" | "cleared";
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type ReminderEventSummary = {
  id: string;
  workspaceId: string;
  policyId: string;
  targetType: "item" | "list_item";
  targetId: string;
  taskItemId: string;
  scheduledForAt: string;
  firedAt: string | null;
  dismissedAt: string | null;
  snoozedUntil: string | null;
  status: "scheduled" | "fired" | "dismissed" | "snoozed" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export type TaskReminderMutationSummary = {
  policy: ReminderPolicySummary | null;
  event: ReminderEventSummary | null;
};

export type ReminderEventMutationSummary = {
  policy: ReminderPolicySummary;
  event: ReminderEventSummary;
};

export type SetTaskReminderInput = {
  workspaceId?: string;
  taskId: string;
  actorType?: "local_user" | "system" | "importer";
  triggerAt?: string;
  leadMinutes?: number;
  anchor?: "due" | "start";
};

export type ClearTaskReminderInput = {
  taskId: string;
  actorType?: "local_user" | "system" | "importer";
};

export type SetListItemReminderInput = {
  workspaceId?: string;
  listItemId: string;
  actorType?: "local_user" | "system" | "importer";
  triggerAt?: string;
  leadMinutes?: number;
  anchor?: "due" | "start";
};

export type ClearListItemReminderInput = {
  listItemId: string;
  actorType?: "local_user" | "system" | "importer";
};

export type DismissReminderInput = {
  eventId: string;
  actorType?: "local_user" | "system" | "importer";
};

export type SnoozeReminderInput = {
  eventId: string;
  until: string;
  actorType?: "local_user" | "system" | "importer";
};

export type ListItemSummary = {
  id: string;
  workspaceId: string;
  listItemParentId: string | null;
  listId: string;
  title: string;
  body: string | null;
  status: ListItemStatus;
  depth: number;
  sortOrder: number;
  startAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ListSummary = ItemSummary & {
  type: "list";
  displayMode: ListDisplayMode;
  showCompleted: boolean;
  progressMode: ListProgressMode;
  listCreatedAt: string;
  listUpdatedAt: string;
  items: ListItemSummary[];
};

export type CreateListInput = {
  workspaceId?: string;
  containerId: string;
  title: string;
  actorType?: "local_user" | "system" | "importer";
  body?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  displayMode?: ListDisplayMode;
  showCompleted?: boolean;
  progressMode?: ListProgressMode;
  sortOrder?: number;
  pinned?: boolean;
};

export type AddListItemInput = {
  listId: string;
  title: string;
  actorType?: "local_user" | "system" | "importer";
  body?: string | null;
  status?: ListItemStatus;
  depth?: number;
  sortOrder?: number;
  listItemParentId?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
};

export type UpdateListItemInput = {
  listItemId: string;
  actorType?: "local_user" | "system" | "importer";
  title?: string;
  body?: string | null;
  status?: ListItemStatus;
  depth?: number;
  sortOrder?: number;
  listItemParentId?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
};

export type BulkAddListItemsInput = {
  listId: string;
  text: string;
  actorType?: "local_user" | "system" | "importer";
  startSortOrder?: number;
};

export type BulkUpdateListItemsOperation =
  | "complete"
  | "delete"
  | "move_up"
  | "move_down"
  | "indent"
  | "outdent";

export type BulkUpdateListItemsInput = {
  listId: string;
  listItemIds: string[];
  operation: BulkUpdateListItemsOperation;
  actorType?: "local_user" | "system" | "importer";
};

export type BulkUpdateListItemSummary = {
  listItemId: string;
  ok: boolean;
  listItem?: ListItemSummary;
  reason?: string;
};

export type BulkUpdateListItemsSummary = {
  listId: string;
  operation: BulkUpdateListItemsOperation;
  requestedCount: number;
  changedCount: number;
  skippedCount: number;
  items: BulkUpdateListItemSummary[];
  activityId: string | null;
};

export type MovePipelineCardInput = {
  listId: string;
  cardId: string;
  targetStageId: string;
  actorType?: "local_user" | "system" | "importer";
  sortOrder?: number;
};

export type MoveListItemInput = {
  listItemId: string;
  direction: "up" | "down";
  actorType?: "local_user" | "system" | "importer";
};

export type MoveListItemToListInput = {
  listItemId: string;
  targetListId: string;
  actorType?: "local_user" | "system" | "importer";
  beforeListItemId?: string | null;
  targetListItemParentId?: string | null;
};

export type PipelineStageSummary = {
  stage: ListItemSummary;
  cards: ListItemSummary[];
};

export type PipelineViewModelSummary = {
  list: ListSummary;
  stages: PipelineStageSummary[];
};

export type TemplateSummary = {
  id: string;
  workspaceId: string;
  kind: "list" | "project" | "contact";
  name: string;
  description: string | null;
  sourceType: "list" | "project" | "contact";
  sourceId: string | null;
  templateJson: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type SaveListAsTemplateInput = {
  listId: string;
  name?: string;
  description?: string | null;
  baseDate?: string;
  actorType?: "local_user" | "system" | "importer";
};

export type CreateListFromTemplateInput = {
  templateId: string;
  workspaceId?: string;
  containerId: string;
  title?: string;
  containerTabId?: string | null;
  baseDate?: string;
  actorType?: "local_user" | "system" | "importer";
};

export type SaveContainerAsTemplateInput = {
  containerId: string;
  name?: string;
  description?: string | null;
  baseDate?: string;
  actorType?: "local_user" | "system" | "importer";
};

export type CreateContainerFromTemplateInput = {
  templateId: string;
  workspaceId?: string;
  name?: string;
  baseDate?: string;
  actorType?: "local_user" | "system" | "importer";
};

export type UpdateTemplateInput = {
  templateId: string;
  name: string;
  description?: string | null;
  actorType?: "local_user" | "system" | "importer";
};

export type DuplicateTemplateInput = {
  templateId: string;
  name?: string;
  actorType?: "local_user" | "system" | "importer";
};

export type DeleteTemplateInput = {
  templateId: string;
  actorType?: "local_user" | "system" | "importer";
};

export type TemplatePackCountsSummary = {
  tabs: number;
  items: number;
  tasks: number;
  notes: number;
  lists: number;
  links: number;
  filePlaceholders: number;
  listItems: number;
  tags: number;
  categories: number;
};

export type TemplatePackCapabilitySummary = {
  tabs: boolean;
  tasks: boolean;
  notes: boolean;
  lists: boolean;
  links: boolean;
  filePlaceholders: boolean;
  tags: boolean;
  categories: boolean;
  relativeDates: boolean;
  contactFields: boolean;
};

export type ExportTemplatePackInput = {
  workspaceId?: string;
  templateIds?: string[];
  name?: string;
  description?: string | null;
  actorType?: "local_user" | "system" | "importer";
};

export type TemplatePackExportSummary = {
  id: string;
  workspaceId: string;
  createdAt: string;
  relativePath: string;
  sizeBytes: number;
  fileVersion: 1;
  name: string;
  templateCount: number;
  templateIds: string[];
};

export type ValidateTemplatePackInput = {
  filePath: string;
};

export type ImportTemplatePackInput = {
  workspaceId?: string;
  filePath: string;
  actorType?: "local_user" | "system" | "importer";
};

export type TemplatePackValidationIssueSummary = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

export type TemplatePackValidationTemplateSummary = {
  valid: boolean;
  kind: TemplateSummary["kind"] | null;
  name: string | null;
  description: string | null;
  counts: TemplatePackCountsSummary;
  issues: TemplatePackValidationIssueSummary[];
};

export type TemplatePackValidationSummary = {
  valid: boolean;
  sourcePath: string | null;
  fileVersion: number | null;
  exportedAt: string | null;
  name: string | null;
  description: string | null;
  templateCount: number;
  capabilities: TemplatePackCapabilitySummary | null;
  counts: TemplatePackCountsSummary;
  templates: TemplatePackValidationTemplateSummary[];
  issues: TemplatePackValidationIssueSummary[];
};

export type TemplatePackImportSummary = {
  workspaceId: string;
  importedAt: string;
  templateCount: number;
  importedTemplates: TemplateSummary[];
};

export type ContainerTemplateCreationSummary = {
  template: TemplateSummary;
  container: ProjectSummary | ContactSummary;
  tabs: ContainerTabSummary[];
  itemIds: string[];
};

export type NoteSummary = ItemSummary & {
  type: "note";
  format: NoteFormat;
  content: string;
  preview: string | null;
  noteCreatedAt: string;
  noteUpdatedAt: string;
  wikilinks?: WikilinkSummary[];
};

export type CreateNoteInput = {
  workspaceId?: string;
  containerId: string;
  title: string;
  content: string;
  actorType?: "local_user" | "system" | "importer";
  categoryId?: string | null;
  containerTabId?: string | null;
  format?: NoteFormat;
  sortOrder?: number;
  pinned?: boolean;
};

export type UpdateNoteInput = {
  itemId: string;
  actorType?: "local_user" | "system" | "importer";
  expectedNoteUpdatedAt?: string;
  title?: string;
  content?: string;
  categoryId?: string | null;
  containerTabId?: string | null;
  sortOrder?: number;
  pinned?: boolean;
};

export type LinkSummary = ItemSummary & {
  type: "link";
  url: string;
  normalizedUrl: string;
  linkTitle: string | null;
  description: string | null;
  domain: string | null;
  faviconPath: string | null;
  previewImagePath: string | null;
  renderAsWidget: boolean;
  widgetHeight: number;
  widgetWarningAcceptedAt: string | null;
  linkCreatedAt: string;
  linkUpdatedAt: string;
};

export type CreateLinkInput = {
  workspaceId?: string;
  containerId: string;
  url: string;
  actorType?: "local_user" | "system" | "importer";
  categoryId?: string | null;
  containerTabId?: string | null;
  description?: string | null;
  sortOrder?: number;
  pinned?: boolean;
  title?: string | null;
};

export type UpdateLinkInput = {
  itemId: string;
  actorType?: "local_user" | "system" | "importer";
  categoryId?: string | null;
  containerTabId?: string | null;
  description?: string | null;
  faviconPath?: string | null;
  pinned?: boolean;
  previewImagePath?: string | null;
  renderAsWidget?: boolean;
  sortOrder?: number;
  title?: string | null;
  url?: string;
  widgetHeight?: number;
};

export type FetchLinkMetadataInput = {
  itemId: string;
  workspaceId?: string;
};

export type OpenLinkSummary = {
  itemId: string;
  url: string;
  normalizedUrl: string;
};

export type LocationSummary = ItemSummary & {
  type: "location";
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  viewportCenterLat: number | null;
  viewportCenterLng: number | null;
  viewportZoom: number;
  locationCreatedAt: string;
  locationUpdatedAt: string;
};

export type CreateLocationInput = {
  workspaceId?: string;
  containerId: string;
  actorType?: "local_user" | "system" | "importer";
  address?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sortOrder?: number;
  pinned?: boolean;
  title?: string | null;
  viewportCenterLat?: number | null;
  viewportCenterLng?: number | null;
  viewportZoom?: number | null;
};

export type UpdateLocationInput = {
  itemId: string;
  actorType?: "local_user" | "system" | "importer";
  address?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  sortOrder?: number;
  pinned?: boolean;
  title?: string | null;
  viewportCenterLat?: number | null;
  viewportCenterLng?: number | null;
  viewportZoom?: number | null;
};

export type OpenLocationMapSummary = {
  itemId: string;
  mapUrl: string;
};

export type OpenExternalUrlSummary = {
  url: string;
  normalizedUrl: string;
};

export type LocalWorkOsModuleName =
  | "containers"
  | "items"
  | "files";

export type IpcModuleStatus = {
  module: LocalWorkOsModuleName;
  available: boolean;
  implemented: boolean;
  message: string;
};

export type NavigationTargetType =
  | "view"
  | "container"
  | "item"
  | "saved_view";

export type NavigationRecentTargetSummary = {
  targetType: NavigationTargetType;
  targetId: string | null;
  workspaceId: string;
  path: string;
  label: string;
  subtitle: string | null;
  viewedAt: string;
};

export type PinnedFavoriteTargetSummary = {
  targetType: "container" | "item" | "saved_view";
  targetId: string;
  workspaceId: string;
  title: string;
  subtitle: string;
  path: string;
  source: "favorite" | "pinned";
  targetKind: string;
  containerId: string | null;
  containerType: string | null;
  containerTitle: string | null;
  updatedAt: string;
};

export type RecordNavigationTargetInput = {
  workspaceId?: string;
  target: {
    targetType: NavigationTargetType;
    targetId?: string | null;
    path: string;
    label: string;
    subtitle?: string | null;
  };
};

export type AppTabSummary = {
  id: string;
  workspaceId: string;
  targetType: NavigationTargetType;
  targetId: string | null;
  path: string;
  label: string;
  subtitle: string | null;
  openedAt: string;
  updatedAt: string;
};

export type AppTabSessionSummary = {
  workspaceId: string;
  tabs: AppTabSummary[];
  activeTabId: string | null;
};

export type OpenAppTabInput = {
  workspaceId?: string;
  target: RecordNavigationTargetInput["target"];
};

export type CloseAppTabInput = {
  workspaceId?: string;
  tabId: string;
};

export type ReorderAppTabsInput = {
  workspaceId?: string;
  tabIds: string[];
};

export type SetActiveAppTabInput = {
  workspaceId?: string;
  tabId: string;
};


export type TrashTargetTypeSummary = "container" | "item" | "list_item" | "attachment";

export type TrashEntrySummary = {
  id: string;
  workspaceId: string;
  targetType: TrashTargetTypeSummary;
  title: string;
  subtitle: string | null;
  deletedAt: string;
  originalContainerId: string | null;
  originalContainerName: string | null;
  parentItemId: string | null;
  parentItemTitle: string | null;
};

export type ListTrashInput = {
  workspaceId?: string;
};

export type RestoreTrashInput = {
  workspaceId?: string;
  targetType: TrashTargetTypeSummary;
  targetId: string;
};

export type TrashSearchIndexSummary = {
  indexedContainerCount: number;
  indexedItemCount: number;
  indexedListItemCount: number;
  indexedAttachmentCount: number;
};

export type RestoreTrashSummary = {
  entry: TrashEntrySummary;
  searchIndex: TrashSearchIndexSummary;
};

export type ClearTrashCountsSummary = Record<TrashTargetTypeSummary, number>;

export type ClearTrashInput = {
  workspaceId?: string;
  confirmed: boolean;
};

export type ClearTrashSummary = {
  workspaceId: string;
  backupSnapshotId: string;
  counts: ClearTrashCountsSummary;
  clearedCount: number;
  searchIndex: TrashSearchIndexSummary;
};


export type AppearanceThemePreference = "system" | "light" | "dark";
export type AppearanceDensityPreference = "comfortable" | "compact";
export type AppearanceFontSizePreference = "small" | "medium" | "large";

export type AppearanceSettingsSummary = {
  workspaceId: string;
  theme: AppearanceThemePreference;
  density: AppearanceDensityPreference;
  fontSize: AppearanceFontSizePreference;
  updatedAt: string | null;
};

export type UpdateAppearanceSettingsInput = {
  workspaceId?: string;
  theme?: AppearanceThemePreference;
  density?: AppearanceDensityPreference;
  fontSize?: AppearanceFontSizePreference;
};

export type PrivacyNetworkSettingsSummary = {
  workspaceId: string;
  metadataFetchEnabled: boolean;
  webWidgetsEnabled: boolean;
  icsUrlImportEnabled: boolean;
  imapImportEnabled: boolean;
  browserCaptureEnabled: boolean;
  telemetryEnabled: false;
  telemetryNotice: string;
  updatedAt: string | null;
};

export type UpdatePrivacyNetworkSettingsInput = {
  workspaceId?: string;
  metadataFetchEnabled?: boolean;
  webWidgetsEnabled?: boolean;
  icsUrlImportEnabled?: boolean;
  imapImportEnabled?: boolean;
  browserCaptureEnabled?: boolean;
};

export const LOCAL_WORK_OS_IPC_CHANNELS = {
  workspace: {
    createWorkspace: "local-work-os:workspace:create-workspace",
    createDemoWorkspace: "local-work-os:workspace:create-demo-workspace",
    openWorkspace: "local-work-os:workspace:open-workspace",
    validateWorkspace: "local-work-os:workspace:validate-workspace",
    getCurrentWorkspace: "local-work-os:workspace:get-current-workspace",
    listRecentWorkspaces: "local-work-os:workspace:list-recent-workspaces"
  },
  database: {
    getHealthStatus: "local-work-os:database:get-health-status"
  },
  inbox: {
    getInbox: "local-work-os:inbox:get-inbox",
    listItems: "local-work-os:inbox:list-items",
    moveItemToProject: "local-work-os:inbox:move-item-to-project"
  },
  tasks: {
    createTask: "local-work-os:tasks:create-task",
    updateTask: "local-work-os:tasks:update-task",
    completeTask: "local-work-os:tasks:complete-task",
    reopenTask: "local-work-os:tasks:reopen-task",
    snoozeTask: "local-work-os:tasks:snooze-task",
    rescheduleTask: "local-work-os:tasks:reschedule-task",
    listByContainer: "local-work-os:tasks:list-by-container"
  },
  reminders: {
    setTaskReminder: "local-work-os:reminders:set-task-reminder",
    clearTaskReminder: "local-work-os:reminders:clear-task-reminder",
    setListItemReminder: "local-work-os:reminders:set-list-item-reminder",
    clearListItemReminder: "local-work-os:reminders:clear-list-item-reminder",
    dismissReminder: "local-work-os:reminders:dismiss-reminder",
    snoozeReminder: "local-work-os:reminders:snooze-reminder"
  },
  lists: {
    createList: "local-work-os:lists:create-list",
    addItem: "local-work-os:lists:add-item",
    updateItem: "local-work-os:lists:update-item",
    completeItem: "local-work-os:lists:complete-item",
    reopenItem: "local-work-os:lists:reopen-item",
    enablePipelineMode: "local-work-os:lists:enable-pipeline-mode",
    disablePipelineMode: "local-work-os:lists:disable-pipeline-mode",
    getPipelineViewModel: "local-work-os:lists:get-pipeline-view-model",
    movePipelineCard: "local-work-os:lists:move-pipeline-card",
    indentItem: "local-work-os:lists:indent-item",
    outdentItem: "local-work-os:lists:outdent-item",
    moveItem: "local-work-os:lists:move-item",
    moveItemToList: "local-work-os:lists:move-item-to-list",
    bulkAddItems: "local-work-os:lists:bulk-add-items",
    bulkUpdateItems: "local-work-os:lists:bulk-update-items",
    listByContainer: "local-work-os:lists:list-by-container",
    saveAsTemplate: "local-work-os:lists:save-as-template",
    createFromTemplate: "local-work-os:lists:create-from-template",
    listTemplates: "local-work-os:lists:list-templates"
  },
  templates: {
    saveContainerAsTemplate: "local-work-os:templates:save-container-as-template",
    createContainerFromTemplate: "local-work-os:templates:create-container-from-template",
    listTemplates: "local-work-os:templates:list-templates",
    updateTemplate: "local-work-os:templates:update-template",
    duplicateTemplate: "local-work-os:templates:duplicate-template",
    deleteTemplate: "local-work-os:templates:delete-template",
    exportTemplatePack: "local-work-os:templates:export-template-pack",
    validateTemplatePack: "local-work-os:templates:validate-template-pack",
    importTemplatePack: "local-work-os:templates:import-template-pack",
    chooseAndImportTemplatePack: "local-work-os:templates:choose-and-import-template-pack"
  },
  notes: {
    createNote: "local-work-os:notes:create-note",
    updateNote: "local-work-os:notes:update-note",
    listByContainer: "local-work-os:notes:list-by-container"
  },
  links: {
    createLink: "local-work-os:links:create-link",
    updateLink: "local-work-os:links:update-link",
    listByContainer: "local-work-os:links:list-by-container",
    fetchMetadata: "local-work-os:links:fetch-metadata",
    openExternal: "local-work-os:links:open-external",
    openUrlExternal: "local-work-os:links:open-url-external"
  },
  locations: {
    createLocation: "local-work-os:locations:create-location",
    updateLocation: "local-work-os:locations:update-location",
    listByContainer: "local-work-os:locations:list-by-container",
    openExternal: "local-work-os:locations:open-external"
  },
  projects: {
    createProject: "local-work-os:projects:create-project",
    updateProject: "local-work-os:projects:update-project",
    cloneProject: "local-work-os:projects:clone-project",
    archiveProject: "local-work-os:projects:archive-project",
    completeProject: "local-work-os:projects:complete-project",
    restoreProject: "local-work-os:projects:restore-project",
    softDeleteProject: "local-work-os:projects:soft-delete-project",
    listProjects: "local-work-os:projects:list-projects",
    getProject: "local-work-os:projects:get-project",
    getProjectHealth: "local-work-os:projects:get-project-health"
  },
  contacts: {
    createContact: "local-work-os:contacts:create-contact",
    updateContact: "local-work-os:contacts:update-contact",
    cloneContact: "local-work-os:contacts:clone-contact",
    archiveContact: "local-work-os:contacts:archive-contact",
    completeContact: "local-work-os:contacts:complete-contact",
    restoreContact: "local-work-os:contacts:restore-contact",
    listContacts: "local-work-os:contacts:list-contacts",
    getContact: "local-work-os:contacts:get-contact",
    addField: "local-work-os:contacts:add-field",
    updateField: "local-work-os:contacts:update-field",
    getTimeline: "local-work-os:contacts:get-timeline"
  },
  tabs: {
    listTabs: "local-work-os:tabs:list-tabs",
    listManagedTabs: "local-work-os:tabs:list-managed-tabs",
    listTabSummaries: "local-work-os:tabs:list-tab-summaries",
    listTabTemplates: "local-work-os:tabs:list-tab-templates",
    createTab: "local-work-os:tabs:create-tab",
    createTabFromTemplate: "local-work-os:tabs:create-tab-from-template",
    renameTab: "local-work-os:tabs:rename-tab",
    reorderTabs: "local-work-os:tabs:reorder-tabs",
    hideTab: "local-work-os:tabs:hide-tab",
    showTab: "local-work-os:tabs:show-tab",
    duplicateTab: "local-work-os:tabs:duplicate-tab",
    archiveTab: "local-work-os:tabs:archive-tab",
    deleteTab: "local-work-os:tabs:delete-tab"
  },
  relationships: {
    getGraph:
      "local-work-os:relationships:get-graph",
    createRelationship:
      "local-work-os:relationships:create-relationship",
    removeRelationship:
      "local-work-os:relationships:remove-relationship",
    linkContactToProject:
      "local-work-os:relationships:link-contact-to-project",
    unlinkContactFromProject:
      "local-work-os:relationships:unlink-contact-from-project",
    listContactsForProject:
      "local-work-os:relationships:list-contacts-for-project",
    listProjectsForContact:
      "local-work-os:relationships:list-projects-for-contact"
  },
  categories: {
    createCategory: "local-work-os:categories:create-category",
    updateCategory: "local-work-os:categories:update-category",
    deleteCategory: "local-work-os:categories:delete-category",
    listCategories: "local-work-os:categories:list-categories",
    assignToProject: "local-work-os:categories:assign-to-project",
    assignToItem: "local-work-os:categories:assign-to-item"
  },
  metadata: {
    listTagsWithCounts: "local-work-os:metadata:list-tags-with-counts",
    listCategoriesWithCounts:
      "local-work-os:metadata:list-categories-with-counts",
    listTargetsByMetadata: "local-work-os:metadata:list-targets-by-metadata",
    getProjectTagBrowser: "local-work-os:metadata:get-project-tag-browser",
    getContactLabelBrowser:
      "local-work-os:metadata:get-contact-label-browser",
    addTagToTarget: "local-work-os:metadata:add-tag-to-target",
    removeTagFromTarget: "local-work-os:metadata:remove-tag-from-target"
  },
  search: {
    searchWorkspace: "local-work-os:search:search-workspace",
    saveSearch: "local-work-os:search:save-search"
  },
  collections: {
    listCollections: "local-work-os:collections:list-collections",
    createTagCollection: "local-work-os:collections:create-tag-collection",
    createKeywordCollection:
      "local-work-os:collections:create-keyword-collection",
    createMetadataCollection:
      "local-work-os:collections:create-metadata-collection",
    evaluateCollection: "local-work-os:collections:evaluate-collection",
    createTaskInCollection:
      "local-work-os:collections:create-task-in-collection",
    createNoteInCollection:
      "local-work-os:collections:create-note-in-collection",
    listSmartLists: "local-work-os:collections:list-smart-lists",
    createSmartList: "local-work-os:collections:create-smart-list",
    updateSmartList: "local-work-os:collections:update-smart-list",
    previewSmartList: "local-work-os:collections:preview-smart-list"
  },
  viewModes: {
    getViewMode: "local-work-os:view-modes:get",
    setViewMode: "local-work-os:view-modes:set"
  },
  today: {
    getViewModel: "local-work-os:today:get-view-model",
    getOrCreateDailyPlan: "local-work-os:today:get-or-create-daily-plan",
    planTask: "local-work-os:today:plan-task",
    unplanTask: "local-work-os:today:unplan-task",
    reorderPlannedTask: "local-work-os:today:reorder-planned-task",
    getPlannedTasks: "local-work-os:today:get-planned-tasks",
    getPreferences: "local-work-os:today:get-preferences",
    updatePreferences: "local-work-os:today:update-preferences"
  },
  timeline: {
    getViewModel: "local-work-os:timeline:get-view-model",
    saveFilterAsView: "local-work-os:timeline:save-filter-as-view"
  },
  calendar: {
    getMonth: "local-work-os:calendar:get-month",
    rescheduleItem: "local-work-os:calendar:reschedule-item",
    importIcsFile: "local-work-os:calendar:import-ics-file"
  },
  dashboard: {
    getDefault: "local-work-os:dashboard:get-default",
    listWidgetDefinitions: "local-work-os:dashboard:list-widget-definitions",
    addWidget: "local-work-os:dashboard:add-widget",
    updateWidget: "local-work-os:dashboard:update-widget",
    removeWidget: "local-work-os:dashboard:remove-widget",
    reorderWidgets: "local-work-os:dashboard:reorder-widgets",
    updateLayout: "local-work-os:dashboard:update-layout"
  },
  activity: {
    listRecentActivity: "local-work-os:activity:list-recent-activity",
    listActivityForTarget: "local-work-os:activity:list-activity-for-target"
  },
  containers: {
    getStatus: "local-work-os:containers:get-status",
    getPreferences: "local-work-os:containers:get-preferences",
    updatePreferences: "local-work-os:containers:update-preferences",
    getGrouping: "local-work-os:containers:get-grouping",
    getGroupingPreferences: "local-work-os:containers:get-grouping-preferences",
    updateGroupingPreferences:
      "local-work-os:containers:update-grouping-preferences"
  },
  items: {
    getStatus: "local-work-os:items:get-status",
    moveItem: "local-work-os:items:move-item",
    archiveItem: "local-work-os:items:archive-item",
    softDeleteItem: "local-work-os:items:soft-delete-item",
    getItemActivity: "local-work-os:items:get-item-activity",
    openItemInspector: "local-work-os:items:open-item-inspector",
    bulkMoveItems: "local-work-os:items:bulk-move-items",
    bulkTagItems: "local-work-os:items:bulk-tag-items",
    bulkCategorizeItems: "local-work-os:items:bulk-categorize-items",
    bulkArchiveItems: "local-work-os:items:bulk-archive-items",
    bulkDeleteItems: "local-work-os:items:bulk-delete-items",
    bulkCompleteTasks: "local-work-os:items:bulk-complete-tasks",
    bulkExportItems: "local-work-os:items:bulk-export-items",
    undoActivity: "local-work-os:items:undo-activity",
    redoActivity: "local-work-os:items:redo-activity"
  },
  trash: {
    listTrash: "local-work-os:trash:list-trash",
    restoreTrash: "local-work-os:trash:restore-trash",
    clearTrash: "local-work-os:trash:clear-trash"
  },
  dragDrop: {
    reorderItems: "local-work-os:drag-drop:reorder-items",
    moveItem: "local-work-os:drag-drop:move-item",
    reorderListItems: "local-work-os:drag-drop:reorder-list-items",
    reorderTabs: "local-work-os:drag-drop:reorder-tabs",
    attachFilesToContainer:
      "local-work-os:drag-drop:attach-files-to-container",
    attachFilesToItem: "local-work-os:drag-drop:attach-files-to-item"
  },
  containerMedia: {
    chooseAndSet: "local-work-os:container-media:choose-and-set",
    getActive: "local-work-os:container-media:get-active",
    remove: "local-work-os:container-media:remove"
  },
  files: {
    getStatus: "local-work-os:files:get-status",
    attachFileToContainer: "local-work-os:files:attach-file-to-container",
    attachFileToItem: "local-work-os:files:attach-file-to-item",
    chooseAndAttach: "local-work-os:files:choose-and-attach",
    listByContainer: "local-work-os:files:list-by-container",
    openAttachment: "local-work-os:files:open-attachment",
    revealAttachment: "local-work-os:files:reveal-attachment",
    updateMetadata: "local-work-os:files:update-metadata",
    verifyAttachment: "local-work-os:files:verify-attachment",
    createFileSnapshot: "local-work-os:files:create-file-snapshot",
    listFileVersions: "local-work-os:files:list-file-versions",
    openFileVersion: "local-work-os:files:open-file-version",
    restoreFileVersion: "local-work-os:files:restore-file-version"
  },
  backup: {
    createManualBackup: "local-work-os:backup:create-manual-backup",
    listBackups: "local-work-os:backup:list-backups",
    listBackupsForWorkspacePath:
      "local-work-os:backup:list-backups-for-workspace-path",
    getAutomaticBackupSettings:
      "local-work-os:backup:get-automatic-backup-settings",
    updateAutomaticBackupSettings:
      "local-work-os:backup:update-automatic-backup-settings",
    runAutomaticBackupCheck:
      "local-work-os:backup:run-automatic-backup-check",
    validateRestoreSource: "local-work-os:backup:validate-restore-source",
    restoreBackupToNewWorkspace:
      "local-work-os:backup:restore-backup-to-new-workspace",
    restoreBackupFromWorkspacePath:
      "local-work-os:backup:restore-backup-from-workspace-path",
    restoreExportToNewWorkspace:
      "local-work-os:backup:restore-export-to-new-workspace"
  },
  import: {
    validateWorkspaceExportJson:
      "local-work-os:import:validate-workspace-export-json",
    chooseAndValidateWorkspaceExportJson:
      "local-work-os:import:choose-and-validate-workspace-export-json",
    previewEmails: "local-work-os:import:preview-emails",
    importEmailsAsTasks: "local-work-os:import:emails-as-tasks",
    chooseAndImportEmailsAsTasks:
      "local-work-os:import:choose-and-import-emails-as-tasks",
    previewDelimitedFileImport:
      "local-work-os:import:preview-delimited-file",
    importDelimitedFile: "local-work-os:import:delimited-file",
    previewMarkdownFolderImport:
      "local-work-os:import:preview-markdown-folder",
    importMarkdownFolder: "local-work-os:import:markdown-folder",
    chooseAndPreviewMarkdownFolderImport:
      "local-work-os:import:choose-and-preview-markdown-folder",
    chooseAndImportMarkdownFolder:
      "local-work-os:import:choose-and-import-markdown-folder",
    previewMarkdownNoteImport:
      "local-work-os:import:preview-markdown-notes",
    importMarkdownNotes: "local-work-os:import:markdown-notes"
  },
  export: {
    exportWorkspaceJson: "local-work-os:export:export-workspace-json",
    exportProjectMarkdown: "local-work-os:export:export-project-markdown",
    exportTasksCsv: "local-work-os:export:export-tasks-csv",
    exportPlanningSummaryMarkdown:
      "local-work-os:export:export-planning-summary-markdown",
    exportHtmlCsvTsvMarkdownBundle:
      "local-work-os:export:export-html-csv-tsv-markdown-bundle"
  },
  print: {
    printPdf: "local-work-os:print:print-pdf"
  },
  appearance: {
    getSettings: "local-work-os:appearance:get-settings",
    updateSettings: "local-work-os:appearance:update-settings"
  },
  privacy: {
    getSettings: "local-work-os:privacy:get-settings",
    updateSettings: "local-work-os:privacy:update-settings"
  },
  diagnostics: {
    runWorkspaceIntegrityCheck:
      "local-work-os:diagnostics:run-workspace-integrity-check",
    repairAttachment:
      "local-work-os:diagnostics:repair-attachment",
    runSavedViewDiagnostics:
      "local-work-os:diagnostics:run-saved-view-diagnostics",
    repairSavedViewQuery:
      "local-work-os:diagnostics:repair-saved-view-query",
    runMaintenanceJob:
      "local-work-os:diagnostics:run-maintenance-job",
    listMaintenanceJobs:
      "local-work-os:diagnostics:list-maintenance-jobs"
  },
  navigation: {
    listRecentTargets: "local-work-os:navigation:list-recent-targets",
    recordTarget: "local-work-os:navigation:record-target",
    listPinnedFavorites: "local-work-os:navigation:list-pinned-favorites",
    listAppTabs: "local-work-os:navigation:list-app-tabs",
    openAppTab: "local-work-os:navigation:open-app-tab",
    closeAppTab: "local-work-os:navigation:close-app-tab",
    reorderAppTabs: "local-work-os:navigation:reorder-app-tabs",
    setActiveAppTab: "local-work-os:navigation:set-active-app-tab"
  }
} as const;

export type LocalWorkOsIpcContracts = {
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.createWorkspace]: {
    input: CreateWorkspaceInput;
    result: ApiResult<WorkspaceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.createDemoWorkspace]: {
    input: CreateWorkspaceInput;
    result: ApiResult<WorkspaceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.openWorkspace]: {
    input: OpenWorkspaceInput;
    result: ApiResult<WorkspaceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.validateWorkspace]: {
    input: ValidateWorkspaceInput;
    result: ApiResult<WorkspaceValidationResult>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace]: {
    input: undefined;
    result: ApiResult<WorkspaceSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.listRecentWorkspaces]: {
    input: undefined;
    result: ApiResult<RecentWorkspace[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.database.getHealthStatus]: {
    input: undefined;
    result: ApiResult<DatabaseHealthStatus>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.inbox.getInbox]: {
    input: string | undefined;
    result: ApiResult<InboxSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.inbox.listItems]: {
    input: string | undefined;
    result: ApiResult<ItemSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.inbox.moveItemToProject]: {
    input: MoveInboxItemToProjectInput;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask]: {
    input: CreateTaskInput;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask]: {
    input: UpdateTaskInput;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask]: {
    input: string;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask]: {
    input: string;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.snoozeTask]: {
    input: SnoozeTaskInput;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.rescheduleTask]: {
    input: RescheduleTaskInput;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.listByContainer]: {
    input: string;
    result: ApiResult<TaskSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.reminders.setTaskReminder]: {
    input: SetTaskReminderInput;
    result: ApiResult<TaskReminderMutationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.reminders.clearTaskReminder]: {
    input: ClearTaskReminderInput;
    result: ApiResult<TaskReminderMutationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.reminders.setListItemReminder]: {
    input: SetListItemReminderInput;
    result: ApiResult<TaskReminderMutationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.reminders.clearListItemReminder]: {
    input: ClearListItemReminderInput;
    result: ApiResult<TaskReminderMutationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.reminders.dismissReminder]: {
    input: DismissReminderInput;
    result: ApiResult<ReminderEventMutationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.reminders.snoozeReminder]: {
    input: SnoozeReminderInput;
    result: ApiResult<ReminderEventMutationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.createList]: {
    input: CreateListInput;
    result: ApiResult<ListSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.addItem]: {
    input: AddListItemInput;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.updateItem]: {
    input: UpdateListItemInput;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.completeItem]: {
    input: string;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.reopenItem]: {
    input: string;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.enablePipelineMode]: {
    input: string;
    result: ApiResult<ListSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.disablePipelineMode]: {
    input: string;
    result: ApiResult<ListSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.getPipelineViewModel]: {
    input: string;
    result: ApiResult<PipelineViewModelSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.movePipelineCard]: {
    input: MovePipelineCardInput;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.indentItem]: {
    input: string;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.outdentItem]: {
    input: string;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.moveItem]: {
    input: MoveListItemInput;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.moveItemToList]: {
    input: MoveListItemToListInput;
    result: ApiResult<ListItemSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.bulkAddItems]: {
    input: BulkAddListItemsInput;
    result: ApiResult<ListItemSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.bulkUpdateItems]: {
    input: BulkUpdateListItemsInput;
    result: ApiResult<BulkUpdateListItemsSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.listByContainer]: {
    input: string;
    result: ApiResult<ListSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.saveAsTemplate]: {
    input: SaveListAsTemplateInput;
    result: ApiResult<TemplateSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.createFromTemplate]: {
    input: CreateListFromTemplateInput;
    result: ApiResult<ListSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.listTemplates]: {
    input: string | undefined;
    result: ApiResult<TemplateSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.templates.saveContainerAsTemplate]: {
    input: SaveContainerAsTemplateInput;
    result: ApiResult<TemplateSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.templates.createContainerFromTemplate]: {
    input: CreateContainerFromTemplateInput;
    result: ApiResult<ContainerTemplateCreationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.templates.listTemplates]: {
    input: { workspaceId?: string; kind?: "list" | "project" | "contact" } | string | undefined;
    result: ApiResult<TemplateSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.templates.updateTemplate]: {
    input: UpdateTemplateInput;
    result: ApiResult<TemplateSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.templates.duplicateTemplate]: {
    input: DuplicateTemplateInput;
    result: ApiResult<TemplateSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.templates.deleteTemplate]: {
    input: DeleteTemplateInput;
    result: ApiResult<TemplateSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.templates.exportTemplatePack]: {
    input: ExportTemplatePackInput | undefined;
    result: ApiResult<TemplatePackExportSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.templates.validateTemplatePack]: {
    input: ValidateTemplatePackInput;
    result: ApiResult<TemplatePackValidationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.templates.importTemplatePack]: {
    input: ImportTemplatePackInput;
    result: ApiResult<TemplatePackImportSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.templates.chooseAndImportTemplatePack]: {
    input: { workspaceId?: string } | undefined;
    result: ApiResult<TemplatePackImportSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.notes.createNote]: {
    input: CreateNoteInput;
    result: ApiResult<NoteSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.notes.updateNote]: {
    input: UpdateNoteInput;
    result: ApiResult<NoteSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.notes.listByContainer]: {
    input: string;
    result: ApiResult<NoteSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.links.createLink]: {
    input: CreateLinkInput;
    result: ApiResult<LinkSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.links.updateLink]: {
    input: UpdateLinkInput;
    result: ApiResult<LinkSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.links.listByContainer]: {
    input: string;
    result: ApiResult<LinkSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.links.fetchMetadata]: {
    input: FetchLinkMetadataInput;
    result: ApiResult<LinkSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.links.openExternal]: {
    input: string;
    result: ApiResult<OpenLinkSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.links.openUrlExternal]: {
    input: string;
    result: ApiResult<OpenExternalUrlSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.locations.createLocation]: {
    input: CreateLocationInput;
    result: ApiResult<LocationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.locations.updateLocation]: {
    input: UpdateLocationInput;
    result: ApiResult<LocationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.locations.listByContainer]: {
    input: string;
    result: ApiResult<LocationSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.locations.openExternal]: {
    input: string;
    result: ApiResult<OpenLocationMapSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject]: {
    input: CreateProjectInput;
    result: ApiResult<CreateProjectResult>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.updateProject]: {
    input: UpdateProjectInput;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.cloneProject]: {
    input: CloneProjectInput;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject]: {
    input: string | ProjectLifecycleInput;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.completeProject]: {
    input: string | ProjectLifecycleInput;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.restoreProject]: {
    input: string | ProjectLifecycleInput;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.softDeleteProject]: {
    input: string;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.listProjects]: {
    input: string | ListContainersInput | undefined;
    result: ApiResult<ProjectSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.getProject]: {
    input: string;
    result: ApiResult<ProjectSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.getProjectHealth]: {
    input: string;
    result: ApiResult<ProjectHealthSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.contacts.createContact]: {
    input: CreateContactInput;
    result: ApiResult<CreateContactResult>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.contacts.updateContact]: {
    input: UpdateContactInput;
    result: ApiResult<ContactSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.contacts.cloneContact]: {
    input: CloneContactInput;
    result: ApiResult<ContactSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.contacts.archiveContact]: {
    input: string | ContactLifecycleInput;
    result: ApiResult<ContactSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.contacts.completeContact]: {
    input: string | ContactLifecycleInput;
    result: ApiResult<ContactSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.contacts.restoreContact]: {
    input: string | ContactLifecycleInput;
    result: ApiResult<ContactSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.contacts.listContacts]: {
    input: string | ListContainersInput | undefined;
    result: ApiResult<ContactSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.contacts.getContact]: {
    input: string;
    result: ApiResult<ContactDetailSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.contacts.addField]: {
    input: AddContactFieldInput;
    result: ApiResult<ContactFieldSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.contacts.updateField]: {
    input: UpdateContactFieldInput;
    result: ApiResult<ContactFieldSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.contacts.getTimeline]: {
    input: ContactTimelineInput;
    result: ApiResult<ContactTimelineSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabs]: {
    input: string;
    result: ApiResult<ContainerTabSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.listManagedTabs]: {
    input: string;
    result: ApiResult<ContainerTabSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabSummaries]: {
    input: string;
    result: ApiResult<ContainerTabContentSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabTemplates]: {
    input: undefined;
    result: ApiResult<TabTemplateSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.createTab]: {
    input: CreateContainerTabInput;
    result: ApiResult<ContainerTabSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.createTabFromTemplate]: {
    input: CreateContainerTabFromTemplateInput;
    result: ApiResult<ContainerTabSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.renameTab]: {
    input: RenameContainerTabInput;
    result: ApiResult<ContainerTabSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.reorderTabs]: {
    input: ReorderContainerTabsInput;
    result: ApiResult<ContainerTabSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.hideTab]: {
    input: string;
    result: ApiResult<ContainerTabSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.showTab]: {
    input: string;
    result: ApiResult<ContainerTabSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.duplicateTab]: {
    input: string;
    result: ApiResult<ContainerTabSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.archiveTab]: {
    input: string;
    result: ApiResult<ContainerTabSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tabs.deleteTab]: {
    input: string | DeleteContainerTabInput;
    result: ApiResult<ContainerTabSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.relationships.getGraph]: {
    input: GetRelationshipGraphInput;
    result: ApiResult<RelationshipGraphSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.relationships.createRelationship]: {
    input: CreateGenericRelationshipInput;
    result: ApiResult<ContactProjectRelationshipResult>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.relationships.removeRelationship]: {
    input: string;
    result: ApiResult<ContactProjectRelationshipResult>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.relationships.linkContactToProject]: {
    input: LinkContactToProjectInput;
    result: ApiResult<ContactProjectRelationshipResult>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.relationships.unlinkContactFromProject]: {
    input: string;
    result: ApiResult<ContactProjectRelationshipResult>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.relationships.listContactsForProject]: {
    input: string;
    result: ApiResult<RelatedContactSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.relationships.listProjectsForContact]: {
    input: string;
    result: ApiResult<RelatedProjectSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.createCategory]: {
    input: CreateCategoryInput;
    result: ApiResult<CategorySummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.updateCategory]: {
    input: UpdateCategoryInput;
    result: ApiResult<CategorySummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.deleteCategory]: {
    input: string;
    result: ApiResult<CategorySummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.listCategories]: {
    input: string | undefined;
    result: ApiResult<CategorySummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToProject]: {
    input: AssignCategoryToProjectInput;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToItem]: {
    input: AssignCategoryToItemInput;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTagsWithCounts]: {
    input: string | undefined;
    result: ApiResult<TagCountSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.metadata.listCategoriesWithCounts]: {
    input: string | undefined;
    result: ApiResult<CategoryCountSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTargetsByMetadata]: {
    input: ListTargetsByMetadataInput;
    result: ApiResult<MetadataTargetSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.metadata.getProjectTagBrowser]: {
    input: ProjectTagBrowserInput;
    result: ApiResult<ProjectTagBrowserSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.metadata.getContactLabelBrowser]: {
    input: ContactLabelBrowserInput;
    result: ApiResult<ContactLabelBrowserSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.metadata.addTagToTarget]: {
    input: AddTagToTargetInput;
    result: ApiResult<ItemTagSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.metadata.removeTagFromTarget]: {
    input: RemoveTagFromTargetInput;
    result: ApiResult<ItemTagSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.search.searchWorkspace]: {
    input: SearchWorkspaceInput;
    result: ApiResult<SearchResultSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.search.saveSearch]: {
    input: SaveSearchInput;
    result: ApiResult<{ savedViewId: string; name: string }>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.listCollections]: {
    input: string | undefined;
    result: ApiResult<CollectionSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.createTagCollection]: {
    input: CreateTagCollectionInput;
    result: ApiResult<CollectionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.createKeywordCollection]: {
    input: CreateKeywordCollectionInput;
    result: ApiResult<CollectionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.createMetadataCollection]: {
    input: CreateMetadataCollectionInput;
    result: ApiResult<CollectionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.evaluateCollection]: {
    input: string | EvaluateCollectionInput;
    result: ApiResult<CollectionEvaluationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.createTaskInCollection]: {
    input: CreateTaskInCollectionInput;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.createNoteInCollection]: {
    input: CreateNoteInCollectionInput;
    result: ApiResult<NoteSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.listSmartLists]: {
    input: string | undefined;
    result: ApiResult<SmartListSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.createSmartList]: {
    input: CreateSmartListInput;
    result: ApiResult<SmartListSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.updateSmartList]: {
    input: UpdateSmartListInput;
    result: ApiResult<SmartListSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.previewSmartList]: {
    input: PreviewSmartListInput;
    result: ApiResult<SmartListPreviewSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.viewModes.getViewMode]: {
    input: { contextType: ViewModeContextType; contextId: string };
    result: ApiResult<ViewModePreferenceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.viewModes.setViewMode]: {
    input: SetViewModeInput;
    result: ApiResult<ViewModePreferenceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.getViewModel]: {
    input: TodayViewModelInput | undefined;
    result: ApiResult<TodayViewModelSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.getOrCreateDailyPlan]: {
    input: DailyPlanDateInput | undefined;
    result: ApiResult<DailyPlanSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.planTask]: {
    input: PlanTaskInput;
    result: ApiResult<DailyPlanItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.unplanTask]: {
    input: UnplanTaskInput;
    result: ApiResult<DailyPlanItemSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.reorderPlannedTask]: {
    input: ReorderPlannedTaskInput;
    result: ApiResult<DailyPlanItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.getPlannedTasks]: {
    input: GetPlannedTasksInput | undefined;
    result: ApiResult<PlannedTaskSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.getPreferences]: {
    input: string | undefined;
    result: ApiResult<TodayPreferencesSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.updatePreferences]: {
    input: UpdateTodayPreferencesInput;
    result: ApiResult<TodayPreferencesSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.timeline.getViewModel]: {
    input: TimelineViewModelInput;
    result: ApiResult<TimelineViewModelSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.timeline.saveFilterAsView]: {
    input: SaveTimelineFilterInput;
    result: ApiResult<{ savedViewId: string; name: string }>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.calendar.getMonth]: {
    input: CalendarMonthInput;
    result: ApiResult<CalendarMonthViewModelSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.calendar.rescheduleItem]: {
    input: CalendarRescheduleItemInput;
    result: ApiResult<CalendarRescheduleItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.calendar.importIcsFile]: {
    input: ImportIcsFileInput;
    result: ApiResult<ImportIcsSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dashboard.getDefault]: {
    input: GetDefaultDashboardInput | undefined;
    result: ApiResult<DashboardViewModelSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dashboard.listWidgetDefinitions]: {
    input: undefined;
    result: ApiResult<DashboardWidgetDefinitionSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dashboard.addWidget]: {
    input: AddDashboardWidgetInput;
    result: ApiResult<DashboardWidgetSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dashboard.updateWidget]: {
    input: UpdateDashboardWidgetInput;
    result: ApiResult<DashboardWidgetSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dashboard.removeWidget]: {
    input: RemoveDashboardWidgetInput;
    result: ApiResult<DashboardWidgetRecordSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dashboard.reorderWidgets]: {
    input: ReorderDashboardWidgetsInput;
    result: ApiResult<DashboardViewModelSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dashboard.updateLayout]: {
    input: UpdateDashboardLayoutInput;
    result: ApiResult<DashboardRecordSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.activity.listRecentActivity]: {
    input: ListRecentActivityInput | undefined;
    result: ApiResult<ActivitySummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.activity.listActivityForTarget]: {
    input: ListActivityForTargetInput;
    result: ApiResult<ActivitySummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.containers.getStatus]: {
    input: undefined;
    result: ApiResult<IpcModuleStatus>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.containers.getPreferences]: {
    input: string;
    result: ApiResult<ContainerPreferencesSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.containers.updatePreferences]: {
    input: UpdateContainerPreferencesInput;
    result: ApiResult<ContainerPreferencesSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.containers.getGrouping]: {
    input: GetContainerGroupingInput;
    result: ApiResult<ContainerGroupingViewModelSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.containers.getGroupingPreferences]: {
    input: Pick<GetContainerGroupingInput, "workspaceId" | "containerType">;
    result: ApiResult<ContainerGroupingPreferencesSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.containers.updateGroupingPreferences]: {
    input: UpdateContainerGroupingPreferencesInput;
    result: ApiResult<ContainerGroupingPreferencesSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.getStatus]: {
    input: undefined;
    result: ApiResult<IpcModuleStatus>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.moveItem]: {
    input: MoveItemInput;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.archiveItem]: {
    input: string;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.softDeleteItem]: {
    input: string;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.getItemActivity]: {
    input: string;
    result: ApiResult<ActivitySummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.openItemInspector]: {
    input: string;
    result: ApiResult<ItemInspectorSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.bulkMoveItems]: {
    input: BulkMoveItemsInput;
    result: ApiResult<BulkActionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.bulkTagItems]: {
    input: BulkTagItemsInput;
    result: ApiResult<BulkActionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.bulkCategorizeItems]: {
    input: BulkCategorizeItemsInput;
    result: ApiResult<BulkActionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.bulkArchiveItems]: {
    input: BulkBaseItemsInput;
    result: ApiResult<BulkActionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.bulkDeleteItems]: {
    input: BulkBaseItemsInput;
    result: ApiResult<BulkActionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.bulkCompleteTasks]: {
    input: BulkBaseItemsInput;
    result: ApiResult<BulkActionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.bulkExportItems]: {
    input: BulkBaseItemsInput;
    result: ApiResult<BulkActionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.undoActivity]: {
    input: UndoActivityInput;
    result: ApiResult<UndoApplySummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.redoActivity]: {
    input: UndoActivityInput;
    result: ApiResult<UndoApplySummary>;
  };

  [LOCAL_WORK_OS_IPC_CHANNELS.trash.listTrash]: {
    input: ListTrashInput | undefined;
    result: ApiResult<TrashEntrySummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.trash.restoreTrash]: {
    input: RestoreTrashInput;
    result: ApiResult<RestoreTrashSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.trash.clearTrash]: {
    input: ClearTrashInput;
    result: ApiResult<ClearTrashSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderItems]: {
    input: ReorderContainerItemsInput;
    result: ApiResult<ItemSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.moveItem]: {
    input: MoveItemInput;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderListItems]: {
    input: ReorderListItemsByIdInput;
    result: ApiResult<ListItemSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderTabs]: {
    input: ReorderContainerTabsInput;
    result: ApiResult<ContainerTabSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.attachFilesToContainer]: {
    input: AttachDroppedFilesToContainerInput;
    result: ApiResult<FileAttachmentResultSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.attachFilesToItem]: {
    input: AttachDroppedFilesToItemInput;
    result: ApiResult<FileAttachmentResultSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.containerMedia.chooseAndSet]: {
    input: ChooseAndSetContainerMediaInput;
    result: ApiResult<ContainerMediaSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.containerMedia.getActive]: {
    input: { containerId: string; role: ContainerMediaRole };
    result: ApiResult<ContainerMediaSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.containerMedia.remove]: {
    input: { containerId: string; role: ContainerMediaRole };
    result: ApiResult<ContainerMediaSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.getStatus]: {
    input: undefined;
    result: ApiResult<IpcModuleStatus>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.attachFileToContainer]: {
    input: AttachFileToContainerInput;
    result: ApiResult<FileAttachmentResultSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.attachFileToItem]: {
    input: AttachFileToItemInput;
    result: ApiResult<FileAttachmentResultSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.chooseAndAttach]: {
    input: ChooseAndAttachFileInput;
    result: ApiResult<FileAttachmentResultSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.listByContainer]: {
    input: string;
    result: ApiResult<FileItemSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.openAttachment]: {
    input: string;
    result: ApiResult<OpenAttachmentSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.revealAttachment]: {
    input: string;
    result: ApiResult<OpenAttachmentSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.updateMetadata]: {
    input: UpdateFileMetadataInput;
    result: ApiResult<FileAttachmentResultSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.verifyAttachment]: {
    input: string;
    result: ApiResult<VerifyAttachmentSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.createFileSnapshot]: {
    input: CreateFileSnapshotInput;
    result: ApiResult<FileVersionMutationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.listFileVersions]: {
    input: string;
    result: ApiResult<AttachmentVersionSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.openFileVersion]: {
    input: string;
    result: ApiResult<OpenFileVersionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.restoreFileVersion]: {
    input: RestoreFileVersionInput;
    result: ApiResult<FileVersionMutationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.backup.createManualBackup]: {
    input: CreateManualBackupInput | undefined;
    result: ApiResult<ManualBackupSnapshotSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.backup.listBackups]: {
    input: ListBackupsInput | undefined;
    result: ApiResult<BackupSnapshotSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.backup.getAutomaticBackupSettings]: {
    input: ListBackupsInput | undefined;
    result: ApiResult<BackupSchedulerSettingsSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.backup.updateAutomaticBackupSettings]: {
    input: UpdateBackupSchedulerSettingsInput;
    result: ApiResult<BackupSchedulerSettingsSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.backup.runAutomaticBackupCheck]: {
    input: RunAutomaticBackupInput;
    result: ApiResult<AutomaticBackupRunSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.backup.validateRestoreSource]: {
    input: ValidateRestoreSourceInput;
    result: ApiResult<RestoreValidationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.backup.listBackupsForWorkspacePath]: {
    input: ListBackupsForWorkspacePathInput;
    result: ApiResult<BackupSnapshotSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreBackupToNewWorkspace]: {
    input: RestoreBackupToNewWorkspaceInput;
    result: ApiResult<RestoreWorkspaceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreBackupFromWorkspacePath]: {
    input: RestoreBackupFromWorkspacePathInput;
    result: ApiResult<RestoreWorkspaceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreExportToNewWorkspace]: {
    input: RestoreExportToNewWorkspaceInput;
    result: ApiResult<RestoreWorkspaceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.validateWorkspaceExportJson]: {
    input: ValidateWorkspaceExportJsonInput;
    result: ApiResult<ImportValidationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.chooseAndValidateWorkspaceExportJson]: {
    input: undefined;
    result: ApiResult<ImportValidationSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.previewEmails]: {
    input: ImportEmailsAsTasksInput;
    result: ApiResult<EmailImportPreviewSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.importEmailsAsTasks]: {
    input: ImportEmailsAsTasksInput;
    result: ApiResult<EmailTaskImportSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.chooseAndImportEmailsAsTasks]: {
    input: ChooseAndImportEmailsInput | undefined;
    result: ApiResult<EmailTaskImportSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.previewDelimitedFileImport]: {
    input: CsvImportPreviewFileInput;
    result: ApiResult<CsvImportPreviewSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.importDelimitedFile]: {
    input: CsvImportExecuteFileInput;
    result: ApiResult<CsvImportExecuteSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.previewMarkdownFolderImport]: {
    input: MarkdownFolderImportPreviewFolderInput;
    result: ApiResult<MarkdownFolderImportPreviewSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.importMarkdownFolder]: {
    input: MarkdownFolderImportExecuteFolderInput;
    result: ApiResult<MarkdownFolderImportExecuteSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.chooseAndPreviewMarkdownFolderImport]: {
    input: ChooseMarkdownFolderImportInput | undefined;
    result: ApiResult<MarkdownFolderImportPreviewSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.chooseAndImportMarkdownFolder]: {
    input: ChooseMarkdownFolderImportInput | undefined;
    result: ApiResult<MarkdownFolderImportExecuteSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.previewMarkdownNoteImport]: {
    input: MarkdownNoteImportPreviewFileInput;
    result: ApiResult<MarkdownNoteImportPreviewSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.import.importMarkdownNotes]: {
    input: MarkdownNoteImportExecuteFileInput;
    result: ApiResult<MarkdownNoteImportExecuteSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.export.exportWorkspaceJson]: {
    input: ExportWorkspaceJsonInput | undefined;
    result: ApiResult<WorkspaceJsonExportSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.export.exportProjectMarkdown]: {
    input: ExportProjectMarkdownInput;
    result: ApiResult<TextExportSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.export.exportTasksCsv]: {
    input: ExportTasksCsvInput | undefined;
    result: ApiResult<TextExportSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.export.exportPlanningSummaryMarkdown]: {
    input: ExportPlanningSummaryMarkdownInput | undefined;
    result: ApiResult<TextExportSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.export.exportHtmlCsvTsvMarkdownBundle]: {
    input: ExportHtmlCsvTsvMarkdownBundleInput | undefined;
    result: ApiResult<BundleExportSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.print.printPdf]: {
    input: PrintPdfInput;
    result: ApiResult<PrintPdfSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.appearance.getSettings]: {
    input: string | undefined;
    result: ApiResult<AppearanceSettingsSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.appearance.updateSettings]: {
    input: UpdateAppearanceSettingsInput;
    result: ApiResult<AppearanceSettingsSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.privacy.getSettings]: {
    input: string | undefined;
    result: ApiResult<PrivacyNetworkSettingsSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.privacy.updateSettings]: {
    input: UpdatePrivacyNetworkSettingsInput;
    result: ApiResult<PrivacyNetworkSettingsSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.runWorkspaceIntegrityCheck]: {
    input: RunWorkspaceIntegrityCheckInput | undefined;
    result: ApiResult<WorkspaceIntegritySummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.repairAttachment]: {
    input: RepairAttachmentInput;
    result: ApiResult<RepairAttachmentSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.runSavedViewDiagnostics]: {
    input: string | undefined;
    result: ApiResult<SavedViewDiagnosticsSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.repairSavedViewQuery]: {
    input: RepairSavedViewQueryInput;
    result: ApiResult<RepairSavedViewQuerySummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.runMaintenanceJob]: {
    input: RunMaintenanceJobInput | undefined;
    result: ApiResult<MaintenanceJobSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.listMaintenanceJobs]: {
    input: ListMaintenanceJobsInput | undefined;
    result: ApiResult<MaintenanceJobSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.navigation.listRecentTargets]: {
    input: string | undefined;
    result: ApiResult<NavigationRecentTargetSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.navigation.recordTarget]: {
    input: RecordNavigationTargetInput;
    result: ApiResult<NavigationRecentTargetSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.navigation.listPinnedFavorites]: {
    input: string | undefined;
    result: ApiResult<PinnedFavoriteTargetSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.navigation.listAppTabs]: {
    input: string | undefined;
    result: ApiResult<AppTabSessionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.navigation.openAppTab]: {
    input: OpenAppTabInput;
    result: ApiResult<AppTabSessionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.navigation.closeAppTab]: {
    input: CloseAppTabInput;
    result: ApiResult<AppTabSessionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.navigation.reorderAppTabs]: {
    input: ReorderAppTabsInput;
    result: ApiResult<AppTabSessionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.navigation.setActiveAppTab]: {
    input: SetActiveAppTabInput;
    result: ApiResult<AppTabSessionSummary>;
  };
};

export type LocalWorkOsIpcChannel = keyof LocalWorkOsIpcContracts & string;

export type LocalWorkOsIpcInput<Channel extends LocalWorkOsIpcChannel> =
  LocalWorkOsIpcContracts[Channel]["input"];

export type LocalWorkOsIpcResult<Channel extends LocalWorkOsIpcChannel> =
  LocalWorkOsIpcContracts[Channel]["result"];

export type LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
  channel: Channel,
  input: LocalWorkOsIpcInput<Channel>
) => Promise<LocalWorkOsIpcResult<Channel>>;

export type LocalWorkOsApi = {
  workspace: {
    createWorkspace: (
      input: CreateWorkspaceInput
    ) => Promise<ApiResult<WorkspaceSummary>>;
    createDemoWorkspace: (
      input: CreateWorkspaceInput
    ) => Promise<ApiResult<WorkspaceSummary>>;
    openWorkspace: (
      input: OpenWorkspaceInput
    ) => Promise<ApiResult<WorkspaceSummary>>;
    validateWorkspace: (
      input: ValidateWorkspaceInput
    ) => Promise<ApiResult<WorkspaceValidationResult>>;
    getCurrentWorkspace: () => Promise<ApiResult<WorkspaceSummary | null>>;
    listRecentWorkspaces: () => Promise<ApiResult<RecentWorkspace[]>>;
  };
  database: {
    getHealthStatus: () => Promise<ApiResult<DatabaseHealthStatus>>;
  };
  inbox: {
    getInbox: (workspaceId?: string) => Promise<ApiResult<InboxSummary>>;
    listItems: (workspaceId?: string) => Promise<ApiResult<ItemSummary[]>>;
    moveItemToProject: (
      input: MoveInboxItemToProjectInput
    ) => Promise<ApiResult<ItemSummary>>;
  };
  tasks: {
    create: (input: CreateTaskInput) => Promise<ApiResult<TaskSummary>>;
    update: (input: UpdateTaskInput) => Promise<ApiResult<TaskSummary>>;
    complete: (itemId: string) => Promise<ApiResult<TaskSummary>>;
    reopen: (itemId: string) => Promise<ApiResult<TaskSummary>>;
    snooze: (input: SnoozeTaskInput) => Promise<ApiResult<TaskSummary>>;
    reschedule: (
      input: RescheduleTaskInput
    ) => Promise<ApiResult<TaskSummary>>;
    listByContainer: (
      containerId: string
    ) => Promise<ApiResult<TaskSummary[]>>;
    createTask: (input: CreateTaskInput) => Promise<ApiResult<TaskSummary>>;
    updateTask: (input: UpdateTaskInput) => Promise<ApiResult<TaskSummary>>;
    completeTask: (itemId: string) => Promise<ApiResult<TaskSummary>>;
    reopenTask: (itemId: string) => Promise<ApiResult<TaskSummary>>;
    snoozeTask: (input: SnoozeTaskInput) => Promise<ApiResult<TaskSummary>>;
    rescheduleTask: (
      input: RescheduleTaskInput
    ) => Promise<ApiResult<TaskSummary>>;
  };
  reminders?: {
    setTaskReminder: (
      input: SetTaskReminderInput
    ) => Promise<ApiResult<TaskReminderMutationSummary>>;
    clearTaskReminder: (
      input: ClearTaskReminderInput
    ) => Promise<ApiResult<TaskReminderMutationSummary>>;
    setListItemReminder: (
      input: SetListItemReminderInput
    ) => Promise<ApiResult<TaskReminderMutationSummary>>;
    clearListItemReminder: (
      input: ClearListItemReminderInput
    ) => Promise<ApiResult<TaskReminderMutationSummary>>;
    dismissReminder: (
      input: DismissReminderInput
    ) => Promise<ApiResult<ReminderEventMutationSummary>>;
    snoozeReminder: (
      input: SnoozeReminderInput
    ) => Promise<ApiResult<ReminderEventMutationSummary>>;
  };
  lists: {
    create: (input: CreateListInput) => Promise<ApiResult<ListSummary>>;
    addItem: (input: AddListItemInput) => Promise<ApiResult<ListItemSummary>>;
    updateItem: (
      input: UpdateListItemInput
    ) => Promise<ApiResult<ListItemSummary>>;
    completeItem: (listItemId: string) => Promise<ApiResult<ListItemSummary>>;
    reopenItem: (listItemId: string) => Promise<ApiResult<ListItemSummary>>;
    enablePipelineMode: (listId: string) => Promise<ApiResult<ListSummary>>;
    disablePipelineMode: (listId: string) => Promise<ApiResult<ListSummary>>;
    getPipelineViewModel: (
      listId: string
    ) => Promise<ApiResult<PipelineViewModelSummary>>;
    movePipelineCard: (
      input: MovePipelineCardInput
    ) => Promise<ApiResult<ListItemSummary>>;
    indentItem: (listItemId: string) => Promise<ApiResult<ListItemSummary>>;
    outdentItem: (listItemId: string) => Promise<ApiResult<ListItemSummary>>;
    moveItem: (input: MoveListItemInput) => Promise<ApiResult<ListItemSummary>>;
    moveItemToList: (
      input: MoveListItemToListInput
    ) => Promise<ApiResult<ListItemSummary[]>>;
    bulkAddItems: (
      input: BulkAddListItemsInput
    ) => Promise<ApiResult<ListItemSummary[]>>;
    bulkUpdateItems: (
      input: BulkUpdateListItemsInput
    ) => Promise<ApiResult<BulkUpdateListItemsSummary>>;
    listByContainer: (
      containerId: string
    ) => Promise<ApiResult<ListSummary[]>>;
    createList: (input: CreateListInput) => Promise<ApiResult<ListSummary>>;
    saveAsTemplate: (
      input: SaveListAsTemplateInput
    ) => Promise<ApiResult<TemplateSummary>>;
    createFromTemplate: (
      input: CreateListFromTemplateInput
    ) => Promise<ApiResult<ListSummary>>;
    listTemplates: (
      workspaceId?: string
    ) => Promise<ApiResult<TemplateSummary[]>>;
  };
  templates?: {
    saveContainerAsTemplate: (
      input: SaveContainerAsTemplateInput
    ) => Promise<ApiResult<TemplateSummary>>;
    createContainerFromTemplate: (
      input: CreateContainerFromTemplateInput
    ) => Promise<ApiResult<ContainerTemplateCreationSummary>>;
    listTemplates: (
      input?: { workspaceId?: string; kind?: "list" | "project" | "contact" } | string
    ) => Promise<ApiResult<TemplateSummary[]>>;
    updateTemplate: (
      input: UpdateTemplateInput
    ) => Promise<ApiResult<TemplateSummary>>;
    duplicateTemplate: (
      input: DuplicateTemplateInput
    ) => Promise<ApiResult<TemplateSummary>>;
    deleteTemplate: (
      input: DeleteTemplateInput
    ) => Promise<ApiResult<TemplateSummary>>;
    exportTemplatePack: (
      input?: ExportTemplatePackInput
    ) => Promise<ApiResult<TemplatePackExportSummary>>;
    validateTemplatePack: (
      input: ValidateTemplatePackInput
    ) => Promise<ApiResult<TemplatePackValidationSummary>>;
    importTemplatePack: (
      input: ImportTemplatePackInput
    ) => Promise<ApiResult<TemplatePackImportSummary>>;
    chooseAndImportTemplatePack: (
      input?: { workspaceId?: string }
    ) => Promise<ApiResult<TemplatePackImportSummary | null>>;
  };
  notes: {
    create: (input: CreateNoteInput) => Promise<ApiResult<NoteSummary>>;
    update: (input: UpdateNoteInput) => Promise<ApiResult<NoteSummary>>;
    listByContainer: (
      containerId: string
    ) => Promise<ApiResult<NoteSummary[]>>;
    createNote: (input: CreateNoteInput) => Promise<ApiResult<NoteSummary>>;
    updateNote: (input: UpdateNoteInput) => Promise<ApiResult<NoteSummary>>;
  };
  links: {
    create: (input: CreateLinkInput) => Promise<ApiResult<LinkSummary>>;
    update: (input: UpdateLinkInput) => Promise<ApiResult<LinkSummary>>;
    listByContainer: (
      containerId: string
    ) => Promise<ApiResult<LinkSummary[]>>;
    openExternal: (itemId: string) => Promise<ApiResult<OpenLinkSummary>>;
    openUrlExternal: (url: string) => Promise<ApiResult<OpenExternalUrlSummary>>;
    fetchMetadata?: (
      input: FetchLinkMetadataInput
    ) => Promise<ApiResult<LinkSummary>>;
    createLink: (input: CreateLinkInput) => Promise<ApiResult<LinkSummary>>;
    updateLink: (input: UpdateLinkInput) => Promise<ApiResult<LinkSummary>>;
  };
  locations: {
    create: (input: CreateLocationInput) => Promise<ApiResult<LocationSummary>>;
    update: (input: UpdateLocationInput) => Promise<ApiResult<LocationSummary>>;
    listByContainer: (
      containerId: string
    ) => Promise<ApiResult<LocationSummary[]>>;
    openExternal: (itemId: string) => Promise<ApiResult<OpenLocationMapSummary>>;
    createLocation: (input: CreateLocationInput) => Promise<ApiResult<LocationSummary>>;
    updateLocation: (input: UpdateLocationInput) => Promise<ApiResult<LocationSummary>>;
  };
  projects: {
    create: (
      input: CreateProjectInput
    ) => Promise<ApiResult<CreateProjectResult>>;
    update: (
      input: UpdateProjectInput
    ) => Promise<ApiResult<ProjectSummary>>;
    clone?: (
      input: CloneProjectInput
    ) => Promise<ApiResult<ProjectSummary>>;
    archive: (
      input: string | ProjectLifecycleInput
    ) => Promise<ApiResult<ProjectSummary>>;
    complete?: (
      input: string | ProjectLifecycleInput
    ) => Promise<ApiResult<ProjectSummary>>;
    restore?: (
      input: string | ProjectLifecycleInput
    ) => Promise<ApiResult<ProjectSummary>>;
    softDelete: (projectId: string) => Promise<ApiResult<ProjectSummary>>;
    list: (
      input?: string | ListContainersInput
    ) => Promise<ApiResult<ProjectSummary[]>>;
    get: (projectId: string) => Promise<ApiResult<ProjectSummary | null>>;
    getHealth: (projectId: string) => Promise<ApiResult<ProjectHealthSummary>>;
    createProject: (
      input: CreateProjectInput
    ) => Promise<ApiResult<CreateProjectResult>>;
    updateProject: (
      input: UpdateProjectInput
    ) => Promise<ApiResult<ProjectSummary>>;
    cloneProject?: (
      input: CloneProjectInput
    ) => Promise<ApiResult<ProjectSummary>>;
    archiveProject: (
      input: string | ProjectLifecycleInput
    ) => Promise<ApiResult<ProjectSummary>>;
    completeProject?: (
      input: string | ProjectLifecycleInput
    ) => Promise<ApiResult<ProjectSummary>>;
    restoreProject?: (
      input: string | ProjectLifecycleInput
    ) => Promise<ApiResult<ProjectSummary>>;
    softDeleteProject: (projectId: string) => Promise<ApiResult<ProjectSummary>>;
    listProjects: (
      input?: string | ListContainersInput
    ) => Promise<ApiResult<ProjectSummary[]>>;
    getProject: (projectId: string) => Promise<ApiResult<ProjectSummary | null>>;
    getProjectHealth: (
      projectId: string
    ) => Promise<ApiResult<ProjectHealthSummary>>;
  };
  contacts: {
    create: (
      input: CreateContactInput
    ) => Promise<ApiResult<CreateContactResult>>;
    update: (
      input: UpdateContactInput
    ) => Promise<ApiResult<ContactSummary>>;
    clone?: (
      input: CloneContactInput
    ) => Promise<ApiResult<ContactSummary>>;
    archive?: (
      input: string | ContactLifecycleInput
    ) => Promise<ApiResult<ContactSummary>>;
    complete?: (
      input: string | ContactLifecycleInput
    ) => Promise<ApiResult<ContactSummary>>;
    restore?: (
      input: string | ContactLifecycleInput
    ) => Promise<ApiResult<ContactSummary>>;
    list: (
      input?: string | ListContainersInput
    ) => Promise<ApiResult<ContactSummary[]>>;
    get: (
      contactId: string
    ) => Promise<ApiResult<ContactDetailSummary | null>>;
    addField: (
      input: AddContactFieldInput
    ) => Promise<ApiResult<ContactFieldSummary>>;
    updateField: (
      input: UpdateContactFieldInput
    ) => Promise<ApiResult<ContactFieldSummary>>;
    createContact: (
      input: CreateContactInput
    ) => Promise<ApiResult<CreateContactResult>>;
    updateContact: (
      input: UpdateContactInput
    ) => Promise<ApiResult<ContactSummary>>;
    cloneContact?: (
      input: CloneContactInput
    ) => Promise<ApiResult<ContactSummary>>;
    archiveContact?: (
      input: string | ContactLifecycleInput
    ) => Promise<ApiResult<ContactSummary>>;
    completeContact?: (
      input: string | ContactLifecycleInput
    ) => Promise<ApiResult<ContactSummary>>;
    restoreContact?: (
      input: string | ContactLifecycleInput
    ) => Promise<ApiResult<ContactSummary>>;
    listContacts: (
      input?: string | ListContainersInput
    ) => Promise<ApiResult<ContactSummary[]>>;
    getContact: (
      contactId: string
    ) => Promise<ApiResult<ContactDetailSummary | null>>;
    getTimeline?: (
      input: ContactTimelineInput
    ) => Promise<ApiResult<ContactTimelineSummary>>;
  };
  tabs: {
    list: (containerId: string) => Promise<ApiResult<ContainerTabSummary[]>>;
    listManaged: (
      containerId: string
    ) => Promise<ApiResult<ContainerTabSummary[]>>;
    listSummaries: (
      containerId: string
    ) => Promise<ApiResult<ContainerTabContentSummary[]>>;
    listTemplates: () => Promise<ApiResult<TabTemplateSummary[]>>;
    create: (
      input: CreateContainerTabInput
    ) => Promise<ApiResult<ContainerTabSummary>>;
    createFromTemplate: (
      input: CreateContainerTabFromTemplateInput
    ) => Promise<ApiResult<ContainerTabSummary>>;
    rename: (
      input: RenameContainerTabInput
    ) => Promise<ApiResult<ContainerTabSummary>>;
    reorder: (
      input: ReorderContainerTabsInput
    ) => Promise<ApiResult<ContainerTabSummary[]>>;
    hide: (tabId: string) => Promise<ApiResult<ContainerTabSummary>>;
    show: (tabId: string) => Promise<ApiResult<ContainerTabSummary>>;
    duplicate: (tabId: string) => Promise<ApiResult<ContainerTabSummary>>;
    archive: (tabId: string) => Promise<ApiResult<ContainerTabSummary>>;
    delete: (
      input: string | DeleteContainerTabInput
    ) => Promise<ApiResult<ContainerTabSummary>>;
    listTabs: (
      containerId: string
    ) => Promise<ApiResult<ContainerTabSummary[]>>;
    listManagedTabs: (
      containerId: string
    ) => Promise<ApiResult<ContainerTabSummary[]>>;
    listTabSummaries: (
      containerId: string
    ) => Promise<ApiResult<ContainerTabContentSummary[]>>;
    createTab: (
      input: CreateContainerTabInput
    ) => Promise<ApiResult<ContainerTabSummary>>;
    createTabFromTemplate: (
      input: CreateContainerTabFromTemplateInput
    ) => Promise<ApiResult<ContainerTabSummary>>;
    renameTab: (
      input: RenameContainerTabInput
    ) => Promise<ApiResult<ContainerTabSummary>>;
    reorderTabs: (
      input: ReorderContainerTabsInput
    ) => Promise<ApiResult<ContainerTabSummary[]>>;
    hideTab: (tabId: string) => Promise<ApiResult<ContainerTabSummary>>;
    showTab: (tabId: string) => Promise<ApiResult<ContainerTabSummary>>;
    duplicateTab: (tabId: string) => Promise<ApiResult<ContainerTabSummary>>;
    archiveTab: (tabId: string) => Promise<ApiResult<ContainerTabSummary>>;
    deleteTab: (
      input: string | DeleteContainerTabInput
    ) => Promise<ApiResult<ContainerTabSummary>>;
  };
  relationships: {
    getGraph: (
      input: GetRelationshipGraphInput
    ) => Promise<ApiResult<RelationshipGraphSummary>>;
    createRelationship: (
      input: CreateGenericRelationshipInput
    ) => Promise<ApiResult<ContactProjectRelationshipResult>>;
    removeRelationship: (
      relationshipId: string
    ) => Promise<ApiResult<ContactProjectRelationshipResult>>;
    linkContactToProject: (
      input: LinkContactToProjectInput
    ) => Promise<ApiResult<ContactProjectRelationshipResult>>;
    unlinkContactFromProject: (
      relationshipId: string
    ) => Promise<ApiResult<ContactProjectRelationshipResult>>;
    listContactsForProject: (
      projectId: string
    ) => Promise<ApiResult<RelatedContactSummary[]>>;
    listProjectsForContact: (
      contactId: string
    ) => Promise<ApiResult<RelatedProjectSummary[]>>;
  };
  categories: {
    create: (input: CreateCategoryInput) => Promise<ApiResult<CategorySummary>>;
    update: (input: UpdateCategoryInput) => Promise<ApiResult<CategorySummary>>;
    delete: (categoryId: string) => Promise<ApiResult<CategorySummary>>;
    list: (workspaceId?: string) => Promise<ApiResult<CategorySummary[]>>;
    assignToProject: (
      input: AssignCategoryToProjectInput
    ) => Promise<ApiResult<ProjectSummary>>;
    assignToItem: (
      input: AssignCategoryToItemInput
    ) => Promise<ApiResult<ItemSummary>>;
    createCategory: (
      input: CreateCategoryInput
    ) => Promise<ApiResult<CategorySummary>>;
    updateCategory: (
      input: UpdateCategoryInput
    ) => Promise<ApiResult<CategorySummary>>;
    deleteCategory: (categoryId: string) => Promise<ApiResult<CategorySummary>>;
    listCategories: (
      workspaceId?: string
    ) => Promise<ApiResult<CategorySummary[]>>;
  };
  metadata: {
    listTagsWithCounts: (
      workspaceId?: string
    ) => Promise<ApiResult<TagCountSummary[]>>;
    listCategoriesWithCounts: (
      workspaceId?: string
    ) => Promise<ApiResult<CategoryCountSummary[]>>;
    listTargetsByMetadata: (
      input: ListTargetsByMetadataInput
    ) => Promise<ApiResult<MetadataTargetSummary[]>>;
    getProjectTagBrowser: (
      input: ProjectTagBrowserInput
    ) => Promise<ApiResult<ProjectTagBrowserSummary>>;
    getContactLabelBrowser: (
      input: ContactLabelBrowserInput
    ) => Promise<ApiResult<ContactLabelBrowserSummary>>;
    addTagToTarget: (
      input: AddTagToTargetInput
    ) => Promise<ApiResult<ItemTagSummary>>;
    removeTagFromTarget: (
      input: RemoveTagFromTargetInput
    ) => Promise<ApiResult<ItemTagSummary | null>>;
  };
  search: {
    searchWorkspace: (
      input: SearchWorkspaceInput
    ) => Promise<ApiResult<SearchResultSummary[]>>;
    saveSearch: (
      input: SaveSearchInput
    ) => Promise<ApiResult<{ savedViewId: string; name: string }>>;
  };
  collections: {
    listCollections: (
      workspaceId?: string
    ) => Promise<ApiResult<CollectionSummary[]>>;
    createTagCollection: (
      input: CreateTagCollectionInput
    ) => Promise<ApiResult<CollectionSummary>>;
    createKeywordCollection: (
      input: CreateKeywordCollectionInput
    ) => Promise<ApiResult<CollectionSummary>>;
    createMetadataCollection: (
      input: CreateMetadataCollectionInput
    ) => Promise<ApiResult<CollectionSummary>>;
    evaluateCollection: (
      input: string | EvaluateCollectionInput
    ) => Promise<ApiResult<CollectionEvaluationSummary>>;
    createTaskInCollection: (
      input: CreateTaskInCollectionInput
    ) => Promise<ApiResult<TaskSummary>>;
    createNoteInCollection: (
      input: CreateNoteInCollectionInput
    ) => Promise<ApiResult<NoteSummary>>;
    listSmartLists: (
      workspaceId?: string
    ) => Promise<ApiResult<SmartListSummary[]>>;
    createSmartList: (
      input: CreateSmartListInput
    ) => Promise<ApiResult<SmartListSummary>>;
    updateSmartList: (
      input: UpdateSmartListInput
    ) => Promise<ApiResult<SmartListSummary>>;
    previewSmartList: (
      input: PreviewSmartListInput
    ) => Promise<ApiResult<SmartListPreviewSummary>>;
  };
  viewModes?: {
    getViewMode: (input: { contextType: ViewModeContextType; contextId: string }) => Promise<ApiResult<ViewModePreferenceSummary>>;
    setViewMode: (input: SetViewModeInput) => Promise<ApiResult<ViewModePreferenceSummary>>;
  };
  today: {
    getViewModel: (
      input?: TodayViewModelInput
    ) => Promise<ApiResult<TodayViewModelSummary>>;
    getOrCreateDailyPlan: (
      input?: DailyPlanDateInput
    ) => Promise<ApiResult<DailyPlanSummary>>;
    planTask: (input: PlanTaskInput) => Promise<ApiResult<DailyPlanItemSummary>>;
    unplanTask: (
      input: UnplanTaskInput
    ) => Promise<ApiResult<DailyPlanItemSummary[]>>;
    reorderPlannedTask: (
      input: ReorderPlannedTaskInput
    ) => Promise<ApiResult<DailyPlanItemSummary>>;
    getPlannedTasks: (
      input?: GetPlannedTasksInput
    ) => Promise<ApiResult<PlannedTaskSummary[]>>;
    getPreferences: (
      workspaceId?: string
    ) => Promise<ApiResult<TodayPreferencesSummary>>;
    updatePreferences: (
      input: UpdateTodayPreferencesInput
    ) => Promise<ApiResult<TodayPreferencesSummary>>;
  };
  timeline?: {
    getViewModel: (
      input: TimelineViewModelInput
    ) => Promise<ApiResult<TimelineViewModelSummary>>;
    saveFilterAsView: (
      input: SaveTimelineFilterInput
    ) => Promise<ApiResult<{ savedViewId: string; name: string }>>;
  };
  calendar?: {
    getMonth: (
      input: CalendarMonthInput
    ) => Promise<ApiResult<CalendarMonthViewModelSummary>>;
    rescheduleItem: (
      input: CalendarRescheduleItemInput
    ) => Promise<ApiResult<CalendarRescheduleItemSummary>>;
    importIcsFile: (
      input: ImportIcsFileInput
    ) => Promise<ApiResult<ImportIcsSummary>>;
  };
  dashboard: {
    getDefault: (
      input?: GetDefaultDashboardInput
    ) => Promise<ApiResult<DashboardViewModelSummary>>;
    listWidgetDefinitions?: () => Promise<ApiResult<DashboardWidgetDefinitionSummary[]>>;
    addWidget?: (input: AddDashboardWidgetInput) => Promise<ApiResult<DashboardWidgetSummary>>;
    updateWidget?: (input: UpdateDashboardWidgetInput) => Promise<ApiResult<DashboardWidgetSummary>>;
    removeWidget?: (input: RemoveDashboardWidgetInput) => Promise<ApiResult<DashboardWidgetRecordSummary>>;
    reorderWidgets?: (input: ReorderDashboardWidgetsInput) => Promise<ApiResult<DashboardViewModelSummary>>;
    updateLayout?: (input: UpdateDashboardLayoutInput) => Promise<ApiResult<DashboardRecordSummary>>;
  };
  activity: {
    listRecent: (
      input?: ListRecentActivityInput
    ) => Promise<ApiResult<ActivitySummary[]>>;
    listForTarget: (
      input: ListActivityForTargetInput
    ) => Promise<ApiResult<ActivitySummary[]>>;
    listRecentActivity: (
      input?: ListRecentActivityInput
    ) => Promise<ApiResult<ActivitySummary[]>>;
    listActivityForTarget: (
      input: ListActivityForTargetInput
    ) => Promise<ApiResult<ActivitySummary[]>>;
  };
  containers: {
    getStatus: () => Promise<ApiResult<IpcModuleStatus>>;
    getPreferences: (
      containerId: string
    ) => Promise<ApiResult<ContainerPreferencesSummary>>;
    updatePreferences: (
      input: UpdateContainerPreferencesInput
    ) => Promise<ApiResult<ContainerPreferencesSummary>>;
    getGrouping: (
      input: GetContainerGroupingInput
    ) => Promise<ApiResult<ContainerGroupingViewModelSummary>>;
    getGroupingPreferences: (
      input: Pick<GetContainerGroupingInput, "workspaceId" | "containerType">
    ) => Promise<ApiResult<ContainerGroupingPreferencesSummary>>;
    updateGroupingPreferences: (
      input: UpdateContainerGroupingPreferencesInput
    ) => Promise<ApiResult<ContainerGroupingPreferencesSummary>>;
  };
  items: {
    getStatus: () => Promise<ApiResult<IpcModuleStatus>>;
    move: (input: MoveItemInput) => Promise<ApiResult<ItemSummary>>;
    archive: (itemId: string) => Promise<ApiResult<ItemSummary>>;
    softDelete: (itemId: string) => Promise<ApiResult<ItemSummary>>;
    getActivity: (itemId: string) => Promise<ApiResult<ActivitySummary[]>>;
    openInspector: (
      itemId: string
    ) => Promise<ApiResult<ItemInspectorSummary>>;
    moveItem: (input: MoveItemInput) => Promise<ApiResult<ItemSummary>>;
    archiveItem: (itemId: string) => Promise<ApiResult<ItemSummary>>;
    softDeleteItem: (itemId: string) => Promise<ApiResult<ItemSummary>>;
    getItemActivity: (
      itemId: string
    ) => Promise<ApiResult<ActivitySummary[]>>;
    openItemInspector: (
      itemId: string
    ) => Promise<ApiResult<ItemInspectorSummary>>;
    bulkMoveItems?: (input: BulkMoveItemsInput) => Promise<ApiResult<BulkActionSummary>>;
    bulkTagItems?: (input: BulkTagItemsInput) => Promise<ApiResult<BulkActionSummary>>;
    bulkCategorizeItems?: (
      input: BulkCategorizeItemsInput
    ) => Promise<ApiResult<BulkActionSummary>>;
    bulkArchiveItems?: (input: BulkBaseItemsInput) => Promise<ApiResult<BulkActionSummary>>;
    bulkDeleteItems?: (input: BulkBaseItemsInput) => Promise<ApiResult<BulkActionSummary>>;
    bulkCompleteTasks?: (input: BulkBaseItemsInput) => Promise<ApiResult<BulkActionSummary>>;
    bulkExportItems?: (input: BulkBaseItemsInput) => Promise<ApiResult<BulkActionSummary>>;
    undoActivity?: (input: UndoActivityInput) => Promise<ApiResult<UndoApplySummary>>;
    redoActivity?: (input: UndoActivityInput) => Promise<ApiResult<UndoApplySummary>>;
  };

  trash?: {
    listTrash: (input?: ListTrashInput) => Promise<ApiResult<TrashEntrySummary[]>>;
    restoreTrash: (input: RestoreTrashInput) => Promise<ApiResult<RestoreTrashSummary>>;
    clearTrash: (input: ClearTrashInput) => Promise<ApiResult<ClearTrashSummary>>;
  };
  dragDrop?: {
    reorderItems: (
      input: ReorderContainerItemsInput
    ) => Promise<ApiResult<ItemSummary[]>>;
    moveItem: (input: MoveItemInput) => Promise<ApiResult<ItemSummary>>;
    reorderListItems: (
      input: ReorderListItemsByIdInput
    ) => Promise<ApiResult<ListItemSummary[]>>;
    reorderTabs: (
      input: ReorderContainerTabsInput
    ) => Promise<ApiResult<ContainerTabSummary[]>>;
    attachFilesToContainer: (
      input: AttachDroppedFilesToContainerInput
    ) => Promise<ApiResult<FileAttachmentResultSummary[]>>;
    attachFilesToItem: (
      input: AttachDroppedFilesToItemInput
    ) => Promise<ApiResult<FileAttachmentResultSummary[]>>;
    getDroppedFilePaths: (files: readonly File[]) => string[];
  };
  containerMedia?: {
    chooseAndSet: (input: ChooseAndSetContainerMediaInput) => Promise<ApiResult<ContainerMediaSummary | null>>;
    getActive: (input: { containerId: string; role: ContainerMediaRole }) => Promise<ApiResult<ContainerMediaSummary | null>>;
    remove: (input: { containerId: string; role: ContainerMediaRole }) => Promise<ApiResult<ContainerMediaSummary | null>>;
  };
  files: {
    getStatus: () => Promise<ApiResult<IpcModuleStatus>>;
    attachFileToContainer: (
      input: AttachFileToContainerInput
    ) => Promise<ApiResult<FileAttachmentResultSummary>>;
    attachFileToItem: (
      input: AttachFileToItemInput
    ) => Promise<ApiResult<FileAttachmentResultSummary>>;
    chooseAndAttach: (
      input: ChooseAndAttachFileInput
    ) => Promise<ApiResult<FileAttachmentResultSummary | null>>;
    listByContainer: (
      containerId: string
    ) => Promise<ApiResult<FileItemSummary[]>>;
    openAttachment: (
      attachmentId: string
    ) => Promise<ApiResult<OpenAttachmentSummary>>;
    revealAttachment: (
      attachmentId: string
    ) => Promise<ApiResult<OpenAttachmentSummary>>;
    updateMetadata: (
      input: UpdateFileMetadataInput
    ) => Promise<ApiResult<FileAttachmentResultSummary>>;
    verifyAttachment: (
      attachmentId: string
    ) => Promise<ApiResult<VerifyAttachmentSummary>>;
    createFileSnapshot: (
      input: CreateFileSnapshotInput
    ) => Promise<ApiResult<FileVersionMutationSummary>>;
    listFileVersions: (
      attachmentId: string
    ) => Promise<ApiResult<AttachmentVersionSummary[]>>;
    openFileVersion: (
      versionId: string
    ) => Promise<ApiResult<OpenFileVersionSummary>>;
    restoreFileVersion: (
      input: RestoreFileVersionInput
    ) => Promise<ApiResult<FileVersionMutationSummary>>;
  };
  backup: {
    createManualBackup: (
      input?: CreateManualBackupInput
    ) => Promise<ApiResult<ManualBackupSnapshotSummary>>;
    listBackups: (
      input?: ListBackupsInput
    ) => Promise<ApiResult<BackupSnapshotSummary[]>>;
    listBackupsForWorkspacePath: (
      input: ListBackupsForWorkspacePathInput
    ) => Promise<ApiResult<BackupSnapshotSummary[]>>;
    getAutomaticBackupSettings: (
      input?: ListBackupsInput
    ) => Promise<ApiResult<BackupSchedulerSettingsSummary>>;
    updateAutomaticBackupSettings: (
      input: UpdateBackupSchedulerSettingsInput
    ) => Promise<ApiResult<BackupSchedulerSettingsSummary>>;
    runAutomaticBackupCheck: (
      input: RunAutomaticBackupInput
    ) => Promise<ApiResult<AutomaticBackupRunSummary>>;
    validateRestoreSource: (
      input: ValidateRestoreSourceInput
    ) => Promise<ApiResult<RestoreValidationSummary>>;
    restoreBackupToNewWorkspace: (
      input: RestoreBackupToNewWorkspaceInput
    ) => Promise<ApiResult<RestoreWorkspaceSummary>>;
    restoreBackupFromWorkspacePath: (
      input: RestoreBackupFromWorkspacePathInput
    ) => Promise<ApiResult<RestoreWorkspaceSummary>>;
    restoreExportToNewWorkspace: (
      input: RestoreExportToNewWorkspaceInput
    ) => Promise<ApiResult<RestoreWorkspaceSummary>>;
  };
  import: {
    validateWorkspaceExportJson: (
      input: ValidateWorkspaceExportJsonInput
    ) => Promise<ApiResult<ImportValidationSummary>>;
    chooseAndValidateWorkspaceExportJson: () => Promise<
      ApiResult<ImportValidationSummary | null>
    >;
    previewEmails?: (
      input: ImportEmailsAsTasksInput
    ) => Promise<ApiResult<EmailImportPreviewSummary[]>>;
    importEmailsAsTasks?: (
      input: ImportEmailsAsTasksInput
    ) => Promise<ApiResult<EmailTaskImportSummary>>;
    chooseAndImportEmailsAsTasks?: (
      input?: ChooseAndImportEmailsInput
    ) => Promise<ApiResult<EmailTaskImportSummary | null>>;
    previewDelimitedFileImport?: (
      input: CsvImportPreviewFileInput
    ) => Promise<ApiResult<CsvImportPreviewSummary>>;
    importDelimitedFile?: (
      input: CsvImportExecuteFileInput
    ) => Promise<ApiResult<CsvImportExecuteSummary>>;
    previewMarkdownFolderImport?: (
      input: MarkdownFolderImportPreviewFolderInput
    ) => Promise<ApiResult<MarkdownFolderImportPreviewSummary>>;
    importMarkdownFolder?: (
      input: MarkdownFolderImportExecuteFolderInput
    ) => Promise<ApiResult<MarkdownFolderImportExecuteSummary>>;
    chooseAndPreviewMarkdownFolderImport?: (
      input?: ChooseMarkdownFolderImportInput
    ) => Promise<ApiResult<MarkdownFolderImportPreviewSummary | null>>;
    chooseAndImportMarkdownFolder?: (
      input?: ChooseMarkdownFolderImportInput
    ) => Promise<ApiResult<MarkdownFolderImportExecuteSummary | null>>;
    previewMarkdownNoteImport?: (
      input: MarkdownNoteImportPreviewFileInput
    ) => Promise<ApiResult<MarkdownNoteImportPreviewSummary>>;
    importMarkdownNotes?: (
      input: MarkdownNoteImportExecuteFileInput
    ) => Promise<ApiResult<MarkdownNoteImportExecuteSummary>>;
  };
  export: {
    exportWorkspaceJson: (
      input?: ExportWorkspaceJsonInput
    ) => Promise<ApiResult<WorkspaceJsonExportSummary>>;
    exportProjectMarkdown: (
      input: ExportProjectMarkdownInput
    ) => Promise<ApiResult<TextExportSummary>>;
    exportTasksCsv: (
      input?: ExportTasksCsvInput
    ) => Promise<ApiResult<TextExportSummary>>;
    exportPlanningSummaryMarkdown?: (
      input?: ExportPlanningSummaryMarkdownInput
    ) => Promise<ApiResult<TextExportSummary>>;
    exportHtmlCsvTsvMarkdownBundle?: (
      input?: ExportHtmlCsvTsvMarkdownBundleInput
    ) => Promise<ApiResult<BundleExportSummary>>;
  };
  print?: {
    printPdf: (input: PrintPdfInput) => Promise<ApiResult<PrintPdfSummary>>;
  };
  appearance: {
    getSettings: (workspaceId?: string) => Promise<ApiResult<AppearanceSettingsSummary>>;
    updateSettings: (
      input: UpdateAppearanceSettingsInput
    ) => Promise<ApiResult<AppearanceSettingsSummary>>;
  };
  privacy?: {
    getSettings: (
      workspaceId?: string
    ) => Promise<ApiResult<PrivacyNetworkSettingsSummary>>;
    updateSettings: (
      input: UpdatePrivacyNetworkSettingsInput
    ) => Promise<ApiResult<PrivacyNetworkSettingsSummary>>;
  };
  diagnostics: {
    runWorkspaceIntegrityCheck: (
      input?: RunWorkspaceIntegrityCheckInput
    ) => Promise<ApiResult<WorkspaceIntegritySummary>>;
    repairAttachment: (
      input: RepairAttachmentInput
    ) => Promise<ApiResult<RepairAttachmentSummary | null>>;
    runSavedViewDiagnostics: (
      workspaceId?: string
    ) => Promise<ApiResult<SavedViewDiagnosticsSummary>>;
    repairSavedViewQuery: (
      input: RepairSavedViewQueryInput
    ) => Promise<ApiResult<RepairSavedViewQuerySummary>>;
    runMaintenanceJob: (
      input?: RunMaintenanceJobInput
    ) => Promise<ApiResult<MaintenanceJobSummary>>;
    listMaintenanceJobs: (
      input?: ListMaintenanceJobsInput
    ) => Promise<ApiResult<MaintenanceJobSummary[]>>;
  };
  navigation: {
    listRecentTargets: (
      workspaceId?: string
    ) => Promise<ApiResult<NavigationRecentTargetSummary[]>>;
    recordTarget: (
      input: RecordNavigationTargetInput
    ) => Promise<ApiResult<NavigationRecentTargetSummary[]>>;
    listPinnedFavorites: (
      workspaceId?: string
    ) => Promise<ApiResult<PinnedFavoriteTargetSummary[]>>;
    listAppTabs: (workspaceId?: string) => Promise<ApiResult<AppTabSessionSummary>>;
    openAppTab: (input: OpenAppTabInput) => Promise<ApiResult<AppTabSessionSummary>>;
    closeAppTab: (input: CloseAppTabInput) => Promise<ApiResult<AppTabSessionSummary>>;
    reorderAppTabs: (input: ReorderAppTabsInput) => Promise<ApiResult<AppTabSessionSummary>>;
    setActiveAppTab: (input: SetActiveAppTabInput) => Promise<ApiResult<AppTabSessionSummary>>;
  };
};

export function apiOk<T>(data: T): ApiResult<T> {
  return {
    ok: true,
    data
  };
}

export function apiError<T = never>(
  code: ApiErrorCode,
  message: string
): ApiResult<T> {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

export function createLocalWorkOsApi(
  invoke: LocalWorkOsIpcInvoke
): LocalWorkOsApi {
  return {
    workspace: {
      createWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.workspace.createWorkspace, input),
      createDemoWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.workspace.createDemoWorkspace, input),
      openWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.workspace.openWorkspace, input),
      validateWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.workspace.validateWorkspace, input),
      getCurrentWorkspace: () =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace,
          undefined
        ),
      listRecentWorkspaces: () =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.workspace.listRecentWorkspaces,
          undefined
        )
    },
    database: {
      getHealthStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.database.getHealthStatus, undefined)
    },
    inbox: {
      getInbox: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.inbox.getInbox, workspaceId),
      listItems: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.inbox.listItems, workspaceId),
      moveItemToProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.inbox.moveItemToProject, input)
    },
    tasks: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask, input),
      complete: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask, itemId),
      reopen: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask, itemId),
      snooze: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.snoozeTask, input),
      reschedule: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.rescheduleTask, input),
      listByContainer: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.listByContainer, containerId),
      createTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask, input),
      updateTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask, input),
      completeTask: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask, itemId),
      reopenTask: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask, itemId),
      snoozeTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.snoozeTask, input),
      rescheduleTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.rescheduleTask, input)
    },
    reminders: {
      setTaskReminder: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.reminders.setTaskReminder, input),
      clearTaskReminder: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.reminders.clearTaskReminder, input),
      setListItemReminder: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.reminders.setListItemReminder, input),
      clearListItemReminder: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.reminders.clearListItemReminder, input),
      dismissReminder: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.reminders.dismissReminder, input),
      snoozeReminder: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.reminders.snoozeReminder, input)
    },
    lists: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.createList, input),
      addItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.addItem, input),
      updateItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.updateItem, input),
      completeItem: (listItemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.completeItem, listItemId),
      reopenItem: (listItemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.reopenItem, listItemId),
      enablePipelineMode: (listId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.enablePipelineMode, listId),
      disablePipelineMode: (listId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.disablePipelineMode, listId),
      getPipelineViewModel: (listId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.getPipelineViewModel, listId),
      movePipelineCard: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.movePipelineCard, input),
      indentItem: (listItemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.indentItem, listItemId),
      outdentItem: (listItemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.outdentItem, listItemId),
      moveItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.moveItem, input),
      moveItemToList: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.moveItemToList, input),
      bulkAddItems: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.bulkAddItems, input),
      bulkUpdateItems: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.bulkUpdateItems, input),
      listByContainer: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.listByContainer, containerId),
      createList: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.createList, input),
      saveAsTemplate: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.saveAsTemplate, input),
      createFromTemplate: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.createFromTemplate, input),
      listTemplates: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.listTemplates, workspaceId)
    },
    templates: {
      saveContainerAsTemplate: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.templates.saveContainerAsTemplate, input),
      createContainerFromTemplate: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.templates.createContainerFromTemplate, input),
      listTemplates: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.templates.listTemplates, input),
      updateTemplate: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.templates.updateTemplate, input),
      duplicateTemplate: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.templates.duplicateTemplate, input),
      deleteTemplate: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.templates.deleteTemplate, input),
      exportTemplatePack: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.templates.exportTemplatePack, input),
      validateTemplatePack: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.templates.validateTemplatePack, input),
      importTemplatePack: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.templates.importTemplatePack, input),
      chooseAndImportTemplatePack: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.templates.chooseAndImportTemplatePack, input)
    },
    notes: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.notes.createNote, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.notes.updateNote, input),
      listByContainer: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.notes.listByContainer, containerId),
      createNote: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.notes.createNote, input),
      updateNote: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.notes.updateNote, input)
    },
    links: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.links.createLink, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.links.updateLink, input),
      listByContainer: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.links.listByContainer, containerId),
      openExternal: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.links.openExternal, itemId),
      openUrlExternal: (url) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.links.openUrlExternal, url),
      fetchMetadata: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.links.fetchMetadata, input),
      createLink: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.links.createLink, input),
      updateLink: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.links.updateLink, input)
    },
    locations: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.locations.createLocation, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.locations.updateLocation, input),
      listByContainer: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.locations.listByContainer, containerId),
      openExternal: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.locations.openExternal, itemId),
      createLocation: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.locations.createLocation, input),
      updateLocation: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.locations.updateLocation, input)
    },
    projects: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.updateProject, input),
      clone: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.cloneProject, input),
      archive: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject, projectId),
      complete: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.completeProject, projectId),
      restore: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.restoreProject, projectId),
      softDelete: (projectId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.projects.softDeleteProject,
          projectId
        ),
      list: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.listProjects, workspaceId),
      get: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.getProject, projectId),
      getHealth: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.getProjectHealth, projectId),
      createProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject, input),
      updateProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.updateProject, input),
      cloneProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.cloneProject, input),
      archiveProject: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject, projectId),
      completeProject: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.completeProject, projectId),
      restoreProject: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.restoreProject, projectId),
      softDeleteProject: (projectId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.projects.softDeleteProject,
          projectId
        ),
      listProjects: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.listProjects, workspaceId),
      getProject: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.getProject, projectId),
      getProjectHealth: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.getProjectHealth, projectId)
    },
    contacts: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.createContact, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.updateContact, input),
      clone: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.cloneContact, input),
      archive: (contactId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.archiveContact, contactId),
      complete: (contactId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.completeContact, contactId),
      restore: (contactId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.restoreContact, contactId),
      list: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.listContacts, workspaceId),
      get: (contactId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.getContact, contactId),
      addField: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.addField, input),
      updateField: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.updateField, input),
      createContact: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.createContact, input),
      updateContact: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.updateContact, input),
      cloneContact: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.cloneContact, input),
      archiveContact: (contactId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.archiveContact, contactId),
      completeContact: (contactId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.completeContact, contactId),
      restoreContact: (contactId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.restoreContact, contactId),
      listContacts: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.listContacts, workspaceId),
      getContact: (contactId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.getContact, contactId),
      getTimeline: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.contacts.getTimeline, input)
    },
    tabs: {
      list: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabs, containerId),
      listManaged: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.listManagedTabs, containerId),
      listSummaries: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabSummaries, containerId),
      listTemplates: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabTemplates, undefined),
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.createTab, input),
      createFromTemplate: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.createTabFromTemplate, input),
      rename: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.renameTab, input),
      reorder: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.reorderTabs, input),
      hide: (tabId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.hideTab, tabId),
      show: (tabId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.showTab, tabId),
      duplicate: (tabId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.duplicateTab, tabId),
      archive: (tabId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.archiveTab, tabId),
      delete: (tabId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.deleteTab, tabId),
      listTabs: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabs, containerId),
      listManagedTabs: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.listManagedTabs, containerId),
      listTabSummaries: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.listTabSummaries, containerId),
      createTab: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.createTab, input),
      createTabFromTemplate: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.createTabFromTemplate, input),
      renameTab: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.renameTab, input),
      reorderTabs: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.reorderTabs, input),
      hideTab: (tabId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.hideTab, tabId),
      showTab: (tabId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.showTab, tabId),
      duplicateTab: (tabId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.duplicateTab, tabId),
      archiveTab: (tabId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.archiveTab, tabId),
      deleteTab: (tabId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tabs.deleteTab, tabId)
    },
    relationships: {
      getGraph: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.relationships.getGraph, input),
      createRelationship: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.relationships.createRelationship,
          input
        ),
      removeRelationship: (relationshipId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.relationships.removeRelationship,
          relationshipId
        ),
      linkContactToProject: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.relationships.linkContactToProject,
          input
        ),
      unlinkContactFromProject: (relationshipId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.relationships.unlinkContactFromProject,
          relationshipId
        ),
      listContactsForProject: (projectId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.relationships.listContactsForProject,
          projectId
        ),
      listProjectsForContact: (contactId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.relationships.listProjectsForContact,
          contactId
        )
    },
    categories: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.createCategory, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.updateCategory, input),
      delete: (categoryId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.deleteCategory, categoryId),
      list: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.listCategories, workspaceId),
      assignToProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToProject, input),
      assignToItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToItem, input),
      createCategory: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.createCategory, input),
      updateCategory: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.updateCategory, input),
      deleteCategory: (categoryId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.deleteCategory, categoryId),
      listCategories: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.listCategories, workspaceId)
    },
    metadata: {
      listTagsWithCounts: (workspaceId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTagsWithCounts,
          workspaceId
        ),
      listCategoriesWithCounts: (workspaceId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.metadata.listCategoriesWithCounts,
          workspaceId
        ),
      listTargetsByMetadata: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTargetsByMetadata, input),
      getProjectTagBrowser: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.metadata.getProjectTagBrowser, input),
      getContactLabelBrowser: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.metadata.getContactLabelBrowser, input),
      addTagToTarget: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.metadata.addTagToTarget, input),
      removeTagFromTarget: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.metadata.removeTagFromTarget, input)
    },
    search: {
      searchWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.search.searchWorkspace, input),
      saveSearch: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.search.saveSearch, input)
    },
    collections: {
      listCollections: (workspaceId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.listCollections,
          workspaceId
        ),
      createTagCollection: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.createTagCollection,
          input
        ),
      createKeywordCollection: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.createKeywordCollection,
          input
        ),
      createMetadataCollection: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.createMetadataCollection,
          input
        ),
      evaluateCollection: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.evaluateCollection,
          input
        ),
      createTaskInCollection: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.createTaskInCollection,
          input
        ),
      createNoteInCollection: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.createNoteInCollection,
          input
        ),
      listSmartLists: (workspaceId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.listSmartLists,
          workspaceId
        ),
      createSmartList: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.createSmartList,
          input
        ),
      updateSmartList: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.updateSmartList,
          input
        ),
      previewSmartList: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.previewSmartList,
          input
        )
    },
    viewModes: {
      getViewMode: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.viewModes.getViewMode, input),
      setViewMode: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.viewModes.setViewMode, input)
    },
    today: {
      getViewModel: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.getViewModel, input),
      getOrCreateDailyPlan: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.getOrCreateDailyPlan, input),
      planTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.planTask, input),
      unplanTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.unplanTask, input),
      reorderPlannedTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.reorderPlannedTask, input),
      getPlannedTasks: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.getPlannedTasks, input),
      getPreferences: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.getPreferences, workspaceId),
      updatePreferences: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.updatePreferences, input)
    },
    timeline: {
      getViewModel: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.timeline.getViewModel, input),
      saveFilterAsView: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.timeline.saveFilterAsView, input)
    },
    calendar: {
      getMonth: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.calendar.getMonth, input),
      rescheduleItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.calendar.rescheduleItem, input),
      importIcsFile: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.calendar.importIcsFile, input)
    },
    dashboard: {
      getDefault: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dashboard.getDefault, input),
      listWidgetDefinitions: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dashboard.listWidgetDefinitions, undefined),
      addWidget: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dashboard.addWidget, input),
      updateWidget: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dashboard.updateWidget, input),
      removeWidget: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dashboard.removeWidget, input),
      reorderWidgets: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dashboard.reorderWidgets, input),
      updateLayout: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dashboard.updateLayout, input)
    },
    activity: {
      listRecent: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.activity.listRecentActivity, input),
      listForTarget: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.activity.listActivityForTarget, input),
      listRecentActivity: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.activity.listRecentActivity, input),
      listActivityForTarget: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.activity.listActivityForTarget, input)
    },
    containers: {
      getStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.containers.getStatus, undefined),
      getPreferences: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.containers.getPreferences, containerId),
      updatePreferences: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.containers.updatePreferences, input),
      getGrouping: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.containers.getGrouping, input),
      getGroupingPreferences: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.containers.getGroupingPreferences, input),
      updateGroupingPreferences: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.containers.updateGroupingPreferences, input)
    },
    items: {
      getStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.getStatus, undefined),
      move: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.moveItem, input),
      archive: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.archiveItem, itemId),
      softDelete: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.softDeleteItem, itemId),
      getActivity: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.getItemActivity, itemId),
      openInspector: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.openItemInspector, itemId),
      moveItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.moveItem, input),
      archiveItem: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.archiveItem, itemId),
      softDeleteItem: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.softDeleteItem, itemId),
      getItemActivity: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.getItemActivity, itemId),
      openItemInspector: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.openItemInspector, itemId),
      bulkMoveItems: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.bulkMoveItems, input),
      bulkTagItems: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.bulkTagItems, input),
      bulkCategorizeItems: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.bulkCategorizeItems, input),
      bulkArchiveItems: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.bulkArchiveItems, input),
      bulkDeleteItems: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.bulkDeleteItems, input),
      bulkCompleteTasks: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.bulkCompleteTasks, input),
      bulkExportItems: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.bulkExportItems, input),
      undoActivity: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.undoActivity, input),
      redoActivity: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.redoActivity, input)
    },

    trash: {
      listTrash: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.trash.listTrash, input),
      restoreTrash: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.trash.restoreTrash, input),
      clearTrash: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.trash.clearTrash, input)
    },
    dragDrop: {
      reorderItems: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderItems, input),
      moveItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.moveItem, input),
      reorderListItems: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderListItems, input),
      reorderTabs: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.reorderTabs, input),
      attachFilesToContainer: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.attachFilesToContainer, input),
      attachFilesToItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.dragDrop.attachFilesToItem, input),
      getDroppedFilePaths: () => []
    },
    containerMedia: {
      chooseAndSet: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.containerMedia.chooseAndSet, input),
      getActive: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.containerMedia.getActive, input),
      remove: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.containerMedia.remove, input)
    },
    files: {
      getStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.getStatus, undefined),
      attachFileToContainer: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.attachFileToContainer, input),
      attachFileToItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.attachFileToItem, input),
      chooseAndAttach: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.chooseAndAttach, input),
      listByContainer: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.listByContainer, containerId),
      openAttachment: (attachmentId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.openAttachment, attachmentId),
      revealAttachment: (attachmentId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.revealAttachment, attachmentId),
      updateMetadata: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.updateMetadata, input),
      verifyAttachment: (attachmentId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.verifyAttachment, attachmentId),
      createFileSnapshot: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.createFileSnapshot, input),
      listFileVersions: (attachmentId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.listFileVersions, attachmentId),
      openFileVersion: (versionId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.openFileVersion, versionId),
      restoreFileVersion: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.restoreFileVersion, input)
    },
    backup: {
      createManualBackup: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.backup.createManualBackup, input),
      listBackups: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.backup.listBackups, input),
      listBackupsForWorkspacePath: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.backup.listBackupsForWorkspacePath,
          input
        ),
      getAutomaticBackupSettings: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.backup.getAutomaticBackupSettings,
          input
        ),
      updateAutomaticBackupSettings: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.backup.updateAutomaticBackupSettings,
          input
        ),
      runAutomaticBackupCheck: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.backup.runAutomaticBackupCheck, input),
      validateRestoreSource: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.backup.validateRestoreSource, input),
      restoreBackupToNewWorkspace: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreBackupToNewWorkspace,
          input
        ),
      restoreBackupFromWorkspacePath: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreBackupFromWorkspacePath,
          input
        ),
      restoreExportToNewWorkspace: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.backup.restoreExportToNewWorkspace,
          input
        )
    },
    import: {
      validateWorkspaceExportJson: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.import.validateWorkspaceExportJson,
          input
        ),
      chooseAndValidateWorkspaceExportJson: () =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.import.chooseAndValidateWorkspaceExportJson,
          undefined
        ),
      previewEmails: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.import.previewEmails, input),
      importEmailsAsTasks: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.import.importEmailsAsTasks, input),
      chooseAndImportEmailsAsTasks: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.import.chooseAndImportEmailsAsTasks,
          input
        ),
      previewDelimitedFileImport: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.import.previewDelimitedFileImport,
          input
        ),
      importDelimitedFile: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.import.importDelimitedFile,
          input
        ),
      previewMarkdownFolderImport: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.import.previewMarkdownFolderImport,
          input
        ),
      importMarkdownFolder: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.import.importMarkdownFolder, input),
      chooseAndPreviewMarkdownFolderImport: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.import.chooseAndPreviewMarkdownFolderImport,
          input
        ),
      chooseAndImportMarkdownFolder: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.import.chooseAndImportMarkdownFolder,
          input
        ),
      previewMarkdownNoteImport: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.import.previewMarkdownNoteImport,
          input
        ),
      importMarkdownNotes: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.import.importMarkdownNotes, input)
    },
    export: {
      exportWorkspaceJson: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.export.exportWorkspaceJson, input),
      exportProjectMarkdown: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.export.exportProjectMarkdown, input),
      exportTasksCsv: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.export.exportTasksCsv, input),
      exportPlanningSummaryMarkdown: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.export.exportPlanningSummaryMarkdown,
          input
        ),
      exportHtmlCsvTsvMarkdownBundle: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.export.exportHtmlCsvTsvMarkdownBundle,
          input
        )
    },
    print: {
      printPdf: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.print.printPdf, input)
    },
    appearance: {
      getSettings: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.appearance.getSettings, workspaceId),
      updateSettings: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.appearance.updateSettings, input)
    },
    privacy: {
      getSettings: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.privacy.getSettings, workspaceId),
      updateSettings: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.privacy.updateSettings, input)
    },
    diagnostics: {
      runWorkspaceIntegrityCheck: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.runWorkspaceIntegrityCheck,
          input
        ),
      repairAttachment: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.repairAttachment, input),
      runSavedViewDiagnostics: (workspaceId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.runSavedViewDiagnostics,
          workspaceId
        ),
      repairSavedViewQuery: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.repairSavedViewQuery, input),
      runMaintenanceJob: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.runMaintenanceJob, input),
      listMaintenanceJobs: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.diagnostics.listMaintenanceJobs, input)
    },
    navigation: {
      listRecentTargets: (workspaceId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.navigation.listRecentTargets,
          workspaceId
        ),
      recordTarget: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.navigation.recordTarget, input),
      listPinnedFavorites: (workspaceId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.navigation.listPinnedFavorites,
          workspaceId
        ),
      listAppTabs: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.navigation.listAppTabs, workspaceId),
      openAppTab: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.navigation.openAppTab, input),
      closeAppTab: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.navigation.closeAppTab, input),
      reorderAppTabs: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.navigation.reorderAppTabs, input),
      setActiveAppTab: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.navigation.setActiveAppTab, input)
    }
  };
}
