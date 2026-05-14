import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  type DatabaseConnection
} from "@local-work-os/db";
import { ItemService } from "../items/ItemService";
import { TagService } from "../metadata/TagService";
import { ProjectService } from "../projects";
import { RelationshipService } from "../relationships/RelationshipService";
import { TaskService } from "../tasks";
import { normalizeTaskDateTime } from "../tasks/TaskQueries";
import { CsvImportService } from "./CsvImportService";

export type TodoistImportSourceKind = "project_csv" | "backup_zip";
export type TodoistImportEntryKind = "csv" | "unsupported";

export type TodoistImportSourceEntry = {
  relativePath: string;
  kind: TodoistImportEntryKind;
  content?: string;
  sizeBytes?: number;
};

export type TodoistImportPreviewInput = {
  workspaceId: string;
  rootName: string;
  entries: TodoistImportSourceEntry[];
  sourceKind?: TodoistImportSourceKind;
  defaultProjectName?: string;
  maxPreviewRows?: number;
};

export type TodoistImportExecuteInput = TodoistImportPreviewInput & {
  actorType?: ActivityActorType;
};

export type TodoistImportValidationIssue = {
  severity: "error" | "warning";
  code: string;
  relativePath: string | null;
  rowNumber: number | null;
  message: string;
};

export type TodoistImportPreviewRow = {
  relativePath: string;
  rowNumber: number | null;
  kind: "project" | "section" | "task" | "comment" | "unsupported";
  action: "create" | "append" | "skip";
  title: string;
  projectName: string | null;
  parentTitle: string | null;
  dueText: string | null;
  labels: string[];
  priority: number | null;
  attachmentUrls: string[];
  issues: TodoistImportValidationIssue[];
};

export type TodoistImportSourceReport = {
  completedAndArchivedMayBeAbsent: boolean;
  inertAttachmentUrls: Array<{ relativePath: string; rowNumber: number; url: string }>;
  unsupportedRows: Array<{ relativePath: string; rowNumber: number; type: string }>;
};

export type TodoistImportPreviewSummary = {
  valid: boolean;
  workspaceId: string;
  rootName: string;
  sourceKind: TodoistImportSourceKind;
  entryCount: number;
  projectCount: number;
  taskCount: number;
  sectionCount: number;
  subtaskCount: number;
  commentCount: number;
  attachmentLinkCount: number;
  unsupportedCount: number;
  creatableCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  issues: TodoistImportValidationIssue[];
  rows: TodoistImportPreviewRow[];
  sourceReport: TodoistImportSourceReport;
};

export type TodoistImportCreatedTarget = {
  targetType: "project" | "item" | "relationship";
  id: string;
  title: string;
  relativePath: string;
  rowNumber: number | null;
};

export type TodoistImportExecuteSummary = TodoistImportPreviewSummary & {
  importedAt: string;
  importedCount: number;
  created: TodoistImportCreatedTarget[];
};

type NormalizedEntry = TodoistImportSourceEntry & {
  relativePath: string;
};

type NormalizedInput = {
  sourceKind: TodoistImportSourceKind;
  entries: NormalizedEntry[];
  issues: TodoistImportValidationIssue[];
};

type ParsedTodoistFile = {
  relativePath: string;
  projectName: string;
  sections: ParsedTodoistSection[];
  tasks: ParsedTodoistTask[];
  comments: ParsedTodoistComment[];
  unsupportedRows: ParsedTodoistUnsupportedRow[];
  issues: TodoistImportValidationIssue[];
};

type ParsedTodoistSection = {
  relativePath: string;
  rowNumber: number;
  title: string;
};

type ParsedTodoistTask = {
  relativePath: string;
  rowNumber: number;
  sourceId: string;
  explicitSourceId: string | null;
  parentSourceId: string | null;
  parentTitle: string | null;
  title: string;
  description: string | null;
  sectionTitle: string | null;
  dueText: string | null;
  dueAt: string | null;
  labels: string[];
  priority: number | null;
  indent: number;
  comments: ParsedTodoistComment[];
  attachmentUrls: string[];
  issues: TodoistImportValidationIssue[];
};

