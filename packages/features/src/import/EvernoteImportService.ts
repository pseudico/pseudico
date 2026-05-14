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
import { TagService } from "../metadata/TagService";
import { NoteService } from "../notes";
import { ProjectService } from "../projects";

export type EvernoteImportEntryKind = "enex" | "html" | "resource" | "unsupported";

export type EvernoteImportSourceEntry = {
  relativePath: string;
  kind: EvernoteImportEntryKind;
  content?: string;
  sizeBytes?: number;
  mimeType?: string | null;
  copiedFile?: CopiedAttachmentFileInput;
  noteRelativePath?: string;
  resourceHash?: string;
  resourceFileName?: string;
};

export type EvernoteImportPreviewInput = {
  workspaceId: string;
  rootName: string;
  entries: EvernoteImportSourceEntry[];
  notebookName?: string;
  maxPreviewRows?: number;
};

export type EvernoteImportExecuteInput = EvernoteImportPreviewInput & {
  actorType?: ActivityActorType;
};

export type EvernoteImportValidationIssue = {
  severity: "error" | "warning";
  code: string;
  relativePath: string | null;
  sourceId?: string | null;
  message: string;
};

export type EvernoteImportPreviewRow = {
  relativePath: string;
  sourceId: string | null;
  kind: "project" | "note" | "resource" | "unsupported";
  action: "create" | "attach" | "skip";
  title: string;
  tags: string[];
  createdAt: string | null;
  updatedAt: string | null;
  issues: EvernoteImportValidationIssue[];
};

export type EvernoteImportSourceReport = {
  unsupportedFormatting: Array<{ relativePath: string; noteTitle: string; detail: string }>;
  htmlResourceLinks: Array<{ relativePath: string; noteTitle: string; link: string }>;
  enexResources: Array<{ relativePath: string; noteTitle: string; hash: string | null; fileName: string }>;
  missingCopiedResources: Array<{ relativePath: string; noteTitle: string; fileName: string }>;
  unmatchedResourceFiles: Array<{ relativePath: string; fileName: string }>;
};

export type EvernoteImportPreviewSummary = {
  valid: boolean;
  workspaceId: string;
  notebookName: string;
  entryCount: number;
  enexCount: number;
  htmlCount: number;
  noteCount: number;
  tagCount: number;
  resourceCount: number;
  attachedResourceCount: number;
  unsupportedCount: number;
  creatableCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  issues: EvernoteImportValidationIssue[];
  rows: EvernoteImportPreviewRow[];
  sourceReport: EvernoteImportSourceReport;
};

export type EvernoteImportCreatedTarget = {
  targetType: "project" | "item" | "attachment";
  id: string;
  title: string;
  relativePath: string;
};

export type EvernoteImportExecuteSummary = EvernoteImportPreviewSummary & {
  importedAt: string;
  importedCount: number;
  created: EvernoteImportCreatedTarget[];
};

type NormalizedEntry = EvernoteImportSourceEntry & {
  relativePath: string;
  noteRelativePath?: string;
};

type ParsedEvernoteNote = {
  sourceKind: "enex" | "html";
  relativePath: string;
  sourceId: string;
  title: string;
  body: string;
  createdAt: string | null;
  updatedAt: string | null;
  rawCreatedAt: string | null;
  rawUpdatedAt: string | null;
  tags: string[];
  resources: ParsedEvernoteResource[];
  links: string[];
  unsupportedFormatting: string[];
  issues: EvernoteImportValidationIssue[];
};

type ParsedEvernoteResource = {
  hash: string | null;
  fileName: string;
  mimeType: string | null;
  sourceUrl: string | null;
};

type ResourceMatch = {
  note: ParsedEvernoteNote;
  resource: ParsedEvernoteResource;
  entry: NormalizedEntry | null;
};

export class EvernoteImportService {
  readonly module = "evernoteImport";

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

