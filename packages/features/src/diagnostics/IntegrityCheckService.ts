import type { FeatureModuleContract } from "../featureModuleContract";
import { AttachmentIntegrityService } from "./AttachmentIntegrityService";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type RelationshipObjectType,
  type TaggingTargetType
} from "@local-work-os/core";
import {
  ActivityLogService,
  AttachmentRepository,
  ContainerRepository,
  ContainerTabRepository,
  DashboardRepository,
  DEFAULT_DASHBOARD_WIDGET_TYPES,
  ItemRepository,
  LinkRepository,
  ListRepository,
  NoteRepository,
  RelationshipRepository,
  SearchIndexService,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  WorkspaceSeedService,
  type ContainerRecord,
  type DatabaseConnection,
  type ItemRecord,
  type ListItemRecord,
  type SearchIndexHealthReport
} from "@local-work-os/db";

export type IntegrityIssueSeverity = "error" | "warning";

export type IntegrityCheckStatus = "healthy" | "degraded";

export type IntegrityCheckKind =
  | "system_rows"
  | "typed_item_details"
  | "taggings"
  | "relationships"
  | "attachments"
  | "attachment_duplicates"
  | "search_index";

export type IntegrityCheckIssue = {
  severity: IntegrityIssueSeverity;
  code: string;
  message: string;
  targetType: string;
  targetId: string;
  relatedType: string | null;
  relatedId: string | null;
};

export type IntegrityCheckSection = {
  kind: IntegrityCheckKind;
  title: string;
  status: IntegrityCheckStatus;
  checkedCount: number;
  issueCount: number;
  issues: IntegrityCheckIssue[];
};

export type WorkspaceIntegrityReport = {
  workspaceId: string;
  generatedAt: string;
  status: IntegrityCheckStatus;
  checkedCount: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  sections: IntegrityCheckSection[];
};

export type IntegrityFileSystemAdapter = {
  workspacePathExists: (workspaceRelativePath: string) => Promise<boolean>;
  workspaceFileChecksum?: (workspaceRelativePath: string) => Promise<string>;
};

export type RepairSystemRowsResult = {
  workspaceId: string;
  repaired: boolean;
  created: {
    systemInbox: boolean;
    systemInboxDefaultTab: boolean;
    defaultDashboard: boolean;
    defaultDashboardWidgetCount: number;
    defaultSettingCount: number;
  };
};

export type IntegrityCheckServiceIdFactory = (prefix: string) => string;

// Coordinates read-only workspace consistency checks for local maintenance UI.
export class IntegrityCheckService {
  readonly module = "diagnostics";

  private readonly connection: DatabaseConnection;
  private readonly fileSystem: IntegrityFileSystemAdapter | undefined;
  private readonly idFactory: IntegrityCheckServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    fileSystem?: IntegrityFileSystemAdapter;
    idFactory?: IntegrityCheckServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.fileSystem = input.fileSystem;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  async runWorkspaceIntegrityCheck(
    workspaceId: string
  ): Promise<WorkspaceIntegrityReport> {
    validateNonEmptyString(workspaceId, "workspaceId");

    const sections = [
      this.checkSystemRows(workspaceId),
      this.checkTypedItemDetails(workspaceId),
      this.checkTaggings(workspaceId),
      this.checkRelationships(workspaceId),
      await this.checkAttachmentFiles(workspaceId),
      this.checkAttachmentDuplicates(workspaceId),
      this.checkSearchIndexConsistency(workspaceId)
    ];
    const issueCount = sections.reduce(
      (total, section) => total + section.issueCount,
      0
    );
    const errorCount = sections.reduce(
      (total, section) =>
        total +
        section.issues.filter((issue) => issue.severity === "error").length,
      0
    );
    const warningCount = issueCount - errorCount;

    return {
      workspaceId,
      generatedAt: createIsoTimestamp(this.now()),
      status: issueCount === 0 ? "healthy" : "degraded",
      checkedCount: sections.reduce(
        (total, section) => total + section.checkedCount,
        0
      ),
      issueCount,
      errorCount,
      warningCount,
      sections
    };
  }

  checkSearchIndexConsistency(workspaceId: string): IntegrityCheckSection {
    validateNonEmptyString(workspaceId, "workspaceId");

    return toSearchIndexSection(
      new SearchIndexService({ connection: this.connection }).getSearchIndexHealth(
        workspaceId
      )
    );
  }

