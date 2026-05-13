import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  type ContainerTabRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import { FileAttachmentService, type CopiedAttachmentFileInput } from "../files";
import { ItemService } from "../items";
import { NoteService } from "../notes";
import { ProjectService } from "../projects";
import { TabService } from "../tabs";

export type MarkdownFolderImportEntryKind = "directory" | "markdown" | "file";

export type MarkdownFolderImportSourceEntry = {
  relativePath: string;
  kind: MarkdownFolderImportEntryKind;
  content?: string;
  sizeBytes?: number;
  mimeType?: string | null;
  copiedFile?: CopiedAttachmentFileInput;
};

export type MarkdownFolderImportPreviewInput = {
  workspaceId: string;
  rootName: string;
  entries: MarkdownFolderImportSourceEntry[];
  projectName?: string;
  maxPreviewRows?: number;
};

export type MarkdownFolderImportExecuteInput = MarkdownFolderImportPreviewInput & {
  actorType?: ActivityActorType;
};

export type MarkdownFolderImportValidationIssue = {
  severity: "error" | "warning";
  code: string;
  relativePath: string | null;
  message: string;
};

export type MarkdownFolderImportPreviewRow = {
  relativePath: string;
  kind: MarkdownFolderImportEntryKind | "project" | "tab" | "heading";
  action: "create" | "skip";
  title: string;
  targetTabName: string;
  issues: MarkdownFolderImportValidationIssue[];
};

export type MarkdownFolderImportPreviewSummary = {
  valid: boolean;
  workspaceId: string;
  projectName: string;
  rowCount: number;
  directoryCount: number;
  markdownCount: number;
  fileCount: number;
  tabCount: number;
  headingCount: number;
  creatableCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  issues: MarkdownFolderImportValidationIssue[];
  rows: MarkdownFolderImportPreviewRow[];
};

export type MarkdownFolderImportCreatedTarget = {
  targetType: "project" | "container_tab" | "item" | "attachment";
  id: string;
  title: string;
  relativePath: string;
};

export type MarkdownFolderImportExecuteSummary = MarkdownFolderImportPreviewSummary & {
  importedAt: string;
  importedCount: number;
  created: MarkdownFolderImportCreatedTarget[];
};

type NormalizedEntry = MarkdownFolderImportSourceEntry & {
  relativePath: string;
  segments: string[];
};

export class MarkdownFolderImportService {
  readonly module = "markdownFolderImport";

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

  previewImport(input: MarkdownFolderImportPreviewInput): MarkdownFolderImportPreviewSummary {
    const normalized = this.normalizeInput(input);
    const issues = [...normalized.issues];
    const rows = this.buildPreviewRows(normalized.entries, normalized.projectName, issues);
    const allIssues = [...issues, ...rows.flatMap((row) => row.issues)];
    const errorCount = allIssues.filter((issue) => issue.severity === "error").length;
    const warningCount = allIssues.length - errorCount;
    const previewRows = rows.slice(0, input.maxPreviewRows ?? 75);

    return {
      valid: errorCount === 0,
      workspaceId: input.workspaceId,
      projectName: normalized.projectName,
      rowCount: rows.length,
      directoryCount: normalized.entries.filter((entry) => entry.kind === "directory").length,
      markdownCount: normalized.entries.filter((entry) => entry.kind === "markdown").length,
      fileCount: normalized.entries.filter((entry) => entry.kind === "file").length,
      tabCount: rows.filter((row) => row.kind === "tab").length,
      headingCount: rows.filter((row) => row.kind === "heading").length,
      creatableCount: rows.filter((row) => row.action === "create" && row.issues.every((issue) => issue.severity !== "error")).length,
      skippedCount: rows.filter((row) => row.action === "skip").length,
      errorCount,
      warningCount,
      issues: allIssues,
      rows: previewRows
    };
  }