  previewImport(input: EvernoteImportPreviewInput): EvernoteImportPreviewSummary {
    const normalized = this.normalizeInput(input);
    const parsed = parseNotes(normalized.entries);
    const notes = parsed.notes;
    const sourceReport = buildSourceReport(notes, normalized.entries);
    const issues = [
      ...normalized.issues,
      ...parsed.issues,
      ...notes.flatMap((note) => note.issues),
      ...sourceReportToIssues(sourceReport)
    ];
    const rows = buildRows(normalized.notebookName, notes, normalized.entries, sourceReport);
    const allIssues = [...issues, ...rows.flatMap((row) => row.issues)];
    const errorCount = allIssues.filter((issue) => issue.severity === "error").length;
    const warningCount = allIssues.length - errorCount;
    const resourceCount = notes.reduce((count, note) => count + note.resources.length + note.links.length, 0);

    return {
      valid: errorCount === 0,
      workspaceId: input.workspaceId,
      notebookName: normalized.notebookName,
      entryCount: normalized.entries.length,
      enexCount: normalized.entries.filter((entry) => entry.kind === "enex").length,
      htmlCount: normalized.entries.filter((entry) => entry.kind === "html").length,
      noteCount: notes.length,
      tagCount: new Set(notes.flatMap((note) => note.tags.map(normalizeTagName))).size,
      resourceCount,
      attachedResourceCount: sourceReport.enexResources.length + sourceReport.htmlResourceLinks.length - sourceReport.missingCopiedResources.length,
      unsupportedCount: normalized.entries.filter((entry) => entry.kind === "unsupported").length,
      creatableCount: rows.filter((row) => row.action === "create" || row.action === "attach").length,
      skippedCount: rows.filter((row) => row.action === "skip").length,
      errorCount,
      warningCount,
      issues: allIssues,
      rows: rows.slice(0, input.maxPreviewRows ?? 100),
      sourceReport
    };
  }

  async executeImport(input: EvernoteImportExecuteInput): Promise<EvernoteImportExecuteSummary> {
    const preview = this.previewImport(input);
    const importedAt = createIsoTimestamp(this.now());

    if (!preview.valid) {
      return { ...preview, importedAt, importedCount: 0, created: [] };
    }

    const normalized = this.normalizeInput(input);
    const parsed = parseNotes(normalized.entries);
    const actorType = input.actorType ?? "importer";
    const created: EvernoteImportCreatedTarget[] = [];
    const issues = [...preview.issues];

    try {
      const project = await new ProjectService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      }).createProject({
        workspaceId: input.workspaceId,
        name: normalized.notebookName,
        description: "Imported from a local Evernote ENEX/HTML notebook export.",
        actorType
      });
      created.push({ targetType: "project", id: project.project.id, title: project.project.name, relativePath: "." });

