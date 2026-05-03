import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  isNoteFormat,
  type ActivityActorType,
  type NoteFormat
} from "@local-work-os/core";
import {
  ActivityLogService,
  ItemRepository,
  NoteRepository,
  SearchIndexService,
  SortOrderService,
  TransactionService,
  type DatabaseConnection,
  type ItemRecord,
  type NoteDetailsRecord,
  type NoteWithItemRecord,
  type SearchIndexRecord,
  type UpdateItemPatch,
  type UpdateNoteDetailsPatch
} from "@local-work-os/db";
import {
  extractInlineNoteTags,
  generateNotePreview
} from "./NotePreview";

// Owns Markdown note application operations.
// Does not own rich text editor internals or attachment storage.
export type NoteServiceIdFactory = (prefix: string) => string;

export type CreateNoteInput = {
  workspaceId: string;
  containerId: string;
  title: string;
  content: string;
  actorType?: ActivityActorType;
  categoryId?: string | null;
  containerTabId?: string | null;
  format?: NoteFormat;
  sortOrder?: number;
  pinned?: boolean;
};

export type UpdateNoteInput = {
  itemId: string;
  actorType?: ActivityActorType;
  title?: string;
  content?: string;
  categoryId?: string | null;
  containerTabId?: string | null;
  sortOrder?: number;
  pinned?: boolean;
};

export type NoteMutationResult = NoteWithItemRecord & {
  searchRecord: SearchIndexRecord;
  inlineTags: string[];
};

