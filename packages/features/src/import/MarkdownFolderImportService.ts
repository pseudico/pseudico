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
  type ContainerTabRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import { FileAttachmentService, type CopiedAttachmentFileInput } from "../files";
import { ItemService } from "../items";
import { TagService } from "../metadata/TagService";
import { NoteService, type NoteMutationResult } from "../notes";
import { ProjectService } from "../projects";
import { TabService } from "../tabs";
import { WikilinkService } from "../wikilinks/WikilinkService";

export type MarkdownFolderImportEntryKind = "directory" | "markdown" | "file" | "unsupported";

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

export type MarkdownFolderImportSourceReport = {
  frontmatter: Array<{ relativePath: string; keys: string[] }>;
  tags: Array<{ relativePath: string; tags: string[] }>;
  wikilinks: Array<{ relativePath: string; titles: string[] }>;
  attachmentEmbeds: Array<{
    relativePath: string;
    rawTarget: string;
    resolvedRelativePath: string | null;
  }>;
  unsupportedCanvasFiles: Array<{ relativePath: string }>;
};

export type MarkdownFolderImportPreviewSummary = {
  valid: boolean;
  workspaceId: string;
  projectName: string;
  rowCount: number;
  directoryCount: number;
  markdownCount: number;
  fileCount: number;
  unsupportedCount: number;
  tabCount: number;
  headingCount: number;
  frontmatterCount: number;
  tagCount: number;
  wikilinkCount: number;
  attachmentEmbedCount: number;
  resolvedAttachmentEmbedCount: number;
  creatableCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  issues: MarkdownFolderImportValidationIssue[];
  rows: MarkdownFolderImportPreviewRow[];
  sourceReport: MarkdownFolderImportSourceReport;
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

type ParsedFrontmatter = {
  raw: string | null;
  body: string;
  fields: Record<string, string[]>;
};

type ParsedMarkdownMetadata = {
  frontmatter: ParsedFrontmatter;
  tags: string[];
  wikilinks: string[];
  embeds: ParsedAttachmentEmbed[];
};

type ParsedAttachmentEmbed = {
  rawTarget: string;
  normalizedTarget: string | null;
  resolvedRelativePath: string | null;
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
    const sourceReport = buildSourceReport(normalized.entries);
    const issues = [...normalized.issues, ...sourceReportToIssues(sourceReport)];
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
      unsupportedCount: normalized.entries.filter((entry) => entry.kind === "unsupported").length,
      tabCount: rows.filter((row) => row.kind === "tab").length,
      headingCount: rows.filter((row) => row.kind === "heading").length,
      frontmatterCount: sourceReport.frontmatter.length,
      tagCount: sourceReport.tags.reduce((total, entry) => total + entry.tags.length, 0),
      wikilinkCount: sourceReport.wikilinks.reduce((total, entry) => total + entry.titles.length, 0),
      attachmentEmbedCount: sourceReport.attachmentEmbeds.length,
      resolvedAttachmentEmbedCount: sourceReport.attachmentEmbeds.filter((embed) => embed.resolvedRelativePath !== null).length,
      creatableCount: rows.filter((row) => row.action === "create" && row.issues.every((issue) => issue.severity !== "error")).length,
      skippedCount: rows.filter((row) => row.action === "skip").length,
      errorCount,
      warningCount,
      issues: allIssues,
      rows: previewRows,
      sourceReport
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
    const notesByPath = new Map<string, { result: NoteMutationResult; metadata: ParsedMarkdownMetadata }>();
    const embeddedFilePaths = getResolvedEmbeddedFilePaths(normalized.entries);
    const fileByPath = new Map(
      normalized.entries
        .filter((entry): entry is NormalizedEntry & { kind: "file" } => entry.kind === "file")
        .map((entry) => [entry.relativePath, entry])
    );

    try {
      const projectService = new ProjectService({ connection: this.connection, idFactory: this.idFactory, now: this.now });
      const project = await projectService.createProject({
        workspaceId: input.workspaceId,
        name: normalized.projectName,
        description: "Imported from a local Markdown folder or Obsidian vault.",
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
        const metadata = parseMarkdownMetadata(entry, normalized.entries);
        const tab = this.resolveTabForEntry(entry, tabByFolder, project.defaultTab);
        const note = await new NoteService({ connection: this.connection, idFactory: this.idFactory, now: this.now }).createNote({
          workspaceId: input.workspaceId,
          containerId: project.project.id,
          containerTabId: tab.id,
          title: titleForMarkdown(entry),
          content: contentForMarkdownImport(entry, metadata),
          actorType
        });
        await this.applyImportedTags({
          workspaceId: input.workspaceId,
          itemId: note.item.id,
          tags: metadata.tags,
          actorType
        });
        notesByPath.set(entry.relativePath, { result: note, metadata });
        created.push({ targetType: "item", id: note.item.id, title: note.item.title, relativePath: entry.relativePath });
      }

      const wikilinkService = new WikilinkService({ connection: this.connection, idFactory: this.idFactory, now: this.now });
      const fileService = new FileAttachmentService({ connection: this.connection, idFactory: this.idFactory, now: this.now });

      for (const [relativePath, note] of notesByPath) {
        wikilinkService.syncRelationshipsForItemInCurrentTransaction({
          workspaceId: input.workspaceId,
          sourceItemId: note.result.item.id,
          content: note.result.note.content,
          actorType
        });

        for (const embed of note.metadata.embeds) {
          if (embed.resolvedRelativePath === null) {
            continue;
          }
          const fileEntry = fileByPath.get(embed.resolvedRelativePath);
          if (fileEntry?.copiedFile === undefined) {
            issues.push({
              severity: "error",
              code: "missing_copied_embed_file",
              relativePath,
              message: `Embedded attachment ${embed.rawTarget} must be copied into workspace attachments before execution.`
            });
            continue;
          }
          const attachment = await fileService.attachFileToItem({
            itemId: note.result.item.id,
            copiedFile: {
              ...fileEntry.copiedFile,
              attachmentId: this.idFactory("attachment")
            },
            description: `Imported Obsidian attachment embed from ${fileEntry.relativePath}`,
            actorType
          });
          created.push({ targetType: "attachment", id: attachment.attachment.id, title: attachment.attachment.originalName, relativePath: fileEntry.relativePath });
        }
      }

      for (const entry of normalized.entries) {
        if (entry.kind !== "file") {
          continue;
        }
        if (embeddedFilePaths.has(entry.relativePath)) {
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

      if (!["directory", "markdown", "file", "unsupported"].includes(rawEntry.kind)) {
        issues.push({
          severity: "error",
          code: "invalid_entry_kind",
          relativePath: normalizedPath,
          message: "Import entry kind must be directory, markdown, file, or unsupported."
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
    const embeddedFilePaths = getResolvedEmbeddedFilePaths(entries);
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
          action: embeddedFilePaths.has(entry.relativePath) ? "skip" : "create",
          title: fileBaseName(entry.relativePath),
          targetTabName: tabNameForEntry(entry),
          issues: []
        });
        continue;
      }

      if (entry.kind === "unsupported") {
        rows.push({
          relativePath: entry.relativePath,
          kind: "unsupported",
          action: "skip",
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
        message: "Selected folder contains only folders or unsupported files; import will create project structure only."
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

  private async applyImportedTags(input: {
    workspaceId: string;
    itemId: string;
    tags: string[];
    actorType: ActivityActorType;
  }): Promise<void> {
    if (input.tags.length === 0) {
      return;
    }
    const tagService = new TagService({ connection: this.connection, idFactory: this.idFactory, now: this.now });
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
  const metadata = parseMarkdownMetadata(entry, []);
  const titleFromFrontmatter = metadata.frontmatter.fields.title?.[0];
  const content = metadata.frontmatter.body;
  const heading = content.split(/\r?\n/).map((line) => line.match(/^#\s+(.+)$/)?.[1]?.trim()).find((value): value is string => value !== undefined && value.length > 0);
  return normalizeTitle(titleFromFrontmatter ?? heading ?? stripMarkdownExtension(fileBaseName(entry.relativePath)), "Untitled note");
}

function contentForMarkdownImport(entry: NormalizedEntry, metadata: ParsedMarkdownMetadata): string {
  const extras: string[] = [];
  if (metadata.tags.length > 0) {
    extras.push(`Imported Obsidian tags: ${metadata.tags.map((tag) => `@${tag}`).join(" ")}`);
  }
  const canonicalWikilinks = metadata.wikilinks.filter((title) => !metadata.frontmatter.body.includes(`[[${title}]]`));
  if (canonicalWikilinks.length > 0) {
    extras.push(`Imported Obsidian wiki-links: ${canonicalWikilinks.map((title) => `[[${title}]]`).join(" ")}`);
  }
  if (metadata.embeds.length > 0) {
    extras.push(`Imported Obsidian attachment embeds: ${metadata.embeds.map((embed) => embed.resolvedRelativePath ?? embed.rawTarget).join(", ")}`);
  }

  if (extras.length === 0) {
    return metadata.frontmatter.body;
  }

  return `${metadata.frontmatter.body.trimEnd()}\n\n---\n${extras.join("\n")}`;
}

function buildSourceReport(entries: NormalizedEntry[]): MarkdownFolderImportSourceReport {
  const frontmatter: MarkdownFolderImportSourceReport["frontmatter"] = [];
  const tags: MarkdownFolderImportSourceReport["tags"] = [];
  const wikilinks: MarkdownFolderImportSourceReport["wikilinks"] = [];
  const attachmentEmbeds: MarkdownFolderImportSourceReport["attachmentEmbeds"] = [];
  const unsupportedCanvasFiles = entries
    .filter((entry) => isCanvasPath(entry.relativePath))
    .map((entry) => ({ relativePath: entry.relativePath }));

  for (const entry of entries) {
    if (entry.kind !== "markdown") {
      continue;
    }
    const metadata = parseMarkdownMetadata(entry, entries);
    const keys = Object.keys(metadata.frontmatter.fields).sort((left, right) => left.localeCompare(right));
    if (keys.length > 0) {
      frontmatter.push({ relativePath: entry.relativePath, keys });
    }
    if (metadata.tags.length > 0) {
      tags.push({ relativePath: entry.relativePath, tags: metadata.tags });
    }
    if (metadata.wikilinks.length > 0) {
      wikilinks.push({ relativePath: entry.relativePath, titles: metadata.wikilinks });
    }
    for (const embed of metadata.embeds) {
      attachmentEmbeds.push({
        relativePath: entry.relativePath,
        rawTarget: embed.rawTarget,
        resolvedRelativePath: embed.resolvedRelativePath
      });
    }
  }

  return { frontmatter, tags, wikilinks, attachmentEmbeds, unsupportedCanvasFiles };
}

function sourceReportToIssues(report: MarkdownFolderImportSourceReport): MarkdownFolderImportValidationIssue[] {
  return [
    ...report.unsupportedCanvasFiles.map((entry) => ({
      severity: "warning" as const,
      code: "unsupported_canvas_file",
      relativePath: entry.relativePath,
      message: "Obsidian .canvas files are reported but not imported."
    })),
    ...report.attachmentEmbeds
      .filter((embed) => embed.resolvedRelativePath === null)
      .map((embed) => ({
        severity: "warning" as const,
        code: "unresolved_attachment_embed",
        relativePath: embed.relativePath,
        message: `Attachment embed ${embed.rawTarget} could not be resolved to a local file in the selected folder.`
      }))
  ];
}

function getResolvedEmbeddedFilePaths(entries: readonly NormalizedEntry[]): Set<string> {
  const embeddedPaths = new Set<string>();
  for (const entry of entries) {
    if (entry.kind !== "markdown") {
      continue;
    }
    for (const embed of parseMarkdownMetadata(entry, entries).embeds) {
      if (embed.resolvedRelativePath !== null) {
        embeddedPaths.add(embed.resolvedRelativePath);
      }
    }
  }
  return embeddedPaths;
}

function parseMarkdownMetadata(entry: Pick<NormalizedEntry, "content" | "relativePath">, entries: readonly NormalizedEntry[]): ParsedMarkdownMetadata {
  const frontmatter = parseYamlFrontmatter(entry.content ?? "");
  const tags = uniqueStrings([
    ...extractFrontmatterTags(frontmatter),
    ...extractObsidianHashTags(frontmatter.body)
  ]);
  const wikilinks = parseUniqueWikilinkTitles(frontmatter.body);
  const embeds = parseAttachmentEmbeds(frontmatter.body).map((embed) => ({
    ...embed,
    resolvedRelativePath: resolveAttachmentEmbedPath({
      noteRelativePath: entry.relativePath,
      rawTarget: embed.normalizedTarget,
      entries
    })
  }));

  return { frontmatter, tags, wikilinks, embeds };
}

function parseYamlFrontmatter(content: string): ParsedFrontmatter {
  const normalizedContent = content.replace(/^\uFEFF/, "");
  const match = normalizedContent.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (match === null || match[1] === undefined) {
    return { raw: null, body: content, fields: {} };
  }

  const raw = match[1];
  const fields: Record<string, string[]> = {};
  let currentKey: string | null = null;

  for (const line of raw.split(/\r?\n/)) {
    const keyValue = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (keyValue !== null) {
      currentKey = keyValue[1]!.trim().toLowerCase();
      fields[currentKey] = parseYamlValueForKey(currentKey, keyValue[2] ?? "");
      continue;
    }

    const listItem = line.match(/^\s*-\s+(.+)$/);
    if (listItem !== null && currentKey !== null) {
      fields[currentKey] = [...(fields[currentKey] ?? []), ...parseYamlValueForKey(currentKey, listItem[1] ?? "")];
    }
  }

  return {
    raw,
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

function extractFrontmatterTags(frontmatter: ParsedFrontmatter): string[] {
  return normalizeImportedTags([
    ...(frontmatter.fields.tags ?? []),
    ...(frontmatter.fields.tag ?? [])
  ]);
}

function extractObsidianHashTags(content: string): string[] {
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

function parseAttachmentEmbeds(content: string): Array<Omit<ParsedAttachmentEmbed, "resolvedRelativePath">> {
  const embeds: Array<Omit<ParsedAttachmentEmbed, "resolvedRelativePath">> = [];

  for (const match of content.matchAll(/!\[\[([^\]\r\n]+)\]\]/g)) {
    const rawTarget = (match[1] ?? "").trim();
    embeds.push({ rawTarget, normalizedTarget: normalizeAttachmentEmbedTarget(rawTarget) });
  }

  for (const match of content.matchAll(/!\[[^\]\r\n]*\]\(([^)\r\n]+)\)/g)) {
    const rawTarget = stripMarkdownLinkTitle((match[1] ?? "").trim());
    embeds.push({ rawTarget, normalizedTarget: normalizeAttachmentEmbedTarget(rawTarget) });
  }

  return embeds.filter((embed) => embed.rawTarget.length > 0);
}

function normalizeAttachmentEmbedTarget(rawTarget: string): string | null {
  const withoutAlias = rawTarget.split("|")[0]?.split("#")[0]?.trim() ?? "";
  const withoutQuotes = trimYamlScalar(withoutAlias);
  if (/^[a-z][a-z0-9+.-]*:/i.test(withoutQuotes) || withoutQuotes.length === 0) {
    return null;
  }
  try {
    return decodeURIComponent(withoutQuotes).replace(/\\/g, "/");
  } catch {
    return withoutQuotes.replace(/\\/g, "/");
  }
}

function stripMarkdownLinkTitle(value: string): string {
  const quoted = value.match(/^<([^>]+)>$/);
  if (quoted !== null) {
    return quoted[1] ?? value;
  }
  const titleIndex = value.search(/\s+["']/);
  return titleIndex === -1 ? value : value.slice(0, titleIndex);
}

function resolveAttachmentEmbedPath(input: {
  noteRelativePath: string;
  rawTarget: string | null;
  entries: readonly NormalizedEntry[];
}): string | null {
  if (input.rawTarget === null) {
    return null;
  }
  const direct = normalizeRelativePath(input.rawTarget);
  const fileEntries = input.entries.filter((entry) => entry.kind === "file");
  const candidates = new Set<string>();
  if (direct !== null) {
    candidates.add(direct);
    const noteFolder = input.noteRelativePath.split("/").slice(0, -1).join("/");
    if (noteFolder.length > 0) {
      const relativeToNote = normalizeRelativePath(`${noteFolder}/${direct}`);
      if (relativeToNote !== null) {
        candidates.add(relativeToNote);
      }
    }
  }

  for (const candidate of candidates) {
    if (fileEntries.some((entry) => entry.relativePath === candidate)) {
      return candidate;
    }
  }

  if (direct !== null && !direct.includes("/")) {
    const basenameMatches = fileEntries.filter((entry) => fileBaseName(entry.relativePath) === direct);
    if (basenameMatches.length === 1) {
      return basenameMatches[0]!.relativePath;
    }
  }

  return null;
}

function splitTagList(value: string): string[] {
  return value
    .split(/[,\s]+/)
    .map((part) => trimYamlScalar(part))
    .filter((part) => part.length > 0);
}

function trimYamlScalar(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    unique.push(value);
  }
  return unique;
}

function fileBaseName(relativePath: string): string {
  return relativePath.split("/").at(-1) ?? relativePath;
}

function stripMarkdownExtension(fileName: string): string {
  return fileName.replace(/\.(md|markdown)$/i, "");
}

function isCanvasPath(relativePath: string): boolean {
  return relativePath.toLowerCase().endsWith(".canvas");
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