      for (const parsedNote of parsed.notes) {
        const note = await new NoteService({
          connection: this.connection,
          idFactory: this.idFactory,
          now: this.now
        }).createNote({
          workspaceId: input.workspaceId,
          containerId: project.project.id,
          containerTabId: project.defaultTab.id,
          title: parsedNote.title,
          content: buildNoteContent(parsedNote),
          actorType
        });
        created.push({ targetType: "item", id: note.item.id, title: note.item.title, relativePath: parsedNote.relativePath });

        await this.applyTags({
          workspaceId: input.workspaceId,
          itemId: note.item.id,
          tags: parsedNote.tags,
          actorType
        });

        for (const match of matchResourcesForNote(parsedNote, normalized.entries)) {
          if (match.entry?.copiedFile === undefined) {
            issues.push({
              severity: "warning",
              code: "missing_copied_resource",
              relativePath: parsedNote.relativePath,
              sourceId: parsedNote.sourceId,
              message: `Evernote resource "${match.resource.fileName}" was referenced but no copied local attachment file was provided.`
            });
            continue;
          }
          const file = await new FileAttachmentService({
            connection: this.connection,
            idFactory: this.idFactory,
            now: this.now
          }).attachFileToItem({
            itemId: note.item.id,
            copiedFile: match.entry.copiedFile,
            description: buildResourceDescription(parsedNote, match.resource, match.entry.relativePath),
            actorType
          });
          created.push({
            targetType: "attachment",
            id: file.attachment.id,
            title: file.attachment.originalName,
            relativePath: match.entry.relativePath
          });
        }
      }
    } catch (error) {
      issues.push({
        severity: "error",
        code: "import_failed",
        relativePath: null,
        sourceId: null,
        message: error instanceof Error ? error.message : "Evernote import failed."
      });
    }

    this.logImportCompleted({
      workspaceId: input.workspaceId,
      actorType,
      importedAt,
      notebookName: normalized.notebookName,
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

  private normalizeInput(input: EvernoteImportPreviewInput): {
    notebookName: string;
    entries: NormalizedEntry[];
    issues: EvernoteImportValidationIssue[];
  } {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const notebookName = normalizeTitle(input.notebookName ?? stripKnownExtension(fileBaseName(input.rootName)), "Imported Evernote notebook");
    const issues: EvernoteImportValidationIssue[] = [];
    const seen = new Set<string>();
    const entries: NormalizedEntry[] = [];

    for (const rawEntry of input.entries) {
      const relativePath = normalizeRelativePath(rawEntry.relativePath);
      if (relativePath === null) {
        issues.push({
          severity: "error",
          code: "unsafe_path",
          relativePath: rawEntry.relativePath,
          sourceId: null,
          message: "Evernote import paths must be relative and stay inside the selected local export."
        });
        continue;
      }
      if (seen.has(relativePath)) {
        issues.push({
          severity: "warning",
          code: "duplicate_path_skipped",
          relativePath,
          sourceId: null,
          message: "Duplicate Evernote export path will be skipped."
        });
        continue;
      }
      seen.add(relativePath);

      const noteRelativePath = rawEntry.noteRelativePath === undefined
        ? undefined
        : normalizeRelativePath(rawEntry.noteRelativePath) ?? undefined;
      if (rawEntry.noteRelativePath !== undefined && noteRelativePath === undefined) {
        issues.push({
          severity: "warning",
          code: "unsafe_resource_note_path_ignored",
          relativePath,
          sourceId: null,
          message: "Evernote resource note path was unsafe and will be ignored for matching."
        });
      }

      if (!["enex", "html", "resource", "unsupported"].includes(rawEntry.kind)) {
        issues.push({
          severity: "error",
          code: "invalid_entry_kind",
          relativePath,
          sourceId: null,
          message: "Evernote import entry kind must be enex, html, resource, or unsupported."
        });
        continue;
      }
      if ((rawEntry.kind === "enex" || rawEntry.kind === "html") && rawEntry.content === undefined) {
        issues.push({
          severity: "error",
          code: "missing_content",
          relativePath,
          sourceId: null,
          message: "Evernote ENEX and HTML entries require content for preview and import."
        });
      }

      entries.push({ ...rawEntry, relativePath, ...(noteRelativePath === undefined ? {} : { noteRelativePath }) });
    }

    entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

    if (!entries.some((entry) => entry.kind === "enex" || entry.kind === "html")) {
      issues.push({
        severity: "error",
        code: "empty_evernote_export",
        relativePath: null,
        sourceId: null,
        message: "Selected Evernote export does not contain ENEX or HTML notes."
      });
    }

    return { notebookName, entries, issues };
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
    notebookName: string;
    createdCount: number;
    issueCount: number;
    sourceCount: number;
  }): void {
    new ActivityLogService({ connection: this.connection, idFactory: this.idFactory }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.evernoteImportCompleted,
      targetType: "workspace",
      targetId: input.workspaceId,
      summary: `Imported Evernote notebook "${input.notebookName}".`,
      beforeJson: null,
      afterJson: JSON.stringify(input),
      timestamp: input.importedAt
    });
  }
}