type ParsedTodoistComment = {
  relativePath: string;
  rowNumber: number;
  title: string;
  targetTaskSourceId: string | null;
  attachmentUrls: string[];
  issues: TodoistImportValidationIssue[];
};

type ParsedTodoistUnsupportedRow = {
  relativePath: string;
  rowNumber: number;
  type: string;
  title: string;
};

type CreatedTaskInfo = {
  task: ParsedTodoistTask;
  itemId: string;
  title: string;
  indent: number;
};

const TODOIST_COMPLETED_ARCHIVED_WARNING: TodoistImportValidationIssue = {
  severity: "warning",
  code: "todoist_completed_archived_may_be_absent",
  relativePath: null,
  rowNumber: null,
  message:
    "Todoist project exports and backup ZIPs may omit completed tasks and archived projects; imported data only reflects the local export files provided."
};

export class TodoistImportService {
  readonly module = "todoistImport";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: (prefix: string) => string;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  previewImport(input: TodoistImportPreviewInput): TodoistImportPreviewSummary {
    const normalized = this.normalizeInput(input);
    const parsedFiles = normalized.entries
      .filter((entry) => entry.kind === "csv")
      .map((entry) => this.parseTodoistCsv(entry, input.defaultProjectName));
    const rows = this.buildRows(parsedFiles, normalized.entries);
    const sourceReport = buildSourceReport(parsedFiles);
    const issues = [
      ...normalized.issues,
      TODOIST_COMPLETED_ARCHIVED_WARNING,
      ...parsedFiles.flatMap((file) => file.issues),
      ...rows.flatMap((row) => row.issues),
      ...sourceReport.inertAttachmentUrls.map((entry) => ({
        severity: "warning" as const,
        code: "inert_attachment_url",
        relativePath: entry.relativePath,
        rowNumber: entry.rowNumber,
        message: `Todoist attachment link is preserved as metadata and will not be downloaded: ${entry.url}`
      }))
    ];
    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const warningCount = issues.length - errorCount;
    const previewRows = rows.slice(0, input.maxPreviewRows ?? 100);
    const taskCount = parsedFiles.reduce((sum, file) => sum + file.tasks.length, 0);
    const sectionCount = parsedFiles.reduce((sum, file) => sum + file.sections.length, 0);

    return {
      valid: errorCount === 0,
      workspaceId: input.workspaceId,
      rootName: input.rootName,
      sourceKind: normalized.sourceKind,
      entryCount: normalized.entries.length,
      projectCount: parsedFiles.length,
      taskCount,
      sectionCount,
      subtaskCount: parsedFiles.reduce(
        (sum, file) =>
          sum + file.tasks.filter((task) => task.indent > 1 || task.parentSourceId !== null || task.parentTitle !== null).length,
        0
      ),
      commentCount: parsedFiles.reduce((sum, file) => sum + file.comments.length, 0),
      attachmentLinkCount: sourceReport.inertAttachmentUrls.length,
      unsupportedCount: normalized.entries.filter((entry) => entry.kind === "unsupported").length +
        sourceReport.unsupportedRows.length,
      creatableCount: rows.filter((row) => row.action === "create").length,
      skippedCount: rows.filter((row) => row.action === "skip").length,
      errorCount,
      warningCount,
      issues,
      rows: previewRows,
      sourceReport
    };
  }

