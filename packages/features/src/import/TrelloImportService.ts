import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import { ActivityLogService, type DatabaseConnection } from "@local-work-os/db";
import { CommentService } from "../comments";
import { FileAttachmentService, type CopiedAttachmentFileInput } from "../files";
import { ItemService } from "../items/ItemService";
import { ListService } from "../lists";
import { TagService } from "../metadata/TagService";
import { ProjectService } from "../projects";
import { RelationshipService } from "../relationships/RelationshipService";
import { TaskService } from "../tasks";
import { normalizeTaskDateTime } from "../tasks/TaskQueries";

export type TrelloArchiveHandling = "skip_archived" | "import_archived";
export type TrelloImportEntryKind = "board_json" | "raw_attachment" | "unsupported";

export type TrelloRawAttachmentMatch = {
  sourceId?: string;
  fileName?: string;
  cardId?: string;
};

export type TrelloImportSourceEntry = {
  relativePath: string;
  kind: TrelloImportEntryKind;
  content?: string;
  sizeBytes?: number;
  copiedFile?: CopiedAttachmentFileInput;
  match?: TrelloRawAttachmentMatch;
};

export type TrelloImportPreviewInput = {
  workspaceId: string;
  rootName: string;
  entries: TrelloImportSourceEntry[];
  boardName?: string;
  archiveHandling?: TrelloArchiveHandling;
  maxPreviewRows?: number;
};

export type TrelloImportExecuteInput = TrelloImportPreviewInput & {
  actorType?: ActivityActorType;
};

export type TrelloImportValidationIssue = {
  severity: "error" | "warning";
  code: string;
  relativePath: string | null;
  sourceId: string | null;
  message: string;
};

export type TrelloImportPreviewRow = {
  relativePath: string;
  sourceId: string | null;
  kind: "project" | "list" | "card" | "checklist" | "checklist_item" | "comment" | "attachment" | "unsupported";
  action: "create" | "append" | "match" | "skip";
  title: string;
  listName: string | null;
  cardTitle: string | null;
  dueAt: string | null;
  labels: string[];
  archived: boolean;
  issues: TrelloImportValidationIssue[];
};

export type TrelloImportSourceReport = {
  archivedLists: Array<{ id: string; name: string }>;
  archivedCards: Array<{ id: string; name: string; listName: string | null }>;
  inertRemoteAttachmentUrls: Array<{ cardId: string; cardName: string; url: string }>;
  matchedRawAttachments: Array<{ relativePath: string; cardId: string; attachmentId: string; fileName: string }>;
  unmatchedRawAttachments: Array<{ relativePath: string; fileName: string }>;
  unsupportedActions: Array<{ id: string | null; type: string }>;
};

export type TrelloImportPreviewSummary = {
  valid: boolean;
  workspaceId: string;
  rootName: string;
  boardName: string;
  archiveHandling: TrelloArchiveHandling;
  entryCount: number;
  listCount: number;
  cardCount: number;
  archivedCardCount: number;
  checklistCount: number;
  checklistItemCount: number;
  commentCount: number;
  labelCount: number;
  attachmentCount: number;
  matchedRawAttachmentCount: number;
  unsupportedCount: number;
  creatableCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  issues: TrelloImportValidationIssue[];
  rows: TrelloImportPreviewRow[];
  sourceReport: TrelloImportSourceReport;
};

export type TrelloImportCreatedTarget = {
  targetType: "project" | "item" | "list_item" | "comment" | "attachment" | "relationship";
  id: string;
  title: string;
  relativePath: string;
  sourceId: string | null;
};

export type TrelloImportExecuteSummary = TrelloImportPreviewSummary & {
  importedAt: string;
  importedCount: number;
  created: TrelloImportCreatedTarget[];
};

type NormalizedEntry = TrelloImportSourceEntry & { relativePath: string };

type ParsedTrelloBoard = {
  relativePath: string;
  id: string;
  name: string;
  description: string | null;
  lists: ParsedTrelloList[];
  cards: ParsedTrelloCard[];
  labelsById: Map<string, TrelloLabel>;
  commentsByCardId: Map<string, ParsedTrelloComment[]>;
  unsupportedActions: Array<{ id: string | null; type: string }>;
  issues: TrelloImportValidationIssue[];
};

type ParsedTrelloList = {
  id: string;
  name: string;
  closed: boolean;
  pos: number;
};

type TrelloLabel = {
  id: string;
  name: string;
  color: string | null;
};

type ParsedTrelloCard = {
  id: string;
  listId: string;
  name: string;
  description: string | null;
  closed: boolean;
  dueAt: string | null;
  dueText: string | null;
  dueComplete: boolean;
  labels: TrelloLabel[];
  checklists: ParsedTrelloChecklist[];
  attachments: ParsedTrelloAttachment[];
};

