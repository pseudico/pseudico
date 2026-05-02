import { createIsoTimestamp, createLocalId } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import {
  ContainerRepository,
  type ContainerRecord,
  ItemRepository,
  type ItemRecord,
  ListRepository,
  type ListItemRecord,
  SearchIndexRepository,
  type RemoveSearchIndexInput,
  type SearchIndexOptions,
  type SearchIndexRecord,
  type UpsertSearchIndexInput
} from "../repositories";

export type SearchIndexTargetType = UpsertSearchIndexInput["targetType"];

export type SearchIndexIdFactory = (prefix: string) => string;

export type SearchProjectionInput = {
  id?: string;
  tags?: string | string[];
  category?: string | null;
  metadata?: Record<string, unknown>;
  timestamp?: string;
};

export type SearchWorkspaceInput = SearchIndexOptions & {
  workspaceId: string;
  query: string;
};

export type RebuildWorkspaceIndexResult = {
  indexedContainerCount: number;
  indexedItemCount: number;
  indexedListItemCount: number;
};

export class SearchIndexService {
  private readonly connection: DatabaseConnection;
  private readonly idFactory: SearchIndexIdFactory;
  private readonly now: () => Date;
  private readonly repository: SearchIndexRepository;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: SearchIndexIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.repository = new SearchIndexRepository(input.connection);
  }

  upsertContainer(
    container: ContainerRecord,
    input: SearchProjectionInput = {}
  ): SearchIndexRecord {
    return this.repository.upsert({
      id: input.id ?? this.idFactory("search"),
      workspaceId: container.workspaceId,
      targetType: "container",
      targetId: container.id,
      title: container.name,
      body: container.description ?? "",
      tags: normalizeTags(input.tags),
      category: input.category ?? null,
      metadataJson: stringifyMetadata({
        type: container.type,
        slug: container.slug,
        status: container.status,
        categoryId: container.categoryId,
        color: container.color,
        isFavorite: container.isFavorite,
        isSystem: container.isSystem,
        archivedAt: container.archivedAt,
        deletedAt: container.deletedAt,
        ...input.metadata
      }),
      isDeleted: container.deletedAt !== null,
      timestamp: input.timestamp ?? createIsoTimestamp(this.now())
    });
  }

  upsertItem(
    item: ItemRecord,
    input: SearchProjectionInput = {}
  ): SearchIndexRecord {
    return this.repository.upsert({
      id: input.id ?? this.idFactory("search"),
      workspaceId: item.workspaceId,
      targetType: "item",
      targetId: item.id,
      title: item.title,
      body: item.body ?? "",
      tags: normalizeTags(input.tags),
      category: input.category ?? null,
      metadataJson: stringifyMetadata({
        type: item.type,
        containerId: item.containerId,
        containerTabId: item.containerTabId,
        status: item.status,
        categoryId: item.categoryId,
        pinned: item.pinned,
        completedAt: item.completedAt,
        archivedAt: item.archivedAt,
        deletedAt: item.deletedAt,
        ...input.metadata
      }),
      isDeleted: item.deletedAt !== null,
      timestamp: input.timestamp ?? createIsoTimestamp(this.now())
    });
  }

  upsertListItem(
    listItem: ListItemRecord,
    input: SearchProjectionInput = {}
  ): SearchIndexRecord {
    return this.repository.upsert({
      id: input.id ?? this.idFactory("search"),
      workspaceId: listItem.workspaceId,
      targetType: "list_item",
      targetId: listItem.id,
      title: listItem.title,
      body: listItem.body ?? "",
      tags: normalizeTags(input.tags),
      category: input.category ?? null,
      metadataJson: stringifyMetadata({
        listId: listItem.listId,
        parentId: listItem.listItemParentId,
        status: listItem.status,
        depth: listItem.depth,
        sortOrder: listItem.sortOrder,
        startAt: listItem.startAt,
        dueAt: listItem.dueAt,
        completedAt: listItem.completedAt,
        archivedAt: listItem.archivedAt,
        deletedAt: listItem.deletedAt,
        ...input.metadata
      }),
      isDeleted: listItem.deletedAt !== null,
      timestamp: input.timestamp ?? createIsoTimestamp(this.now())
    });
  }

  removeTarget(input: RemoveSearchIndexInput): void {
    this.repository.remove(input);
  }

  searchWorkspace(input: SearchWorkspaceInput): SearchIndexRecord[] {
    const options: SearchIndexOptions = {};

    if (input.includeDeleted !== undefined) {
      options.includeDeleted = input.includeDeleted;
    }

    if (input.limit !== undefined) {
      options.limit = input.limit;
    }

    if (input.targetTypes !== undefined) {
      options.targetTypes = input.targetTypes;
    }

    return this.repository.search(input.workspaceId, input.query, options);
  }

  rebuildWorkspaceIndex(workspaceId: string): RebuildWorkspaceIndexResult {
    if (this.connection.sqlite.inTransaction) {
      return this.rebuildWorkspaceIndexInCurrentTransaction(workspaceId);
    }

    this.connection.sqlite.exec("begin immediate");

    try {
      const result = this.rebuildWorkspaceIndexInCurrentTransaction(workspaceId);
      this.connection.sqlite.exec("commit");
      return result;
    } catch (error) {
      this.connection.sqlite.exec("rollback");
      throw error;
    }
  }

  private rebuildWorkspaceIndexInCurrentTransaction(
    workspaceId: string
  ): RebuildWorkspaceIndexResult {
    this.repository.removeWorkspaceTargets({
      workspaceId,
      targetTypes: ["container", "item", "list_item"]
    });

    const containers = new ContainerRepository(this.connection).listByWorkspace(
      workspaceId,
      {
        includeArchived: true,
        includeDeleted: true
      }
    );
    const items = new ItemRepository(this.connection).listByWorkspace(workspaceId, {
      includeArchived: true,
      includeDeleted: true
    });
    const listItems = new ListRepository(this.connection).listItemsByWorkspace(
      workspaceId,
      {
        includeArchived: true,
        includeDeleted: true
      }
    );

    for (const container of containers) {
      this.upsertContainer(container);
    }

    for (const item of items) {
      this.upsertItem(item);
    }

    for (const listItem of listItems) {
      this.upsertListItem(listItem);
    }

    return {
      indexedContainerCount: containers.length,
      indexedItemCount: items.length,
      indexedListItemCount: listItems.length
    };
  }
}

function normalizeTags(tags: string | string[] | undefined): string {
  if (tags === undefined) {
    return "";
  }

  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean).join(" ");
  }

  return tags.trim();
}

function stringifyMetadata(metadata: Record<string, unknown>): string {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(metadata).filter(([, value]) => value !== undefined)
    )
  );
}
