import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  parseUniqueWikilinkTitles,
  slugifyTagName,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ContainerRepository,
  type DatabaseConnection
} from "@local-work-os/db";
import { TagService } from "../metadata/TagService";
import { NoteService } from "../notes";

export type MarkdownNoteImportSourceFile = {
  relativePath: string;
  content: string;
  containerId?: string;
  containerTabId?: string | null;
};

export type MarkdownNoteImportPreviewInput = {
  workspaceId: string;
  containerId: string;
  containerTabId?: string | null;
  files: MarkdownNoteImportSourceFile[];
  maxPreviewRows?: number;
};

export type MarkdownNoteImportExecuteInput = MarkdownNoteImportPreviewInput & {
  actorType?: ActivityActorType;
};

export type MarkdownNoteImportValidationIssue = {
  severity: "error" | "warning";
  code: string;
  relativePath: string | null;
  message: string;
};

export type MarkdownNoteImportPreviewRow = {
  relativePath: string;
  action: "create" | "skip";
  title: string;
  containerId: string;
  containerTabId: string | null;
  tags: string[];
  wikilinks: string[];
  issues: MarkdownNoteImportValidationIssue[];
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
  issues: MarkdownNoteImportValidationIssue[];
  rows: MarkdownNoteImportPreviewRow[];
};

export type MarkdownNoteImportCreatedTarget = {
  targetType: "item";
  id: string;
  title: string;
  relativePath: string;
};

export type MarkdownNoteImportExecuteSummary = MarkdownNoteImportPreviewSummary & {
  importedAt: string;
  importedCount: number;
  created: MarkdownNoteImportCreatedTarget[];
};

type NormalizedMarkdownNoteFile = MarkdownNoteImportSourceFile & {
  relativePath: string;
  containerId: string;
  containerTabId: string | null;
  title: string;
  body: string;
  tags: string[];
  wikilinks: string[];
  issues: MarkdownNoteImportValidationIssue[];
};

type ParsedFrontmatter = {
  body: string;
  fields: Record<string, string[]>;
};

export class MarkdownNoteImporter {
  readonly module = "markdownNoteImporter";

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

  previewMarkdownImport(input: MarkdownNoteImportPreviewInput): MarkdownNoteImportPreviewSummary {
    const normalized = this.normalizeInput(input);
    const allIssues = [
      ...normalized.inputIssues,
      ...normalized.files.flatMap((file) => file.issues)
    ];
    const errorCount = allIssues.filter((issue) => issue.severity === "error").length;
    const warningCount = allIssues.length - errorCount;
    const rows = normalized.files.map((file) => ({
      relativePath: file.relativePath,
      action: file.issues.some((issue) => issue.code === "duplicate_path_skipped" || issue.severity === "error") ? "skip" as const : "create" as const,
      title: file.title,
      containerId: file.containerId,
      containerTabId: file.containerTabId,
      tags: file.tags,
      wikilinks: file.wikilinks,
      issues: file.issues
    }));
    const previewRows = rows.slice(0, input.maxPreviewRows ?? 75);

    return {
      valid: errorCount === 0,
      workspaceId: input.workspaceId,
      rowCount: rows.length,
      markdownCount: normalized.files.filter((file) => isMarkdownPath(file.relativePath)).length,
      creatableCount: rows.filter((row) => row.action === "create").length,
      skippedCount: rows.filter((row) => row.action === "skip").length,
      errorCount,
      warningCount,
      issues: allIssues,
      rows: previewRows
    };
  }