  async executeImport(input: TodoistImportExecuteInput): Promise<TodoistImportExecuteSummary> {
    const preview = this.previewImport(input);
    const importedAt = createIsoTimestamp(this.now());

    if (!preview.valid) {
      return { ...preview, importedAt, importedCount: 0, created: [] };
    }

    const normalized = this.normalizeInput(input);
    const parsedFiles = normalized.entries
      .filter((entry) => entry.kind === "csv")
      .map((entry) => this.parseTodoistCsv(entry, input.defaultProjectName));
    const actorType = input.actorType ?? "importer";
    const created: TodoistImportCreatedTarget[] = [];
    const issues = [...preview.issues];

    try {
      for (const file of parsedFiles) {
        await this.importParsedFile({
          workspaceId: input.workspaceId,
          actorType,
          file,
          created
        });
      }
    } catch (error) {
      issues.push({
        severity: "error",
        code: "todoist_import_failed",
        relativePath: null,
        rowNumber: null,
        message: error instanceof Error ? error.message : "Todoist import failed."
      });
    }

    this.logImportCompleted({
      workspaceId: input.workspaceId,
      actorType,
      importedAt,
      sourceKind: normalized.sourceKind,
      projectCount: parsedFiles.length,
      taskCount: parsedFiles.reduce((sum, file) => sum + file.tasks.length, 0),
      createdCount: created.length,
      issueCount: issues.length
    });

    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const warningCount = issues.length - errorCount;

    return {
      ...preview,
      valid: errorCount === 0,
      errorCount,
      warningCount,
      issues,
      importedAt,
      importedCount: created.length,
      created
    };
  }

  private normalizeInput(input: TodoistImportPreviewInput): NormalizedInput {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.rootName, "rootName");

    const issues: TodoistImportValidationIssue[] = [];
    const seen = new Set<string>();
    const entries: NormalizedEntry[] = [];

    for (const rawEntry of input.entries) {
      const relativePath = normalizeRelativePath(rawEntry.relativePath);
      if (relativePath === null) {
        issues.push({
          severity: "error",
          code: "unsafe_path",
          relativePath: rawEntry.relativePath,
          rowNumber: null,
          message: "Todoist import paths must be relative and stay inside the selected local export."
        });
        continue;
      }

      if (seen.has(relativePath)) {
        issues.push({
          severity: "warning",
          code: "duplicate_path_skipped",
          relativePath,
          rowNumber: null,
          message: "Duplicate Todoist export path will be skipped."
        });
        continue;
      }
      seen.add(relativePath);

      if (!["csv", "unsupported"].includes(rawEntry.kind)) {
        issues.push({
          severity: "error",
          code: "invalid_entry_kind",
          relativePath,
          rowNumber: null,
          message: "Todoist import entry kind must be csv or unsupported."
        });
        continue;
      }

      if (rawEntry.kind === "csv" && rawEntry.content === undefined) {
        issues.push({
          severity: "error",
          code: "missing_content",
          relativePath,
          rowNumber: null,
          message: "Todoist CSV entries require content for preview and import."
        });
      }

      entries.push({ ...rawEntry, relativePath });
    }

    entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

    if (!entries.some((entry) => entry.kind === "csv")) {
      issues.push({
        severity: "error",
        code: "empty_todoist_export",
        relativePath: null,
        rowNumber: null,
        message: "Selected Todoist export does not contain project CSV files."
      });
    }

