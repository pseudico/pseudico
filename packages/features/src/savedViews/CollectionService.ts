import {
  createLocalId,
  normalizeTagName,
  slugifyTagName,
  type ActivityActorType
} from "@local-work-os/core";
import {
  SavedViewRepository,
  type DatabaseConnection,
  type SavedViewRecord,
  type NoteWithItemRecord,
  type SearchIndexRecord,
  type TaskWithItemRecord
} from "@local-work-os/db";
import { TagService } from "../metadata/TagService";
import { NoteService, type CreateNoteInput } from "../notes/NoteService";
import { TaskService, type CreateTaskInput } from "../tasks/TaskService";
import { SavedViewService, type SavedViewServiceIdFactory } from "./SavedViewService";
import { isViewMode, type ViewMode } from "../viewModes";
import {
  parseSavedViewQueryJson,
  type SavedViewQuery,
  type SavedViewQueryCondition
} from "./SavedViewQuery";
import type {
  SavedViewEvaluationResult,
  SavedViewResultGroup,
  SavedViewResultRef
} from "./QueryEvaluator";

export type CollectionKind = "tag" | "keyword" | "custom";

export type CollectionSummary = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  kind: CollectionKind;
  tagSlug: string | null;
  keyword: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
  viewMode: ViewMode;
};

export type CollectionEvaluationResult = SavedViewEvaluationResult & {
  collection: CollectionSummary;
};

export type EvaluateCollectionInput = {
  collectionId: string;
  limit?: number;
  offset?: number;
};

export type CreateTagCollectionInput = {
  workspaceId: string;
  tagSlug: string;
  actorType?: ActivityActorType;
  name?: string;
  description?: string | null;
};

export type CreateKeywordCollectionInput = {
  workspaceId: string;
  query: string;
  actorType?: ActivityActorType;
  name?: string;
  description?: string | null;
};

export type CreateMetadataCollectionInput = {
  workspaceId: string;
  tagSlugs?: readonly string[];
  categoryId?: string | null;
  includeArchived?: boolean;
  actorType?: ActivityActorType;
  name?: string;
  description?: string | null;
};

export type CreateTaskInCollectionInput = Omit<CreateTaskInput, "workspaceId"> & {
  collectionId: string;
  workspaceId?: string;
};

export type CreateNoteInCollectionInput = Omit<CreateNoteInput, "workspaceId"> & {
  collectionId: string;
  workspaceId?: string;
};

export type CreateCollectionItemInput =
  | ({ itemType: "task" } & CreateTaskInCollectionInput)
  | ({ itemType: "note" } & CreateNoteInCollectionInput);

export type CollectionInheritedMetadata = {
  tagSlugs: string[];
  categoryId: string | null;
};

export type CollectionTaskMutationResult = TaskWithItemRecord & {
  inheritedMetadata: CollectionInheritedMetadata;
  searchRecord: SearchIndexRecord;
  inlineTags: string[];
};

export type CollectionNoteMutationResult = NoteWithItemRecord & {
  inheritedMetadata: CollectionInheritedMetadata;
  searchRecord: SearchIndexRecord;
  inlineTags: string[];
};

export type CollectionItemMutationResult =
  | ({ itemType: "task" } & CollectionTaskMutationResult)
  | ({ itemType: "note" } & CollectionNoteMutationResult);

