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
import { FileAttachmentService, type CopiedAttachmentFileInput } from "../files";
import { NoteService } from "../notes";
import { ProjectService } from "../projects";
import { TagService } from "../metadata/TagService";
import { TaskService } from "../tasks";

export type NotionImportEntryKind =
  | "directory"
  | "markdown"
  | "csv"
  | "asset"
  | "unsupported";

export type NotionImportSourceEntry = {
  relativePath: string;
  kind: NotionImportEntryKind;
  content?: string;
  sizeBytes?: number;
  mimeType?: string | null;
  copiedFile?: CopiedAttachmentFileInput;
};

export type NotionImportPreviewInput = {
  workspaceId: string;
  rootName: string;
  entries: NotionImportSourceEntry[];
  projectName?: string;
  maxPreviewRows?: number;
};

export type NotionImportExecuteInput = NotionImportPreviewInput & {
  actorType?: ActivityActorType;
};

export type NotionImportValidationIssue = {
  severity: "error" | "warning";
  code: string;
  relativePath: string | null;
  message: string;
};

export type NotionImportPreviewRow = {
  relativePath: string;
  kind: "project" | "page" | "database_row" | "asset" | "unsupported";
  action: "create" | "skip";
  title: string;
  sourceType: NotionImportEntryKind | "project";
  issues: NotionImportValidationIssue[];
};

export type NotionImportSourceReport = {
  unsupportedBlocks: Array<{ relativePath: string; detail: string }>;
  unsupportedFields: Array<{ relativePath: string; field: string }>;
  inertAttachmentUrls: Array<{ relativePath: string; url: string }>;
};

export type NotionImportPreviewSummary = {
  valid: boolean;
  workspaceId: string;
  projectName: string;
  entryCount: number;
  pageCount: number;
  databaseCount: number;
  databaseRowCount: number;
  assetCount: number;
  unsupportedCount: number;
  creatableCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  issues: NotionImportValidationIssue[];
  rows: NotionImportPreviewRow[];
  sourceReport: NotionImportSourceReport;
};

export type NotionImportCreatedTarget = {
  targetType: "project" | "item" | "attachment";
  id: string;
  title: string;
  relativePath: string;
};

export type NotionImportExecuteSummary = NotionImportPreviewSummary & {
  importedAt: string;
  importedCount: number;
  created: NotionImportCreatedTarget[];
};

type NormalizedEntry = NotionImportSourceEntry & {
  relativePath: string;
};

type ParsedDatabaseRow = {
  rowNumber: number;
  title: string;
  body: string;
  dueAt: string | null;
  tags: string[];
  issues: NotionImportValidationIssue[];
};

export class NotionImportService {
  readonly module = "notionImport";

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

  previewImport(input: NotionImportPreviewInput): NotionImportPreviewSummary {
    const normalized = this.normalizeInput(input);
    const sourceReport = buildSourceReport(normalized.entries);
    const issues = [...normalized.issues, ...sourceReportToIssues(sourceReport)];
    const rows = this.buildRows(normalized.entries, normalized.projectName, issues);
    const allIssues = [...issues, ...rows.flatMap((row) => row.issues)];
    const errorCount = allIssues.filter((issue) => issue.severity === "error").length;
    const warningCount = allIssues.length - errorCount;
    const previewRows = rows.slice(0, input.maxPreviewRows ?? 100);

    return {
      valid: errorCount === 0,
      workspaceId: input.workspaceId,
      projectName: normalized.projectName,
      entryCount: normalized.entries.length,
      pageCount: normalized.entries.filter((entry) => entry.kind === "markdown").length,
      databaseCount: normalized.entries.filter((entry) => entry.kind === "csv").length,
      databaseRowCount: rows.filter((row) => row.kind === "database_row").length,
      assetCount: normalized.entries.filter((entry) => entry.kind === "asset").length,
      unsupportedCount: normalized.entries.filter((entry) => entry.kind === "unsupported").length,
      creatableCount: rows.filter((row) => row.action === "create").length,
      skippedCount: rows.filter((row) => row.action === "skip").length,
      errorCount,
      warningCount,
      issues: allIssues,
      rows: previewRows,
      sourceReport
    };
  }