    return {
      sourceKind: input.sourceKind ?? inferSourceKind(input.rootName, entries),
      entries,
      issues
    };
  }

  private parseTodoistCsv(
    entry: NormalizedEntry,
    defaultProjectName: string | undefined
  ): ParsedTodoistFile {
    const parsed = new CsvImportService({ connection: this.connection }).parse({
      contents: entry.content ?? "",
      format: "csv"
    });
    const projectName = normalizeTitle(
      defaultProjectName ?? inferProjectName(parsed.rows, parsed.headers, entry.relativePath),
      fileBaseName(entry.relativePath).replace(/\.csv$/i, "") || "Todoist project"
    );
    const sections: ParsedTodoistSection[] = [];
    const tasks: ParsedTodoistTask[] = [];
    const comments: ParsedTodoistComment[] = [];
    const unsupportedRows: ParsedTodoistUnsupportedRow[] = [];
    const issues: TodoistImportValidationIssue[] = [];
    let currentSectionTitle: string | null = null;
    let lastTask: ParsedTodoistTask | null = null;

    for (const [index, row] of parsed.rows.entries()) {
      const rowNumber = index + 2;
      const type = getTodoistField(row, parsed.headers, ["type"]);
      const normalizedType = normalizeHeader(type);
      const title = getTodoistField(row, parsed.headers, ["content", "title"]).trim();
      const attachmentUrls = extractAttachmentUrls(
        getTodoistField(row, parsed.headers, ["attachment", "comment", "description", "url"])
      );

      if (normalizedType === "section") {
        const sectionTitle = normalizeTitle(title, `Section ${sections.length + 1}`);
        currentSectionTitle = sectionTitle;
        sections.push({
          relativePath: entry.relativePath,
          rowNumber,
          title: sectionTitle
        });
        continue;
      }

      if (normalizedType === "note" || normalizedType === "comment") {
        const comment: ParsedTodoistComment = {
          relativePath: entry.relativePath,
          rowNumber,
          title: title || "Untitled Todoist comment",
          targetTaskSourceId: lastTask?.sourceId ?? null,
          attachmentUrls,
          issues: lastTask === null
            ? [{
                severity: "warning",
                code: "orphan_comment_skipped",
                relativePath: entry.relativePath,
                rowNumber,
                message: "Todoist comment row has no preceding task and will be skipped."
              }]
            : []
        };
        comments.push(comment);
        lastTask?.comments.push(comment);
        for (const url of attachmentUrls) {
          if (!lastTask?.attachmentUrls.includes(url)) {
            lastTask?.attachmentUrls.push(url);
          }
        }
        continue;
      }

      if (normalizedType.length > 0 && normalizedType !== "task") {
        unsupportedRows.push({
          relativePath: entry.relativePath,
          rowNumber,
          type,
          title: title || type
        });
        continue;
      }

      const taskIssues: TodoistImportValidationIssue[] = [];
      if (title.length === 0) {
        taskIssues.push({
          severity: "error",
          code: "missing_task_title",
          relativePath: entry.relativePath,
          rowNumber,
          message: "Todoist task title/content is required."
        });
      }

      const dueText = normalizeNullableString(getTodoistField(row, parsed.headers, ["due"]));
      const dueAt = parseDueDate(dueText);
      if (dueText !== null && dueAt === null) {
        taskIssues.push({
          severity: "warning",
          code: "due_text_preserved",
          relativePath: entry.relativePath,
          rowNumber,
          message: `Todoist due date text "${dueText}" is preserved in the task body because it is not a concrete local date.`
        });
      }

      const priority = parsePriority(getTodoistField(row, parsed.headers, ["priority"]));
      if (priority === "invalid") {
        taskIssues.push({
          severity: "warning",
          code: "invalid_priority_preserved",
          relativePath: entry.relativePath,
          rowNumber,
          message: "Todoist priority must be an integer from 1 to 4; invalid value is preserved in source metadata."
        });
      }

      const sectionFromColumn = normalizeNullableString(getTodoistField(row, parsed.headers, ["section"]));
      const explicitSourceId = normalizeNullableString(getTodoistField(row, parsed.headers, ["id"]));
      const task: ParsedTodoistTask = {
        relativePath: entry.relativePath,
        rowNumber,
        sourceId: explicitSourceId ?? `${entry.relativePath}#row-${rowNumber}`,
        explicitSourceId,
        parentSourceId: normalizeNullableString(getTodoistField(row, parsed.headers, ["parentId"])),
        parentTitle: normalizeNullableString(getTodoistField(row, parsed.headers, ["parent"])),
        title,
        description: normalizeNullableString(getTodoistField(row, parsed.headers, ["description"])),
        sectionTitle: sectionFromColumn ?? currentSectionTitle,
        dueText,
        dueAt,
        labels: splitList(getTodoistField(row, parsed.headers, ["labels"])),
        priority: priority === "invalid" ? null : priority,
        indent: parseIndent(getTodoistField(row, parsed.headers, ["indent"])),
        comments: [],
        attachmentUrls,
        issues: taskIssues
      };
      tasks.push(task);
      lastTask = task;
    }

    return { relativePath: entry.relativePath, projectName, sections, tasks, comments, unsupportedRows, issues };
  }

  private buildRows(
    files: ParsedTodoistFile[],
    entries: NormalizedEntry[]
  ): TodoistImportPreviewRow[] {
    const rows: TodoistImportPreviewRow[] = [];

    for (const file of files) {
      rows.push({
        relativePath: file.relativePath,
        rowNumber: null,
        kind: "project",
        action: "create",
        title: file.projectName,
        projectName: file.projectName,
        parentTitle: null,
        dueText: null,
        labels: [],
        priority: null,
        attachmentUrls: [],
        issues: []
      });

      for (const section of file.sections) {
        rows.push({
          relativePath: `${section.relativePath}#row-${section.rowNumber}`,
          rowNumber: section.rowNumber,
          kind: "section",
          action: "create",
          title: section.title,
          projectName: file.projectName,
          parentTitle: null,
          dueText: null,
          labels: [],
          priority: null,
          attachmentUrls: [],
          issues: []
        });
      }

      for (const task of file.tasks) {
        rows.push({
          relativePath: `${task.relativePath}#row-${task.rowNumber}`,
          rowNumber: task.rowNumber,
          kind: "task",
          action: task.issues.some((issue) => issue.severity === "error") ? "skip" : "create",
          title: task.title || `Untitled task row ${task.rowNumber}`,
          projectName: file.projectName,
          parentTitle: task.parentTitle,
          dueText: task.dueText,
          labels: task.labels,
          priority: task.priority,
          attachmentUrls: task.attachmentUrls,
          issues: task.issues
        });
      }

      for (const comment of file.comments) {
        rows.push({
          relativePath: `${comment.relativePath}#row-${comment.rowNumber}`,
          rowNumber: comment.rowNumber,
          kind: "comment",
          action: comment.targetTaskSourceId === null ? "skip" : "append",
          title: comment.title,
          projectName: file.projectName,
          parentTitle: null,
          dueText: null,
          labels: [],
          priority: null,
          attachmentUrls: comment.attachmentUrls,
          issues: comment.issues
        });
      }

      for (const unsupported of file.unsupportedRows) {
        rows.push({
          relativePath: `${unsupported.relativePath}#row-${unsupported.rowNumber}`,
          rowNumber: unsupported.rowNumber,
          kind: "unsupported",
          action: "skip",
          title: unsupported.title,
          projectName: file.projectName,
          parentTitle: null,
          dueText: null,
          labels: [],
          priority: null,
          attachmentUrls: [],
          issues: [{
            severity: "warning",
            code: "unsupported_todoist_row_type",
            relativePath: unsupported.relativePath,
            rowNumber: unsupported.rowNumber,
            message: `Unsupported Todoist row type "${unsupported.type}" will be reported but not imported.`
          }]
        });
      }
    }

    for (const entry of entries.filter((entry) => entry.kind === "unsupported")) {
      rows.push({
        relativePath: entry.relativePath,
        rowNumber: null,
        kind: "unsupported",
        action: "skip",
        title: fileBaseName(entry.relativePath),
        projectName: null,
        parentTitle: null,
        dueText: null,
        labels: [],
        priority: null,
        attachmentUrls: [],
        issues: [{
          severity: "warning",
          code: "unsupported_todoist_export_file",
          relativePath: entry.relativePath,
          rowNumber: null,
          message: "Unsupported Todoist backup file will be reported but not imported."
        }]
      });
    }

    return rows;
  }

  private async importParsedFile(input: {
    workspaceId: string;
    actorType: ActivityActorType;
    file: ParsedTodoistFile;
    created: TodoistImportCreatedTarget[];
  }): Promise<void> {
    const serviceInput = {
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    };
    const project = await new ProjectService(serviceInput).createProject({
      workspaceId: input.workspaceId,
      name: input.file.projectName,
      description: "Imported from a local Todoist project CSV or backup ZIP export.",
      actorType: input.actorType
    });
    input.created.push({
      targetType: "project",
      id: project.project.id,
      title: project.project.name,
      relativePath: input.file.relativePath,
      rowNumber: null
    });

    const sectionByTitle = new Map<string, string>();
    for (const section of input.file.sections) {
      if (sectionByTitle.has(section.title)) {
        continue;
      }
      const item = await new ItemService(serviceInput).createItem({
        workspaceId: input.workspaceId,
        containerId: project.project.id,
        containerTabId: project.defaultTab.id,
        type: "heading",
        title: section.title,
        body: `Imported Todoist section from ${section.relativePath} row ${section.rowNumber}.`,
        actorType: input.actorType
      });
      sectionByTitle.set(section.title, item.item.id);
      input.created.push({
        targetType: "item",
        id: item.item.id,
        title: item.item.title,
        relativePath: section.relativePath,
        rowNumber: section.rowNumber
      });
    }

    const createdTasks = new Map<string, CreatedTaskInfo>();
    const explicitIds = new Map<string, string>();
    const taskTitleIndex = new Map<string, string>();
    const indentStack = new Map<number, CreatedTaskInfo>();
    const taskService = new TaskService(serviceInput);

    for (const task of input.file.tasks) {
      if (task.issues.some((issue) => issue.severity === "error")) {
        continue;
      }

      const result = await taskService.createTask({
        workspaceId: input.workspaceId,
        containerId: project.project.id,
        containerTabId: project.defaultTab.id,
        title: task.title,
        body: buildTaskBody(task),
        actorType: input.actorType,
        ...(task.dueAt === null ? {} : { dueAt: task.dueAt }),
        ...(task.priority === null ? {} : { priority: task.priority })
      });
      const info = {
        task,
        itemId: result.item.id,
        title: result.item.title,
        indent: task.indent
      };
      await this.applyTags({
        workspaceId: input.workspaceId,
        itemId: result.item.id,
        tags: task.labels,
        actorType: input.actorType
      });
      input.created.push({
        targetType: "item",
        id: result.item.id,
        title: result.item.title,
        relativePath: task.relativePath,
        rowNumber: task.rowNumber
      });

      const parent = resolveParentTask(task, createdTasks, explicitIds, taskTitleIndex, indentStack);
      if (parent !== null) {
        const relationship = await new RelationshipService(serviceInput).createRelationship({
          workspaceId: input.workspaceId,
          source: { type: "item", id: result.item.id },
          target: { type: "item", id: parent.itemId },
          relationType: "belongs_to",
          label: "Todoist subtask",
          actorType: input.actorType
        });
        if (relationship.changed) {
          input.created.push({
            targetType: "relationship",
            id: relationship.relationship.id,
            title: `${result.item.title} belongs to ${parent.title}`,
            relativePath: task.relativePath,
            rowNumber: task.rowNumber
          });
        }
      }

      createdTasks.set(task.sourceId, info);
      if (task.explicitSourceId !== null) {
        explicitIds.set(task.explicitSourceId, task.sourceId);
      }
      taskTitleIndex.set(normalizeHeader(task.title), task.sourceId);
      indentStack.set(task.indent, info);
      for (const depth of Array.from(indentStack.keys())) {
        if (depth > task.indent) {
          indentStack.delete(depth);
        }
      }

      const sectionId = task.sectionTitle === null ? null : sectionByTitle.get(task.sectionTitle) ?? null;
      if (sectionId !== null) {
        const relationship = await new RelationshipService(serviceInput).createRelationship({
          workspaceId: input.workspaceId,
          source: { type: "item", id: result.item.id },
          target: { type: "item", id: sectionId },
          relationType: "belongs_to",
          label: "Todoist section",
          actorType: input.actorType
        });
        if (relationship.changed) {
          input.created.push({
            targetType: "relationship",
            id: relationship.relationship.id,
            title: `${result.item.title} belongs to ${task.sectionTitle}`,
            relativePath: task.relativePath,
            rowNumber: task.rowNumber
          });
        }
      }
    }
  }

  private async applyTags(input: {
    workspaceId: string;
    itemId: string;
    tags: string[];
    actorType: ActivityActorType;
  }): Promise<void> {
    const tagService = new TagService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
    for (const tag of input.tags) {
      await tagService.addTagToTarget({
        workspaceId: input.workspaceId,
        targetType: "item",
        targetId: input.itemId,
        name: tag,
        source: "imported",
        actorType: input.actorType
      });
    }
  }

  private logImportCompleted(input: {
    workspaceId: string;
    actorType: ActivityActorType;
    importedAt: string;
    sourceKind: TodoistImportSourceKind;
    projectCount: number;
    taskCount: number;
    createdCount: number;
    issueCount: number;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.todoistImportCompleted,
      targetType: "workspace",
      targetId: input.workspaceId,
      summary: `Imported Todoist ${input.sourceKind === "backup_zip" ? "backup ZIP" : "project CSV"}.`,
      beforeJson: null,
      afterJson: JSON.stringify(input),
      timestamp: input.importedAt
    });
  }
}