export class CollectionService {
  readonly module = "savedViews.collections";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: SavedViewServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: SavedViewServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
  }

  async createTagCollection(
    input: CreateTagCollectionInput
  ): Promise<CollectionSummary> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const tagSlug = normalizeTagSlug(input.tagSlug);
    const savedView = await this.savedViewService().createSavedView({
      workspaceId: input.workspaceId,
      type: "collection",
      name: input.name ?? `@${tagSlug}`,
      description: input.description ?? `Items tagged @${tagSlug}.`,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      query: createTagCollectionQuery(tagSlug),
      display: {
        collectionKind: "tag",
        tagSlug
      },
      isFavorite: true
    });

    return toCollectionSummary(savedView.savedView);
  }

  async createMetadataCollection(
    input: CreateMetadataCollectionInput
  ): Promise<CollectionSummary> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const tagSlugs = normalizeTagSlugs(input.tagSlugs ?? []);
    const categoryId = normalizeOptionalString(input.categoryId ?? null, "categoryId");

    if (tagSlugs.length === 0 && categoryId === null && input.includeArchived !== true) {
      throw new Error("A metadata collection requires at least one tag, category, or archived filter.");
    }

    const label = formatMetadataCollectionLabel(tagSlugs, categoryId, input.includeArchived === true);
    const savedView = await this.savedViewService().createSavedView({
      workspaceId: input.workspaceId,
      type: "collection",
      name: input.name ?? label,
      description: input.description ?? `Metadata filter: ${label}.`,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      query: createMetadataCollectionQuery({
        tagSlugs,
        categoryId,
        includeArchived: input.includeArchived === true
      }),
      display: {
        collectionKind: "custom",
        metadataFilter: { tagSlugs, categoryId, includeArchived: input.includeArchived === true }
      },
      isFavorite: true
    });

    return toCollectionSummary(savedView.savedView);
  }

  async createKeywordCollection(
    input: CreateKeywordCollectionInput
  ): Promise<CollectionSummary> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const keyword = normalizeKeyword(input.query);
    const savedView = await this.savedViewService().createSavedView({
      workspaceId: input.workspaceId,
      type: "collection",
      name: input.name ?? `Search: ${keyword}`,
      description: input.description ?? `Items and containers matching "${keyword}".`,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      query: createKeywordCollectionQuery(keyword),
      display: {
        collectionKind: "keyword",
        keyword
      }
    });

    return toCollectionSummary(savedView.savedView);
  }

  listCollections(workspaceId: string): CollectionSummary[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return this.savedViewService()
      .listSavedViews({ workspaceId, type: "collection" })
      .map(toCollectionSummary);
  }

  evaluateCollection(
    input: string | EvaluateCollectionInput
  ): CollectionEvaluationResult {
    const collectionId = typeof input === "string" ? input : input.collectionId;
    const collection = this.requireCollection(collectionId);
    const evaluation = this.savedViewService().evaluateSavedView({
      workspaceId: collection.workspaceId,
      query: collection.queryJson,
      ...(typeof input === "string" || input.limit === undefined
        ? {}
        : { limit: input.limit }),
      ...(typeof input === "string" || input.offset === undefined
        ? {}
        : { offset: input.offset })
    });

    return {
      ...evaluation,
      collection: toCollectionSummary(collection)
    };
  }

  async createTaskInCollection(
    input: CreateTaskInCollectionInput
  ): Promise<CollectionTaskMutationResult> {
    const collection = this.requireCollectionForInlineItem(input);
    const inheritedMetadata = extractInheritableMetadata(
      parseSavedViewQueryJson(collection.queryJson)
    );

    const task = await new TaskService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).createTask({
      ...input,
      workspaceId: collection.workspaceId,
      categoryId: input.categoryId ?? inheritedMetadata.categoryId
    });
    const tagging = await this.applyInheritedTags({
      workspaceId: collection.workspaceId,
      itemId: task.item.id,
      tagSlugs: inheritedMetadata.tagSlugs,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType })
    });

    return {
      item: task.item,
      task: task.task,
      inlineTags: task.inlineTags,
      inheritedMetadata,
      searchRecord: tagging?.searchRecord ?? task.searchRecord
    };
  }

  async createNoteInCollection(
    input: CreateNoteInCollectionInput
  ): Promise<CollectionNoteMutationResult> {
    const collection = this.requireCollectionForInlineItem(input);
    const inheritedMetadata = extractInheritableMetadata(
      parseSavedViewQueryJson(collection.queryJson)
    );

    const note = await new NoteService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).createNote({
      ...input,
      workspaceId: collection.workspaceId,
      categoryId: input.categoryId ?? inheritedMetadata.categoryId
    });
    const tagging = await this.applyInheritedTags({
      workspaceId: collection.workspaceId,
      itemId: note.item.id,
      tagSlugs: inheritedMetadata.tagSlugs,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType })
    });

    return {
      item: note.item,
      note: note.note,
      inlineTags: note.inlineTags,
      inheritedMetadata,
      searchRecord: tagging?.searchRecord ?? note.searchRecord
    };
  }

  async createItemInCollection(
    input: CreateCollectionItemInput
  ): Promise<CollectionItemMutationResult> {
    if (input.itemType === "task") {
      const result = await this.createTaskInCollection(input);
      return { ...result, itemType: "task" };
    }

    const result = await this.createNoteInCollection(input);
    return { ...result, itemType: "note" };
  }

  private requireCollection(collectionId: string): SavedViewRecord {
    validateNonEmptyString(collectionId, "collectionId");
    const savedView = new SavedViewRepository(this.connection).getById(collectionId);

    if (savedView === null || savedView.type !== "collection") {
      throw new Error(`Collection was not found: ${collectionId}.`);
    }

    return savedView;
  }

  private requireCollectionForInlineItem(input: {
    collectionId: string;
    workspaceId?: string;
  }): SavedViewRecord {
    validateNonEmptyString(input.collectionId, "collectionId");
    const collection = this.requireCollection(input.collectionId);

    if (
      input.workspaceId !== undefined &&
      input.workspaceId !== collection.workspaceId
    ) {
      throw new Error("Collection item workspaceId must match the collection workspace.");
    }

    const inheritedMetadata = extractInheritableMetadata(
      parseSavedViewQueryJson(collection.queryJson)
    );

    if (
      inheritedMetadata.tagSlugs.length === 0 &&
      inheritedMetadata.categoryId === null
    ) {
      throw new Error(
        "Items can only be created directly in tag or metadata collections with inheritable filters."
      );
    }

    return collection;
  }

  private async applyInheritedTags(input: {
    workspaceId: string;
    itemId: string;
    tagSlugs: readonly string[];
    actorType?: ActivityActorType;
  }): Promise<{ searchRecord: SearchIndexRecord } | null> {
    let latest: { searchRecord: SearchIndexRecord } | null = null;
    const tagService = new TagService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });

    for (const tagSlug of input.tagSlugs) {
      latest = await tagService.addTagToTarget({
        workspaceId: input.workspaceId,
        targetType: "item",
        targetId: input.itemId,
        name: tagSlug,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        source: "manual"
      });
    }

    return latest;
  }

  private savedViewService(): SavedViewService {
    return new SavedViewService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
  }
}