type ParsedTrelloChecklist = {
  id: string;
  name: string;
  items: ParsedTrelloChecklistItem[];
};

type ParsedTrelloChecklistItem = {
  id: string;
  name: string;
  state: "open" | "done";
  dueAt: string | null;
};

type ParsedTrelloAttachment = {
  id: string;
  name: string;
  fileName: string;
  url: string | null;
};

type ParsedTrelloComment = {
  id: string;
  cardId: string;
  body: string;
  authorLabel: string | null;
  date: string | null;
};

type NormalizedInput = {
  archiveHandling: TrelloArchiveHandling;
  entries: NormalizedEntry[];
  issues: TrelloImportValidationIssue[];
};

type RawAttachmentCandidate = NormalizedEntry & {
  kind: "raw_attachment";
  copiedFile: CopiedAttachmentFileInput;
};

export class TrelloImportService {
  readonly module = "trelloImport";

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

  previewImport(input: TrelloImportPreviewInput): TrelloImportPreviewSummary {
    const normalized = this.normalizeInput(input);
    const boardEntry = normalized.entries.find((entry) => entry.kind === "board_json");
    const parsedBoard = boardEntry === undefined ? null : parseBoardEntry(boardEntry, input.boardName);
    const sourceReport = buildSourceReport(parsedBoard, normalized.entries);
    const rows = parsedBoard === null
      ? []
      : buildRows(parsedBoard, normalized.entries, normalized.archiveHandling, sourceReport);
    const issues = [
      ...normalized.issues,
      ...(parsedBoard?.issues ?? []),
      ...rows.flatMap((row) => row.issues),
      ...sourceReport.inertRemoteAttachmentUrls.map((entry) => ({
        severity: "warning" as const,
        code: "inert_attachment_url",
        relativePath: parsedBoard?.relativePath ?? null,
        sourceId: entry.cardId,
        message: `Trello attachment URL is preserved as metadata and will not be downloaded: ${entry.url}`
      })),
      ...sourceReport.unmatchedRawAttachments.map((entry) => ({
        severity: "warning" as const,
        code: "unmatched_raw_attachment",
        relativePath: entry.relativePath,
        sourceId: null,
        message: `Raw Trello attachment file was not matched to a card attachment and will not be imported: ${entry.fileName}`
      }))
    ];
    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const warningCount = issues.length - errorCount;

    return {
      valid: errorCount === 0,
      workspaceId: input.workspaceId,
      rootName: input.rootName,
      boardName: parsedBoard?.name ?? normalizeTitle(input.boardName ?? input.rootName, "Trello board"),
      archiveHandling: normalized.archiveHandling,
      entryCount: normalized.entries.length,
      listCount: parsedBoard?.lists.length ?? 0,
      cardCount: parsedBoard?.cards.length ?? 0,
      archivedCardCount: parsedBoard?.cards.filter((card) => card.closed).length ?? 0,
      checklistCount: parsedBoard?.cards.reduce((sum, card) => sum + card.checklists.length, 0) ?? 0,
      checklistItemCount: parsedBoard?.cards.reduce((sum, card) => sum + card.checklists.reduce((count, checklist) => count + checklist.items.length, 0), 0) ?? 0,
      commentCount: parsedBoard === null ? 0 : Array.from(parsedBoard.commentsByCardId.values()).reduce((sum, comments) => sum + comments.length, 0),
      labelCount: parsedBoard?.labelsById.size ?? 0,
      attachmentCount: parsedBoard?.cards.reduce((sum, card) => sum + card.attachments.length, 0) ?? 0,
      matchedRawAttachmentCount: sourceReport.matchedRawAttachments.length,
      unsupportedCount: normalized.entries.filter((entry) => entry.kind === "unsupported").length + sourceReport.unsupportedActions.length,
      creatableCount: rows.filter((row) => row.action === "create" || row.action === "append" || row.action === "match").length,
      skippedCount: rows.filter((row) => row.action === "skip").length,
      errorCount,
      warningCount,
      issues,
      rows: rows.slice(0, input.maxPreviewRows ?? 150),
      sourceReport
    };
  }