function buildSourceReport(files: ParsedTodoistFile[]): TodoistImportSourceReport {
  const inertAttachmentUrls = files.flatMap((file) =>
    file.tasks.flatMap((task) =>
      task.attachmentUrls.map((url) => ({
        relativePath: task.relativePath,
        rowNumber: task.rowNumber,
        url
      }))
    )
  );

  return {
    completedAndArchivedMayBeAbsent: true,
    inertAttachmentUrls,
    unsupportedRows: files.flatMap((file) =>
      file.unsupportedRows.map((row) => ({
        relativePath: row.relativePath,
        rowNumber: row.rowNumber,
        type: row.type
      }))
    )
  };
}

function resolveParentTask(
  task: ParsedTodoistTask,
  createdTasks: Map<string, CreatedTaskInfo>,
  explicitIds: Map<string, string>,
  taskTitleIndex: Map<string, string>,
  indentStack: Map<number, CreatedTaskInfo>
): CreatedTaskInfo | null {
  if (task.parentSourceId !== null) {
    const sourceId = explicitIds.get(task.parentSourceId) ?? task.parentSourceId;
    return createdTasks.get(sourceId) ?? null;
  }

  if (task.parentTitle !== null) {
    const sourceId = taskTitleIndex.get(normalizeHeader(task.parentTitle));
    return sourceId === undefined ? null : createdTasks.get(sourceId) ?? null;
  }

  if (task.indent <= 1) {
    return null;
  }

  for (let depth = task.indent - 1; depth >= 1; depth -= 1) {
    const parent = indentStack.get(depth);
    if (parent !== undefined) {
      return parent;
    }
  }

  return null;
}

