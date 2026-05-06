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
import {
  ProjectMarkdownExporter,
  type ProjectMarkdownExportItem
} from "./ProjectMarkdownExporter";
import {
  TaskCsvExporter,
  type TaskDelimitedExportFormat,
  type TaskDelimitedExportRow
} from "./TaskCsvExporter";

// Owns export orchestration application contracts.
// Does not own backup lifecycle or direct renderer filesystem writes.
export type ExportServiceIdFactory = (prefix: string) => string;

export type ExportFileSystemAdapter = {
  writeJsonExport?: (input: {
    exportRelativePath: string;
    contents: string;
  }) => Promise<{ sizeBytes: number }>;
  writeTextExport?: (input: {
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

export type WriteTextExportInput = {
  exportRelativePath: string;
  contents: string;
};

export type ExportWorkspaceJsonInput = BuildWorkspaceExportInput & {
  exportRelativePath?: string;
  actorType?: ActivityActorType;
};

export type ExportProjectMarkdownInput = {
  projectId: string;
  exportRelativePath?: string;
  actorType?: ActivityActorType;
};

export type ExportTasksCsvInput = {
  workspaceId: string;
  format?: TaskDelimitedExportFormat;
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

export type TextExportResult = {
  id: string;
  workspaceId: string;
  createdAt: string;
  relativePath: string;
  sizeBytes: number;
  kind: "project_markdown" | "tasks_csv" | "tasks_tsv";
  sourceId: string;
  rowCount: number;
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

    const writeJsonExport =
      this.fileSystem.writeJsonExport ?? this.fileSystem.writeTextExport;

    if (writeJsonExport === undefined) {
      throw new Error("Export file system adapter cannot write JSON exports.");
    }

    const written = await writeJsonExport({
      exportRelativePath: input.exportRelativePath,
      contents: `${JSON.stringify(input.exportData, null, 2)}\n`
    });

    return {
      relativePath: input.exportRelativePath,
      sizeBytes: written.sizeBytes
    };
  }

  async writeTextExport(input: WriteTextExportInput): Promise<{
    relativePath: string;
    sizeBytes: number;
  }> {
    validateTextExportRelativePath(input.exportRelativePath, "exportRelativePath");

    if (this.fileSystem.writeTextExport === undefined) {
      throw new Error("Export file system adapter cannot write text exports.");
    }

    const written = await this.fileSystem.writeTextExport({
      exportRelativePath: input.exportRelativePath,
      contents: input.contents
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

  async exportProjectMarkdown(
    input: ExportProjectMarkdownInput
  ): Promise<TextExportResult> {
    validateNonEmptyString(input.projectId, "projectId");

    const project = new ContainerRepository(this.connection).getById(
      input.projectId
    );

    if (project === null || project.type !== "project") {
      throw new Error(`Project row was not found: ${input.projectId}.`);
    }

    const createdAt = createIsoTimestamp(this.now());
    const exportId = this.idFactory("export");
    const exportRelativePath =
      input.exportRelativePath ??
      createProjectMarkdownRelativePath(createdAt, project.slug);
    const contents = new ProjectMarkdownExporter().build({
      exportedAt: createdAt,
      project,
      items: buildProjectMarkdownItems(this.connection, project)
    });
    const written = await this.writeTextExport({
      exportRelativePath,
      contents
    });

    this.logTextExport({
      workspaceId: project.workspaceId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      exportId,
      createdAt,
      kind: "project_markdown",
      relativePath: written.relativePath,
      sizeBytes: written.sizeBytes,
      sourceId: project.id,
      rowCount: new ItemRepository(this.connection).listByContainer(project.id)
        .length,
      summary: `Created project Markdown export ${written.relativePath}.`
    });

    return {
      id: exportId,
      workspaceId: project.workspaceId,
      createdAt,
      relativePath: written.relativePath,
      sizeBytes: written.sizeBytes,
      kind: "project_markdown",
      sourceId: project.id,
      rowCount: new ItemRepository(this.connection).listByContainer(project.id)
        .length
    };
  }

  async exportTasksCsv(input: ExportTasksCsvInput): Promise<TextExportResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    const workspace = new WorkspaceRepository(this.connection).getById(
      input.workspaceId
    );

    if (workspace === null) {
      throw new Error(`Workspace row was not found: ${input.workspaceId}.`);
    }

    const format = input.format ?? "csv";
    const rows = buildTaskExportRows(this.connection, input.workspaceId);
    const createdAt = createIsoTimestamp(this.now());
    const exportId = this.idFactory("export");
    const exportRelativePath =
      input.exportRelativePath ??
      createTasksRelativePath(createdAt, format);
    const contents = new TaskCsvExporter().build({ format, rows });
    const written = await this.writeTextExport({
      exportRelativePath,
      contents
    });
    const kind = format === "tsv" ? "tasks_tsv" : "tasks_csv";

    this.logTextExport({
      workspaceId: input.workspaceId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      exportId,
      createdAt,
      kind,
      relativePath: written.relativePath,
      sizeBytes: written.sizeBytes,
      sourceId: input.workspaceId,
      rowCount: rows.length,
      summary: `Created task ${format.toUpperCase()} export ${written.relativePath}.`
    });

    return {
      id: exportId,
      workspaceId: input.workspaceId,
      createdAt,
      relativePath: written.relativePath,
      sizeBytes: written.sizeBytes,
      kind,
      sourceId: input.workspaceId,
      rowCount: rows.length
    };
  }

  private logTextExport(input: {
    workspaceId: string;
    actorType?: ActivityActorType;
    exportId: string;
    createdAt: string;
    kind: TextExportResult["kind"];
    relativePath: string;
    sizeBytes: number;
    sourceId: string;
    rowCount: number;
    summary: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.exportCreated,
      targetType: "export",
      targetId: input.exportId,
      summary: input.summary,
      beforeJson: null,
      afterJson: JSON.stringify({
        export: {
          id: input.exportId,
          kind: input.kind,
          relativePath: input.relativePath,
          sizeBytes: input.sizeBytes,
          sourceId: input.sourceId,
          rowCount: input.rowCount
        }
      }),
      timestamp: input.createdAt
    });
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

function createProjectMarkdownRelativePath(
  createdAt: string,
  projectSlug: string
): string {
  return `exports/${createdAt.replace(/[:.]/g, "-")}-${projectSlug}-project.md`;
}

function createTasksRelativePath(
  createdAt: string,
  format: TaskDelimitedExportFormat
): string {
  return `exports/${createdAt.replace(/[:.]/g, "-")}-tasks.${format}`;
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

function validateTextExportRelativePath(value: string, fieldName: string): void {
  validateNonEmptyString(value, fieldName);

  const normalized = value.replace(/\\/g, "/");

  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error(`${fieldName} must be workspace-relative.`);
  }

  if (
    !normalized.startsWith("exports/") ||
    (!normalized.endsWith(".md") &&
      !normalized.endsWith(".csv") &&
      !normalized.endsWith(".tsv"))
  ) {
    throw new Error(
      `${fieldName} must be a Markdown, CSV, or TSV file inside workspace exports.`
    );
  }
}

function buildProjectMarkdownItems(
  connection: DatabaseConnection,
  project: ContainerRecord
): ProjectMarkdownExportItem[] {
  const itemRepository = new ItemRepository(connection);
  const taskRepository = new TaskRepository(connection);
  const noteRepository = new NoteRepository(connection);
  const listRepository = new ListRepository(connection);
  const linkRepository = new LinkRepository(connection);
  const attachmentRepository = new AttachmentRepository(connection);
  const tagRepository = new TagRepository(connection);

  return itemRepository.listByContainer(project.id).map((item) => {
    const entry: ProjectMarkdownExportItem = {
      item,
      tags: tagRepository
        .listTagsForTarget({
          workspaceId: item.workspaceId,
          targetType: "item",
          targetId: item.id
        })
        .map((tag) => tag.slug)
    };

    if (item.type === "task") {
      const task = taskRepository.getDetailsByItemId(item.id);

      if (task !== null) {
        entry.task = task;
      }
    }

    if (item.type === "note") {
      const note = noteRepository.getDetailsByItemId(item.id);

      if (note !== null) {
        entry.note = note;
      }
    }

    if (item.type === "list") {
      const list = listRepository.getDetailsByItemId(item.id);

      if (list !== null) {
        entry.list = list;
        entry.listItems = listRepository.listItems(item.id);
      }
    }

    if (item.type === "link") {
      const link = linkRepository.getDetailsByItemId(item.id);

      if (link !== null) {
        entry.link = link;
      }
    }

    if (item.type === "file") {
      entry.attachments = attachmentRepository.listForItem({
        workspaceId: item.workspaceId,
        itemId: item.id
      });
    }

    return entry;
  });
}

function buildTaskExportRows(
  connection: DatabaseConnection,
  workspaceId: string
): TaskDelimitedExportRow[] {
  const itemRepository = new ItemRepository(connection);
  const containerRepository = new ContainerRepository(connection);
  const taskRepository = new TaskRepository(connection);
  const tagRepository = new TagRepository(connection);

  const rows: TaskDelimitedExportRow[] = [];

  for (const item of itemRepository.listByWorkspace(workspaceId, { type: "task" })) {
    const task = taskRepository.getDetailsByItemId(item.id);

    if (task === null) {
      continue;
    }

    rows.push({
      item,
      task,
      container: containerRepository.getById(item.containerId),
      tags: tagRepository
        .listTagsForTarget({
          workspaceId: item.workspaceId,
          targetType: "item",
          targetId: item.id
        })
        .map((tag) => tag.slug)
    });
  }

  return rows;
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