  async executeImport(input: TrelloImportExecuteInput): Promise<TrelloImportExecuteSummary> {
    const preview = this.previewImport(input);
    const importedAt = createIsoTimestamp(this.now());

    if (!preview.valid) {
      return { ...preview, importedAt, importedCount: 0, created: [] };
    }

    const normalized = this.normalizeInput(input);
    const boardEntry = normalized.entries.find((entry) => entry.kind === "board_json");
    const parsedBoard = boardEntry === undefined ? null : parseBoardEntry(boardEntry, input.boardName);
    const created: TrelloImportCreatedTarget[] = [];
    const issues = [...preview.issues];
    const actorType = input.actorType ?? "importer";

    if (parsedBoard === null) {
      return { ...preview, valid: false, importedAt, importedCount: 0, created };
    }

    try {
      await this.importBoard({
        workspaceId: input.workspaceId,
        archiveHandling: normalized.archiveHandling,
        actorType,
        board: parsedBoard,
        rawAttachments: getRawAttachmentCandidates(normalized.entries),
        created
      });
    } catch (error) {
      issues.push({
        severity: "error",
        code: "trello_import_failed",
        relativePath: parsedBoard.relativePath,
        sourceId: parsedBoard.id,
        message: error instanceof Error ? error.message : "Trello import failed."
      });
    }

    this.logImportCompleted({
      workspaceId: input.workspaceId,
      actorType,
      importedAt,
      boardName: parsedBoard.name,
      listCount: parsedBoard.lists.length,
      cardCount: parsedBoard.cards.length,
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

  private normalizeInput(input: TrelloImportPreviewInput): NormalizedInput {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.rootName, "rootName");

    const issues: TrelloImportValidationIssue[] = [];
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
          message: "Trello import paths must be relative and stay inside the selected local export."
        });
        continue;
      }

      if (seen.has(relativePath)) {
        issues.push({
          severity: "warning",
          code: "duplicate_path_skipped",
          relativePath,
          sourceId: null,
          message: "Duplicate Trello export path will be skipped."
        });
        continue;
      }
      seen.add(relativePath);

      if (!["board_json", "raw_attachment", "unsupported"].includes(rawEntry.kind)) {
        issues.push({
          severity: "error",
          code: "invalid_entry_kind",
          relativePath,
          sourceId: null,
          message: "Trello import entry kind must be board_json, raw_attachment, or unsupported."
        });
        continue;
      }

      if (rawEntry.kind === "board_json" && rawEntry.content === undefined) {
        issues.push({
          severity: "error",
          code: "missing_board_json",
          relativePath,
          sourceId: null,
          message: "Trello board JSON entries require content for preview and import."
        });
      }
      if (rawEntry.kind === "raw_attachment" && rawEntry.copiedFile === undefined) {
        issues.push({
          severity: "error",
          code: "missing_copied_attachment",
          relativePath,
          sourceId: rawEntry.match?.sourceId ?? null,
          message: "Raw Trello attachment ZIP entries must be copied into workspace attachments before execution."
        });
      }