function buildTaskBody(task: ParsedTodoistTask): string {
  const lines: string[] = [];
  if (task.description !== null) {
    lines.push(task.description);
  }
  lines.push("");
  lines.push("Imported from Todoist.");
  lines.push(`Source: ${task.relativePath} row ${task.rowNumber}`);
  if (task.sectionTitle !== null) {
    lines.push(`Section: ${task.sectionTitle}`);
  }
  if (task.dueText !== null) {
    lines.push(`Todoist due text: ${task.dueText}`);
  }
  if (task.explicitSourceId !== null) {
    lines.push(`Todoist ID: ${task.explicitSourceId}`);
  }
  if (task.parentSourceId !== null) {
    lines.push(`Todoist parent ID: ${task.parentSourceId}`);
  }
  if (task.parentTitle !== null) {
    lines.push(`Todoist parent: ${task.parentTitle}`);
  }
  if (task.comments.length > 0) {
    lines.push("");
    lines.push("Todoist comments:");
    for (const comment of task.comments) {
      lines.push(`- ${comment.title}`);
    }
  }
  if (task.attachmentUrls.length > 0) {
    lines.push("");
    lines.push("Todoist attachment links (not downloaded):");
    for (const url of task.attachmentUrls) {
      lines.push(`- ${url}`);
    }
  }
  return lines.join("\n").trim();
}