function parseNotes(entries: NormalizedEntry[]): {
  notes: ParsedEvernoteNote[];
  issues: EvernoteImportValidationIssue[];
} {
  const notes: ParsedEvernoteNote[] = [];
  const issues: EvernoteImportValidationIssue[] = [];

  for (const entry of entries) {
    if (entry.kind === "enex") {
      const parsed = parseEnexEntry(entry);
      notes.push(...parsed.notes);
      issues.push(...parsed.issues);
    }
    if (entry.kind === "html") {
      notes.push(parseHtmlEntry(entry));
    }
  }

  if (notes.length === 0 && entries.some((entry) => entry.kind === "enex" || entry.kind === "html")) {
    issues.push({
      severity: "error",
      code: "no_evernote_notes_found",
      relativePath: null,
      sourceId: null,
      message: "Evernote export files were present but no notes could be parsed."
    });
  }

  return { notes, issues };
}

function parseEnexEntry(entry: NormalizedEntry): {
  notes: ParsedEvernoteNote[];
  issues: EvernoteImportValidationIssue[];
} {
  const content = entry.content ?? "";
  const noteBlocks = Array.from(content.matchAll(/<note\b[^>]*>([\s\S]*?)<\/note>/gi));
  const issues: EvernoteImportValidationIssue[] = [];
  const notes: ParsedEvernoteNote[] = [];

  if (noteBlocks.length === 0) {
    issues.push({
      severity: "error",
      code: "invalid_enex",
      relativePath: entry.relativePath,
      sourceId: null,
      message: "ENEX file did not contain any <note> entries."
    });
    return { notes, issues };
  }

  for (const [index, match] of noteBlocks.entries()) {
    const block = match[1] ?? "";
    const title = normalizeTitle(decodeXml(readFirstTag(block, "title") ?? ""), `Untitled Evernote note ${index + 1}`);
    const rawCreatedAt = readFirstTag(block, "created");
    const rawUpdatedAt = readFirstTag(block, "updated");
    const createdAt = parseEvernoteDate(rawCreatedAt);
    const updatedAt = parseEvernoteDate(rawUpdatedAt);
    const sourceId = readFirstTag(block, "guid") ?? `${entry.relativePath}#note-${index + 1}`;
    const contentXml = unwrapCdata(readFirstTag(block, "content") ?? "");
    const resources = parseEnexResources(block);
    const unsupportedFormatting = detectUnsupportedFormatting(contentXml);
    notes.push({
      sourceKind: "enex",
      relativePath: `${entry.relativePath}#note-${index + 1}`,
      sourceId,
      title,
      body: htmlToPlainText(contentXml),
      createdAt,
      updatedAt,
      rawCreatedAt,
      rawUpdatedAt,
      tags: readRepeatedTags(block, "tag").map(decodeXml).map(normalizeTagName).filter(Boolean),
      resources,
      links: [],
      unsupportedFormatting,
      issues: timestampIssues(entry.relativePath, sourceId, rawCreatedAt, createdAt, rawUpdatedAt, updatedAt)
    });
  }

  return { notes, issues };
}

function parseHtmlEntry(entry: NormalizedEntry): ParsedEvernoteNote {
  const content = entry.content ?? "";
  const title = normalizeTitle(
    decodeHtml(readHtmlTitle(content) ?? readHeading(content) ?? stripKnownExtension(fileBaseName(entry.relativePath))),
    "Untitled Evernote note"
  );
  const rawCreatedAt = readMeta(content, ["created", "evernote-created", "date-created"]);
  const rawUpdatedAt = readMeta(content, ["updated", "evernote-updated", "last-updated", "date-updated"]);
  const createdAt = parseEvernoteDate(rawCreatedAt);
  const updatedAt = parseEvernoteDate(rawUpdatedAt);
  const sourceId = entry.relativePath;

  return {
    sourceKind: "html",
    relativePath: entry.relativePath,
    sourceId,
    title,
    body: htmlToPlainText(readBody(content) ?? content),
    createdAt,
    updatedAt,
    rawCreatedAt,
    rawUpdatedAt,
    tags: splitList(readMeta(content, ["keywords", "tags", "evernote-tags"]) ?? ""),
    resources: [],
    links: readLocalResourceLinks(content),
    unsupportedFormatting: detectUnsupportedFormatting(content),
    issues: timestampIssues(entry.relativePath, sourceId, rawCreatedAt, createdAt, rawUpdatedAt, updatedAt)
  };
}