      entries.push({ ...rawEntry, relativePath });
    }

    entries.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

    const boardEntries = entries.filter((entry) => entry.kind === "board_json");
    if (boardEntries.length === 0) {
      issues.push({
        severity: "error",
        code: "empty_trello_export",
        relativePath: null,
        sourceId: null,
        message: "Selected Trello export does not contain a board JSON file."
      });
    }
    if (boardEntries.length > 1) {
      issues.push({
        severity: "error",
        code: "multiple_board_json_files",
        relativePath: null,
        sourceId: null,
        message: "Import one Trello board JSON file at a time."
      });
    }

    return {
      archiveHandling: input.archiveHandling ?? "skip_archived",
      entries,
      issues
    };
  }

  private async importBoard(input: {
    workspaceId: string;
    archiveHandling: TrelloArchiveHandling;
    actorType: ActivityActorType;
    board: ParsedTrelloBoard;
    rawAttachments: RawAttachmentCandidate[];
    created: TrelloImportCreatedTarget[];
  }): Promise<void> {
    const serviceInput = {
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    };
    const project = await new ProjectService(serviceInput).createProject({
      workspaceId: input.workspaceId,
      name: input.board.name,
      description: buildProjectDescription(input.board),
      actorType: input.actorType
    });
    input.created.push({
      targetType: "project",
      id: project.project.id,
      title: project.project.name,
      relativePath: input.board.relativePath,
      sourceId: input.board.id
    });

    const listService = new ListService(serviceInput);
    const taskService = new TaskService(serviceInput);
    const itemService = new ItemService(serviceInput);
    const commentService = new CommentService(serviceInput);
    const fileService = new FileAttachmentService(serviceInput);
    const relationshipService = new RelationshipService(serviceInput);
    const localListByTrelloId = new Map<string, { itemId: string; name: string }>();

    for (const trelloList of input.board.lists) {
      if (trelloList.closed && input.archiveHandling === "skip_archived") {
        continue;
      }
      const list = await listService.createList({
        workspaceId: input.workspaceId,
        containerId: project.project.id,
        containerTabId: project.defaultTab.id,
        title: trelloList.name,
        body: `Imported Trello list ${trelloList.id}${trelloList.closed ? " (archived in Trello)" : ""}.`,
        actorType: input.actorType,
        displayMode: "checklist",
        progressMode: "count"
      });
      localListByTrelloId.set(trelloList.id, { itemId: list.item.id, name: list.item.title });
      input.created.push({
        targetType: "item",
        id: list.item.id,
        title: list.item.title,
        relativePath: input.board.relativePath,
        sourceId: trelloList.id
      });
      if (trelloList.closed) {
        await itemService.archiveItem(list.item.id, input.actorType);
      }
    }

    for (const card of input.board.cards) {
      const targetList = localListByTrelloId.get(card.listId);
      if (targetList === undefined || (card.closed && input.archiveHandling === "skip_archived")) {
        continue;
      }

      const task = await taskService.createTask({
        workspaceId: input.workspaceId,
        containerId: project.project.id,
        containerTabId: project.defaultTab.id,
        title: card.name,
        body: buildCardBody(card, input.board.commentsByCardId.get(card.id) ?? []),
        dueAt: card.dueAt,
        status: card.dueComplete ? "done" : "open",
        actorType: input.actorType
      });
      input.created.push({
        targetType: "item",
        id: task.item.id,
        title: task.item.title,
        relativePath: input.board.relativePath,
        sourceId: card.id
      });

      await this.applyTags({
        workspaceId: input.workspaceId,
        itemId: task.item.id,
        labels: card.labels,
        actorType: input.actorType
      });

      const cardListItem = await listService.addListItem({
        listId: targetList.itemId,
        title: card.name,
        body: `Imported Trello card ${card.id}.`,
        status: card.dueComplete || card.closed ? "done" : "open",
        dueAt: card.dueAt,
        actorType: input.actorType
      });
      input.created.push({
        targetType: "list_item",
        id: cardListItem.listItem.id,
        title: cardListItem.listItem.title,
        relativePath: input.board.relativePath,
        sourceId: card.id
      });

      const cardRelationship = await relationshipService.createRelationship({
        workspaceId: input.workspaceId,
        source: { type: "item", id: task.item.id },
        target: { type: "list_item", id: cardListItem.listItem.id },
        relationType: "belongs_to",
        label: "Trello card in list",
        actorType: input.actorType
      });
      if (cardRelationship.changed) {
        input.created.push({
          targetType: "relationship",
          id: cardRelationship.relationship.id,
          title: `${task.item.title} belongs to ${targetList.name}`,
          relativePath: input.board.relativePath,
          sourceId: card.id
        });
      }

      for (const checklist of card.checklists) {
        const checklistRow = await listService.addListItem({
          listId: targetList.itemId,
          title: checklist.name,
          body: `Imported Trello checklist ${checklist.id} from card ${card.id}.`,
          status: checklist.items.length > 0 && checklist.items.every((item) => item.state === "done") ? "done" : "open",
          listItemParentId: cardListItem.listItem.id,
          depth: 1,
          actorType: input.actorType
        });
        input.created.push({
          targetType: "list_item",
          id: checklistRow.listItem.id,
          title: checklistRow.listItem.title,
          relativePath: input.board.relativePath,
          sourceId: checklist.id
        });

        for (const checklistItem of checklist.items) {
          const item = await listService.addListItem({
            listId: targetList.itemId,
            title: checklistItem.name,
            status: checklistItem.state,
            dueAt: checklistItem.dueAt,
            listItemParentId: checklistRow.listItem.id,
            depth: 2,
            actorType: input.actorType
          });
          input.created.push({
            targetType: "list_item",
            id: item.listItem.id,
            title: item.listItem.title,
            relativePath: input.board.relativePath,
            sourceId: checklistItem.id
          });
        }
      }

      for (const comment of input.board.commentsByCardId.get(card.id) ?? []) {
        const result = await commentService.addComment({
          workspaceId: input.workspaceId,
          targetType: "item",
          targetId: task.item.id,
          body: buildCommentBody(comment),
          authorLabel: comment.authorLabel,
          actorType: input.actorType
        });
        input.created.push({
          targetType: "comment",
          id: result.comment.id,
          title: `Comment on ${task.item.title}`,
          relativePath: input.board.relativePath,
          sourceId: comment.id
        });
      }

      for (const match of findAttachmentMatches(card, input.rawAttachments)) {
        const file = await fileService.attachFileToItem({
          itemId: task.item.id,
          copiedFile: match.copiedFile,
          description: `Imported from Trello attachment ${match.attachment.id} on card ${card.id}.`,
          actorType: input.actorType
        });
        input.created.push({
          targetType: "attachment",
          id: file.attachment.id,
          title: file.attachment.originalName,
          relativePath: match.relativePath,
          sourceId: match.attachment.id
        });
      }

      if (card.closed && input.archiveHandling === "import_archived") {
        await itemService.archiveItem(task.item.id, input.actorType);
      }
    }
  }

  private async applyTags(input: {
    workspaceId: string;
    itemId: string;
    labels: TrelloLabel[];
    actorType: ActivityActorType;
  }): Promise<void> {
    const tagService = new TagService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
    for (const label of input.labels) {
      const name = labelToTagName(label);
      await tagService.addTagToTarget({
        workspaceId: input.workspaceId,
        targetType: "item",
        targetId: input.itemId,
        name,
        source: "imported",
        actorType: input.actorType
      });
    }
  }

  private logImportCompleted(input: {
    workspaceId: string;
    actorType: ActivityActorType;
    importedAt: string;
    boardName: string;
    listCount: number;
    cardCount: number;
    createdCount: number;
    issueCount: number;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.trelloImportCompleted,
      targetType: "workspace",
      targetId: input.workspaceId,
      summary: `Imported Trello board "${input.boardName}".`,
      beforeJson: null,
      afterJson: JSON.stringify(input),
      timestamp: input.importedAt
    });
  }
}