type TodoistField =
  | "type"
  | "content"
  | "title"
  | "description"
  | "priority"
  | "indent"
  | "due"
  | "labels"
  | "section"
  | "id"
  | "parentId"
  | "parent"
  | "comment"
  | "attachment"
  | "url"
  | "project";

function getTodoistField(
  row: Record<string, string>,
  headers: string[],
  fields: TodoistField[]
): string {
  const aliases: Record<TodoistField, string[]> = {
    type: ["type", "item type", "row type"],
    content: ["content", "task", "task name", "name", "title"],
    title: ["title", "content", "task", "task name", "name"],
    description: ["description", "desc", "notes", "note"],
    priority: ["priority", "prio"],
    indent: ["indent", "level", "depth"],
    due: ["date", "due", "due date", "due string", "date string"],
    labels: ["labels", "label", "tags", "tag"],
    section: ["section", "section name"],
    id: ["id", "task id", "todoist id", "task_id"],
    parentId: ["parent id", "parent task id", "parent_id"],
    parent: ["parent", "parent task", "parent title"],
    comment: ["comment", "comments", "note"],
    attachment: ["attachment", "attachments", "attachment url", "attachment urls", "file attachment", "file attachments"],
    url: ["url", "link", "links"],
    project: ["project", "project name"]
  };
  for (const field of fields) {
    const header = findHeader(headers, aliases[field]);
    const value = header === null ? "" : row[header] ?? "";
    if (value.trim().length > 0) {
      return value;
    }
  }
  return "";
}