  async executeImport(input: NotionImportExecuteInput): Promise<NotionImportExecuteSummary> {
    const preview = this.previewImport(input);
    const importedAt = createIsoTimestamp(this.now());

    if (!preview.valid) {
      return { ...preview, importedAt, importedCount: 0, created: [] };
    }

    const normalized = this.normalizeInput(input);
    const actorType = input.actorType ?? "importer";
    const created: NotionImportCreatedTarget[] = [];
    const issues = [...preview.issues];

    try {
      const project = await new ProjectService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).createProject({
        workspaceId: input.workspaceId,
        name: normalized.projectName,
        description: "Imported from a local Notion Markdown/CSV export.",
        actorType
      });
      created.push({
        targetType: "project",
        id: project.project.id,
        title: project.project.name,
        relativePath: "."
      });

      for (const entry of normalized.entries) {
        if (entry.kind === "markdown") {
          const note = await new NoteService({
            connection: this.connection,
            idFactory: this.idFactory,
            now: this.now
          }).createNote({
            workspaceId: input.workspaceId,
            containerId: project.project.id,
            containerTabId: project.defaultTab.id,
            title: titleForMarkdown(entry),
            content: entry.content ?? "",
            actorType
          });
          created.push({
            targetType: "item",
            id: note.item.id,
            title: note.item.title,
            relativePath: entry.relativePath
          });
          continue;
        }

        if (entry.kind === "csv") {
          for (const row of parseDatabaseRows(entry)) {
            if (row.title.length === 0) {
              issues.push(...row.issues);
              continue;
            }
            const task = await new TaskService({
              connection: this.connection,
              idFactory: this.idFactory,
              now: this.now
            }).createTask({
              workspaceId: input.workspaceId,
              containerId: project.project.id,
              title: row.title,
              body: row.body,
              actorType,
              ...(row.dueAt === null ? {} : { dueAt: row.dueAt })
            });
            await this.applyTags({
              workspaceId: input.workspaceId,
              itemId: task.item.id,
              tags: row.tags,
              actorType
            });
            created.push({
              targetType: "item",
              id: task.item.id,
              title: task.item.title,
              relativePath: `${entry.relativePath}#row-${row.rowNumber}`
            });
          }
          continue;
        }

        if (entry.kind === "asset") {
          if (entry.copiedFile === undefined) {
            issues.push({
              severity: "error",
              code: "missing_copied_asset",
              relativePath: entry.relativePath,
              message: "Notion assets must be copied into workspace attachments before execution."
            });
            continue;
          }
          const file = await new FileAttachmentService({
            connection: this.connection,
            idFactory: this.idFactory,
            now: this.now
          }).attachFileToContainer({
            workspaceId: input.workspaceId,
            containerId: project.project.id,
            containerTabId: project.defaultTab.id,
            copiedFile: entry.copiedFile,
            description: `Imported from Notion export path ${entry.relativePath}`,
            actorType
          });
          created.push({
            targetType: "item",
            id: file.item.id,
            title: file.item.title,
            relativePath: entry.relativePath
          });
          created.push({
            targetType: "attachment",
            id: file.attachment.id,
            title: file.attachment.originalName,
            relativePath: entry.relativePath
          });
        }
      }
    } catch (error) {
      issues.push({
        severity: "error",
        code: "import_failed",
        relativePath: null,
        message: error instanceof Error ? error.message : "Notion import failed."
      });
    }

