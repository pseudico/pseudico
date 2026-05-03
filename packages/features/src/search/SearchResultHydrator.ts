import {
  ContainerRepository,
  ItemRepository,
  ListRepository,
  type ContainerRecord,
  type DatabaseConnection,
  type ItemRecord,
  type SearchIndexRecord
} from "@local-work-os/db";

export type SearchResultTargetType = "container" | "item" | "list_item";

export type SearchResultKind =
  | "inbox"
  | "project"
  | "contact"
  | "task"
  | "list"
  | "note"
  | "file"
  | "link"
  | "heading"
  | "location"
  | "comment"
  | "list_item"
  | "unknown";

export type SearchResult = {
  id: string;
  workspaceId: string;
  targetType: SearchResultTargetType;
  targetId: string;
  kind: SearchResultKind;
  title: string;
  body: string | null;
  status: string | null;
  tags: string[];
  category: string | null;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
  containerId: string | null;
  containerTitle: string | null;
  parentItemId: string | null;
  parentItemTitle: string | null;
  destinationPath: string | null;
};

export type HydrateSearchResultsOptions = {
  includeArchived?: boolean;
  includeDeleted?: boolean;
  kinds?: readonly SearchResultKind[];
};

export class SearchResultHydrator {
  private readonly containerRepository: ContainerRepository;
  private readonly itemRepository: ItemRepository;
  private readonly listRepository: ListRepository;

  constructor(input: { connection: DatabaseConnection }) {
    this.containerRepository = new ContainerRepository(input.connection);
    this.itemRepository = new ItemRepository(input.connection);
    this.listRepository = new ListRepository(input.connection);
  }

  hydrateSearchResults(
    records: readonly SearchIndexRecord[],
    options: HydrateSearchResultsOptions = {}
  ): SearchResult[] {
    const kindFilter =
      options.kinds === undefined ? null : new Set<SearchResultKind>(options.kinds);

    return records
      .map((record) => this.hydrateRecord(record))
      .filter((result): result is SearchResult => result !== null)
      .filter((result) => options.includeDeleted === true || result.deletedAt === null)
      .filter((result) => options.includeArchived === true || result.archivedAt === null)
      .filter((result) => kindFilter === null || kindFilter.has(result.kind));
  }

  private hydrateRecord(record: SearchIndexRecord): SearchResult | null {
    if (record.targetType === "container") {
      return this.hydrateContainer(record);
    }

    if (record.targetType === "item") {
      return this.hydrateItem(record);
    }

    if (record.targetType === "list_item") {
      return this.hydrateListItem(record);
    }

    return null;
  }

  private hydrateContainer(record: SearchIndexRecord): SearchResult | null {
    const container = this.containerRepository.getById(record.targetId);

    if (container === null || container.workspaceId !== record.workspaceId) {
      return null;
    }

    return {
      id: record.id,
      workspaceId: record.workspaceId,
      targetType: "container",
      targetId: container.id,
      kind: toSearchResultKind(container.type),
      title: container.name,
      body: container.description,
      status: container.status,
      tags: splitTags(record.tags),
      category: record.category,
      updatedAt: container.updatedAt,
      archivedAt: container.archivedAt,
      deletedAt: container.deletedAt,
      containerId: container.id,
      containerTitle: container.name,
      parentItemId: null,
      parentItemTitle: null,
      destinationPath: getContainerDestinationPath(container)
    };
  }

  private hydrateItem(record: SearchIndexRecord): SearchResult | null {
    const item = this.itemRepository.getById(record.targetId);

    if (item === null || item.workspaceId !== record.workspaceId) {
      return null;
    }

    const container = this.containerRepository.getById(item.containerId);

    return {
      id: record.id,
      workspaceId: record.workspaceId,
      targetType: "item",
      targetId: item.id,
      kind: toSearchResultKind(item.type),
      title: item.title,
      body: item.body,
      status: item.status,
      tags: splitTags(record.tags),
      category: record.category,
      updatedAt: item.updatedAt,
      archivedAt: firstNonNull(item.archivedAt, container?.archivedAt ?? null),
      deletedAt: firstNonNull(item.deletedAt, container?.deletedAt ?? null),
      containerId: item.containerId,
      containerTitle: container?.name ?? null,
      parentItemId: null,
      parentItemTitle: null,
      destinationPath: getItemDestinationPath(item, container)
    };
  }

  private hydrateListItem(record: SearchIndexRecord): SearchResult | null {
    const listItem = this.listRepository
      .listItemsByWorkspace(record.workspaceId, {
        includeArchived: true,
        includeDeleted: true
      })
      .find((candidate) => candidate.id === record.targetId);

    if (listItem === undefined) {
      return null;
    }

    const parentItem = this.itemRepository.getById(listItem.listId);
    const container =
      parentItem === null ? null : this.containerRepository.getById(parentItem.containerId);

    return {
      id: record.id,
      workspaceId: record.workspaceId,
      targetType: "list_item",
      targetId: listItem.id,
      kind: "list_item",
      title: listItem.title,
      body: listItem.body,
      status: listItem.status,
      tags: splitTags(record.tags),
      category: record.category,
      updatedAt: listItem.updatedAt,
      archivedAt: firstNonNull(
        listItem.archivedAt,
        parentItem?.archivedAt ?? null,
        container?.archivedAt ?? null
      ),
      deletedAt: firstNonNull(
        listItem.deletedAt,
        parentItem?.deletedAt ?? null,
        container?.deletedAt ?? null
      ),
      containerId: parentItem?.containerId ?? null,
      containerTitle: container?.name ?? null,
      parentItemId: parentItem?.id ?? null,
      parentItemTitle: parentItem?.title ?? null,
      destinationPath:
        parentItem === null ? null : getItemDestinationPath(parentItem, container)
    };
  }
}

function getContainerDestinationPath(container: ContainerRecord): string | null {
  if (container.type === "project") {
    return `/projects/${container.id}`;
  }

  if (container.type === "inbox") {
    return "/inbox";
  }

  if (container.type === "contact") {
    return "/contacts";
  }

  return null;
}

function getItemDestinationPath(
  item: ItemRecord,
  container: ContainerRecord | null
): string | null {
  if (container?.type === "project") {
    return `/projects/${item.containerId}`;
  }

  if (container?.type === "inbox") {
    return "/inbox";
  }

  if (container?.type === "contact") {
    return "/contacts";
  }

  return null;
}

function splitTags(tags: string): string[] {
  return tags
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function firstNonNull(...values: Array<string | null>): string | null {
  return values.find((value) => value !== null) ?? null;
}

function toSearchResultKind(value: string): SearchResultKind {
  if (
    value === "inbox" ||
    value === "project" ||
    value === "contact" ||
    value === "task" ||
    value === "list" ||
    value === "note" ||
    value === "file" ||
    value === "link" ||
    value === "heading" ||
    value === "location" ||
    value === "comment" ||
    value === "list_item"
  ) {
    return value;
  }

  return "unknown";
}