export function createTagCollectionQuery(tagSlug: string): SavedViewQuery {
  return {
    version: 1,
    match: "all",
    targets: ["item"],
    conditions: [{ field: "tag", operator: "has", value: normalizeTagSlug(tagSlug) }],
    groupBy: "container",
    sort: [
      { field: "container", direction: "asc" },
      { field: "updatedAt", direction: "desc" }
    ]
  };
}

export function createMetadataCollectionQuery(input: {
  tagSlugs?: readonly string[];
  categoryId?: string | null;
  includeArchived?: boolean;
}): SavedViewQuery {
  const tagSlugs = normalizeTagSlugs(input.tagSlugs ?? []);
  const categoryId = normalizeOptionalString(input.categoryId ?? null, "categoryId");
  const conditions: SavedViewQuery["conditions"] = tagSlugs.map((tagSlug) => ({
    field: "tag",
    operator: "has",
    value: tagSlug
  }));

  if (categoryId !== null) {
    conditions.push({ field: "category", operator: "is", value: categoryId });
  }

  return {
    version: 1,
    match: "all",
    targets: ["container", "item"],
    conditions,
    groupBy: "targetType",
    sort: [
      { field: "type", direction: "asc" },
      { field: "updatedAt", direction: "desc" }
    ],
    includeArchived: input.includeArchived === true
  };
}

export function createKeywordCollectionQuery(query: string): SavedViewQuery {
  return {
    version: 1,
    match: "all",
    targets: ["container", "item"],
    conditions: [{ field: "text", operator: "contains", value: normalizeKeyword(query) }],
    groupBy: "container",
    sort: [
      { field: "container", direction: "asc" },
      { field: "updatedAt", direction: "desc" }
    ]
  };
}

