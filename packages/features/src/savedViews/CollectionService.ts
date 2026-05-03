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
  type SearchIndexRecord,
  type TaskWithItemRecord
} from "@local-work-os/db";
import { TagService } from "../metadata/TagService";
import { TaskService, type CreateTaskInput } from "../tasks/TaskService";
import { SavedViewService, type SavedViewServiceIdFactory } from "./SavedViewService";
import {
  parseSavedViewQueryJson,
  type SavedViewQuery
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
};

export type CollectionEvaluationResult = SavedViewEvaluationResult & {
  collection: CollectionSummary;
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

export type CreateTaskInCollectionInput = Omit<CreateTaskInput, "workspaceId"> & {
  collectionId: string;
  workspaceId?: string;
};

export type CollectionTaskMutationResult = TaskWithItemRecord & {
  tagSlug: string;
  searchRecord: SearchIndexRecord;
  inlineTags: string[];
};

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

  evaluateCollection(collectionId: string): CollectionEvaluationResult {
    const collection = this.requireCollection(collectionId);
    const evaluation = this.savedViewService().evaluateSavedView({
      workspaceId: collection.workspaceId,
      query: collection.queryJson
    });

    return {
      ...evaluation,
      collection: toCollectionSummary(collection)
    };
  }

  async createTaskInCollection(
    input: CreateTaskInCollectionInput
  ): Promise<CollectionTaskMutationResult> {
    validateNonEmptyString(input.collectionId, "collectionId");
    const collection = this.requireCollection(input.collectionId);
    const tagSlug = extractSingleTagSlug(parseSavedViewQueryJson(collection.queryJson));

    if (tagSlug === null) {
      throw new Error("Tasks can only be created directly in tag collections.");
    }

    if (
      input.workspaceId !== undefined &&
      input.workspaceId !== collection.workspaceId
    ) {
      throw new Error("Collection task workspaceId must match the collection workspace.");
    }

    const task = await new TaskService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).createTask({
      ...input,
      workspaceId: collection.workspaceId
    });
    const tagging = await new TagService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).addTagToTarget({
      workspaceId: collection.workspaceId,
      targetType: "item",
      targetId: task.item.id,
      name: tagSlug,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      source: "manual"
    });

    return {
      item: task.item,
      task: task.task,
      inlineTags: task.inlineTags,
      tagSlug,
      searchRecord: tagging.searchRecord
    };
  }

  private requireCollection(collectionId: string): SavedViewRecord {
    validateNonEmptyString(collectionId, "collectionId");
    const savedView = new SavedViewRepository(this.connection).getById(collectionId);

    if (savedView === null || savedView.type !== "collection") {
      throw new Error(`Collection was not found: ${collectionId}.`);
    }

    return savedView;
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
    updatedAt: savedView.updatedAt
  };
}

export type {
  SavedViewEvaluationResult,
  SavedViewResultGroup,
  SavedViewResultRef
};

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
