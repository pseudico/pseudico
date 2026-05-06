import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  AttachmentRepository,
  CategoryRepository,
  ContainerRepository,
  ContainerTabRepository,
  DailyPlanRepository,
  DashboardRepository,
  ItemRepository,
  LinkRepository,
  ListRepository,
  NoteRepository,
  RelationshipRepository,
  SavedViewRepository,
  TagRepository,
  TaskRepository,
  WorkspaceRepository,
  type CategoryRecord,
  type ContainerRecord,
  type ContainerTabRecord,
  type DailyPlanItemRecord,
  type DailyPlanRecord,
  type DashboardRecord,
  type DashboardWidgetRecord,
  type DatabaseConnection,
  type ItemRecord,
  type LinkRecord,
  type ListDetailsRecord,
  type ListItemRecord,
  type NoteDetailsRecord,
  type RelationshipRecord,
  type SavedViewRecord,
  type TagRecord,
  type TaggingRecord,
  type TaskRecord
} from "@local-work-os/db";
import {
  createAttachmentManifest,
  WORKSPACE_EXPORT_SCHEMA_VERSION,
  type WorkspaceExportV1
} from "./WorkspaceExportV1";

// Owns export orchestration application contracts.
// Does not own backup lifecycle or direct renderer filesystem writes.
export type ExportServiceIdFactory = (prefix: string) => string;

export type ExportFileSystemAdapter = {
  writeJsonExport: (input: {
    exportRelativePath: string;
    contents: string;
  }) => Promise<{ sizeBytes: number }>;
};

export type BuildWorkspaceExportInput = {
  workspaceId: string;
};

export type WriteExportFileInput = {
  exportRelativePath: string;
  exportData: WorkspaceExportV1;
};

export type ExportWorkspaceJsonInput = BuildWorkspaceExportInput & {
  exportRelativePath?: string;
  actorType?: ActivityActorType;
};

export type WorkspaceJsonExportResult = {
  id: string;
  workspaceId: string;
  createdAt: string;
  relativePath: string;
  sizeBytes: number;
  schemaVersion: typeof WORKSPACE_EXPORT_SCHEMA_VERSION;
  itemCount: number;
  attachmentCount: number;
  totalAttachmentBytes: number;
};

export class ExportService {
  readonly module = "export";

  private readonly connection: DatabaseConnection;
  private readonly fileSystem: ExportFileSystemAdapter;
  private readonly idFactory: ExportServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    fileSystem: ExportFileSystemAdapter;
    idFactory?: ExportServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.fileSystem = input.fileSystem;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  buildWorkspaceExport(input: BuildWorkspaceExportInput): WorkspaceExportV1 {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    const workspace = new WorkspaceRepository(this.connection).getById(
      input.workspaceId
    );

    if (workspace === null) {
      throw new Error(`Workspace row was not found: ${input.workspaceId}.`);
    }

    const attachments = new AttachmentRepository(
      this.connection
    ).listByWorkspace({
      workspaceId: input.workspaceId
    });
    const noteDetails = new NoteRepository(this.connection)
      .listByWorkspace(input.workspaceId, { includeArchived: true })
      .map(({ note }) => note);
    const linkDetails = new LinkRepository(this.connection)
      .listByWorkspace(input.workspaceId, { includeArchived: true })
      .map(({ link }) => link);
    const dashboardRepository = new DashboardRepository(this.connection);
    const dailyPlanRepository = new DailyPlanRepository(this.connection);

    return {
      schemaVersion: WORKSPACE_EXPORT_SCHEMA_VERSION,
      exportedAt: createIsoTimestamp(this.now()),
      workspace,
      data: {
        containers: sortContainers(
          new ContainerRepository(this.connection).listByWorkspace(
            input.workspaceId,
            {
              includeArchived: true
            }
          )
        ),
        containerTabs: sortContainerTabs(
          new ContainerTabRepository(this.connection).listByWorkspace(
            input.workspaceId
          )
        ),
        items: sortItems(
          new ItemRepository(this.connection).listByWorkspace(input.workspaceId, {
            includeArchived: true
          })
        ),
        taskDetails: sortTaskDetails(
          new TaskRepository(this.connection).listDetailsByWorkspace(
            input.workspaceId
          )
        ),
        noteDetails: sortNoteDetails(noteDetails),
        listDetails: sortListDetails(
          new ListRepository(this.connection).listDetailsByWorkspace(
            input.workspaceId
          )
        ),
        listItems: sortListItems(
          new ListRepository(this.connection).listItemsByWorkspace(
            input.workspaceId,
            { includeArchived: true }
          )
        ),
        linkDetails: sortLinkDetails(linkDetails),
        tags: sortTags(
          new TagRepository(this.connection).listByWorkspace(input.workspaceId)
        ),
        taggings: sortTaggings(
          new TagRepository(this.connection).listTaggingsByWorkspace(
            input.workspaceId
          )
        ),
        categories: sortCategories(
          new CategoryRepository(this.connection).listByWorkspace(
            input.workspaceId
          )
        ),
        relationships: sortRelationships(
          new RelationshipRepository(this.connection).listByWorkspace(
            input.workspaceId
          )
        ),
        savedViews: sortSavedViews(
          new SavedViewRepository(this.connection).listByWorkspace(
            input.workspaceId
          )
        ),
        dashboards: sortDashboards(
          dashboardRepository.listByWorkspace(input.workspaceId)
        ),
        dashboardWidgets: sortDashboardWidgets(
          dashboardRepository.listWidgetsByWorkspace(input.workspaceId)
        ),
        dailyPlans: sortDailyPlans(
          dailyPlanRepository.listPlansByWorkspace(input.workspaceId)
        ),
        dailyPlanItems: sortDailyPlanItems(
          dailyPlanRepository.listPlanItemsByWorkspace(input.workspaceId)
        )
      },
      attachmentManifest: createAttachmentManifest(attachments)
    };
  }