  async applyMarkdownImport(input: MarkdownNoteImportExecuteInput): Promise<MarkdownNoteImportExecuteSummary> {
    const preview = this.previewMarkdownImport(input);
    const importedAt = createIsoTimestamp(this.now());
    const actorType = input.actorType ?? "importer";

    if (preview.errorCount > 0) {
      return { ...preview, importedAt, importedCount: 0, created: [] };
    }

    const normalized = this.normalizeInput(input);
    const issues = [...preview.issues];
    const created: MarkdownNoteImportCreatedTarget[] = [];
    const noteService = new NoteService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
    const tagService = new TagService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });

    for (const file of normalized.files) {
      if (file.issues.some((issue) => issue.severity === "error" || issue.code === "duplicate_path_skipped")) {
        continue;
      }

      try {
        const note = await noteService.createNote({
          workspaceId: input.workspaceId,
          containerId: file.containerId,
          containerTabId: file.containerTabId,
          title: file.title,
          content: file.body,
          actorType
        });
        for (const tag of file.tags) {
          await tagService.addTagToTarget({
            workspaceId: input.workspaceId,
            targetType: "item",
            targetId: note.item.id,
            name: tag,
            source: "imported",
            actorType
          });
        }
        created.push({
          targetType: "item",
          id: note.item.id,
          title: note.item.title,
          relativePath: file.relativePath
        });
      } catch (error) {
        issues.push({
          severity: "error",
          code: "row_import_failed",
          relativePath: file.relativePath,
          message: error instanceof Error ? error.message : "Markdown note import failed."
        });
      }
    }

    this.logImportCompleted({
      workspaceId: input.workspaceId,
      actorType,
      importedAt,
      fileCount: normalized.files.length,
      importedCount: created.length,
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

  private normalizeInput(input: MarkdownNoteImportPreviewInput): {
    inputIssues: MarkdownNoteImportValidationIssue[];
    files: NormalizedMarkdownNoteFile[];
  } {
    const inputIssues: MarkdownNoteImportValidationIssue[] = [];
    const files: NormalizedMarkdownNoteFile[] = [];
    const seen = new Set<string>();

    if (input.workspaceId.trim().length === 0) {
      inputIssues.push({
        severity: "error",
        code: "missing_workspace_id",
        relativePath: null,
        message: "workspaceId is required."
      });
    }
    if (input.containerId.trim().length === 0) {
      inputIssues.push({
        severity: "error",
        code: "missing_container_id",
        relativePath: null,
        message: "containerId is required."
      });
    } else {
      const container = new ContainerRepository(this.connection).getById(input.containerId);
      if (container === null || container.workspaceId !== input.workspaceId || container.deletedAt !== null) {
        inputIssues.push({
          severity: "error",
          code: "invalid_container",
          relativePath: null,
          message: "Markdown notes must import into an existing active local container."
        });
      }
    }

    if (input.files.length === 0) {
      inputIssues.push({
        severity: "error",
        code: "empty_import",
        relativePath: null,
        message: "Select at least one Markdown file to import."
      });
    }

    for (const file of input.files) {
      const normalizedPath = normalizeRelativePath(file.relativePath);
      const fileIssues: MarkdownNoteImportValidationIssue[] = [];
      if (normalizedPath === null) {
        fileIssues.push({
          severity: "error",
          code: "unsafe_path",
          relativePath: file.relativePath,
          message: "Markdown import paths must be relative and stay inside the selected file set."
        });
      }

      const relativePath = normalizedPath ?? file.relativePath;
      if (seen.has(relativePath)) {
        fileIssues.push({
          severity: "warning",
          code: "duplicate_path_skipped",
          relativePath,
          message: "Duplicate Markdown import path will be skipped."
        });
      }
      seen.add(relativePath);

      if (normalizedPath !== null && !isMarkdownPath(normalizedPath)) {
        fileIssues.push({
          severity: "error",
          code: "unsupported_file_type",
          relativePath,
          message: "Markdown note import only accepts .md or .markdown files."
        });
      }

      const parsed = parseYamlFrontmatter(file.content);
      const tags = extractTags(parsed);
      files.push({
        ...file,
        relativePath,
        containerId: file.containerId ?? input.containerId,
        containerTabId: file.containerTabId ?? input.containerTabId ?? null,
        title: titleForMarkdownFile(relativePath, parsed),
        body: contentForMarkdownImport(parsed, tags),
        tags,
        wikilinks: parseUniqueWikilinkTitles(parsed.body),
        issues: fileIssues
      });
    }

    return { inputIssues, files };
  }

  private logImportCompleted(input: {
    workspaceId: string;
    actorType: ActivityActorType;
    importedAt: string;
    fileCount: number;
    importedCount: number;
    issueCount: number;
  }): void {
    new ActivityLogService({ connection: this.connection, idFactory: this.idFactory }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.markdownNoteImportCompleted,
      targetType: "workspace",
      targetId: input.workspaceId,
      summary: `Imported ${input.importedCount} Markdown note(s).`,
      beforeJson: null,
      afterJson: JSON.stringify(input),
      timestamp: input.importedAt
    });
  }
}