  async checkAttachmentFiles(
    workspaceId: string
  ): Promise<IntegrityCheckSection> {
    validateNonEmptyString(workspaceId, "workspaceId");

    const attachments = new AttachmentRepository(
      this.connection
    ).listByWorkspace({
      workspaceId
    });
    const issues: IntegrityCheckIssue[] = [];
    const itemsById = new Map(
      new ItemRepository(this.connection)
        .listByWorkspace(workspaceId, {
          includeArchived: true,
          includeDeleted: true
        })
        .map((item) => [item.id, item])
    );

    for (const attachment of attachments) {
      const item = itemsById.get(attachment.itemId);

      if (item === undefined || item.deletedAt !== null) {
        issues.push(
          createIssue({
            code: "attachment_source_missing",
            message: `Attachment ${attachment.id} references missing item ${attachment.itemId}.`,
            targetType: "attachment",
            targetId: attachment.id,
            relatedType: "item",
            relatedId: attachment.itemId
          })
        );
      }

      if (this.fileSystem === undefined) {
        continue;
      }

      let exists = false;

      try {
        exists = await this.fileSystem.workspacePathExists(attachment.storagePath);
      } catch {
        issues.push(
          createIssue({
            code: "attachment_path_invalid",
            message: `Attachment ${attachment.id} has an invalid workspace path.`,
            targetType: "attachment",
            targetId: attachment.id,
            relatedType: "path",
            relatedId: attachment.storagePath
          })
        );
        continue;
      }

      if (!exists) {
        issues.push(
          createIssue({
            code: "attachment_file_missing",
            message: `Attachment file is missing at ${attachment.storagePath}.`,
            targetType: "attachment",
            targetId: attachment.id,
            relatedType: "path",
            relatedId: attachment.storagePath
          })
        );
      }

      if (exists && this.fileSystem.workspaceFileChecksum !== undefined && attachment.checksum !== null) {
        const actualChecksum = await this.fileSystem.workspaceFileChecksum(attachment.storagePath);

        if (actualChecksum.toLowerCase() !== attachment.checksum.toLowerCase()) {
          issues.push(
            createIssue({
              code: "attachment_checksum_mismatch",
              message: `Attachment file checksum does not match stored metadata at ${attachment.storagePath}.`,
              targetType: "attachment",
              targetId: attachment.id,
              relatedType: "checksum",
              relatedId: attachment.checksum
            })
          );
        }
      }
    }

    return createSection({
      kind: "attachments",
      title: "Attachment files",
      checkedCount: attachments.length,
      issues
    });
  }


  checkAttachmentDuplicates(workspaceId: string): IntegrityCheckSection {
    validateNonEmptyString(workspaceId, "workspaceId");

    const attachments = new AttachmentRepository(this.connection).listByWorkspace({
      workspaceId
    });
    const duplicateGroups = new AttachmentIntegrityService({
      connection: this.connection
    }).listDuplicateChecksumGroups(workspaceId);
    const issues: IntegrityCheckIssue[] = [];

    for (const { checksum, attachments: groupedAttachments } of duplicateGroups) {

      const attachmentIds = groupedAttachments.map((attachment) => attachment.id);

      for (const attachment of groupedAttachments) {
        issues.push(
          createIssue({
            severity: "warning",
            code: "attachment_checksum_duplicate",
            message: `Attachment ${attachment.id} shares checksum ${checksum} with ${attachmentIds.filter((id) => id !== attachment.id).join(", ")}.`,
            targetType: "attachment",
            targetId: attachment.id,
            relatedType: "checksum",
            relatedId: checksum
          })
        );
      }
    }

    return createSection({
      kind: "attachment_duplicates",
      title: "Attachment duplicates",
      checkedCount: attachments.filter(
        (attachment) => (attachment.checksum?.trim().length ?? 0) > 0
      ).length,
      issues
    });
  }

  repairSystemRows(workspaceId: string): RepairSystemRowsResult {
    validateNonEmptyString(workspaceId, "workspaceId");

    const workspace = new WorkspaceRepository(this.connection).findById(workspaceId);

    if (workspace === null) {
      throw new Error(`Workspace was not found: ${workspaceId}.`);
    }

    const before = this.checkSystemRows(workspaceId);
    const seed = new WorkspaceSeedService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).ensureWorkspaceSeed({
      workspaceId,
      workspaceName: workspace.name,
      schemaVersion: workspace.schemaVersion
    });
    const created = {
      systemInbox: seed.systemInbox.created,
      systemInboxDefaultTab: seed.systemInboxDefaultTab.created,
      defaultDashboard: seed.defaultDashboard.created,
      defaultDashboardWidgetCount: seed.defaultDashboardWidgets.filter(
        (widget) => widget.created
      ).length,
      defaultSettingCount: seed.defaultSettings.filter((setting) => setting.created)
        .length
    };
    const repaired =
      created.systemInbox ||
      created.systemInboxDefaultTab ||
      created.defaultDashboard ||
      created.defaultDashboardWidgetCount > 0 ||
      created.defaultSettingCount > 0;