    this.logImportCompleted({
      workspaceId: input.workspaceId,
      actorType,
      importedAt,
      projectName: normalized.projectName,
      createdCount: created.length,
      issueCount: issues.length,
      sourceCount: normalized.entries.length
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

  private normalizeInput(input: NotionImportPreviewInput): {
    projectName: string;
    entries: NormalizedEntry[];
    issues: NotionImportValidationIssue[];
  } {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const projectName = normalizeTitle(input.projectName ?? input.rootName, "Imported Notion export");
    const issues: NotionImportValidationIssue[] = [];
    const seen = new Set<string>();
    const entries: NormalizedEntry[] = [];

    for (const rawEntry of input.entries) {
      const relativePath = normalizeRelativePath(rawEntry.relativePath);
      if (relativePath === null) {
        issues.push({
          severity: "error",
          code: "unsafe_path",
          relativePath: rawEntry.relativePath,
          message: "Notion import paths must be relative and stay inside the selected local export."
        });
        continue;
      }
      if (seen.has(relativePath)) {
        issues.push({
          severity: "warning",
          code: "duplicate_path_skipped",
          relativePath,
          message: "Duplicate Notion export path will be skipped."
        });
        continue;
      }
      seen.add(relativePath);

      if (!["directory", "markdown", "csv", "asset", "unsupported"].includes(rawEntry.kind)) {
        issues.push({
          severity: "error",
          code: "invalid_entry_kind",
          relativePath,
          message: "Notion import entry kind must be directory, markdown, csv, asset, or unsupported."
        });
        continue;
      }
      if ((rawEntry.kind === "markdown" || rawEntry.kind === "csv") && rawEntry.content === undefined) {
        issues.push({
          severity: "error",
          code: "missing_content",
          relativePath,
          message: "Notion Markdown and CSV entries require content for preview and import."
        });
      }
      entries.push({ ...rawEntry, relativePath });
    }

    entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

    if (!entries.some((entry) => entry.kind === "markdown" || entry.kind === "csv")) {
      issues.push({
        severity: "error",
        code: "empty_notion_export",
        relativePath: null,
        message: "Selected Notion export does not contain Markdown pages or database CSV files."
      });
    }

    return { projectName, entries, issues };
  }

  private buildRows(
    entries: NormalizedEntry[],
    projectName: string,
    issues: NotionImportValidationIssue[]
  ): NotionImportPreviewRow[] {
    const rows: NotionImportPreviewRow[] = [{
      relativePath: ".",
      kind: "project",
      action: "create",
      title: projectName,
      sourceType: "project",
      issues: []
    }];

    for (const entry of entries) {
      if (entry.kind === "markdown") {
        rows.push({
          relativePath: entry.relativePath,
          kind: "page",
          action: "create",
          title: titleForMarkdown(entry),
          sourceType: entry.kind,
          issues: []
        });
        continue;
      }

      if (entry.kind === "csv") {
        for (const row of parseDatabaseRows(entry)) {
          rows.push({
            relativePath: `${entry.relativePath}#row-${row.rowNumber}`,
            kind: "database_row",
            action: row.title.length === 0 ? "skip" : "create",
            title: row.title || `Untitled row ${row.rowNumber}`,
            sourceType: entry.kind,
            issues: row.issues
          });
        }
        continue;
      }

      if (entry.kind === "asset") {
        rows.push({
          relativePath: entry.relativePath,
          kind: "asset",
          action: "create",
          title: fileBaseName(entry.relativePath),
          sourceType: entry.kind,
          issues: []
        });
        continue;
      }

      if (entry.kind === "unsupported") {
        issues.push({
          severity: "warning",
          code: "unsupported_export_file",
          relativePath: entry.relativePath,
          message: "Unsupported Notion export file will be reported but not imported."
        });
        rows.push({
          relativePath: entry.relativePath,
          kind: "unsupported",
          action: "skip",
          title: fileBaseName(entry.relativePath),
          sourceType: entry.kind,
          issues: []
        });
      }
    }

    return rows;
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
    projectName: string;
    createdCount: number;
    issueCount: number;
    sourceCount: number;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.notionImportCompleted,
      targetType: "workspace",
      targetId: input.workspaceId,
      summary: `Imported Notion export "${input.projectName}".`,
      beforeJson: null,
      afterJson: JSON.stringify(input),
      timestamp: input.importedAt
    });
  }
}

function parseDatabaseRows(entry: NormalizedEntry): ParsedDatabaseRow[] {
  const table = parseCsv(entry.content ?? "");
  if (table.length === 0) {
    return [];
  }
  const headers = table[0] ?? [];
  const titleHeader = findHeader(headers, ["Name", "Title", "Task", "Page"]);
  const dueHeader = findHeader(headers, ["Due", "Due Date", "Date"]);
  const tagHeader = findHeader(headers, ["Tags", "Tag", "Labels", "Multi-select", "Multi Select"]);
  const rows: ParsedDatabaseRow[] = [];

  for (const [index, cells] of table.slice(1).entries()) {
    const record = rowToRecord(headers, cells);
    const rowNumber = index + 2;
    const title = titleHeader === null ? "" : (record[titleHeader] ?? "").trim();
    const dueText = dueHeader === null ? "" : (record[dueHeader] ?? "").trim();
    const dueAt = dueText.length === 0 ? null : dateOnlyToIso(dueText);
    const issues: NotionImportValidationIssue[] = [];

    if (titleHeader === null) {
      issues.push({
        severity: "warning",
        code: "missing_title_column",
        relativePath: `${entry.relativePath}#row-${rowNumber}`,
        message: "Notion database CSV row has no Name, Title, Task, or Page column and will be skipped."
      });
    } else if (title.length === 0) {
      issues.push({
        severity: "warning",
        code: "missing_row_title",
        relativePath: `${entry.relativePath}#row-${rowNumber}`,
        message: "Notion database CSV row has an empty title and will be skipped."
      });
    }

    if (dueText.length > 0 && Number.isNaN(new Date(dueAt ?? "").getTime())) {
      issues.push({
        severity: "warning",
        code: "unsupported_date_value",
        relativePath: `${entry.relativePath}#row-${rowNumber}`,
        message: `Could not parse Notion date value "${dueText}"; it will be preserved in the task body.`
      });
    }

    rows.push({
      rowNumber,
      title,
      dueAt: dueText.length > 0 && issues.every((issue) => issue.code !== "unsupported_date_value")
        ? dueAt
        : null,
      tags: tagHeader === null ? [] : splitList(record[tagHeader] ?? ""),
      body: databaseRowBody(entry.relativePath, record),
      issues
    });
  }

  return rows;
}