function normalizeRelativePath(value: string): string | null {
  const normalized = value.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (
    normalized.length === 0 ||
    normalized === "." ||
    normalized.split("/").some((segment) => segment === "" || segment === "." || segment === "..") ||
    /^[a-z]:/i.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function isMarkdownPath(relativePath: string): boolean {
  return /\.(md|markdown)$/i.test(relativePath);
}

function titleForMarkdownFile(relativePath: string, parsed: ParsedFrontmatter): string {
  const titleFromFrontmatter = parsed.fields.title?.[0];
  const heading = parsed.body
    .split(/\r?\n/)
    .map((line) => line.match(/^#\s+(.+)$/)?.[1]?.trim())
    .find((value): value is string => value !== undefined && value.length > 0);
  return normalizeTitle(titleFromFrontmatter ?? heading ?? stripMarkdownExtension(fileBaseName(relativePath)));
}

function contentForMarkdownImport(parsed: ParsedFrontmatter, tags: string[]): string {
  if (tags.length === 0) {
    return parsed.body;
  }
  const importedTagLine = `Imported Markdown tags: ${tags.map((tag) => `@${tag}`).join(" ")}`;
  return `${parsed.body.trimEnd()}\n\n---\n${importedTagLine}`;
}

function parseYamlFrontmatter(content: string): ParsedFrontmatter {
  const normalizedContent = content.replace(/^\uFEFF/, "");
  const match = normalizedContent.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (match === null || match[1] === undefined) {
    return { body: normalizedContent, fields: {} };
  }

  const fields: Record<string, string[]> = {};
  let currentKey: string | null = null;
  for (const line of match[1].split(/\r?\n/)) {
    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyValue !== null) {
      currentKey = keyValue[1]!.trim().toLowerCase();
      fields[currentKey] = parseYamlValueForKey(currentKey, keyValue[2] ?? "");
      continue;
    }

    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem !== null && currentKey !== null) {
      fields[currentKey] = [
        ...(fields[currentKey] ?? []),
        ...parseYamlValueForKey(currentKey, listItem[1] ?? "")
      ];
    }
  }

  return {
    body: normalizedContent.slice(match[0].length),
    fields
  };
}

function parseYamlValueForKey(key: string, value: string): string[] {
  const trimmed = trimYamlScalar(value);
  if (trimmed.length === 0) {
    return [];
  }
  if (key !== "tag" && key !== "tags") {
    return [trimmed];
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return splitTagList(trimmed.slice(1, -1));
  }
  return splitTagList(trimmed);
}

function extractTags(parsed: ParsedFrontmatter): string[] {
  return uniqueStrings([
    ...normalizeImportedTags([...(parsed.fields.tags ?? []), ...(parsed.fields.tag ?? [])]),
    ...extractHashTags(parsed.body)
  ]);
}

function extractHashTags(content: string): string[] {
  const tags: string[] = [];
  const pattern = /(^|[\s([{])#([A-Za-z0-9][A-Za-z0-9/_-]*)(?![A-Za-z0-9/_-])/g;
  for (const match of content.matchAll(pattern)) {
    const tag = match[2];
    if (tag !== undefined) {
      tags.push(tag);
    }
  }
  return normalizeImportedTags(tags);
}

function normalizeImportedTags(values: string[]): string[] {
  return values
    .map((value) => value.replace(/^#+/, "").replace(/[\\/]+/g, "-").trim())
    .map((value) => slugifyTagName(value))
    .filter((value): value is string => value !== null);
}

function splitTagList(value: string): string[] {
  return value
    .split(/[;,]/)
    .map((entry) => trimYamlScalar(entry))
    .filter((entry) => entry.length > 0);
}

function trimYamlScalar(value: string): string {
  const trimmed = value.trim();
  const quoted = trimmed.match(/^["']([\s\S]*)["']$/);
  return quoted?.[1] ?? trimmed;
}

function normalizeTitle(value: string): string {
  const title = value.trim();
  return title.length > 0 ? title.slice(0, 200) : "Untitled note";
}

function fileBaseName(relativePath: string): string {
  return relativePath.split("/").pop() ?? relativePath;
}

function stripMarkdownExtension(value: string): string {
  return value.replace(/\.(md|markdown)$/i, "");
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}