function parseEnexResources(noteBlock: string): ParsedEvernoteResource[] {
  return Array.from(noteBlock.matchAll(/<resource\b[^>]*>([\s\S]*?)<\/resource>/gi)).map((match, index) => {
    const block = match[1] ?? "";
    const mimeType = normalizeNullableString(readFirstTag(block, "mime"));
    const dataTag = block.match(/<data\b([^>]*)>[\s\S]*?<\/data>/i)?.[1] ?? "";
    const hash = readAttribute(dataTag, "hash");
    const fileName = normalizeTitle(
      decodeXml(readFirstTag(block, "file-name") ?? ""),
      `${hash ?? `resource-${index + 1}`}${extensionForMime(mimeType)}`
    );
    const sourceUrl = normalizeNullableString(decodeXml(readFirstTag(block, "source-url") ?? ""));
    return { hash, fileName, mimeType, sourceUrl };
  });
}

function buildRows(
  notebookName: string,
  notes: ParsedEvernoteNote[],
  entries: NormalizedEntry[],
  sourceReport: EvernoteImportSourceReport
): EvernoteImportPreviewRow[] {
  const rows: EvernoteImportPreviewRow[] = [{
    relativePath: ".",
    sourceId: null,
    kind: "project",
    action: "create",
    title: notebookName,
    tags: [],
    createdAt: null,
    updatedAt: null,
    issues: []
  }];

  for (const note of notes) {
    rows.push({
      relativePath: note.relativePath,
      sourceId: note.sourceId,
      kind: "note",
      action: "create",
      title: note.title,
      tags: note.tags,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      issues: note.issues
    });
    for (const match of matchResourcesForNote(note, entries)) {
      rows.push({
        relativePath: match.entry?.relativePath ?? note.relativePath,
        sourceId: match.resource.hash,
        kind: "resource",
        action: match.entry?.copiedFile === undefined ? "skip" : "attach",
        title: match.resource.fileName,
        tags: [],
        createdAt: null,
        updatedAt: null,
        issues: match.entry?.copiedFile === undefined ? [{
          severity: "warning",
          code: "missing_copied_resource",
          relativePath: note.relativePath,
          sourceId: note.sourceId,
          message: `Evernote resource "${match.resource.fileName}" needs a copied local attachment before import.`
        }] : []
      });
    }
  }

  for (const entry of entries.filter((candidate) => candidate.kind === "resource")) {
    const isMatched = !sourceReport.unmatchedResourceFiles.some((resource) => resource.relativePath === entry.relativePath);
    if (isMatched) {
      continue;
    }
    rows.push({
      relativePath: entry.relativePath,
      sourceId: entry.resourceHash ?? null,
      kind: "resource",
      action: "skip",
      title: entry.resourceFileName ?? entry.copiedFile?.originalName ?? fileBaseName(entry.relativePath),
      tags: [],
      createdAt: null,
      updatedAt: null,
      issues: [{
        severity: "warning",
        code: "unmatched_resource_file",
        relativePath: entry.relativePath,
        sourceId: entry.resourceHash ?? null,
        message: "Evernote resource file was not referenced by a parsed note and will be skipped."
      }]
    });
  }

  for (const entry of entries.filter((candidate) => candidate.kind === "unsupported")) {
    rows.push({
      relativePath: entry.relativePath,
      sourceId: null,
      kind: "unsupported",
      action: "skip",
      title: fileBaseName(entry.relativePath),
      tags: [],
      createdAt: null,
      updatedAt: null,
      issues: [{
        severity: "warning",
        code: "unsupported_evernote_export_file",
        relativePath: entry.relativePath,
        sourceId: null,
        message: "Unsupported Evernote export file will be reported but not imported."
      }]
    });
  }

  return rows;
}