function buildSourceReport(entries: NormalizedEntry[]): NotionImportSourceReport {
  const unsupportedBlocks: NotionImportSourceReport["unsupportedBlocks"] = [];
  const unsupportedFields: NotionImportSourceReport["unsupportedFields"] = [];
  const inertAttachmentUrls: NotionImportSourceReport["inertAttachmentUrls"] = [];

  for (const entry of entries) {
    if (entry.kind === "markdown") {
      const content = entry.content ?? "";
      for (const marker of ["[Unsupported block]", "<iframe", "<script", "```mermaid"]) {
        if (content.toLowerCase().includes(marker.toLowerCase())) {
          unsupportedBlocks.push({ relativePath: entry.relativePath, detail: marker });
        }
      }
      for (const match of content.matchAll(/https?:\/\/[^\s)]+/g)) {
        inertAttachmentUrls.push({ relativePath: entry.relativePath, url: match[0] });
      }
    }

    if (entry.kind === "csv") {
      const headers = parseCsv(entry.content ?? "")[0] ?? [];
      for (const header of headers) {
        if (isUnsupportedNotionField(header)) {
          unsupportedFields.push({ relativePath: entry.relativePath, field: header });
        }
      }
    }
  }

  return { unsupportedBlocks, unsupportedFields, inertAttachmentUrls };
}

function sourceReportToIssues(report: NotionImportSourceReport): NotionImportValidationIssue[] {
  return [
    ...report.unsupportedBlocks.map((block) => ({
      severity: "warning" as const,
      code: "unsupported_block",
      relativePath: block.relativePath,
      message: `Unsupported Notion block marker preserved as Markdown/source report: ${block.detail}.`
    })),
    ...report.unsupportedFields.map((field) => ({
      severity: "warning" as const,
      code: "unsupported_source_field",
      relativePath: field.relativePath,
      message: `Notion source field "${field.field}" is preserved in the task body but has no first-class mapping.`
    })),
    ...report.inertAttachmentUrls.map((url) => ({
      severity: "warning" as const,
      code: "inert_remote_url",
      relativePath: url.relativePath,
      message: `Remote URL is preserved as text and will not be fetched: ${url.url}.`
    }))
  ];
}

function parseCsv(contents: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < contents.length; index += 1) {
    const char = contents[index];
    const next = contents[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((cellValue) => cellValue.trim().length > 0));
}

function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    record[header] = row[index] ?? "";
  });
  return record;
}

function databaseRowBody(relativePath: string, row: Record<string, string>): string {
  const fields = Object.entries(row)
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n");

  return [`Imported from Notion database CSV: ${relativePath}`, "", fields].join("\n").trim();
}

function titleForMarkdown(entry: NormalizedEntry): string {
  const content = entry.content ?? "";
  const heading = content
    .split(/\r?\n/)
    .map((line) => line.match(/^#\s+(.+)$/)?.[1]?.trim())
    .find((value): value is string => value !== undefined && value.length > 0);
  return normalizeTitle(heading ?? stripExtension(fileBaseName(entry.relativePath)), "Untitled Notion page");
}

function findHeader(headers: string[], candidates: string[]): string | null {
  const normalizedCandidates = new Set(candidates.map(normalizeHeader));
  return headers.find((header) => normalizedCandidates.has(normalizeHeader(header))) ?? null;
}

function isUnsupportedNotionField(header: string): boolean {
  return [
    "person",
    "people",
    "relation",
    "rollup",
    "formula",
    "created by",
    "last edited by"
  ].includes(normalizeHeader(header));
}

function splitList(value: string): string[] {
  return Array.from(new Set(
    value
      .split(/[;,]/)
      .map((entry) => entry.trim().replace(/^@/, ""))
      .filter(Boolean)
  ));
}

function normalizeRelativePath(value: string): string | null {
  if (value.includes("\0") || /^[a-zA-Z]:/.test(value) || value.startsWith("/") || value.startsWith("\\")) {
    return null;
  }
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "");
  const segments = normalized.split("/");
  if (
    segments.length === 0 ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    return null;
  }
  return segments.join("/");
}

function normalizeTitle(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length === 0 ? fallback : trimmed;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function fileBaseName(relativePath: string): string {
  return relativePath.split("/").at(-1) ?? relativePath;
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.(md|markdown|csv)$/i, "");
}

function dateOnlyToIso(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? `${value.trim()}T00:00:00.000Z`
    : value;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
