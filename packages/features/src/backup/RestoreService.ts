import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  SearchIndexService,
  TransactionService,
  WorkspaceSeedService,
  type DatabaseConnection
} from "@local-work-os/db";
import {
  ImportValidationService,
  type ImportValidationIssue,
  type ImportValidationSummary
} from "../import";
import type { WorkspaceExportV1 } from "../export";
import type { BackupManifest } from "./BackupManifest";

export type RestoreSourceType = "backup" | "workspace_export";

export type RestoreIssue = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

export type RestoreValidationSummary = {
  valid: boolean;
  sourceType: RestoreSourceType;
  sourcePath: string | null;
  workspace:
    | {
        id: string;
        name: string;
        schemaVersion: number | null;
      }
    | null;
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
  issues: RestoreIssue[];
};

export type ValidateRestoreSourceInput =
  | {
      sourceType: "backup";
      sourcePath?: string | null;
      manifest: BackupManifest;
      databaseSizeBytes?: number | null;
    }
  | {
      sourceType: "workspace_export";
      sourcePath?: string | null;
      exportData: unknown;
    };

export type RestoreResult = RestoreValidationSummary & {
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
  manifest: BackupManifest;
  sourcePath: string;
  targetWorkspaceRootPath: string;
  copiedAttachmentCount?: number;
  missingAttachmentCount?: number;
  actorType?: ActivityActorType;
};

export type RestoreExportToNewWorkspaceInput = {
  exportData: WorkspaceExportV1;
  sourcePath: string;
  targetWorkspaceRootPath: string;
  copiedAttachmentCount?: number;
  missingAttachmentCount?: number;
  actorType?: ActivityActorType;
};

export type RestoreServiceIdFactory = (prefix: string) => string;

export class RestoreService {
  readonly module = "backup";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: RestoreServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: RestoreServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  validateRestoreSource(
    input: ValidateRestoreSourceInput
  ): RestoreValidationSummary {
    if (input.sourceType === "backup") {
      return validateBackupSource(input);
    }

    return toRestoreValidationSummary(
      "workspace_export",
      new ImportValidationService().validateWorkspaceExportData(
        input.exportData,
        input.sourcePath ?? null
      ),
      input.sourcePath ?? null
    );
  }

  async restoreBackupToNewWorkspace(
    input: RestoreBackupToNewWorkspaceInput
  ): Promise<RestoreResult> {
    const validation = this.validateRestoreSource({
      sourceType: "backup",
      sourcePath: input.sourcePath,
      manifest: input.manifest
    });

    if (!validation.valid) {
      throw new Error("Backup source is not valid for restore.");
    }

    const restoredAt = createIsoTimestamp(this.now());
    const workspaceId = input.manifest.workspaceId;
    const searchIndex = await new TransactionService({
      connection: this.connection
    }).runInTransaction(() => {
      const indexResult = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).rebuildWorkspaceIndex(workspaceId);

      this.logRestoreActivity({
        workspaceId,
        actorType: input.actorType ?? "importer",
        action: ActivityAction.backupRestored,
        targetType: "backup",
        targetId: input.manifest.id,
        summary: `Restored backup into ${input.targetWorkspaceRootPath}.`,
        restoredAt,
        after: {
          sourcePath: input.sourcePath,
          targetWorkspaceRootPath: input.targetWorkspaceRootPath,
          copiedAttachmentCount: input.copiedAttachmentCount ?? 0,
          missingAttachmentCount: input.missingAttachmentCount ?? 0
        }
      });

      return indexResult;
    });