function buildSourceReport(notes: ParsedEvernoteNote[], entries: NormalizedEntry[]): EvernoteImportSourceReport {
  const matches = notes.flatMap((note) => matchResourcesForNote(note, entries));
  const matchedPaths = new Set(matches.map((match) => match.entry?.relativePath).filter((path): path is string => path !== undefined));
  const unmatchedResourceFiles = entries
    .filter((entry) => entry.kind === "resource" && !matchedPaths.has(entry.relativePath))
    .map((entry) => ({ relativePath: entry.relativePath, fileName: entry.resourceFileName ?? entry.copiedFile?.originalName ?? fileBaseName(entry.relativePath) }));

  return {
    unsupportedFormatting: notes.flatMap((note) => note.unsupportedFormatting.map((detail) => ({
      relativePath: note.relativePath,
      noteTitle: note.title,
      detail
    }))),
    htmlResourceLinks: notes.flatMap((note) => note.links.map((link) => ({
      relativePath: note.relativePath,
      noteTitle: note.title,
      link
    }))),
    enexResources: notes.flatMap((note) => note.resources.map((resource) => ({
      relativePath: note.relativePath,
      noteTitle: note.title,
      hash: resource.hash,
      fileName: resource.fileName
    }))),
    missingCopiedResources: matches
      .filter((match) => match.entry?.copiedFile === undefined)
      .map((match) => ({
        relativePath: match.note.relativePath,
        noteTitle: match.note.title,
        fileName: match.resource.fileName
      })),
    unmatchedResourceFiles
  };
}

function sourceReportToIssues(report: EvernoteImportSourceReport): EvernoteImportValidationIssue[] {
  return [
    ...report.unsupportedFormatting.map((formatting) => ({
      severity: "warning" as const,
      code: "unsupported_formatting_preserved",
      relativePath: formatting.relativePath,
      sourceId: null,
      message: `Unsupported Evernote formatting preserved in note/source report: ${formatting.detail}.`
    })),
    ...report.htmlResourceLinks.map((link) => ({
      severity: "warning" as const,
      code: "html_resource_link",
      relativePath: link.relativePath,
      sourceId: null,
      message: `Evernote HTML note references local resource "${link.link}"; matching copied local files will be attached when provided.`
    })),
    ...report.missingCopiedResources.map((resource) => ({
      severity: "warning" as const,
      code: "missing_copied_resource",
      relativePath: resource.relativePath,
      sourceId: null,
      message: `Evernote resource "${resource.fileName}" is referenced but no copied local attachment file was provided.`
    })),
    ...report.unmatchedResourceFiles.map((resource) => ({
      severity: "warning" as const,
      code: "unmatched_resource_file",
      relativePath: resource.relativePath,
      sourceId: null,
      message: `Evernote resource file "${resource.fileName}" was not matched to a parsed note and will be skipped.`
    }))
  ];
}

function matchResourcesForNote(note: ParsedEvernoteNote, entries: NormalizedEntry[]): ResourceMatch[] {
  const resources = [
    ...note.resources,
    ...note.links.map((link) => ({
      hash: null,
      fileName: fileBaseName(link),
      mimeType: null,
      sourceUrl: link
    }))
  ];

  return resources.map((resource) => {
    const entry = entries.find((candidate) => {
      if (candidate.kind !== "resource") {
        return false;
      }
      if (
        candidate.noteRelativePath !== undefined &&
        candidate.noteRelativePath !== note.relativePath &&
        candidate.noteRelativePath !== note.relativePath.split("#")[0]
      ) {
        return false;
      }
      if (
        resource.hash !== null &&
        candidate.resourceHash !== undefined &&
        normalizeNameKey(candidate.resourceHash) === normalizeNameKey(resource.hash)
      ) {
        return true;
      }
      const candidateName = normalizeFileName(candidate.resourceFileName ?? candidate.copiedFile?.originalName ?? fileBaseName(candidate.relativePath));
      const resourceName = normalizeFileName(resource.fileName);
      return candidateName === resourceName || normalizeFileName(candidate.relativePath) === resourceName;
    }) ?? null;
    return { note, resource, entry };
  });
}

