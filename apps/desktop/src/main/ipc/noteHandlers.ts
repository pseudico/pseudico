import { NoteService, TagService } from "@local-work-os/features";
import {
  createDatabaseConnection,
  resolveWorkspaceDatabasePath,
  type DatabaseConnection,
  type NoteWithItemRecord,
  type TaggedTargetRecord
} from "@local-work-os/db";
import {
  apiError,
  apiOk,
  type ApiResult,
  type CreateNoteInput,
  type ItemTagSummary,
  type NoteFormat,
  type NoteSummary,
  type UpdateNoteInput,
  type WorkspaceSummary
} from "../../preload/api";
import type { WorkspaceFileSystemService } from "../services/workspace/WorkspaceFileSystemService";

type CurrentWorkspaceService = Pick<
  WorkspaceFileSystemService,
  "getCurrentWorkspace"
>;

type NoteIpcHandlers = {
  handleCreateNote: (input: unknown) => Promise<ApiResult<NoteSummary>>;
  handleUpdateNote: (input: unknown) => Promise<ApiResult<NoteSummary>>;
  handleListNotesByContainer: (
    input: unknown
  ) => Promise<ApiResult<NoteSummary[]>>;
};

export function createNoteIpcHandlers(
  workspaceService: CurrentWorkspaceService
): NoteIpcHandlers {
  return {
    async handleCreateNote(input) {
      if (!isCreateNoteInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "createNote requires containerId, title, and content fields."
        );
      }

      return await withNoteService(workspaceService, async (context) => {
        const workspaceId = resolveWorkspaceId(input.workspaceId, context.workspace);
        const result = await context.noteService.createNote({
          ...input,
          workspaceId
        });

        return apiOk(toNoteSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleUpdateNote(input) {
      if (!isUpdateNoteInput(input)) {
        return apiError(
          "INVALID_INPUT",
          "updateNote requires an itemId and at least one note update field."
        );
      }

      return await withNoteService(workspaceService, async (context) => {
        const result = await context.noteService.updateNote(input);
        return apiOk(toNoteSummary(result, hydrateSingleItemTags(context, result.item.id)));
      });
    },

    async handleListNotesByContainer(input) {
      if (!isNonEmptyString(input)) {
        return apiError(
          "INVALID_INPUT",
          "listNotesByContainer requires a containerId string."
        );
      }

      return await withNoteService(workspaceService, async (context) => {
        const notes = context.noteService.listNotesByContainer(input);
        const tagsByItemId = context.tagService.hydrateItemTags({
          workspaceId: context.workspace.id,
          itemIds: notes.map((note) => note.item.id)
        });

        return apiOk(
          notes.map((note) => toNoteSummary(note, tagsByItemId[note.item.id] ?? []))
        );
      });
    }
  };
}

async function withNoteService<T>(
  workspaceService: CurrentWorkspaceService,
  operation: (context: {
    connection: DatabaseConnection;
    noteService: NoteService;
    tagService: TagService;
    workspace: WorkspaceSummary;
  }) => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  const workspace = workspaceService.getCurrentWorkspace();

  if (workspace === null) {
    return apiError("WORKSPACE_ERROR", "No workspace is open.");
  }

  const connection = await createDatabaseConnection({
    databasePath: resolveWorkspaceDatabasePath(workspace.rootPath),
    fileMustExist: true
  });

  try {
    return await operation({
      connection,
      noteService: new NoteService({ connection }),
      tagService: new TagService({ connection }),
      workspace
    });
  } catch (error) {
    return apiError(
      "WORKSPACE_ERROR",
      error instanceof Error ? error.message : "Note operation failed."
    );
  } finally {
    connection.close();
  }
}

function resolveWorkspaceId(
  requestedWorkspaceId: string | undefined,
  currentWorkspace: WorkspaceSummary
): string {
  if (
    requestedWorkspaceId !== undefined &&
    requestedWorkspaceId !== currentWorkspace.id
  ) {
    throw new Error("Note workspaceId must match the current workspace.");
  }

  return currentWorkspace.id;
}

function hydrateSingleItemTags(
  context: {
    tagService: TagService;
    workspace: WorkspaceSummary;
  },
  itemId: string
): TaggedTargetRecord[] {
  return context.tagService.hydrateItemTags({
    workspaceId: context.workspace.id,
    itemIds: [itemId]
  })[itemId] ?? [];
}

function toNoteSummary(
  noteWithItem: NoteWithItemRecord,
  tags: readonly TaggedTargetRecord[] = []
): NoteSummary {
  const { item, note } = noteWithItem;

  if (item.type !== "note") {
    throw new Error(`Expected note item but received ${item.type}.`);
  }

  return {
    id: item.id,
    workspaceId: item.workspaceId,
    containerId: item.containerId,
    containerTabId: item.containerTabId,
    type: "note",
    title: item.title,
    body: item.body,
    categoryId: item.categoryId,
    status: item.status,
    sortOrder: item.sortOrder,
    pinned: item.pinned,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt,
    archivedAt: item.archivedAt,
    deletedAt: item.deletedAt,
    tags: tags.map(toItemTagSummary),
    format: note.format,
    content: note.content,
    preview: note.preview,
    noteCreatedAt: note.createdAt,
    noteUpdatedAt: note.updatedAt
  };
}

function toItemTagSummary(tag: TaggedTargetRecord): ItemTagSummary {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    source: tag.taggingSource
  };
}

function isCreateNoteInput(input: unknown): input is CreateNoteInput {
  return (
    isRecord(input) &&
    isOptionalString(input.workspaceId) &&
    isNonEmptyString(input.containerId) &&
    isNonEmptyString(input.title) &&
    typeof input.content === "string" &&
    isOptionalNullableString(input.categoryId) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalNumber(input.sortOrder) &&
    isOptionalBoolean(input.pinned) &&
    isOptionalActorType(input.actorType) &&
    (input.format === undefined || isNoteFormatValue(input.format))
  );
}

function isUpdateNoteInput(input: unknown): input is UpdateNoteInput {
  return (
    isRecord(input) &&
    isNonEmptyString(input.itemId) &&
    (input.title === undefined || isNonEmptyString(input.title)) &&
    (input.content === undefined || typeof input.content === "string") &&
    isOptionalNullableString(input.categoryId) &&
    isOptionalNullableString(input.containerTabId) &&
    isOptionalNumber(input.sortOrder) &&
    isOptionalBoolean(input.pinned) &&
    isOptionalActorType(input.actorType) &&
    hasNoteUpdateField(input)
  );
}

function hasNoteUpdateField(input: Record<string, unknown>): boolean {
  return [
    "categoryId",
    "containerTabId",
    "content",
    "pinned",
    "sortOrder",
    "title"
  ].some((field) => input[field] !== undefined);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || isNonEmptyString(value);
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === "string";
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === "number";
}

function isOptionalActorType(value: unknown): boolean {
  return (
    value === undefined ||
    value === "local_user" ||
    value === "system" ||
    value === "importer"
  );
}

function isNoteFormatValue(value: unknown): value is NoteFormat {
  return value === "markdown";
}