    return {
      ...validation,
      restoredAt,
      targetWorkspaceRootPath: input.targetWorkspaceRootPath,
      copiedAttachmentCount: input.copiedAttachmentCount ?? 0,
      missingAttachmentCount: input.missingAttachmentCount ?? 0,
      searchIndex
    };
  }

  async restoreExportToNewWorkspace(
    input: RestoreExportToNewWorkspaceInput
  ): Promise<RestoreResult> {
    const validation = this.validateRestoreSource({
      sourceType: "workspace_export",
      sourcePath: input.sourcePath,
      exportData: input.exportData
    });

    if (!validation.valid) {
      throw new Error("Workspace export source is not valid for restore.");
    }

    const restoredAt = createIsoTimestamp(this.now());
    const workspaceId = input.exportData.workspace.id;
    const searchIndex = await new TransactionService({
      connection: this.connection
    }).runInTransaction(() => {
      this.insertWorkspaceExport(input.exportData);

      new WorkspaceSeedService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).ensureWorkspaceSeed({
        workspaceId,
        workspaceName: input.exportData.workspace.name,
        schemaVersion: input.exportData.workspace.schemaVersion
      });

      const indexResult = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).rebuildWorkspaceIndex(workspaceId);

      this.logRestoreActivity({
        workspaceId,
        actorType: input.actorType ?? "importer",
        action: ActivityAction.exportRestored,
        targetType: "export",
        targetId: input.exportData.workspace.id,
        summary: `Restored workspace JSON export into ${input.targetWorkspaceRootPath}.`,
        restoredAt,
        after: {
          sourcePath: input.sourcePath,
          targetWorkspaceRootPath: input.targetWorkspaceRootPath,
          copiedAttachmentCount: input.copiedAttachmentCount ?? 0,
          missingAttachmentCount: input.missingAttachmentCount ?? 0,
          schemaVersion: input.exportData.schemaVersion
        }
      });

      return indexResult;
    });

    return {
      ...validation,
      restoredAt,
      targetWorkspaceRootPath: input.targetWorkspaceRootPath,
      copiedAttachmentCount: input.copiedAttachmentCount ?? 0,
      missingAttachmentCount: input.missingAttachmentCount ?? 0,
      searchIndex
    };
  }

  private insertWorkspaceExport(exportData: WorkspaceExportV1): void {
    insertRows(this.connection, "workspaces", [exportData.workspace], {
      id: "id",
      name: "name",
      schemaVersion: "schema_version",
      createdAt: "created_at",
      updatedAt: "updated_at"
    });
    insertRows(this.connection, "categories", exportData.data.categories, {
      id: "id",
      workspaceId: "workspace_id",
      name: "name",
      slug: "slug",
      color: "color",
      description: "description",
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at"
    });
    insertRows(this.connection, "containers", exportData.data.containers, {
      id: "id",
      workspaceId: "workspace_id",
      type: "type",
      name: "name",
      slug: "slug",
      description: "description",
      status: "status",
      categoryId: "category_id",
      color: "color",
      isFavorite: "is_favorite",
      isSystem: "is_system",
      sortOrder: "sort_order",
      createdAt: "created_at",
      updatedAt: "updated_at",
      archivedAt: "archived_at",
      deletedAt: "deleted_at"
    });
    insertRows(this.connection, "container_tabs", exportData.data.containerTabs, {
      id: "id",
      workspaceId: "workspace_id",
      containerId: "container_id",
      name: "name",
      description: "description",
      sortOrder: "sort_order",
      isDefault: "is_default",
      createdAt: "created_at",
      updatedAt: "updated_at",
      archivedAt: "archived_at",
      deletedAt: "deleted_at"
    });
    insertRows(this.connection, "items", exportData.data.items, {
      id: "id",
      workspaceId: "workspace_id",
      containerId: "container_id",
      containerTabId: "container_tab_id",
      type: "type",
      title: "title",
      body: "body",
      categoryId: "category_id",
      status: "status",
      sortOrder: "sort_order",
      pinned: "pinned",
      createdAt: "created_at",
      updatedAt: "updated_at",
      completedAt: "completed_at",
      archivedAt: "archived_at",
      deletedAt: "deleted_at"
    });
    insertRows(this.connection, "task_details", exportData.data.taskDetails, {
      itemId: "item_id",
      workspaceId: "workspace_id",
      taskStatus: "task_status",
      priority: "priority",
      startAt: "start_at",
      dueAt: "due_at",
      allDay: "all_day",
      timezone: "timezone",
      reminderPolicyId: "reminder_policy_id",
      recurrenceRuleId: "recurrence_rule_id",
      completedAt: "completed_at",
      createdAt: "created_at",
      updatedAt: "updated_at"
    });
    insertRows(this.connection, "note_details", exportData.data.noteDetails, {
      itemId: "item_id",
      workspaceId: "workspace_id",
      format: "format",
      content: "content",
      preview: "preview",
      createdAt: "created_at",
      updatedAt: "updated_at"
    });
    insertRows(this.connection, "list_details", exportData.data.listDetails, {
      itemId: "item_id",
      workspaceId: "workspace_id",
      displayMode: "display_mode",
      showCompleted: "show_completed",
      progressMode: "progress_mode",
      createdAt: "created_at",
      updatedAt: "updated_at"
    });
    insertRows(this.connection, "list_items", exportData.data.listItems, {
      id: "id",
      workspaceId: "workspace_id",
      listItemParentId: "list_item_parent_id",
      listId: "list_id",
      title: "title",
      body: "body",
      status: "status",
      depth: "depth",
      sortOrder: "sort_order",
      startAt: "start_at",
      dueAt: "due_at",
      completedAt: "completed_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
      archivedAt: "archived_at",
      deletedAt: "deleted_at"
    });
    insertRows(this.connection, "links", exportData.data.linkDetails, {
      itemId: "item_id",
      workspaceId: "workspace_id",
      url: "url",
      normalizedUrl: "normalized_url",
      title: "title",
      description: "description",
      domain: "domain",
      faviconPath: "favicon_path",
      previewImagePath: "preview_image_path",
      createdAt: "created_at",
      updatedAt: "updated_at"
    });
    insertRows(this.connection, "tags", exportData.data.tags, {
      id: "id",
      workspaceId: "workspace_id",
      name: "name",
      slug: "slug",
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at"
    });
    insertRows(this.connection, "taggings", exportData.data.taggings, {
      id: "id",
      workspaceId: "workspace_id",
      tagId: "tag_id",
      targetType: "target_type",
      targetId: "target_id",
      source: "source",
      createdAt: "created_at",
      deletedAt: "deleted_at"
    });
    insertRows(this.connection, "relationships", exportData.data.relationships, {
      id: "id",
      workspaceId: "workspace_id",
      sourceType: "source_type",
      sourceId: "source_id",
      targetType: "target_type",
      targetId: "target_id",
      relationType: "relation_type",
      label: "label",
      createdAt: "created_at",
      deletedAt: "deleted_at"
    });
    insertRows(this.connection, "saved_views", exportData.data.savedViews, {
      id: "id",
      workspaceId: "workspace_id",
      type: "type",
      name: "name",
      description: "description",
      queryJson: "query_json",
      displayJson: "display_json",
      isFavorite: "is_favorite",
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at"
    });
    insertRows(this.connection, "dashboards", exportData.data.dashboards, {
      id: "id",
      workspaceId: "workspace_id",
      name: "name",
      isDefault: "is_default",
      layoutJson: "layout_json",
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at"
    });
    insertRows(
      this.connection,
      "dashboard_widgets",
      exportData.data.dashboardWidgets,
      {
        id: "id",
        workspaceId: "workspace_id",
        dashboardId: "dashboard_id",
        type: "type",
        title: "title",
        savedViewId: "saved_view_id",
        configJson: "config_json",
        positionJson: "position_json",
        sortOrder: "sort_order",
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at"
      }
    );
    insertRows(this.connection, "daily_plans", exportData.data.dailyPlans, {
      id: "id",
      workspaceId: "workspace_id",
      planDate: "plan_date",
      createdAt: "created_at",
      updatedAt: "updated_at"
    });
    insertRows(
      this.connection,
      "daily_plan_items",
      exportData.data.dailyPlanItems,
      {
        id: "id",
        workspaceId: "workspace_id",
        dailyPlanId: "daily_plan_id",
        itemType: "item_type",
        itemId: "item_id",
        lane: "lane",
        sortOrder: "sort_order",
        addedManually: "added_manually",
        createdAt: "created_at",
        updatedAt: "updated_at"
      }
    );
    insertRows(
      this.connection,
      "attachments",
      exportData.attachmentManifest.attachments.map((attachment) => ({
        ...attachment,
        workspaceId: exportData.workspace.id,
        deletedAt: null
      })),
      {
        id: "id",
        workspaceId: "workspace_id",
        itemId: "item_id",
        originalName: "original_name",
        storedName: "stored_name",
        mimeType: "mime_type",
        sizeBytes: "size_bytes",
        checksum: "checksum",
        storagePath: "storage_path",
        description: "description",
        createdAt: "created_at",
        updatedAt: "updated_at",
        deletedAt: "deleted_at"
      }
    );
  }

  private logRestoreActivity(input: {
    workspaceId: string;
    actorType: ActivityActorType;
    action: typeof ActivityAction.backupRestored | typeof ActivityAction.exportRestored;
    targetType: "backup" | "export";
    targetId: string;
    summary: string;
    restoredAt: string;
    after: Record<string, unknown>;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      beforeJson: null,
      afterJson: JSON.stringify(input.after),
      timestamp: input.restoredAt
    });
  }
}