function buildNoteContent(note: ParsedEvernoteNote): string {
  const lines: string[] = [];
  lines.push(note.body.trim());
  lines.push("", "---", "Imported from Evernote.");
  lines.push(`Source: ${note.sourceKind.toUpperCase()} ${note.relativePath}`);
  lines.push(`Evernote note ID: ${note.sourceId}`);
  if (note.createdAt !== null || note.rawCreatedAt !== null) {
    lines.push(`Evernote created: ${note.createdAt ?? note.rawCreatedAt}`);
  }
  if (note.updatedAt !== null || note.rawUpdatedAt !== null) {
    lines.push(`Evernote updated: ${note.updatedAt ?? note.rawUpdatedAt}`);
  }
  if (note.tags.length > 0) {
    lines.push(`Evernote tags: ${note.tags.join(", ")}`);
  }
  if (note.resources.length > 0) {
    lines.push("", "Evernote resources:");
    for (const resource of note.resources) {
      lines.push(`- ${resource.fileName}${resource.mimeType === null ? "" : ` (${resource.mimeType})`}`);
    }
  }
  if (note.links.length > 0) {
    lines.push("", "Evernote HTML resource links:");
    for (const link of note.links) {
      lines.push(`- ${link}`);
    }
  }
  if (note.unsupportedFormatting.length > 0) {
    lines.push("", "Unsupported formatting preserved in source report:");
    for (const detail of note.unsupportedFormatting) {
      lines.push(`- ${detail}`);
    }
  }
  return lines.join("\n").trim();
}

function buildResourceDescription(note: ParsedEvernoteNote, resource: ParsedEvernoteResource, relativePath: string): string {
  const lines = [
    `Imported Evernote resource for note "${note.title}".`,
    `Source note: ${note.relativePath}`,
    `Resource path: ${relativePath}`
  ];
  if (resource.hash !== null) {
    lines.push(`Evernote resource hash: ${resource.hash}`);
  }
  if (resource.sourceUrl !== null) {
    lines.push(`Evernote source URL/path: ${resource.sourceUrl}`);
  }
  return lines.join("\n");
}

function timestampIssues(
  relativePath: string,
  sourceId: string,
  rawCreatedAt: string | null,
  createdAt: string | null,
  rawUpdatedAt: string | null,
  updatedAt: string | null
): EvernoteImportValidationIssue[] {
  const issues: EvernoteImportValidationIssue[] = [];
  if (rawCreatedAt !== null && createdAt === null) {
    issues.push({
      severity: "warning",
      code: "unsupported_created_timestamp",
      relativePath,
      sourceId,
      message: `Could not parse Evernote created timestamp "${rawCreatedAt}"; raw value will be preserved in the note.`
    });
  }
  if (rawUpdatedAt !== null && updatedAt === null) {
    issues.push({
      severity: "warning",
      code: "unsupported_updated_timestamp",
      relativePath,
      sourceId,
      message: `Could not parse Evernote updated timestamp "${rawUpdatedAt}"; raw value will be preserved in the note.`
    });
  }
  return issues;
}

