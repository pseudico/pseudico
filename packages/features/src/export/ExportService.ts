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
  SearchIndexRepository,
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
  type SearchIndexRecord,
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
import { PlanningSummaryService } from "../today/PlanningSummaryService";

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

export type ExportPlanningSummaryMarkdownInput = {
  workspaceId: string;
  date?: string | Date;
  exportRelativePath?: string;
  actorType?: ActivityActorType;
};

export type ExportHtmlCsvTsvMarkdownBundleInput = {
  workspaceId: string;
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
  kind: "project_markdown" | "tasks_csv" | "tasks_tsv" | "planning_summary_markdown";
  sourceId: string;
  rowCount: number;
};

export type BundleExportFileSummary = {
  relativePath: string;
  role:
    | "manifest"
    | "readme"
    | "container_markdown"
    | "tasks_csv"
    | "tasks_tsv"
    | "lists_csv"
    | "lists_tsv"
    | "html_index"
    | "html_containers"
    | "html_search"
    | "html_collections"
    | "attachment_manifest_csv";
  mediaType: string;
  sizeBytes: number;
  sourceType?: "workspace" | "container" | "saved_view" | "search_index";
  sourceId?: string;
  rowCount?: number;
};

export type BundleExportManifest = {
  schemaVersion: 1;
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

export type BundleExportResult = {
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
  manifest: BundleExportManifest;
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

  async exportPlanningSummaryMarkdown(
    input: ExportPlanningSummaryMarkdownInput
  ): Promise<TextExportResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    const workspace = new WorkspaceRepository(this.connection).getById(
      input.workspaceId
    );

    if (workspace === null) {
      throw new Error(`Workspace row was not found: ${input.workspaceId}.`);
    }

    const createdAt = createIsoTimestamp(this.now());
    const exportId = this.idFactory("export");
    const summaryService = new PlanningSummaryService({
      connection: this.connection,
      now: this.now
    });
    const summary = summaryService.getSummary({
      workspaceId: input.workspaceId,
      date: input.date ?? this.now()
    });
    const exportRelativePath =
      input.exportRelativePath ??
      createPlanningSummaryRelativePath(createdAt, summary.daily.localDate);
    const contents = summaryService.buildMarkdown({
      workspaceId: input.workspaceId,
      date: input.date ?? this.now()
    });
    const written = await this.writeTextExport({
      exportRelativePath,
      contents
    });

    this.logTextExport({
      workspaceId: input.workspaceId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      exportId,
      createdAt,
      kind: "planning_summary_markdown",
      relativePath: written.relativePath,
      sizeBytes: written.sizeBytes,
      sourceId: input.workspaceId,
      rowCount:
        summary.weekly.byProject.length + summary.weekly.byCategory.length,
      summary: `Created planning summary Markdown export ${written.relativePath}.`
    });

    return {
      id: exportId,
      workspaceId: input.workspaceId,
      createdAt,
      relativePath: written.relativePath,
      sizeBytes: written.sizeBytes,
      kind: "planning_summary_markdown",
      sourceId: input.workspaceId,
      rowCount: summary.weekly.byProject.length + summary.weekly.byCategory.length
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

  async exportHtmlCsvTsvMarkdownBundle(
    input: ExportHtmlCsvTsvMarkdownBundleInput
  ): Promise<BundleExportResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    const exportData = this.buildWorkspaceExport({
      workspaceId: input.workspaceId
    });
    const createdAt = exportData.exportedAt;
    const exportId = this.idFactory("export");
    const baseRelativePath = normalizeBundleBaseRelativePath(
      input.exportRelativePath ??
        createBundleRelativePath(createdAt, exportData.workspace.name)
    );
    const searchRecords = new SearchIndexRepository(this.connection)
      .listByWorkspace(input.workspaceId)
      .filter((record) => !record.isDeleted);
    const files = buildAdvancedBundleFiles({
      exportData,
      baseRelativePath,
      connection: this.connection,
      searchRecords
    });
    const writtenFiles: BundleExportFileSummary[] = [];
    let totalSizeBytes = 0;

    for (const file of files) {
      const written = await this.writeBundleTextExport(file);
      totalSizeBytes += written.sizeBytes;
      writtenFiles.push({
        relativePath: written.relativePath,
        role: file.role,
        mediaType: file.mediaType,
        sizeBytes: written.sizeBytes,
        ...(file.sourceType === undefined
          ? {}
          : { sourceType: file.sourceType }),
        ...(file.sourceId === undefined ? {} : { sourceId: file.sourceId }),
        ...(file.rowCount === undefined ? {} : { rowCount: file.rowCount })
      });
    }

    const manifest = buildBundleManifest({
      exportData,
      createdAt,
      searchRecords,
      files: writtenFiles
    });
    const manifestRelativePath = joinExportRelativePath(
      baseRelativePath,
      "manifest.json"
    );
    const manifestWritten = await this.writeBundleTextExport({
      relativePath: manifestRelativePath,
      contents: `${JSON.stringify(manifest, null, 2)}\n`,
      role: "manifest",
      mediaType: "application/json",
      sourceType: "workspace",
      sourceId: input.workspaceId,
      rowCount: manifest.files.length
    });

    totalSizeBytes += manifestWritten.sizeBytes;

    this.logTextExport({
      workspaceId: input.workspaceId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      exportId,
      createdAt,
      kind: "html_csv_tsv_markdown_bundle",
      relativePath: baseRelativePath,
      sizeBytes: totalSizeBytes,
      sourceId: input.workspaceId,
      rowCount: manifest.files.length + 1,
      summary: `Created HTML/CSV/TSV/Markdown export bundle ${baseRelativePath}.`
    });

    return {
      id: exportId,
      workspaceId: input.workspaceId,
      createdAt,
      relativePath: baseRelativePath,
      sizeBytes: totalSizeBytes,
      kind: "html_csv_tsv_markdown_bundle",
      fileCount: manifest.files.length + 1,
      containerCount: manifest.counts.projects + manifest.counts.contacts,
      taskCount: manifest.counts.tasks,
      listItemCount: manifest.counts.listItems,
      savedViewCount: manifest.counts.savedViews,
      searchRecordCount: manifest.counts.searchRecords,
      attachmentCount: manifest.counts.attachments,
      manifest
    };
  }

  private logTextExport(input: {
    workspaceId: string;
    actorType?: ActivityActorType;
    exportId: string;
    createdAt: string;
    kind: TextExportResult["kind"] | BundleExportResult["kind"];
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

  private async writeBundleTextExport(input: BundleExportFileDraft): Promise<{
    relativePath: string;
    sizeBytes: number;
  }> {
    validateBundleExportRelativePath(input.relativePath, "relativePath");

    if (this.fileSystem.writeTextExport === undefined) {
      throw new Error("Export file system adapter cannot write bundle exports.");
    }

    const written = await this.fileSystem.writeTextExport({
      exportRelativePath: input.relativePath,
      contents: input.contents
    });

    return {
      relativePath: input.relativePath,
      sizeBytes: written.sizeBytes
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

type BundleExportFileDraft = {
  relativePath: string;
  contents: string;
  role: BundleExportFileSummary["role"];
  mediaType: string;
  sourceType?: BundleExportFileSummary["sourceType"];
  sourceId?: string;
  rowCount?: number;
};

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

function createPlanningSummaryRelativePath(
  createdAt: string,
  localDate: string
): string {
  return `exports/${createdAt.replace(/[:.]/g, "-")}-${localDate}-planning-summary.md`;
}

function createBundleRelativePath(createdAt: string, workspaceName: string): string {
  return `exports/${createdAt.replace(/[:.]/g, "-")}-${slugifyExportSegment(
    workspaceName
  )}-export-bundle`;
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

function normalizeBundleBaseRelativePath(value: string): string {
  validateNonEmptyString(value, "exportRelativePath");

  const normalized = value.replace(/\\/g, "/").replace(/\/+$/g, "");

  if (
    normalized.startsWith("/") ||
    /^[a-zA-Z]:/.test(normalized) ||
    normalized.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error("exportRelativePath must be workspace-relative.");
  }

  if (!normalized.startsWith("exports/") || normalized === "exports") {
    throw new Error("exportRelativePath must be a folder inside workspace exports.");
  }

  return normalized;
}

function validateBundleExportRelativePath(value: string, fieldName: string): void {
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
      !normalized.endsWith(".tsv") &&
      !normalized.endsWith(".html") &&
      !normalized.endsWith(".json"))
  ) {
    throw new Error(
      `${fieldName} must be a Markdown, CSV, TSV, HTML, or JSON file inside workspace exports.`
    );
  }
}

function joinExportRelativePath(baseRelativePath: string, childPath: string): string {
  return `${baseRelativePath}/${childPath.replace(/\\/g, "/")}`;
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

function buildAdvancedBundleFiles(input: {
  exportData: WorkspaceExportV1;
  baseRelativePath: string;
  connection: DatabaseConnection;
  searchRecords: SearchIndexRecord[];
}): BundleExportFileDraft[] {
  const containerMarkdownFiles = buildContainerMarkdownFiles(input);
  const taskRows = buildTaskExportRows(
    input.connection,
    input.exportData.workspace.id
  );
  const listRows = buildListDelimitedRows(input.exportData);
  const attachmentRows = input.exportData.attachmentManifest.attachments.map(
    (attachment) => [
      attachment.id,
      attachment.itemId,
      attachment.originalName,
      attachment.storedName,
      attachment.mimeType ?? "",
      String(attachment.sizeBytes),
      attachment.checksum ?? "",
      attachment.storagePath,
      attachment.description ?? ""
    ]
  );

  return [
    {
      relativePath: joinExportRelativePath(input.baseRelativePath, "README.md"),
      contents: buildBundleReadme(input.exportData),
      role: "readme",
      mediaType: "text/markdown",
      sourceType: "workspace",
      sourceId: input.exportData.workspace.id
    },
    ...containerMarkdownFiles,
    {
      relativePath: joinExportRelativePath(input.baseRelativePath, "tasks/tasks.csv"),
      contents: new TaskCsvExporter().build({ format: "csv", rows: taskRows }),
      role: "tasks_csv",
      mediaType: "text/csv",
      sourceType: "workspace",
      sourceId: input.exportData.workspace.id,
      rowCount: taskRows.length
    },
    {
      relativePath: joinExportRelativePath(input.baseRelativePath, "tasks/tasks.tsv"),
      contents: new TaskCsvExporter().build({ format: "tsv", rows: taskRows }),
      role: "tasks_tsv",
      mediaType: "text/tab-separated-values",
      sourceType: "workspace",
      sourceId: input.exportData.workspace.id,
      rowCount: taskRows.length
    },
    {
      relativePath: joinExportRelativePath(input.baseRelativePath, "lists/lists.csv"),
      contents: buildDelimitedTable(LIST_EXPORT_HEADERS, listRows, ","),
      role: "lists_csv",
      mediaType: "text/csv",
      sourceType: "workspace",
      sourceId: input.exportData.workspace.id,
      rowCount: listRows.length
    },
    {
      relativePath: joinExportRelativePath(input.baseRelativePath, "lists/lists.tsv"),
      contents: buildDelimitedTable(LIST_EXPORT_HEADERS, listRows, "\t"),
      role: "lists_tsv",
      mediaType: "text/tab-separated-values",
      sourceType: "workspace",
      sourceId: input.exportData.workspace.id,
      rowCount: listRows.length
    },
    {
      relativePath: joinExportRelativePath(
        input.baseRelativePath,
        "attachments/manifest.csv"
      ),
      contents: buildDelimitedTable(ATTACHMENT_EXPORT_HEADERS, attachmentRows, ","),
      role: "attachment_manifest_csv",
      mediaType: "text/csv",
      sourceType: "workspace",
      sourceId: input.exportData.workspace.id,
      rowCount: attachmentRows.length
    },
    {
      relativePath: joinExportRelativePath(input.baseRelativePath, "html/index.html"),
      contents: buildBundleIndexHtml(input.exportData),
      role: "html_index",
      mediaType: "text/html",
      sourceType: "workspace",
      sourceId: input.exportData.workspace.id
    },
    {
      relativePath: joinExportRelativePath(
        input.baseRelativePath,
        "html/containers.html"
      ),
      contents: buildContainersHtml(input.exportData),
      role: "html_containers",
      mediaType: "text/html",
      sourceType: "workspace",
      sourceId: input.exportData.workspace.id,
      rowCount: input.exportData.data.containers.length
    },
    {
      relativePath: joinExportRelativePath(input.baseRelativePath, "html/search.html"),
      contents: buildSearchHtml(input.searchRecords),
      role: "html_search",
      mediaType: "text/html",
      sourceType: "search_index",
      sourceId: input.exportData.workspace.id,
      rowCount: input.searchRecords.length
    },
    {
      relativePath: joinExportRelativePath(
        input.baseRelativePath,
        "html/collections.html"
      ),
      contents: buildCollectionsHtml(input.exportData.data.savedViews),
      role: "html_collections",
      mediaType: "text/html",
      sourceType: "saved_view",
      sourceId: input.exportData.workspace.id,
      rowCount: input.exportData.data.savedViews.length
    }
  ];
}

function buildContainerMarkdownFiles(input: {
  exportData: WorkspaceExportV1;
  baseRelativePath: string;
  connection: DatabaseConnection;
}): BundleExportFileDraft[] {
  const exporter = new ProjectMarkdownExporter();
  const countsByName = new Map<string, number>();

  return input.exportData.data.containers
    .filter((container) => container.type === "project" || container.type === "contact")
    .map((container) => {
      const baseName = buildPortableContainerExportBaseName(container);
      const count = countsByName.get(baseName) ?? 0;
      countsByName.set(baseName, count + 1);
      const fileName = count === 0 ? `${baseName}.md` : `${baseName}-${count + 1}.md`;
      const items = buildProjectMarkdownItems(input.connection, container);

      return {
        relativePath: joinExportRelativePath(
          input.baseRelativePath,
          `containers/${fileName}`
        ),
        contents: exporter.build({
          exportedAt: input.exportData.exportedAt,
          project: container,
          items
        }),
        role: "container_markdown",
        mediaType: "text/markdown",
        sourceType: "container",
        sourceId: container.id,
        rowCount: items.length
      };
    });
}

function buildBundleManifest(input: {
  exportData: WorkspaceExportV1;
  createdAt: string;
  searchRecords: SearchIndexRecord[];
  files: BundleExportFileSummary[];
}): BundleExportManifest {
  const projects = input.exportData.data.containers.filter(
    (container) => container.type === "project"
  );
  const contacts = input.exportData.data.containers.filter(
    (container) => container.type === "contact"
  );
  const taskCount = input.exportData.data.items.filter(
    (item) => item.type === "task"
  ).length;
  const listCount = input.exportData.data.items.filter(
    (item) => item.type === "list"
  ).length;
  const collectionCount = input.exportData.data.savedViews.filter(
    (view) => view.type === "collection"
  ).length;

  return {
    schemaVersion: 1,
    kind: "html_csv_tsv_markdown_bundle",
    workspace: {
      id: input.exportData.workspace.id,
      name: input.exportData.workspace.name,
      schemaVersion: input.exportData.workspace.schemaVersion
    },
    createdAt: input.createdAt,
    files: input.files,
    counts: {
      containers: input.exportData.data.containers.length,
      projects: projects.length,
      contacts: contacts.length,
      tasks: taskCount,
      lists: listCount,
      listItems: input.exportData.data.listItems.length,
      savedViews: input.exportData.data.savedViews.length,
      collections: collectionCount,
      searchRecords: input.searchRecords.length,
      attachments: input.exportData.attachmentManifest.attachmentCount,
      totalAttachmentBytes:
        input.exportData.attachmentManifest.totalAttachmentBytes
    }
  };
}

const LIST_EXPORT_HEADERS = [
  "Container",
  "List",
  "List item",
  "Status",
  "Depth",
  "Start",
  "Due",
  "Completed",
  "List ID",
  "List item ID"
] as const;

const ATTACHMENT_EXPORT_HEADERS = [
  "Attachment ID",
  "Item ID",
  "Original name",
  "Stored name",
  "MIME type",
  "Size bytes",
  "Checksum",
  "Storage path",
  "Description"
] as const;

function buildListDelimitedRows(exportData: WorkspaceExportV1): string[][] {
  const itemsById = new Map(exportData.data.items.map((item) => [item.id, item]));
  const containersById = new Map(
    exportData.data.containers.map((container) => [container.id, container])
  );

  return exportData.data.listItems.map((listItem) => {
    const listItemParent = itemsById.get(listItem.listId);
    const container =
      listItemParent === undefined
        ? undefined
        : containersById.get(listItemParent.containerId);

    return [
      container?.name ?? "",
      listItemParent?.title ?? "",
      listItem.title,
      listItem.status,
      String(listItem.depth),
      listItem.startAt ?? "",
      listItem.dueAt ?? "",
      listItem.completedAt ?? "",
      listItem.listId,
      listItem.id
    ];
  });
}

function buildDelimitedTable(
  headers: readonly string[],
  rows: string[][],
  delimiter: "," | "\t"
): string {
  return `${[headers, ...rows]
    .map((row) =>
      row.map((cell) => escapeDelimitedExportCell(cell, delimiter)).join(delimiter)
    )
    .join("\n")}\n`;
}

function escapeDelimitedExportCell(value: string, delimiter: "," | "\t"): string {
  const normalized = value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  if (
    normalized.includes("\"") ||
    normalized.includes("\n") ||
    normalized.includes(delimiter)
  ) {
    return `"${normalized.replace(/"/g, "\"\"")}"`;
  }

  return normalized;
}

function buildBundleReadme(exportData: WorkspaceExportV1): string {
  return [
    `# ${escapeMarkdownInline(exportData.workspace.name)} export bundle`,
    "",
    `- Exported: ${escapeMarkdownInline(exportData.exportedAt)}`,
    `- Workspace ID: ${escapeMarkdownInline(exportData.workspace.id)}`,
    `- Schema version: ${exportData.schemaVersion}`,
    "",
    "## Contents",
    "",
    "- `manifest.json` lists every generated file with sizes.",
    "- `containers/` contains Markdown exports for each project and contact.",
    "- `tasks/` contains task CSV and TSV files.",
    "- `lists/` contains checklist/list-item CSV and TSV files.",
    "- `html/` contains printable local HTML indexes for containers, search, and collections.",
    "- `attachments/manifest.csv` lists local attachment metadata; original files remain in the workspace attachment store.",
    ""
  ].join("\n");
}

function buildBundleIndexHtml(exportData: WorkspaceExportV1): string {
  return buildHtmlDocument(
    `${exportData.workspace.name} export`,
    [
      `<h1>${escapeHtml(exportData.workspace.name)} export bundle</h1>`,
      `<p>Exported ${escapeHtml(exportData.exportedAt)} from local workspace ${escapeHtml(
        exportData.workspace.id
      )}.</p>`,
      "<nav><ul>",
      '<li><a href="containers.html">Containers</a></li>',
      '<li><a href="search.html">Search index</a></li>',
      '<li><a href="collections.html">Collections and saved views</a></li>',
      "</ul></nav>"
    ].join("\n")
  );
}

function buildContainersHtml(exportData: WorkspaceExportV1): string {
  const rows = exportData.data.containers
    .map((container) => {
      const itemCount = exportData.data.items.filter(
        (item) => item.containerId === container.id
      ).length;

      return `<tr><td>${escapeHtml(container.name)}</td><td>${escapeHtml(
        container.type
      )}</td><td>${escapeHtml(container.status)}</td><td>${itemCount}</td><td>${escapeHtml(
        container.slug
      )}</td></tr>`;
    })
    .join("\n");

  return buildHtmlDocument(
    "Containers",
    [
      "<h1>Containers</h1>",
      "<table><thead><tr><th>Name</th><th>Type</th><th>Status</th><th>Items</th><th>Slug</th></tr></thead>",
      `<tbody>${rows}</tbody></table>`
    ].join("\n")
  );
}

function buildSearchHtml(records: SearchIndexRecord[]): string {
  const rows = records
    .map(
      (record) =>
        `<tr><td>${escapeHtml(record.targetType)}</td><td>${escapeHtml(
          record.title
        )}</td><td>${escapeHtml(record.tags)}</td><td>${escapeHtml(
          record.category ?? ""
        )}</td><td>${escapeHtml(record.body).slice(0, 500)}</td></tr>`
    )
    .join("\n");

  return buildHtmlDocument(
    "Search index",
    [
      "<h1>Search index</h1>",
      "<p>Static, sanitized local HTML projection of indexed searchable records.</p>",
      "<table><thead><tr><th>Type</th><th>Title</th><th>Tags</th><th>Category</th><th>Body</th></tr></thead>",
      `<tbody>${rows}</tbody></table>`
    ].join("\n")
  );
}

function buildCollectionsHtml(savedViews: SavedViewRecord[]): string {
  const rows = savedViews
    .map(
      (view) =>
        `<tr><td>${escapeHtml(view.name)}</td><td>${escapeHtml(
          view.type
        )}</td><td>${escapeHtml(view.queryJson)}</td><td>${escapeHtml(
          view.updatedAt
        )}</td></tr>`
    )
    .join("\n");

  return buildHtmlDocument(
    "Collections and saved views",
    [
      "<h1>Collections and saved views</h1>",
      "<table><thead><tr><th>Name</th><th>Type</th><th>Query JSON</th><th>Updated</th></tr></thead>",
      `<tbody>${rows}</tbody></table>`
    ].join("\n")
  );
}

function buildHtmlDocument(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 2rem; color: #172033; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #d5dbe7; padding: 0.5rem; text-align: left; vertical-align: top; }
th { background: #f4f6fb; }
a { color: #2358d8; }
</style>
</head>
<body>
${body}
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMarkdownInline(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>]/g, "\\$&");
}

function slugifyExportSegment(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length === 0 ? "export" : slug;
}

const PORTABLE_CONTAINER_FILE_BASENAME_LIMIT = 96;

function buildPortableContainerExportBaseName(container: ContainerRecord): string {
  const typePrefix = container.type === "contact" ? "contact" : "project";
  const sourceSlug = slugifyExportSegment(container.slug || container.name || container.id);
  const unqualifiedLimit =
    PORTABLE_CONTAINER_FILE_BASENAME_LIMIT - `${typePrefix}-`.length;
  if (sourceSlug.length <= unqualifiedLimit) {
    return `${typePrefix}-${sourceSlug}`;
  }

  const idSuffix = slugifyExportSegment(container.id).replace(/_/g, "-").slice(-18);
  const suffix = idSuffix.length > 0 ? `-${idSuffix}` : "";
  const staticLength = `${typePrefix}-`.length + suffix.length;
  const segmentLimit = Math.max(
    16,
    PORTABLE_CONTAINER_FILE_BASENAME_LIMIT - staticLength
  );
  const shortenedSlug =
    sourceSlug.length > segmentLimit
      ? sourceSlug.slice(0, segmentLimit).replace(/[-_.]+$/g, "")
      : sourceSlug;

  return `${typePrefix}-${shortenedSlug || "export"}${suffix}`;
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