  async writeExportFile(input: WriteExportFileInput): Promise<{
    relativePath: string;
    sizeBytes: number;
  }> {
    validateExportRelativePath(input.exportRelativePath, "exportRelativePath");

    const written = await this.fileSystem.writeJsonExport({
      exportRelativePath: input.exportRelativePath,
      contents: `${JSON.stringify(input.exportData, null, 2)}\n`
    });

    return {
      relativePath: input.exportRelativePath,
      sizeBytes: written.sizeBytes
    };
  }

  async exportWorkspaceJson(
    input: ExportWorkspaceJsonInput
  ): Promise<WorkspaceJsonExportResult> {
    const exportData = this.buildWorkspaceExport(input);
    const exportId = this.idFactory("export");
    const createdAt = exportData.exportedAt;
    const exportRelativePath =
      input.exportRelativePath ?? createExportRelativePath(createdAt);
    const written = await this.writeExportFile({
      exportRelativePath,
      exportData
    });

    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.exportCreated,
      targetType: "export",
      targetId: exportId,
      summary: `Created workspace JSON export ${written.relativePath}.`,
      beforeJson: null,
      afterJson: JSON.stringify({
        export: {
          id: exportId,
          relativePath: written.relativePath,
          sizeBytes: written.sizeBytes,
          schemaVersion: exportData.schemaVersion,
          itemCount: exportData.data.items.length,
          attachmentCount: exportData.attachmentManifest.attachmentCount,
          totalAttachmentBytes:
            exportData.attachmentManifest.totalAttachmentBytes
        }
      }),
      timestamp: createdAt
    });

    return {
      id: exportId,
      workspaceId: input.workspaceId,
      createdAt,
      relativePath: written.relativePath,
      sizeBytes: written.sizeBytes,
      schemaVersion: exportData.schemaVersion,
      itemCount: exportData.data.items.length,
      attachmentCount: exportData.attachmentManifest.attachmentCount,
      totalAttachmentBytes: exportData.attachmentManifest.totalAttachmentBytes
    };
  }
}