type AttachmentMatch = {
  relativePath: string;
  copiedFile: CopiedAttachmentFileInput;
  attachment: ParsedTrelloAttachment;
};

function parseBoardEntry(entry: NormalizedEntry, boardName: string | undefined): ParsedTrelloBoard {
  const issues: TrelloImportValidationIssue[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(entry.content ?? "");
  } catch (error) {
    return {
      relativePath: entry.relativePath,
      id: "unknown",
      name: normalizeTitle(boardName ?? fileBaseName(entry.relativePath).replace(/\.json$/i, ""), "Trello board"),
      description: null,
      lists: [],
      cards: [],
      labelsById: new Map(),
      commentsByCardId: new Map(),
      unsupportedActions: [],
      issues: [{
        severity: "error",
        code: "invalid_board_json",
        relativePath: entry.relativePath,
        sourceId: null,
        message: error instanceof Error ? error.message : "Trello board JSON could not be parsed."
      }]
    };
  }

  const board = isRecord(raw) ? raw : {};
  const id = readString(board.id) ?? "trello_board";
  const name = normalizeTitle(boardName ?? readString(board.name) ?? fileBaseName(entry.relativePath).replace(/\.json$/i, ""), "Trello board");
  const labelsById = parseLabels(board);
  const lists = readArray(board.lists).map(parseList).filter((list): list is ParsedTrelloList => list !== null)
    .sort((left, right) => left.pos - right.pos || left.name.localeCompare(right.name));
  const cards = readArray(board.cards).map((card) => parseCard(card, labelsById)).filter((card): card is ParsedTrelloCard => card !== null);
  const { commentsByCardId, unsupportedActions } = parseActions(readArray(board.actions));

  if (cards.length === 0) {
    issues.push({
      severity: "warning",
      code: "trello_board_has_no_cards",
      relativePath: entry.relativePath,
      sourceId: id,
      message: "Trello board JSON contains no cards to import."
    });
  }
  if (lists.length === 0) {
    issues.push({
      severity: "error",
      code: "trello_board_has_no_lists",
      relativePath: entry.relativePath,
      sourceId: id,
      message: "Trello board JSON must contain at least one list."
    });
  }

  return {
    relativePath: entry.relativePath,
    id,
    name,
    description: normalizeNullableString(readString(board.desc) ?? null),
    lists,
    cards,
    labelsById,
    commentsByCardId,
    unsupportedActions,
    issues
  };
}

function parseList(value: unknown): ParsedTrelloList | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value.id);
  if (id === null) {
    return null;
  }
  return {
    id,
    name: normalizeTitle(readString(value.name) ?? "", "Untitled Trello list"),
    closed: readBoolean(value.closed),
    pos: readNumber(value.pos) ?? 0
  };
}

function parseLabels(board: Record<string, unknown>): Map<string, TrelloLabel> {
  const labels = new Map<string, TrelloLabel>();
  for (const value of readArray(board.labels)) {
    if (!isRecord(value)) {
      continue;
    }
    const label = parseLabel(value);
    if (label !== null) {
      labels.set(label.id, label);
    }
  }
  return labels;
}