    if (repaired) {
      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId,
        actorType: "system",
        action: ActivityAction.systemRowsRepaired,
        targetType: "workspace",
        targetId: workspaceId,
        summary: "Repaired required workspace system rows.",
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(created),
        timestamp: createIsoTimestamp(this.now())
      });
    }

    return {
      workspaceId,
      repaired,
      created
    };
  }

  private checkSystemRows(workspaceId: string): IntegrityCheckSection {
    const containerRepository = new ContainerRepository(this.connection);
    const dashboardRepository = new DashboardRepository(this.connection);
    const inbox = containerRepository.findSystemInbox(workspaceId);
    const dashboard = dashboardRepository.findDefaultDashboard(workspaceId);
    const issues: IntegrityCheckIssue[] = [];
    let checkedCount = 2;

    if (inbox === null) {
      issues.push(
        createIssue({
          code: "system_inbox_missing",
          message: "System Inbox row is missing.",
          targetType: "container",
          targetId: "inbox",
          relatedType: "workspace",
          relatedId: workspaceId
        })
      );
    } else {
      checkedCount += 1;

      if (new ContainerTabRepository(this.connection).findDefaultTab(inbox.id) === null) {
        issues.push(
          createIssue({
            code: "system_inbox_default_tab_missing",
            message: "System Inbox default tab is missing.",
            targetType: "container_tab",
            targetId: "default",
            relatedType: "container",
            relatedId: inbox.id
          })
        );
      }
    }

    if (dashboard === null) {
      issues.push(
        createIssue({
          code: "default_dashboard_missing",
          message: "Default dashboard row is missing.",
          targetType: "dashboard",
          targetId: "default",
          relatedType: "workspace",
          relatedId: workspaceId
        })
      );
    } else {
      const widgets = dashboardRepository.listWidgetsByDashboard(dashboard.id);
      checkedCount += DEFAULT_DASHBOARD_WIDGET_TYPES.length;

      for (const widgetType of DEFAULT_DASHBOARD_WIDGET_TYPES) {
        if (widgets.some((widget) => widget.type === widgetType)) {
          continue;
        }

        issues.push(
          createIssue({
            code: "default_dashboard_widget_missing",
            message: `Default dashboard widget ${widgetType} is missing.`,
            targetType: "dashboard_widget",
            targetId: widgetType,
            relatedType: "dashboard",
            relatedId: dashboard.id
          })
        );
      }
    }

    return createSection({
      kind: "system_rows",
      title: "System rows",
      checkedCount,
      issues
    });
  }

  private checkTypedItemDetails(workspaceId: string): IntegrityCheckSection {
    const items = new ItemRepository(this.connection).listByWorkspace(workspaceId, {
      includeArchived: true,
      includeDeleted: true
    });
    const itemTargets = new TargetLookup({
      containers: [],
      items,
      listItems: []
    });
    const taskIds = new Set(
      new TaskRepository(this.connection)
        .listDetailsByWorkspace(workspaceId)
        .map((task) => task.itemId)
    );
    const listIds = new Set(
      new ListRepository(this.connection)
        .listDetailsByWorkspace(workspaceId)
        .map((list) => list.itemId)
    );
    const noteIds = new Set(
      new NoteRepository(this.connection)
        .listByWorkspace(workspaceId, {
          includeArchived: true,
          includeDeleted: true
        })
        .map(({ note }) => note.itemId)
    );
    const linkIds = new Set(
      new LinkRepository(this.connection)
        .listByWorkspace(workspaceId, {
          includeArchived: true,
          includeDeleted: true
        })
        .map(({ link }) => link.itemId)
    );
    const attachments = new AttachmentRepository(
      this.connection
    ).listByWorkspace({
      workspaceId,
      includeDeleted: true
    });
    const fileItemIds = new Set(attachments.map((attachment) => attachment.itemId));
    const issues: IntegrityCheckIssue[] = [];

    for (const item of items) {
      if (!requiresTypedDetails(item)) {
        continue;
      }

      const detailExists =
        (item.type === "task" && taskIds.has(item.id)) ||
        (item.type === "list" && listIds.has(item.id)) ||
        (item.type === "note" && noteIds.has(item.id)) ||
        (item.type === "link" && linkIds.has(item.id)) ||
        (item.type === "file" && fileItemIds.has(item.id));

      if (!detailExists) {
        issues.push(
          createIssue({
            code: `${item.type}_details_missing`,
            message: `Item ${item.id} of type ${item.type} is missing its detail row.`,
            targetType: "item",
            targetId: item.id,
            relatedType: `${item.type}_details`,
            relatedId: item.id
          })
        );
      }
    }

    for (const attachment of attachments) {
      if (!itemTargets.hasExisting("item", attachment.itemId)) {
        issues.push(
          createIssue({
            code: "file_details_orphaned",
            message: `Attachment ${attachment.id} references missing file item ${attachment.itemId}.`,
            targetType: "attachment",
            targetId: attachment.id,
            relatedType: "item",
            relatedId: attachment.itemId
          })
        );
      }
    }

    return createSection({
      kind: "typed_item_details",
      title: "Typed item details",
      checkedCount: items.filter(requiresTypedDetails).length + attachments.length,
      issues
    });
  }

  private checkTaggings(workspaceId: string): IntegrityCheckSection {
    const tagsById = new Map(
      new TagRepository(this.connection)
        .listByWorkspace(workspaceId, { includeDeleted: true })
        .map((tag) => [tag.id, tag])
    );
    const taggings = new TagRepository(this.connection).listTaggingsByWorkspace(
      workspaceId
    );
    const targets = this.createTargetLookup(workspaceId);
    const issues: IntegrityCheckIssue[] = [];

    for (const tagging of taggings) {
      const tag = tagsById.get(tagging.tagId);

      if (tag === undefined || tag.deletedAt !== null) {
        issues.push(
          createIssue({
            code: "tagging_tag_missing",
            message: `Tagging ${tagging.id} references missing tag ${tagging.tagId}.`,
            targetType: "tagging",
            targetId: tagging.id,
            relatedType: "tag",
            relatedId: tagging.tagId
          })
        );
      }

      if (!targets.hasActive(tagging.targetType, tagging.targetId)) {
        issues.push(
          createIssue({
            code: "tagging_target_missing",
            message: `Tagging ${tagging.id} references missing ${tagging.targetType} ${tagging.targetId}.`,
            targetType: "tagging",
            targetId: tagging.id,
            relatedType: tagging.targetType,
            relatedId: tagging.targetId
          })
        );
      }
    }

    return createSection({
      kind: "taggings",
      title: "Taggings",
      checkedCount: taggings.length,
      issues
    });
  }

  private checkRelationships(workspaceId: string): IntegrityCheckSection {
    const relationships = new RelationshipRepository(
      this.connection
    ).listByWorkspace(workspaceId);
    const targets = this.createTargetLookup(workspaceId);
    const issues: IntegrityCheckIssue[] = [];

    for (const relationship of relationships) {
      for (const side of ["source", "target"] as const) {
        const targetType =
          side === "source" ? relationship.sourceType : relationship.targetType;
        const targetId =
          side === "source" ? relationship.sourceId : relationship.targetId;

        if (targets.hasActive(targetType, targetId)) {
          continue;
        }

        issues.push(
          createIssue({
            code: `relationship_${side}_missing`,
            message: `Relationship ${relationship.id} references missing ${side} ${targetType} ${targetId}.`,
            targetType: "relationship",
            targetId: relationship.id,
            relatedType: targetType,
            relatedId: targetId
          })
        );
      }
    }

    return createSection({
      kind: "relationships",
      title: "Relationships",
      checkedCount: relationships.length,
      issues
    });
  }

  private createTargetLookup(workspaceId: string): TargetLookup {
    return new TargetLookup({
      containers: new ContainerRepository(this.connection).listByWorkspace(
        workspaceId,
        {
          includeArchived: true,
          includeDeleted: true
        }
      ),
      items: new ItemRepository(this.connection).listByWorkspace(workspaceId, {
        includeArchived: true,
        includeDeleted: true
      }),
      listItems: new ListRepository(this.connection).listItemsByWorkspace(
        workspaceId,
        {
          includeArchived: true,
          includeDeleted: true
        }
      )
    });
  }
}