export function toCollectionSummary(savedView: SavedViewRecord): CollectionSummary {
  const query = parseSavedViewQueryJson(savedView.queryJson);
  const display = parseDisplay(savedView.displayJson);
  const queryTagSlug = extractSingleTagSlug(query);
  const queryKeyword = extractKeyword(query);
  const displayKind = display.collectionKind;
  const kind: CollectionKind =
    displayKind === "tag" || queryTagSlug !== null
      ? "tag"
      : displayKind === "keyword" || queryKeyword !== null
        ? "keyword"
        : "custom";

  return {
    id: savedView.id,
    workspaceId: savedView.workspaceId,
    name: savedView.name,
    description: savedView.description,
    kind,
    tagSlug:
      typeof display.tagSlug === "string" && display.tagSlug.trim().length > 0
        ? display.tagSlug
        : queryTagSlug,
    keyword:
      typeof display.keyword === "string" && display.keyword.trim().length > 0
        ? display.keyword
        : queryKeyword,
    isFavorite: savedView.isFavorite,
    createdAt: savedView.createdAt,
    updatedAt: savedView.updatedAt,
    viewMode: isViewMode(display.viewMode) ? display.viewMode : "list"
  };
}

export type {
  SavedViewEvaluationResult,
  SavedViewResultGroup,
  SavedViewResultRef
};

function extractInheritableMetadata(query: SavedViewQuery): CollectionInheritedMetadata {
  if (query.match !== "all") {
    return { tagSlugs: [], categoryId: null };
  }

  const tagSlugs = query.conditions
    .filter(
      (condition): condition is SavedViewQueryCondition & { value: string } =>
        condition.field === "tag" &&
        condition.operator === "has" &&
        "value" in condition &&
        typeof condition.value === "string"
    )
    .map((condition) => normalizeTagSlug(condition.value));
  const categoryConditions = query.conditions.filter(
    (condition) => condition.field === "category" && condition.operator === "is"
  );
  const firstCategoryCondition = categoryConditions[0];
  const categoryValue =
    firstCategoryCondition !== undefined && "value" in firstCategoryCondition
      ? firstCategoryCondition.value
      : null;

  return {
    tagSlugs: [...new Set(tagSlugs)].sort(),
    categoryId: typeof categoryValue === "string" ? categoryValue : null
  };
}

function extractSingleTagSlug(query: SavedViewQuery): string | null {
  const tagConditions = query.conditions.filter(
    (condition) => condition.field === "tag"
  );

  if (tagConditions.length !== 1) {
    return null;
  }

  const value = tagConditions[0]?.value;

  return typeof value === "string" ? normalizeTagSlug(value) : null;
}

function extractKeyword(query: SavedViewQuery): string | null {
  const textConditions = query.conditions.filter(
    (condition) => condition.field === "text"
  );

  if (textConditions.length !== 1) {
    return null;
  }

  const value = textConditions[0]?.value;

  return typeof value === "string" ? normalizeKeyword(value) : null;
}

function normalizeTagSlug(input: string): string {
  const name = normalizeTagName(input);
  const slug = slugifyTagName(name);

  if (slug === null) {
    throw new Error("tagSlug must contain only letters, numbers, and hyphens.");
  }

  return slug;
}

function normalizeTagSlugs(values: readonly string[]): string[] {
  return [...new Set(values.map(normalizeTagSlug))].sort();
}

function normalizeOptionalString(value: string | null, fieldName: string): string | null {
  if (value === null) {
    return null;
  }

  validateNonEmptyString(value, fieldName);
  return value;
}

function formatMetadataCollectionLabel(
  tagSlugs: readonly string[],
  categoryId: string | null,
  includeArchived: boolean
): string {
  const parts = [
    ...tagSlugs.map((slug) => `@${slug}`),
    ...(categoryId === null ? [] : [`category:${categoryId}`]),
    ...(includeArchived ? ["with archived"] : [])
  ];

  return parts.length === 0 ? "Metadata filter" : parts.join(" + ");
}

function normalizeKeyword(input: string): string {
  const query = input.trim().replace(/\s+/g, " ");

  if (query.length === 0) {
    throw new Error("query must be a non-empty string.");
  }

  return query;
}

function parseDisplay(displayJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(displayJson);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