  async executeImport(input: MarkdownFolderImportExecuteInput): Promise<MarkdownFolderImportExecuteSummary> {
    const preview = this.previewImport(input);
    const importedAt = createIsoTimestamp(this.now());

    if (preview.errorCount > 0) {
      return { ...preview, importedAt, importedCount: 0, created: [] };
    }

    const normalized = this.normalizeInput(input);
    const actorType = input.actorType ?? "importer";
    const created: MarkdownFolderImportCreatedTarget[] = [];
    const issues = [...preview.issues];

    try {
      const projectService = new ProjectService({ connection: this.connection, idFactory: this.idFactory, now: this.now });
      const project = await projectService.createProject({
        workspaceId: input.workspaceId,
        name: normalized.projectName,
        actorType
      });
      created.push({
        targetType: "project",
        id: project.project.id,
        title: project.project.name,
        relativePath: "."
      });

      const tabByFolder = new Map<string, ContainerTabRecord>();
      tabByFolder.set("", project.defaultTab);
      tabByFolder.set(normalizeNameKey(project.defaultTab.name), project.defaultTab);

      for (const folderName of getTopLevelFolderNames(normalized.entries)) {
        const folderKey = normalizeNameKey(folderName);
        if (folderKey === normalizeNameKey(project.defaultTab.name)) {
          tabByFolder.set(folderName, project.defaultTab);
          continue;
        }
        const tab = await new TabService({ connection: this.connection, idFactory: this.idFactory, now: this.now }).createTab({
          containerId: project.project.id,
          name: folderName,
          actorType
        });
        tabByFolder.set(folderName, tab);
        created.push({ targetType: "container_tab", id: tab.id, title: tab.name, relativePath: folderName });
      }

      for (const entry of normalized.entries) {
        if (entry.kind !== "directory" || entry.segments.length <= 1) {
          continue;
        }
        const tab = this.resolveTabForEntry(entry, tabByFolder, project.defaultTab);
        const heading = await new ItemService({ connection: this.connection, idFactory: this.idFactory, now: this.now }).createItem({
          workspaceId: input.workspaceId,
          containerId: project.project.id,
          containerTabId: tab.id,
          type: "heading",
          title: entry.segments[entry.segments.length - 1]!,
          body: `Imported folder ${entry.relativePath}`,
          actorType
        });
        created.push({ targetType: "item", id: heading.item.id, title: heading.item.title, relativePath: entry.relativePath });
      }

      for (const entry of normalized.entries) {
        if (entry.kind !== "markdown") {
          continue;
        }
        const tab = this.resolveTabForEntry(entry, tabByFolder, project.defaultTab);
        const note = await new NoteService({ connection: this.connection, idFactory: this.idFactory, now: this.now }).createNote({
          workspaceId: input.workspaceId,
          containerId: project.project.id,
          containerTabId: tab.id,
          title: titleForMarkdown(entry),
          content: entry.content ?? "",
          actorType
        });
        created.push({ targetType: "item", id: note.item.id, title: note.item.title, relativePath: entry.relativePath });
      }

      for (const entry of normalized.entries) {
        if (entry.kind !== "file") {
          continue;
        }
        if (entry.copiedFile === undefined) {
          issues.push({
            severity: "error",
            code: "missing_copied_file",
            relativePath: entry.relativePath,
            message: "Non-Markdown files must be copied into workspace attachments before execution."
          });
          continue;
        }
        const tab = this.resolveTabForEntry(entry, tabByFolder, project.defaultTab);
        const file = await new FileAttachmentService({ connection: this.connection, idFactory: this.idFactory, now: this.now }).attachFileToContainer({
          workspaceId: input.workspaceId,
          containerId: project.project.id,
          containerTabId: tab.id,
          copiedFile: entry.copiedFile,
          description: `Imported from ${entry.relativePath}`,
          actorType
        });
        created.push({ targetType: "item", id: file.item.id, title: file.item.title, relativePath: entry.relativePath });
        created.push({ targetType: "attachment", id: file.attachment.id, title: file.attachment.originalName, relativePath: entry.relativePath });
      }
    } catch (error) {
      issues.push({
        severity: "error",
        code: "import_failed",
        relativePath: null,
        message: error instanceof Error ? error.message : "Markdown folder import failed."
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

  private normalizeInput(input: MarkdownFolderImportPreviewInput): {
    projectName: string;
    entries: NormalizedEntry[];
    issues: MarkdownFolderImportValidationIssue[];
  } {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const projectName = normalizeTitle(input.projectName ?? input.rootName, "Imported folder");
    const issues: MarkdownFolderImportValidationIssue[] = [];
    const seen = new Set<string>();
    const entries: NormalizedEntry[] = [];

    for (const rawEntry of input.entries) {
      const normalizedPath = normalizeRelativePath(rawEntry.relativePath);
      if (normalizedPath === null) {
        issues.push({
          severity: "error",
          code: "unsafe_path",
          relativePath: rawEntry.relativePath,
          message: "Import paths must be relative and stay inside the selected folder."
        });
        continue;
      }

      if (seen.has(normalizedPath)) {
        issues.push({
          severity: "warning",
          code: "duplicate_path_skipped",
          relativePath: normalizedPath,
          message: "Duplicate import path will be skipped."
        });
        continue;
      }
      seen.add(normalizedPath);

      if (!["directory", "markdown", "file"].includes(rawEntry.kind)) {
        issues.push({
          severity: "error",
          code: "invalid_entry_kind",
          relativePath: normalizedPath,
          message: "Import entry kind must be directory, markdown, or file."
        });
        continue;
      }

      if (rawEntry.kind === "markdown" && rawEntry.content === undefined) {
        issues.push({
          severity: "error",
          code: "missing_markdown_content",
          relativePath: normalizedPath,
          message: "Markdown entries require file content for preview and import."
        });
      }

      entries.push({
        ...rawEntry,
        relativePath: normalizedPath,
        segments: normalizedPath.split("/")
      });
    }

    entries.sort(compareEntries);

    if (entries.length === 0) {
      issues.push({
        severity: "error",
        code: "empty_folder",
        relativePath: null,
        message: "Selected folder does not contain importable Markdown or files."
      });
    }

    return { projectName, entries, issues };
  }

  private buildPreviewRows(
    entries: NormalizedEntry[],
    projectName: string,
    issues: MarkdownFolderImportValidationIssue[]
  ): MarkdownFolderImportPreviewRow[] {
    const rows: MarkdownFolderImportPreviewRow[] = [{
      relativePath: ".",
      kind: "project",
      action: "create",
      title: projectName,
      targetTabName: "Main",
      issues: []
    }];

    for (const folderName of getTopLevelFolderNames(entries)) {
      rows.push({
        relativePath: folderName,
        kind: "tab",
        action: "create",
        title: folderName,
        targetTabName: folderName,
        issues: []
      });
    }

    for (const entry of entries) {
      if (entry.kind === "directory" && entry.segments.length > 1) {
        rows.push({
          relativePath: entry.relativePath,
          kind: "heading",
          action: "create",
          title: entry.segments[entry.segments.length - 1]!,
          targetTabName: tabNameForEntry(entry),
          issues: []
        });
        continue;
      }

      if (entry.kind === "markdown") {
        rows.push({
          relativePath: entry.relativePath,
          kind: "markdown",
          action: "create",
          title: titleForMarkdown(entry),
          targetTabName: tabNameForEntry(entry),
          issues: []
        });
        continue;
      }

      if (entry.kind === "file") {
        rows.push({
          relativePath: entry.relativePath,
          kind: "file",
          action: "create",
          title: fileBaseName(entry.relativePath),
          targetTabName: tabNameForEntry(entry),
          issues: []
        });
      }
    }

    if (!entries.some((entry) => entry.kind === "markdown" || entry.kind === "file")) {
      issues.push({
        severity: "warning",
        code: "no_file_entries",
        relativePath: null,
        message: "Selected folder contains only folders; import will create project structure only."
      });
    }

    return rows;
  }

  private resolveTabForEntry(
    entry: NormalizedEntry,
    tabByFolder: Map<string, ContainerTabRecord>,
    defaultTab: ContainerTabRecord
  ): ContainerTabRecord {
    if (entry.segments.length <= 1) {
      return defaultTab;
    }
    return tabByFolder.get(entry.segments[0]!) ?? defaultTab;
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
    new ActivityLogService({ connection: this.connection, idFactory: this.idFactory }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.markdownFolderImportCompleted,
      targetType: "workspace",
      targetId: input.workspaceId,
      summary: `Imported Markdown folder "${input.projectName}".`,
      beforeJson: null,
      afterJson: JSON.stringify(input),
      timestamp: input.importedAt
    });
  }
}

function compareEntries(left: NormalizedEntry, right: NormalizedEntry): number {
  if (left.kind === "directory" && right.kind !== "directory") {
    return -1;
  }
  if (left.kind !== "directory" && right.kind === "directory") {
    return 1;
  }
  return left.relativePath.localeCompare(right.relativePath);
}

function getTopLevelFolderNames(entries: NormalizedEntry[]): string[] {
  return Array.from(new Set(
    entries
      .filter((entry) => entry.kind === "directory" && entry.segments.length === 1)
      .map((entry) => entry.segments[0]!)
  )).sort((left, right) => left.localeCompare(right));
}

function tabNameForEntry(entry: NormalizedEntry): string {
  return entry.segments.length <= 1 ? "Main" : entry.segments[0]!;
}

function titleForMarkdown(entry: NormalizedEntry): string {
  const content = entry.content ?? "";
  const heading = content.split(/\r?\n/).map((line) => line.match(/^#\s+(.+)$/)?.[1]?.trim()).find((value): value is string => value !== undefined && value.length > 0);
  return normalizeTitle(heading ?? stripMarkdownExtension(fileBaseName(entry.relativePath)), "Untitled note");
}

function fileBaseName(relativePath: string): string {
  return relativePath.split("/").at(-1) ?? relativePath;
}

function stripMarkdownExtension(fileName: string): string {
  return fileName.replace(/\.(md|markdown)$/i, "");
}

function normalizeTitle(value: string, fallback: string): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length === 0 ? fallback : trimmed;
}

function normalizeNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeRelativePath(value: string): string | null {
  if (value.includes("\0") || /^[a-zA-Z]:/.test(value) || value.startsWith("/") || value.startsWith("\\")) {
    return null;
  }
  const normalized = value.replace(/\\/g, "/").replace(/^\.\//, "");
  const segments = normalized.split("/");
  if (segments.length === 0 || segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return null;
  }
  return segments.join("/");
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