export const diagnosticsModuleContract = {
  module: "diagnostics",
  purpose: "Run local workspace data integrity and search consistency checks.",
  owns: [
    "workspace integrity reports",
    "search consistency diagnostics",
    "attachment presence diagnostics"
  ],
  doesNotOwn: [
    "direct renderer filesystem access",
    "cloud diagnostics",
    "destructive repair flows"
  ],
  integrationPoints: ["database services", "search", "files", "settings"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

class TargetLookup {
  private readonly containers: Map<string, ContainerRecord>;
  private readonly items: Map<string, ItemRecord>;
  private readonly listItems: Map<string, ListItemRecord>;

  constructor(input: {
    containers: ContainerRecord[];
    items: ItemRecord[];
    listItems: ListItemRecord[];
  }) {
    this.containers = new Map(input.containers.map((target) => [target.id, target]));
    this.items = new Map(input.items.map((target) => [target.id, target]));
    this.listItems = new Map(input.listItems.map((target) => [target.id, target]));
  }

  hasActive(targetType: TaggingTargetType | RelationshipObjectType, id: string): boolean {
    const target = this.get(targetType, id);
    return target !== undefined && target.deletedAt === null;
  }

  hasExisting(targetType: TaggingTargetType | RelationshipObjectType, id: string): boolean {
    return this.get(targetType, id) !== undefined;
  }

  private get(
    targetType: TaggingTargetType | RelationshipObjectType,
    id: string
  ): ContainerRecord | ItemRecord | ListItemRecord | undefined {
    switch (targetType) {
      case "container":
        return this.containers.get(id);
      case "item":
        return this.items.get(id);
      case "list_item":
        return this.listItems.get(id);
    }
  }
}

function toSearchIndexSection(
  report: SearchIndexHealthReport
): IntegrityCheckSection {
  const issues: IntegrityCheckIssue[] = [
    ...report.missingTargets.map((target) =>
      createIssue({
        code: "search_record_missing",
        message: `Search index is missing ${target.targetType} ${target.targetId}.`,
        targetType: target.targetType,
        targetId: target.targetId,
        relatedType: "search_index",
        relatedId: null
      })
    ),
    ...report.orphanedTargets.map((target) =>
      createIssue({
        code: "search_record_orphaned",
        message: `Search index has stale ${target.targetType} ${target.targetId}.`,
        targetType: "search_index",
        targetId: `${target.targetType}:${target.targetId}`,
        relatedType: target.targetType,
        relatedId: target.targetId
      })
    ),
    ...report.deletedFlagMismatches.map((target) =>
      createIssue({
        code: "search_deleted_flag_mismatch",
        message: `Search index deleted flag is stale for ${target.targetType} ${target.targetId}.`,
        targetType: "search_index",
        targetId: `${target.targetType}:${target.targetId}`,
        relatedType: target.targetType,
        relatedId: target.targetId
      })
    )
  ];

  return createSection({
    kind: "search_index",
    title: "Search index",
    checkedCount:
      report.containerSourceCount +
      report.itemSourceCount +
      report.listItemSourceCount +
      report.attachmentSourceCount,
    issues
  });
}

function createSection(input: {
  kind: IntegrityCheckKind;
  title: string;
  checkedCount: number;
  issues: IntegrityCheckIssue[];
}): IntegrityCheckSection {
  return {
    kind: input.kind,
    title: input.title,
    status: input.issues.length === 0 ? "healthy" : "degraded",
    checkedCount: input.checkedCount,
    issueCount: input.issues.length,
    issues: input.issues
  };
}

function createIssue(input: {
  code: string;
  message: string;
  targetType: string;
  targetId: string;
  relatedType?: string | null;
  relatedId?: string | null;
  severity?: IntegrityIssueSeverity;
}): IntegrityCheckIssue {
  return {
    severity: input.severity ?? "error",
    code: input.code,
    message: input.message,
    targetType: input.targetType,
    targetId: input.targetId,
    relatedType: input.relatedType ?? null,
    relatedId: input.relatedId ?? null
  };
}

function requiresTypedDetails(item: ItemRecord): item is ItemRecord & {
  type: "task" | "list" | "note" | "file" | "link";
} {
  return (
    item.type === "task" ||
    item.type === "list" ||
    item.type === "note" ||
    item.type === "file" ||
    item.type === "link"
  );
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