export class NoteService {
  readonly module = "notes";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: NoteServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: NoteServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async createNote(input: CreateNoteInput): Promise<NoteMutationResult> {
    this.validateCreateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const preview = generateNotePreview(input.content);
      const itemRepository = new ItemRepository(this.connection);
      const noteRepository = new NoteRepository(this.connection);
      const sortOrderService = new SortOrderService({
        connection: this.connection
      });
      const item = itemRepository.create({
        id: this.idFactory("item"),
        workspaceId: input.workspaceId,
        containerId: input.containerId,
        containerTabId: input.containerTabId ?? null,
        type: "note",
        title: input.title.trim(),
        body: preview,
        categoryId: normalizeNullableString(input.categoryId),
        sortOrder:
          input.sortOrder ??
          sortOrderService.getNextItemSortOrder({
            containerId: input.containerId,
            containerTabId: input.containerTabId ?? null
          }),
        ...(input.pinned === undefined ? {} : { pinned: input.pinned }),
        timestamp
      });
      const note = noteRepository.createDetails({
        itemId: item.id,
        workspaceId: input.workspaceId,
        content: input.content,
        preview,
        format: input.format ?? "markdown",
        timestamp
      });

      this.logNoteEvent({
        item,
        note,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.noteCreated,
        summary: `Created note "${item.title}".`,
        before: null,
        timestamp
      });

      const search = this.upsertSearchRecord(item, note, timestamp);

      return {
        item,
        note,
        searchRecord: search.record,
        inlineTags: search.inlineTags
      };
    });
  }

  async updateNote(input: UpdateNoteInput): Promise<NoteMutationResult> {
    this.validateUpdateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireNote(input.itemId);
      const itemPatch: UpdateItemPatch = { timestamp };
      const notePatch: UpdateNoteDetailsPatch = { timestamp };

      if (input.title !== undefined) {
        itemPatch.title = input.title.trim();
      }

      if (input.categoryId !== undefined) {
        itemPatch.categoryId = normalizeNullableString(input.categoryId);
      }

      if (input.sortOrder !== undefined) {
        itemPatch.sortOrder = input.sortOrder;
      }

      if (input.pinned !== undefined) {
        itemPatch.pinned = input.pinned;
      }

      if (input.containerTabId !== undefined) {
        itemPatch.containerTabId = input.containerTabId;
      }

      if (input.content !== undefined) {
        const preview = generateNotePreview(input.content);
        itemPatch.body = preview;
        notePatch.content = input.content;
        notePatch.preview = preview;
      }

      const item = new ItemRepository(this.connection).update(
        input.itemId,
        itemPatch
      );
      const note = new NoteRepository(this.connection).updateDetails(
        input.itemId,
        notePatch
      );

      this.logNoteEvent({
        item,
        note,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.noteUpdated,
        summary: `Updated note "${item.title}".`,
        before,
        timestamp
      });

      const search = this.upsertSearchRecord(item, note, timestamp);

      return {
        item,
        note,
        searchRecord: search.record,
        inlineTags: search.inlineTags
      };
    });
  }

  async archiveNote(
    itemId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<NoteMutationResult> {
    validateNonEmptyString(itemId, "itemId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireNote(itemId);
      const item = new ItemRepository(this.connection).archive(itemId, timestamp);
      const note = new NoteRepository(this.connection).getDetailsByItemId(itemId);

      if (note === null) {
        throw new Error(`Note details row was not found: ${itemId}.`);
      }

      this.logNoteEvent({
        item,
        note,
        actorType,
        action: ActivityAction.noteArchived,
        summary: `Archived note "${item.title}".`,
        before,
        timestamp
      });

      const search = this.upsertSearchRecord(item, note, timestamp);

      return {
        item,
        note,
        searchRecord: search.record,
        inlineTags: search.inlineTags
      };
    });
  }

  listNotesByContainer(containerId: string): NoteWithItemRecord[] {
    validateNonEmptyString(containerId, "containerId");

    return new NoteRepository(this.connection).listByContainer(containerId);
  }

  generateNotePreview(content: string): string | null {
    return generateNotePreview(content);
  }

  private requireNote(itemId: string): NoteWithItemRecord {
    const note = new NoteRepository(this.connection).getByItemId(itemId);

    if (note === null) {
      throw new Error(`Note was not found: ${itemId}.`);
    }

    return note;
  }

  private upsertSearchRecord(
    item: ItemRecord,
    note: NoteDetailsRecord,
    timestamp: string
  ): { record: SearchIndexRecord; inlineTags: string[] } {
    const inlineTags = extractInlineNoteTags([item.title, note.content]);
    const record = new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertNote(item, note, {
      timestamp,
      tags: inlineTags,
      metadata: {
        inlineTags
      }
    });

    return { record, inlineTags };
  }

  private logNoteEvent(input: {
    item: ItemRecord;
    note: NoteDetailsRecord;
    actorType?: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: NoteWithItemRecord | null;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.item.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: input.action,
      targetType: "item",
      targetId: input.item.id,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify({ item: input.item, note: input.note }),
      timestamp: input.timestamp
    });
  }

  private validateCreateInput(input: CreateNoteInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");
    validateNonEmptyString(input.title, "title");

    if (input.format !== undefined && !isNoteFormat(input.format)) {
      throw new Error("format must be markdown.");
    }
  }

  private validateUpdateInput(input: UpdateNoteInput): void {
    validateNonEmptyString(input.itemId, "itemId");

    if (input.title !== undefined) {
      validateNonEmptyString(input.title, "title");
    }

    if (
      input.title === undefined &&
      input.content === undefined &&
      input.categoryId === undefined &&
      input.containerTabId === undefined &&
      input.pinned === undefined &&
      input.sortOrder === undefined
    ) {
      throw new Error("At least one note field must be provided.");
    }
  }
}

export const notesModuleContract = {
  module: "notes",
  purpose: "Manage Markdown note operations and note search projections.",
  owns: ["note operations", "Markdown content boundary", "note previews"],
  doesNotOwn: ["rich text editor internals", "file attachments", "raw search index implementation"],
  integrationPoints: ["projects", "contacts", "inbox", "search", "metadata", "saved views", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeNullableString(
  value: string | null | undefined
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
