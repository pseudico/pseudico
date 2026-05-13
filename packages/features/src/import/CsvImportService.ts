import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  isContactFieldType,
  isTaskStatus,
  type ActivityActorType,
  type ContactFieldType,
  type TaskStatus
} from "@local-work-os/core";
import {
  ActivityLogService,
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  type CategoryRecord,
  type ContainerRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import { ContactService, type CreateContactResult } from "../contacts";
import { InboxService } from "../inbox";
import { CategoryService } from "../metadata/CategoryService";
import { TagService } from "../metadata/TagService";
import { ProjectService, type CreateProjectResult } from "../projects";
import { TaskService } from "../tasks";

export type CsvImportTargetType = "task" | "contact" | "project";
export type CsvImportFormat = "csv" | "tsv";
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

export type CsvImportPreviewInput = {
  workspaceId: string;
  contents: string;
  targetType: CsvImportTargetType;
  format?: CsvImportFormat;
  mapping?: CsvImportColumnMapping;
  conflictStrategy?: CsvImportConflictStrategy;
  missingContainerStrategy?: CsvImportMissingContainerStrategy;
  maxPreviewRows?: number;
};

export type CsvImportExecuteInput = CsvImportPreviewInput & {
  actorType?: ActivityActorType;
};

export type CsvImportValidationIssue = {
  severity: "error" | "warning";
  code: string;
  rowNumber: number | null;
  field?: CsvImportMappingField;
  message: string;
};

export type CsvImportPreviewRow = {
  rowNumber: number;
  targetType: CsvImportTargetType;
  action: "create" | "skip";
  title: string;
  containerName: string | null;
  tags: string[];
  categoryName: string | null;
  issues: CsvImportValidationIssue[];
};

export type CsvImportPreviewSummary = {
  valid: boolean;
  workspaceId: string;
  targetType: CsvImportTargetType;
  format: CsvImportFormat;
  headers: string[];
  mapping: CsvImportColumnMapping;
  rowCount: number;
  creatableCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  issues: CsvImportValidationIssue[];
  rows: CsvImportPreviewRow[];
};

export type CsvImportCreatedTarget = {
  targetType: CsvImportTargetType;
  id: string;
  title: string;
  rowNumber: number;
};

export type CsvImportExecuteSummary = CsvImportPreviewSummary & {
  importedAt: string;
  importedCount: number;
  created: CsvImportCreatedTarget[];
};

type ParsedDelimitedFile = {
  format: CsvImportFormat;
  headers: string[];
  rows: Array<Record<string, string>>;
};

type NormalizedImportRow = {
  rowNumber: number;
  targetType: CsvImportTargetType;
  title: string;
  description: string | null;
  body: string | null;
  status: string | null;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  containerName: string | null;
  categoryName: string | null;
  tags: string[];
  contactFields: Array<{ label: string; value: string; type: ContactFieldType }>;
  issues: CsvImportValidationIssue[];
};

const headerAliases: Record<CsvImportMappingField, string[]> = {
  title: ["task", "title", "summary", "item", "todo"],
  name: ["name", "project", "contact", "client", "company", "title"],
  description: ["description", "details", "notes", "note"],
  body: ["body", "details", "notes", "note", "description"],
  status: ["status", "state"],
  priority: ["priority", "prio"],
  startAt: ["start", "start at", "start date", "starts", "begin"],
  dueAt: ["due", "due at", "due date", "deadline", "end"],
  container: ["project", "container", "list", "context", "workspace", "contact"],
  category: ["category", "area", "type"],
  tags: ["tags", "tag", "labels", "label"],
  email: ["email", "e-mail", "mail"],
  phone: ["phone", "mobile", "telephone"],
  company: ["company", "organization", "organisation", "account"],
  role: ["role", "job title", "title"],
  website: ["website", "url", "site"]
};

export class CsvImportService {
  readonly module = "csvImport";

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

  parse(input: { contents: string; format?: CsvImportFormat }): ParsedDelimitedFile {
    validateNonEmptyString(input.contents, "contents");
    const format = input.format ?? inferFormat(input.contents);
    const delimiter = format === "tsv" ? "\t" : ",";
    const rows = parseDelimitedRows(stripBom(input.contents), delimiter);

    if (rows.length === 0) {
      throw new Error("Import file must contain a header row.");
    }

    const headerRow = rows[0] ?? [];
    const headers = headerRow.map((header) => header.trim());

    if (headers.length === 0 || headers.every((header) => header.length === 0)) {
      throw new Error("Import file must contain at least one column header.");
    }

    const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell.trim().length > 0));

    return {
      format,
      headers,
      rows: dataRows.map((row) => rowToRecord(headers, row))
    };
  }

  inferMapping(input: {
    headers: string[];
    targetType: CsvImportTargetType;
  }): CsvImportColumnMapping {
    const normalizedHeaders = input.headers.map((header) => ({
      original: header,
      normalized: normalizeHeader(header)
    }));
    const candidateFields = fieldsForTarget(input.targetType);
    const mapping: CsvImportColumnMapping = {};

    for (const field of candidateFields) {
      const aliases = headerAliases[field];
      const match = normalizedHeaders.find(({ normalized }) =>
        aliases.some((alias) => normalized === normalizeHeader(alias))
      ) ?? normalizedHeaders.find(({ normalized }) =>
        aliases.some((alias) => normalized.includes(normalizeHeader(alias)))
      );

      if (match !== undefined) {
        mapping[field] = match.original;
      }
    }

    return mapping;
  }

  previewImport(input: CsvImportPreviewInput): CsvImportPreviewSummary {
    this.validateBaseInput(input);
    const parsed = this.parse({
      contents: input.contents,
      ...(input.format === undefined ? {} : { format: input.format })
    });
    const mapping = {
      ...this.inferMapping({ headers: parsed.headers, targetType: input.targetType }),
      ...(input.mapping ?? {})
    };
    const rows = parsed.rows.map((row, index) =>
      this.normalizeRow({
        row,
        rowNumber: index + 2,
        targetType: input.targetType,
        mapping,
        conflictStrategy: input.conflictStrategy ?? "create_new",
        missingContainerStrategy: input.missingContainerStrategy ?? "create_project",
        workspaceId: input.workspaceId
      })
    );
    const mappedRows = rows.map((row) => this.toPreviewRow(row, input.conflictStrategy ?? "create_new"));
    const issues = rows.flatMap((row) => row.issues);
    const fileIssues = validateMapping(mapping, input.targetType);
    const allIssues = [...fileIssues, ...issues];
    const previewRows = mappedRows.slice(0, input.maxPreviewRows ?? 50);
    const errorCount = allIssues.filter((issue) => issue.severity === "error").length;
    const warningCount = allIssues.length - errorCount;

    return {
      valid: errorCount === 0,
      workspaceId: input.workspaceId,
      targetType: input.targetType,
      format: parsed.format,
      headers: parsed.headers,
      mapping,
      rowCount: rows.length,
      creatableCount: mappedRows.filter((row) => row.action === "create" && row.issues.every((issue) => issue.severity !== "error")).length,
      skippedCount: mappedRows.filter((row) => row.action === "skip").length,
      errorCount,
      warningCount,
      issues: allIssues,
      rows: previewRows
    };
  }

  async executeImport(input: CsvImportExecuteInput): Promise<CsvImportExecuteSummary> {
    const preview = this.previewImport(input);
    const importedAt = createIsoTimestamp(this.now());
    const created: CsvImportCreatedTarget[] = [];
    const issues = [...preview.issues];

    if (preview.errorCount > 0) {
      return {
        ...preview,
        importedAt,
        importedCount: 0,
        created: []
      };
    }

    const parsed = this.parse({
      contents: input.contents,
      ...(input.format === undefined ? {} : { format: input.format })
    });
    const normalizedRows = parsed.rows.map((row, index) =>
      this.normalizeRow({
        row,
        rowNumber: index + 2,
        targetType: input.targetType,
        mapping: preview.mapping,
        conflictStrategy: input.conflictStrategy ?? "create_new",
        missingContainerStrategy: input.missingContainerStrategy ?? "create_project",
        workspaceId: input.workspaceId
      })
    );

    for (const row of normalizedRows) {
      if (row.issues.some((issue) => issue.severity === "error")) {
        continue;
      }

      const previewRow = this.toPreviewRow(row, input.conflictStrategy ?? "create_new");
      if (previewRow.action === "skip") {
        continue;
      }

      try {
        const createdTarget = await this.createTarget(row, input.workspaceId, input.actorType ?? "importer");
        created.push(createdTarget);
      } catch (error) {
        issues.push({
          severity: "error",
          code: "row_import_failed",
          rowNumber: row.rowNumber,
          message: error instanceof Error ? error.message : "Row import failed."
        });
      }
    }

    this.logImportCompleted({
      workspaceId: input.workspaceId,
      actorType: input.actorType ?? "importer",
      importedAt,
      targetType: input.targetType,
      rowCount: preview.rowCount,
      importedCount: created.length,
      skippedCount: preview.skippedCount,
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

  private validateBaseInput(input: CsvImportPreviewInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.contents, "contents");

    if (!["task", "contact", "project"].includes(input.targetType)) {
      throw new Error("targetType must be task, contact, or project.");
    }
  }

  private normalizeRow(input: {
    row: Record<string, string>;
    rowNumber: number;
    targetType: CsvImportTargetType;
    mapping: CsvImportColumnMapping;
    conflictStrategy: CsvImportConflictStrategy;
    missingContainerStrategy: CsvImportMissingContainerStrategy;
    workspaceId: string;
  }): NormalizedImportRow {
    const get = (field: CsvImportMappingField): string => {
      const header = input.mapping[field];
      return header === undefined ? "" : (input.row[header] ?? "").trim();
    };
    const title = input.targetType === "task" ? get("title") : get("name");
    const issues: CsvImportValidationIssue[] = [];
    const status = get("status");
    const priorityText = get("priority");
    const startAt = get("startAt");
    const dueAt = get("dueAt");
    const tags = splitList(get("tags"));
    const contactFields = buildContactFields(input.row, input.mapping);

    if (title.length === 0) {
      issues.push({
        severity: "error",
        code: "missing_required_field",
        rowNumber: input.rowNumber,
        field: input.targetType === "task" ? "title" : "name",
        message: input.targetType === "task" ? "Task title is required." : "Name is required."
      });
    }

    if (input.targetType === "task" && status.length > 0 && !isTaskStatus(status)) {
      issues.push({
        severity: "error",
        code: "invalid_status",
        rowNumber: input.rowNumber,
        field: "status",
        message: "Task status must be open, done, waiting, someday, deferred, or cancelled."
      });
    }

    if (
      input.targetType !== "task" &&
      status.length > 0 &&
      !["active", "waiting", "completed"].includes(status)
    ) {
      issues.push({
        severity: "error",
        code: "invalid_status",
        rowNumber: input.rowNumber,
        field: "status",
        message: "Container status must be active, waiting, or completed."
      });
    }

    const priority = priorityText.length === 0 ? null : Number(priorityText);
    if (priority !== null && (!Number.isInteger(priority) || priority < 0 || priority > 4)) {
      issues.push({
        severity: "error",
        code: "invalid_priority",
        rowNumber: input.rowNumber,
        field: "priority",
        message: "Priority must be an integer from 0 to 4."
      });
    }

    for (const [field, value] of [["startAt", startAt], ["dueAt", dueAt]] as const) {
      if (value.length > 0 && Number.isNaN(new Date(dateOnlyToIso(value)).getTime())) {
        issues.push({
          severity: "error",
          code: "invalid_date",
          rowNumber: input.rowNumber,
          field,
          message: `${field} must be a valid date or ISO timestamp.`
        });
      }
    }

    const containerName = get("container");
    const categoryName = get("category");

    if (input.targetType === "task" && input.missingContainerStrategy === "error" && containerName.length > 0 && this.findContainerByName(input.workspaceId, containerName) === null) {
      issues.push({
        severity: "error",
        code: "missing_container",
        rowNumber: input.rowNumber,
        field: "container",
        message: `Container was not found: ${containerName}.`
      });
    }

    if (input.conflictStrategy === "skip_existing" && title.length > 0 && this.hasDuplicate(input.workspaceId, input.targetType, title, containerName || null)) {
      issues.push({
        severity: "warning",
        code: "duplicate_skipped",
        rowNumber: input.rowNumber,
        message: `Existing ${input.targetType} matches this row and will be skipped.`
      });
    }

    return {
      rowNumber: input.rowNumber,
      targetType: input.targetType,
      title,
      description: normalizeNullableString(get("description")),
      body: normalizeNullableString(get("body")),
      status: normalizeNullableString(status),
      priority,
      startAt: normalizeNullableString(startAt),
      dueAt: normalizeNullableString(dueAt),
      containerName: normalizeNullableString(containerName),
      categoryName: normalizeNullableString(categoryName),
      tags,
      contactFields,
      issues
    };
  }

  private toPreviewRow(row: NormalizedImportRow, conflictStrategy: CsvImportConflictStrategy): CsvImportPreviewRow {
    return {
      rowNumber: row.rowNumber,
      targetType: row.targetType,
      action: conflictStrategy === "skip_existing" && row.issues.some((issue) => issue.code === "duplicate_skipped") ? "skip" : "create",
      title: row.title,
      containerName: row.containerName,
      tags: row.tags,
      categoryName: row.categoryName,
      issues: row.issues
    };
  }

  private async createTarget(row: NormalizedImportRow, workspaceId: string, actorType: ActivityActorType): Promise<CsvImportCreatedTarget> {
    const categoryId = row.categoryName === null ? null : (await this.findOrCreateCategory(workspaceId, row.categoryName, actorType)).id;

    if (row.targetType === "project") {
      const projectService = new ProjectService({ connection: this.connection, idFactory: this.idFactory, now: this.now });
      const result = await projectService.createProject({
        workspaceId,
        name: row.title,
        actorType,
        ...(row.description === null ? {} : { description: row.description }),
        ...(categoryId === null ? {} : { categoryId })
      });
      if (row.status !== null && row.status !== "active") {
        await projectService.updateProject({
          projectId: result.project.id,
          actorType,
          status: row.status as "waiting" | "completed"
        });
      }
      await this.applyTags(workspaceId, "container", result.project.id, row.tags, actorType);
      return toCreatedTarget(row, result);
    }

    if (row.targetType === "contact") {
      const contactService = new ContactService({ connection: this.connection, idFactory: this.idFactory, now: this.now });
      const result = await contactService.createContact({
        workspaceId,
        name: row.title,
        actorType,
        ...(row.description === null ? {} : { description: row.description }),
        ...(categoryId === null ? {} : { categoryId }),
        ...(row.contactFields.length === 0 ? {} : { fields: row.contactFields })
      });
      if (row.status !== null && row.status !== "active") {
        await contactService.updateContact({
          contactId: result.contact.id,
          actorType,
          status: row.status as "waiting" | "completed"
        });
      }
      await this.applyTags(workspaceId, "container", result.contact.id, row.tags, actorType);
      return toCreatedTarget(row, result);
    }

    const container = await this.resolveTaskContainer(workspaceId, row.containerName, actorType);
    const task = await new TaskService({ connection: this.connection, idFactory: this.idFactory, now: this.now }).createTask({
      workspaceId,
      containerId: container.id,
      title: row.title,
      actorType,
      ...(row.body === null ? {} : { body: row.body }),
      ...(categoryId === null ? {} : { categoryId }),
      ...(row.status === null ? {} : { status: row.status as TaskStatus }),
      ...(row.priority === null ? {} : { priority: row.priority }),
      ...(row.startAt === null ? {} : { startAt: row.startAt }),
      ...(row.dueAt === null ? {} : { dueAt: row.dueAt })
    });
    await this.applyTags(workspaceId, "item", task.item.id, row.tags, actorType);
    return {
      targetType: "task",
      id: task.item.id,
      title: task.item.title,
      rowNumber: row.rowNumber
    };
  }

  private async resolveTaskContainer(workspaceId: string, containerName: string | null, actorType: ActivityActorType): Promise<ContainerRecord> {
    if (containerName === null || normalizeHeader(containerName) === "inbox") {
      return new InboxService({ connection: this.connection, idFactory: this.idFactory, now: this.now }).getInbox(workspaceId);
    }

    const existing = this.findContainerByName(workspaceId, containerName);
    if (existing !== null) {
      return existing;
    }

    const created = await new ProjectService({ connection: this.connection, idFactory: this.idFactory, now: this.now }).createProject({
      workspaceId,
      name: containerName,
      actorType
    });

    return created.project;
  }

  private findContainerByName(workspaceId: string, name: string): ContainerRecord | null {
    const normalized = normalizeHeader(name);
    return new ContainerRepository(this.connection)
      .listByWorkspace(workspaceId, { includeArchived: true })
      .find((container) => normalizeHeader(container.name) === normalized || normalizeHeader(container.slug) === normalized) ?? null;
  }

  private async findOrCreateCategory(workspaceId: string, name: string, actorType: ActivityActorType): Promise<CategoryRecord> {
    const slug = slugify(name, "category");
    const repository = new CategoryRepository(this.connection);
    const existing = repository.findBySlug({ workspaceId, slug });
    if (existing !== null) {
      return existing;
    }

    return await new CategoryService({ connection: this.connection, idFactory: this.idFactory, now: this.now }).createCategory({
      workspaceId,
      name,
      color: "#6b7280",
      actorType
    });
  }

  private async applyTags(workspaceId: string, targetType: "container" | "item", targetId: string, tags: string[], actorType: ActivityActorType): Promise<void> {
    const tagService = new TagService({ connection: this.connection, idFactory: this.idFactory, now: this.now });
    for (const tag of tags) {
      await tagService.addTagToTarget({ workspaceId, targetType, targetId, name: tag, source: "imported", actorType });
    }
  }

  private hasDuplicate(workspaceId: string, targetType: CsvImportTargetType, title: string, containerName: string | null): boolean {
    const normalized = normalizeHeader(title);
    if (targetType === "task") {
      const container = containerName === null ? null : this.findContainerByName(workspaceId, containerName);
      const items = container === null
        ? new ItemRepository(this.connection).listByWorkspace(workspaceId, { type: "task" })
        : new ItemRepository(this.connection).listByContainer(container.id, { type: "task" });
      return items.some((item) => normalizeHeader(item.title) === normalized);
    }

    return new ContainerRepository(this.connection)
      .listByWorkspace(workspaceId, { type: targetType, includeArchived: true })
      .some((container) => normalizeHeader(container.name) === normalized);
  }

  private logImportCompleted(input: {
    workspaceId: string;
    actorType: ActivityActorType;
    importedAt: string;
    targetType: CsvImportTargetType;
    rowCount: number;
    importedCount: number;
    skippedCount: number;
    issueCount: number;
  }): void {
    new ActivityLogService({ connection: this.connection, idFactory: this.idFactory }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.csvImportCompleted,
      targetType: "workspace",
      targetId: input.workspaceId,
      summary: `Imported ${input.importedCount} ${input.targetType} row(s) from CSV/TSV.`,
      beforeJson: null,
      afterJson: JSON.stringify(input),
      timestamp: input.importedAt
    });
  }
}