function parseCard(value: unknown, labelsById: Map<string, TrelloLabel>): ParsedTrelloCard | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value.id);
  const listId = readString(value.idList);
  if (id === null || listId === null) {
    return null;
  }
  const embeddedLabels = readArray(value.labels)
    .map((label) => isRecord(label) ? parseLabel(label) : null)
    .filter((label): label is TrelloLabel => label !== null);
  const idLabels = readArray(value.idLabels)
    .map((labelId) => typeof labelId === "string" ? labelId : null)
    .filter((labelId): labelId is string => labelId !== null);
  const labels = dedupeLabels([
    ...embeddedLabels,
    ...idLabels.map((labelId) => labelsById.get(labelId) ?? { id: labelId, name: labelId, color: null })
  ]);

  return {
    id,
    listId,
    name: normalizeTitle(readString(value.name) ?? "", "Untitled Trello card"),
    description: normalizeNullableString(readString(value.desc) ?? null),
    closed: readBoolean(value.closed),
    dueAt: parseDate(readString(value.due)),
    dueText: normalizeNullableString(readString(value.due) ?? null),
    dueComplete: readBoolean(value.dueComplete),
    labels,
    checklists: readArray(value.checklists).map(parseChecklist).filter((checklist): checklist is ParsedTrelloChecklist => checklist !== null),
    attachments: readArray(value.attachments).map(parseAttachment).filter((attachment): attachment is ParsedTrelloAttachment => attachment !== null)
  };
}

function parseLabel(value: Record<string, unknown>): TrelloLabel | null {
  const id = readString(value.id) ?? readString(value.name) ?? readString(value.color);
  if (id === null) {
    return null;
  }
  return { id, name: readString(value.name) ?? "", color: readString(value.color) };
}

function parseChecklist(value: unknown): ParsedTrelloChecklist | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value.id);
  if (id === null) {
    return null;
  }
  return {
    id,
    name: normalizeTitle(readString(value.name) ?? "", "Checklist"),
    items: readArray(value.checkItems).map(parseChecklistItem).filter((item): item is ParsedTrelloChecklistItem => item !== null)
  };
}

function parseChecklistItem(value: unknown): ParsedTrelloChecklistItem | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value.id);
  if (id === null) {
    return null;
  }
  return {
    id,
    name: normalizeTitle(readString(value.name) ?? "", "Untitled checklist item"),
    state: readString(value.state) === "complete" ? "done" : "open",
    dueAt: parseDate(readString(value.due))
  };
}

function parseAttachment(value: unknown): ParsedTrelloAttachment | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value.id);
  if (id === null) {
    return null;
  }
  const fileName = readString(value.fileName) ?? readString(value.name) ?? id;
  return {
    id,
    name: normalizeTitle(readString(value.name) ?? fileName, fileName),
    fileName,
    url: readString(value.url)
  };
}

function parseActions(actions: unknown[]): {
  commentsByCardId: Map<string, ParsedTrelloComment[]>;
  unsupportedActions: Array<{ id: string | null; type: string }>;
} {
  const commentsByCardId = new Map<string, ParsedTrelloComment[]>();
  const unsupportedActions: Array<{ id: string | null; type: string }> = [];

  for (const action of actions) {
    if (!isRecord(action)) {
      continue;
    }
    const type = readString(action.type) ?? "unknown";
    if (type !== "commentCard") {
      unsupportedActions.push({ id: readString(action.id), type });
      continue;
    }
    const data = isRecord(action.data) ? action.data : {};
    const cardData = isRecord(data.card) ? data.card : {};
    const cardId = readString(cardData.id);
    const body = readString(data.text);
    if (cardId === null || body === null || body.trim().length === 0) {
      continue;
    }
    const member = isRecord(action.memberCreator) ? action.memberCreator : {};
    const comment: ParsedTrelloComment = {
      id: readString(action.id) ?? `${cardId}:comment:${commentsByCardId.get(cardId)?.length ?? 0}`,
      cardId,
      body: body.trim(),
      authorLabel: readString(member.fullName) ?? readString(member.username),
      date: parseDate(readString(action.date))
    };
    commentsByCardId.set(cardId, [...commentsByCardId.get(cardId) ?? [], comment]);
  }

  return { commentsByCardId, unsupportedActions };
}