function inferProjectName(
  rows: Array<Record<string, string>>,
  headers: string[],
  relativePath: string
): string {
  const projectHeader = findHeader(headers, ["project", "project name"]);
  if (projectHeader !== null) {
    const project = rows.map((row) => row[projectHeader]?.trim() ?? "").find((value) => value.length > 0);
    if (project !== undefined) {
      return project;
    }
  }
  return fileBaseName(relativePath).replace(/\.csv$/i, "") || "Todoist project";
}

function findHeader(headers: string[], aliases: string[]): string | null {
  const normalizedAliases = aliases.map((alias) => normalizeHeader(alias));
  const exact = headers.find((header) => normalizedAliases.includes(normalizeHeader(header)));
  if (exact !== undefined) {
    return exact;
  }
  return headers.find((header) =>
    normalizedAliases.some((alias) => normalizeHeader(header).includes(alias))
  ) ?? null;
}

function parseDueDate(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  try {
    return normalizeTaskDateTime(value, "dueAt") ?? null;
  } catch {
    return null;
  }
}

function parsePriority(value: string): number | "invalid" | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed.replace(/^p/i, ""));
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 4) {
    return "invalid";
  }
  return parsed;
}

function parseIndent(value: string): number {
  const parsed = Number(value.trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function splitList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[;,]/)
        .map((entry) => entry.trim().replace(/^@/, ""))
        .filter(Boolean)
    )
  );
}

function extractAttachmentUrls(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[\s,;]+/)
        .map((entry) => entry.trim().replace(/[.)\]]+$/, ""))
        .filter((entry) => /^https?:\/\//i.test(entry))
    )
  );
}

function inferSourceKind(rootName: string, entries: NormalizedEntry[]): TodoistImportSourceKind {
  const csvCount = entries.filter((entry) => entry.kind === "csv").length;
  return rootName.toLowerCase().endsWith(".zip") || csvCount > 1 ? "backup_zip" : "project_csv";
}

function normalizeRelativePath(value: string): string | null {
  const normalized = value.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    normalized.length === 0 ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    /^[a-zA-Z]:/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function fileBaseName(relativePath: string): string {
  return relativePath.split("/").filter(Boolean).at(-1) ?? relativePath;
}

function normalizeTitle(value: string, fallback: string): string {
  const normalized = value.trim();
  return normalized.length === 0 ? fallback : normalized;
}

function normalizeNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