function validateBackupSource(input: {
  sourcePath?: string | null;
  manifest: BackupManifest;
  databaseSizeBytes?: number | null;
}): RestoreValidationSummary {
  const issues: RestoreIssue[] = [];

  if (input.manifest.kind !== "manual") {
    issues.push({
      severity: "error",
      code: "unsupported_backup_kind",
      path: "$.kind",
      message: "Only manual backup manifests can be restored."
    });
  }

  if (input.databaseSizeBytes !== undefined && input.databaseSizeBytes !== null) {
    if (input.databaseSizeBytes !== input.manifest.database.sizeBytes) {
      issues.push({
        severity: "warning",
        code: "database_size_mismatch",
        path: "$.database.sizeBytes",
        message: "Backup database size differs from the manifest size."
      });
    }
  }

  if (!isBackupRelativePath(input.manifest.database.backupRelativePath)) {
    issues.push({
      severity: "error",
      code: "unsafe_database_path",
      path: "$.database.backupRelativePath",
      message: "Backup database path must stay inside the backup snapshot."
    });
  }

  const totalAttachmentBytes = input.manifest.attachments.reduce(
    (total, attachment) => total + attachment.sizeBytes,
    0
  );

  if (input.manifest.attachmentCount !== input.manifest.attachments.length) {
    issues.push({
      severity: "error",
      code: "attachment_count_mismatch",
      path: "$.attachmentCount",
      message: "Backup manifest attachmentCount must match attachment entries."
    });
  }

  if (input.manifest.totalAttachmentBytes !== totalAttachmentBytes) {
    issues.push({
      severity: "error",
      code: "attachment_total_mismatch",
      path: "$.totalAttachmentBytes",
      message: "Backup manifest totalAttachmentBytes must match attachment entries."
    });
  }

  for (const [index, attachment] of input.manifest.attachments.entries()) {
    if (!isAttachmentRelativePath(attachment.storagePath)) {
      issues.push({
        severity: "error",
        code: "unsafe_attachment_path",
        path: `$.attachments[${index}].storagePath`,
        message: "Attachment storage paths must stay inside workspace attachments."
      });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    sourceType: "backup",
    sourcePath: input.sourcePath ?? null,
    workspace: {
      id: input.manifest.workspaceId,
      name: input.manifest.workspaceName,
      schemaVersion: null
    },
    counts: {
      containers: 0,
      items: 0,
      listItems: 0,
      attachments: input.manifest.attachmentCount
    },
    targetPolicy: newWorkspaceOnlyPolicy(),
    issues
  };
}

function toRestoreValidationSummary(
  sourceType: RestoreSourceType,
  summary: ImportValidationSummary,
  sourcePath: string | null
): RestoreValidationSummary {
  return {
    valid: summary.valid,
    sourceType,
    sourcePath,
    workspace:
      summary.workspace === null
        ? null
        : {
            id: summary.workspace.id,
            name: summary.workspace.name,
            schemaVersion: summary.workspace.schemaVersion
          },
    counts: {
      containers: summary.counts.containers,
      items: summary.counts.items,
      listItems: summary.counts.listItems,
      attachments: summary.counts.attachments
    },
    targetPolicy: newWorkspaceOnlyPolicy(),
    issues: summary.issues.map(importIssueToRestoreIssue)
  };
}

function importIssueToRestoreIssue(issue: ImportValidationIssue): RestoreIssue {
  return {
    severity: issue.severity,
    code: issue.code,
    path: issue.path,
    message: issue.message
  };
}

function newWorkspaceOnlyPolicy(): RestoreValidationSummary["targetPolicy"] {
  return {
    mode: "new_workspace_only",
    canApplyToActiveWorkspace: false,
    message:
      "Restore always creates a new local workspace folder and never overwrites the active workspace."
  };
}

function insertRows(
  connection: DatabaseConnection,
  tableName: string,
  records: ReadonlyArray<object>,
  columnMap: Record<string, string>
): void {
  const entries = Object.entries(columnMap);

  if (records.length === 0) {
    return;
  }

  const columns = entries.map(([, column]) => column);
  const placeholders = columns.map(() => "?").join(", ");
  const statement = connection.sqlite.prepare(
    `insert into ${tableName} (${columns.join(", ")}) values (${placeholders})`
  );

  for (const record of records) {
    const row = record as Record<string, unknown>;
    statement.run(...entries.map(([key]) => sqliteValue(row[key])));
  }
}

function sqliteValue(value: unknown): unknown {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  return value;
}

function isBackupRelativePath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");

  return (
    normalized.startsWith("backups/") &&
    !normalized.startsWith("/") &&
    !/^[a-zA-Z]:/.test(normalized) &&
    normalized.split("/").every((segment) => segment !== "." && segment !== "..")
  );
}

function isAttachmentRelativePath(value: string): boolean {
  const normalized = value.replace(/\\/g, "/");

  return (
    normalized.startsWith("attachments/") &&
    !normalized.startsWith("/") &&
    !/^[a-zA-Z]:/.test(normalized) &&
    normalized.split("/").every((segment) => segment !== "." && segment !== "..")
  );
}