function buildRows(
  board: ParsedTrelloBoard,
  entries: NormalizedEntry[],
  archiveHandling: TrelloArchiveHandling,
  sourceReport: TrelloImportSourceReport
): TrelloImportPreviewRow[] {
  const rows: TrelloImportPreviewRow[] = [{
    relativePath: board.relativePath,
    sourceId: board.id,
    kind: "project",
    action: "create",
    title: board.name,
    listName: null,
    cardTitle: null,
    dueAt: null,
    labels: [],
    archived: false,
    issues: []
  }];
  const listById = new Map(board.lists.map((list) => [list.id, list]));

  for (const list of board.lists) {
    rows.push({
      relativePath: board.relativePath,
      sourceId: list.id,
      kind: "list",
      action: list.closed && archiveHandling === "skip_archived" ? "skip" : "create",
      title: list.name,
      listName: list.name,
      cardTitle: null,
      dueAt: null,
      labels: [],
      archived: list.closed,
      issues: list.closed ? [{
        severity: "warning",
        code: archiveHandling === "skip_archived" ? "archived_list_skipped" : "archived_list_imported",
        relativePath: board.relativePath,
        sourceId: list.id,
        message: archiveHandling === "skip_archived" ? "Archived Trello list will be skipped." : "Archived Trello list will be imported and archived locally."
      }] : []
    });
  }

  for (const card of board.cards) {
    const list = listById.get(card.listId);
    const skip = (card.closed || list?.closed === true) && archiveHandling === "skip_archived";
    rows.push({
      relativePath: board.relativePath,
      sourceId: card.id,
      kind: "card",
      action: skip ? "skip" : "create",
      title: card.name,
      listName: list?.name ?? null,
      cardTitle: card.name,
      dueAt: card.dueAt,
      labels: card.labels.map(labelToTagName),
      archived: card.closed,
      issues: card.closed ? [{
        severity: "warning",
        code: archiveHandling === "skip_archived" ? "archived_card_skipped" : "archived_card_imported",
        relativePath: board.relativePath,
        sourceId: card.id,
        message: archiveHandling === "skip_archived" ? "Archived Trello card will be skipped." : "Archived Trello card will be imported and archived locally."
      }] : []
    });

    for (const checklist of card.checklists) {
      rows.push({
        relativePath: board.relativePath,
        sourceId: checklist.id,
        kind: "checklist",
        action: skip ? "skip" : "create",
        title: checklist.name,
        listName: list?.name ?? null,
        cardTitle: card.name,
        dueAt: null,
        labels: [],
        archived: card.closed,
        issues: []
      });
      for (const item of checklist.items) {
        rows.push({
          relativePath: board.relativePath,
          sourceId: item.id,
          kind: "checklist_item",
          action: skip ? "skip" : "create",
          title: item.name,
          listName: list?.name ?? null,
          cardTitle: card.name,
          dueAt: item.dueAt,
          labels: [],
          archived: card.closed,
          issues: []
        });
      }
    }

    for (const comment of board.commentsByCardId.get(card.id) ?? []) {
      rows.push({
        relativePath: board.relativePath,
        sourceId: comment.id,
        kind: "comment",
        action: skip ? "skip" : "append",
        title: comment.body,
        listName: list?.name ?? null,
        cardTitle: card.name,
        dueAt: comment.date,
        labels: [],
        archived: card.closed,
        issues: []
      });
    }

    for (const attachment of card.attachments) {
      const matched = sourceReport.matchedRawAttachments.some((match) => match.attachmentId === attachment.id);
      rows.push({
        relativePath: board.relativePath,
        sourceId: attachment.id,
        kind: "attachment",
        action: skip ? "skip" : matched ? "match" : "skip",
        title: attachment.name,
        listName: list?.name ?? null,
        cardTitle: card.name,
        dueAt: null,
        labels: [],
        archived: card.closed,
        issues: matched ? [] : [{
          severity: "warning",
          code: "raw_attachment_not_available",
          relativePath: board.relativePath,
          sourceId: attachment.id,
          message: "Trello attachment metadata is preserved, but no matching local raw attachment file was provided."
        }]
      });
    }
  }

  for (const entry of entries.filter((candidate) => candidate.kind === "unsupported")) {
    rows.push({
      relativePath: entry.relativePath,
      sourceId: null,
      kind: "unsupported",
      action: "skip",
      title: fileBaseName(entry.relativePath),
      listName: null,
      cardTitle: null,
      dueAt: null,
      labels: [],
      archived: false,
      issues: [{
        severity: "warning",
        code: "unsupported_trello_export_file",
        relativePath: entry.relativePath,
        sourceId: null,
        message: "Unsupported Trello export file will be reported but not imported."
      }]
    });
  }

  return rows;
}