function toCreatedTarget(row: NormalizedImportRow, result: CreateProjectResult | CreateContactResult): CsvImportCreatedTarget {
  if ("project" in result) {
    return { targetType: "project", id: result.project.id, title: result.project.name, rowNumber: row.rowNumber };
  }
  return { targetType: "contact", id: result.contact.id, title: result.contact.name, rowNumber: row.rowNumber };
}

function validateMapping(mapping: CsvImportColumnMapping, targetType: CsvImportTargetType): CsvImportValidationIssue[] {
  const requiredField: CsvImportMappingField = targetType === "task" ? "title" : "name";
  if (mapping[requiredField] === undefined) {
    return [{
      severity: "error",
      code: "missing_required_mapping",
      rowNumber: null,
      field: requiredField,
      message: targetType === "task" ? "Map a source column to Task title." : "Map a source column to Name."
    }];
  }
  return [];
}

function buildContactFields(row: Record<string, string>, mapping: CsvImportColumnMapping): Array<{ label: string; value: string; type: ContactFieldType }> {
  const fields: Array<{ label: string; value: string; type: ContactFieldType }> = [];
  const add = (field: CsvImportMappingField, label: string, type: ContactFieldType): void => {
    const header = mapping[field];
    const value = header === undefined ? "" : (row[header] ?? "").trim();
    if (value.length > 0 && isContactFieldType(type)) {
      fields.push({ label, value, type, sortOrder: fields.length * 10 } as { label: string; value: string; type: ContactFieldType });
    }
  };
  add("email", "Email", "email");
  add("phone", "Phone", "phone");
  add("company", "Company", "text");
  add("role", "Role", "text");
  add("website", "Website", "website");
  return fields;
}