function parseEvernoteDate(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim().length === 0) {
    return null;
  }
  const trimmed = value.trim();
  const enex = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  const date = enex === null
    ? new Date(trimmed)
    : new Date(`${enex[1]}-${enex[2]}-${enex[3]}T${enex[4]}:${enex[5]}:${enex[6]}.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function detectUnsupportedFormatting(content: string): string[] {
  const checks = [
    [/<table\b/i, "table layout"],
    [/<iframe\b/i, "embedded iframe"],
    [/<script\b/i, "script block"],
    [/<style\b/i, "style block"],
    [/<object\b/i, "embedded object"],
    [/<embed\b/i, "embedded content"],
    [/<en-crypt\b/i, "encrypted Evernote content"],
    [/<en-todo\b/i, "Evernote checkbox"],
    [/<input\b[^>]*type=["']?checkbox/i, "HTML checkbox"]
  ] as const;
  return checks.filter(([pattern]) => pattern.test(content)).map(([, detail]) => detail);
}

function readFirstTag(content: string, tagName: string): string | null {
  const escaped = tagName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const match = content.match(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

function readRepeatedTags(content: string, tagName: string): string[] {
  const escaped = tagName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return Array.from(content.matchAll(new RegExp(`<${escaped}\\b[^>]*>([\\s\\S]*?)<\\/${escaped}>`, "gi")))
    .map((match) => match[1]?.trim() ?? "")
    .filter((value) => value.length > 0);
}

function readAttribute(attributeText: string, attributeName: string): string | null {
  const escaped = attributeName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  return attributeText.match(new RegExp(`${escaped}=["']([^"']+)["']`, "i"))?.[1] ?? null;
}

function readHtmlTitle(content: string): string | null {
  return normalizeNullableString(content.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
}

function readHeading(content: string): string | null {
  return normalizeNullableString(content.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]);
}

function readBody(content: string): string | null {
  return normalizeNullableString(content.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1]);
}

function readMeta(content: string, names: string[]): string | null {
  for (const name of names) {
    const escaped = name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    const nameFirst = content.match(new RegExp(`<meta\\b[^>]*name=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i"));
    if (nameFirst?.[1] !== undefined) {
      return decodeHtml(nameFirst[1]);
    }
    const contentFirst = content.match(new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*name=["']${escaped}["'][^>]*>`, "i"));
    if (contentFirst?.[1] !== undefined) {
      return decodeHtml(contentFirst[1]);
    }
  }
  return null;
}

function readLocalResourceLinks(content: string): string[] {
  const links = Array.from(content.matchAll(/(?:src|href)=["']([^"']+)["']/gi))
    .map((match) => decodeHtml(match[1] ?? "").trim())
    .filter((value) => value.length > 0)
    .filter((value) => !/^https?:\/\//i.test(value) && !/^mailto:/i.test(value) && !value.startsWith("#") && !value.startsWith("data:"));
  return Array.from(new Set(links));
}

function htmlToPlainText(content: string): string {
  return decodeHtml(unwrapCdata(content)
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => line.length > 0 || (index > 0 && lines[index - 1]?.length !== 0))
    .join("\n"))
    .trim();
}

function unwrapCdata(value: string): string {
  return value.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "");
}

function decodeXml(value: string): string {
  return decodeHtml(value);
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function splitList(value: string): string[] {
  return value.split(/[;,]/g).map(normalizeTagName).filter(Boolean);
}

function normalizeTagName(value: string): string {
  return value.trim().replace(/^#/, "").replace(/^@/, "").replace(/\s+/g, "-").toLowerCase();
}

function normalizeRelativePath(value: string): string | null {
  if (value.includes("\0") || /^[a-zA-Z]:/.test(value) || value.startsWith("/") || value.startsWith("\\")) {
    return null;
  }
  const normalized = value.trim().replace(/\\/g, "/").replace(/^\.\//, "");
  const segments = normalized.split("/");
  if (segments.length === 0 || segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    return null;
  }
  return segments.join("/");
}

function fileBaseName(relativePath: string): string {
  return relativePath.split("/").filter(Boolean).at(-1) ?? relativePath;
}

function stripKnownExtension(fileName: string): string {
  return fileName.replace(/\.(enex|html|htm)$/i, "");
}

function normalizeFileName(value: string): string {
  return fileBaseName(value).trim().toLowerCase();
}

function normalizeNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeTitle(value: string, fallback: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length === 0 ? fallback : normalized;
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function extensionForMime(mimeType: string | null): string {
  if (mimeType === null) {
    return ".bin";
  }
  const lower = mimeType.toLowerCase();
  if (lower === "image/png") {
    return ".png";
  }
  if (lower === "image/jpeg") {
    return ".jpg";
  }
  if (lower === "application/pdf") {
    return ".pdf";
  }
  if (lower === "text/plain") {
    return ".txt";
  }
  return ".bin";
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