function buildSourceReport(board: ParsedTrelloBoard | null, entries: NormalizedEntry[]): TrelloImportSourceReport {
  const rawAttachments = getRawAttachmentCandidates(entries);
  if (board === null) {
    return {
      archivedLists: [],
      archivedCards: [],
      inertRemoteAttachmentUrls: [],
      matchedRawAttachments: [],
      unmatchedRawAttachments: rawAttachments.map((entry) => ({ relativePath: entry.relativePath, fileName: entry.copiedFile.originalName })),
      unsupportedActions: []
    };
  }

  const matches = board.cards.flatMap((card) =>
    findAttachmentMatches(card, rawAttachments).map((match) => ({
      relativePath: match.relativePath,
      cardId: card.id,
      attachmentId: match.attachment.id,
      fileName: match.attachment.fileName
    }))
  );
  const matchedPaths = new Set(matches.map((match) => match.relativePath));

  return {
    archivedLists: board.lists.filter((list) => list.closed).map((list) => ({ id: list.id, name: list.name })),
    archivedCards: board.cards.filter((card) => card.closed).map((card) => ({
      id: card.id,
      name: card.name,
      listName: board.lists.find((list) => list.id === card.listId)?.name ?? null
    })),
    inertRemoteAttachmentUrls: board.cards.flatMap((card) =>
      card.attachments
        .filter((attachment) => attachment.url !== null && /^https?:\/\//i.test(attachment.url))
        .map((attachment) => ({ cardId: card.id, cardName: card.name, url: attachment.url! }))
    ),
    matchedRawAttachments: matches,
    unmatchedRawAttachments: rawAttachments
      .filter((entry) => !matchedPaths.has(entry.relativePath))
      .map((entry) => ({ relativePath: entry.relativePath, fileName: entry.copiedFile.originalName })),
    unsupportedActions: board.unsupportedActions
  };
}

function findAttachmentMatches(card: ParsedTrelloCard, rawAttachments: RawAttachmentCandidate[]): AttachmentMatch[] {
  const matches: AttachmentMatch[] = [];
  const usedPaths = new Set<string>();
  for (const attachment of card.attachments) {
    const candidate = rawAttachments.find((entry) => {
      if (usedPaths.has(entry.relativePath)) {
        return false;
      }
      if (entry.match?.cardId !== undefined && entry.match.cardId !== card.id) {
        return false;
      }
      if (entry.match?.sourceId !== undefined && entry.match.sourceId === attachment.id) {
        return true;
      }
      const entryName = normalizeFileName(entry.match?.fileName ?? entry.copiedFile.originalName ?? fileBaseName(entry.relativePath));
      return entryName === normalizeFileName(attachment.fileName) || entryName === normalizeFileName(attachment.name);
    });
    if (candidate !== undefined) {
      usedPaths.add(candidate.relativePath);
      matches.push({ relativePath: candidate.relativePath, copiedFile: candidate.copiedFile, attachment });
    }
  }
  return matches;
}

function getRawAttachmentCandidates(entries: NormalizedEntry[]): RawAttachmentCandidate[] {
  return entries.filter((entry): entry is RawAttachmentCandidate => entry.kind === "raw_attachment" && entry.copiedFile !== undefined);
}

function buildProjectDescription(board: ParsedTrelloBoard): string {
  const lines = ["Imported from a local Trello board JSON export.", `Trello board ID: ${board.id}`];
  if (board.description !== null) {
    lines.push("", board.description);
  }
  return lines.join("\n");
}

function buildCardBody(card: ParsedTrelloCard, comments: ParsedTrelloComment[]): string {
  const lines: string[] = [];
  if (card.description !== null) {
    lines.push(card.description, "");
  }
  lines.push("Imported from Trello.");
  lines.push(`Trello card ID: ${card.id}`);
  lines.push(`Trello list ID: ${card.listId}`);
  if (card.closed) {
    lines.push("Archived in Trello: yes");
  }
  if (card.dueText !== null) {
    lines.push(`Trello due date: ${card.dueText}`);
  }
  if (card.labels.length > 0) {
    lines.push(`Trello labels: ${card.labels.map(labelToTagName).join(", ")}`);
  }
  if (comments.length > 0) {
    lines.push("", "Trello comments:");
    for (const comment of comments) {
      lines.push(`- ${comment.authorLabel === null ? "Unknown" : comment.authorLabel}: ${comment.body}`);
    }
  }
  if (card.attachments.length > 0) {
    lines.push("", "Trello attachments:");
    for (const attachment of card.attachments) {
      lines.push(`- ${attachment.name}${attachment.url === null ? "" : ` (${attachment.url})`}`);
    }
  }
  return lines.join("\n").trim();
}

function buildCommentBody(comment: ParsedTrelloComment): string {
  const lines = [comment.body];
  if (comment.date !== null) {
    lines.push("", `Trello comment date: ${comment.date}`);
  }
  lines.push(`Trello comment ID: ${comment.id}`);
  return lines.join("\n");
}

function labelToTagName(label: TrelloLabel): string {
  return label.name.trim() || label.color?.trim() || "trello-label";
}

function dedupeLabels(labels: TrelloLabel[]): TrelloLabel[] {
  const result: TrelloLabel[] = [];
  const seen = new Set<string>();
  for (const label of labels) {
    const key = label.id || labelToTagName(label);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(label);
    }
  }
  return result;
}

function parseDate(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  try {
    return normalizeTaskDateTime(value, "dueAt") ?? null;
  } catch {
    return null;
  }
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

function normalizeFileName(value: string): string {
  return fileBaseName(value).trim().toLowerCase();
}

function normalizeTitle(value: string, fallback: string): string {
  const normalized = value.trim();
  return normalized.length === 0 ? fallback : normalized;
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