export const exportModuleContract = {
  module: "export",
  purpose: "Coordinate local JSON, Markdown, CSV/TSV, and manifest exports.",
  owns: ["export orchestration", "portable output contracts", "export validation"],
  doesNotOwn: ["backup lifecycle", "import/restore behavior", "direct renderer filesystem writes"],
  integrationPoints: ["workspace", "projects", "contacts", "tasks", "notes", "files", "links", "metadata"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function createExportRelativePath(createdAt: string): string {
  return `exports/${createdAt.replace(/[:.]/g, "-")}-workspace-export.json`;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function validateExportRelativePath(value: string, fieldName: string): void {
  validateNonEmptyString(value, fieldName);

  const normalized = value.replace(/\\/g, "/");

  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`${fieldName} must be workspace-relative.`);
  }

  if (!normalized.startsWith("exports/") || !normalized.endsWith(".json")) {
    throw new Error(`${fieldName} must be a JSON file inside workspace exports.`);
  }
}

function sortContainers(records: ContainerRecord[]): ContainerRecord[] {
  return [...records].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}

function sortContainerTabs(records: ContainerTabRecord[]): ContainerTabRecord[] {
  return [...records].sort(
    (left, right) =>
      left.containerId.localeCompare(right.containerId) ||
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}

function sortItems(records: ItemRecord[]): ItemRecord[] {
  return [...records].sort(
    (left, right) =>
      left.containerId.localeCompare(right.containerId) ||
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}

function sortTaskDetails(records: TaskRecord[]): TaskRecord[] {
  return [...records].sort((left, right) =>
    left.itemId.localeCompare(right.itemId)
  );
}

function sortNoteDetails(records: NoteDetailsRecord[]): NoteDetailsRecord[] {
  return [...records].sort((left, right) =>
    left.itemId.localeCompare(right.itemId)
  );
}

function sortListDetails(records: ListDetailsRecord[]): ListDetailsRecord[] {
  return [...records].sort((left, right) =>
    left.itemId.localeCompare(right.itemId)
  );
}

function sortListItems(records: ListItemRecord[]): ListItemRecord[] {
  return [...records].sort(
    (left, right) =>
      left.listId.localeCompare(right.listId) ||
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}

function sortLinkDetails(records: LinkRecord[]): LinkRecord[] {
  return [...records].sort((left, right) =>
    left.itemId.localeCompare(right.itemId)
  );
}

function sortTags(records: TagRecord[]): TagRecord[] {
  return [...records].sort(
    (left, right) =>
      left.slug.localeCompare(right.slug) || left.id.localeCompare(right.id)
  );
}

function sortTaggings(records: TaggingRecord[]): TaggingRecord[] {
  return [...records].sort(
    (left, right) =>
      left.targetType.localeCompare(right.targetType) ||
      left.targetId.localeCompare(right.targetId) ||
      left.tagId.localeCompare(right.tagId) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}

function sortCategories(records: CategoryRecord[]): CategoryRecord[] {
  return [...records].sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
  );
}

function sortRelationships(records: RelationshipRecord[]): RelationshipRecord[] {
  return [...records].sort(
    (left, right) =>
      left.sourceType.localeCompare(right.sourceType) ||
      left.sourceId.localeCompare(right.sourceId) ||
      left.targetType.localeCompare(right.targetType) ||
      left.targetId.localeCompare(right.targetId) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}

function sortSavedViews(records: SavedViewRecord[]): SavedViewRecord[] {
  return [...records].sort(
    (left, right) =>
      Number(right.isFavorite) - Number(left.isFavorite) ||
      left.name.localeCompare(right.name) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}

function sortDashboards(records: DashboardRecord[]): DashboardRecord[] {
  return [...records].sort(
    (left, right) =>
      Number(right.isDefault) - Number(left.isDefault) ||
      left.name.localeCompare(right.name) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}

function sortDashboardWidgets(
  records: DashboardWidgetRecord[]
): DashboardWidgetRecord[] {
  return [...records].sort(
    (left, right) =>
      left.dashboardId.localeCompare(right.dashboardId) ||
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}

function sortDailyPlans(records: DailyPlanRecord[]): DailyPlanRecord[] {
  return [...records].sort(
    (left, right) =>
      left.planDate.localeCompare(right.planDate) ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}

function sortDailyPlanItems(
  records: DailyPlanItemRecord[]
): DailyPlanItemRecord[] {
  return [...records].sort(
    (left, right) =>
      left.dailyPlanId.localeCompare(right.dailyPlanId) ||
      left.lane.localeCompare(right.lane) ||
      left.sortOrder - right.sortOrder ||
      left.createdAt.localeCompare(right.createdAt) ||
      left.id.localeCompare(right.id)
  );
}