function parseDelimitedRows(contents: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < contents.length; index += 1) {
    const char = contents[index];
    const next = contents[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === delimiter) {
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

  return rows;
}

function rowToRecord(headers: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    record[header] = row[index] ?? "";
  });
  return record;
}

function fieldsForTarget(targetType: CsvImportTargetType): CsvImportMappingField[] {
  if (targetType === "task") {
    return ["title", "container", "status", "priority", "startAt", "dueAt", "tags", "category", "body"];
  }
  if (targetType === "contact") {
    return ["name", "email", "phone", "company", "role", "website", "tags", "category", "description"];
  }
  return ["name", "description", "status", "tags", "category"];
}

function inferFormat(contents: string): CsvImportFormat {
  const firstLine = stripBom(contents).split(/\r?\n/, 1)[0] ?? "";
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return tabs > commas ? "tsv" : "csv";
}

function splitList(value: string): string[] {
  return Array.from(new Set(value.split(/[;,]/).map((entry) => entry.trim().replace(/^@/, "")).filter(Boolean)));
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function normalizeNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function dateOnlyToIso(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? `${value.trim()}T00:00:00.000Z` : value;
}

function slugify(value: string, fallback: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.length === 0 ? fallback : slug;
}

function stripBom(value: string): string {
  return value.startsWith("\uFEFF") ? value.slice(1) : value;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}


