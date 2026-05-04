import { createIsoTimestamp, createLocalId } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import {
  ContainerRepository,
  type ContainerRecord,
  AttachmentRepository,
  type AttachmentRecord,
  CategoryRepository,
  ItemRepository,
  type ItemRecord,
  LinkRepository,
  type LinkRecord,
  ListRepository,
  type ListItemRecord,
  NoteRepository,
  type NoteDetailsRecord,
  SearchIndexRepository,
  TagRepository,
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
  indexedAttachmentCount: number;
};

export type SearchIndexHealthTarget = {
  targetType: "container" | "item" | "list_item" | "attachment";
  targetId: string;
};

export type SearchIndexDeletedFlagMismatch = SearchIndexHealthTarget & {
  expectedIsDeleted: boolean;
  indexedIsDeleted: boolean;
};

export type SearchIndexHealthReport = {
  workspaceId: string;
  status: "healthy" | "degraded";
  containerSourceCount: number;
  itemSourceCount: number;
  listItemSourceCount: number;
  attachmentSourceCount: number;
  indexedContainerCount: number;
  indexedItemCount: number;
  indexedListItemCount: number;
  indexedAttachmentCount: number;
  missingRecordCount: number;
  orphanedRecordCount: number;
  deletedFlagMismatchCount: number;
  missingTargets: SearchIndexHealthTarget[];
  orphanedTargets: SearchIndexHealthTarget[];
  deletedFlagMismatches: SearchIndexDeletedFlagMismatch[];
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
    const tagProjection = this.buildTagProjection({
      workspaceId: container.workspaceId,
      targetType: "container",
      targetId: container.id,
      tags: input.tags
    });

    return this.repository.upsert({
      id: input.id ?? this.idFactory("search"),
      workspaceId: container.workspaceId,
      targetType: "container",
      targetId: container.id,
      title: container.name,
      body: container.description ?? "",
      tags: tagProjection.tags,
      category:
        input.category ??
        this.findCategoryName(container.categoryId, container.workspaceId),
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
        ...tagProjection.metadata,
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
    const tagProjection = this.buildTagProjection({
      workspaceId: item.workspaceId,
      targetType: "item",
      targetId: item.id,
      tags: input.tags
    });

    return this.repository.upsert({
      id: input.id ?? this.idFactory("search"),
      workspaceId: item.workspaceId,
      targetType: "item",
      targetId: item.id,
      title: item.title,
      body: item.body ?? "",
      tags: tagProjection.tags,
      category: input.category ?? this.findCategoryName(item.categoryId, item.workspaceId),
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
        ...tagProjection.metadata,
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
    const tagProjection = this.buildTagProjection({
      workspaceId: listItem.workspaceId,
      targetType: "list_item",
      targetId: listItem.id,
      tags: input.tags
    });

    return this.repository.upsert({
      id: input.id ?? this.idFactory("search"),
      workspaceId: listItem.workspaceId,
      targetType: "list_item",
      targetId: listItem.id,
      title: listItem.title,
      body: listItem.body ?? "",
      tags: tagProjection.tags,
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
        ...tagProjection.metadata,
        ...input.metadata
      }),
      isDeleted: listItem.deletedAt !== null,
      timestamp: input.timestamp ?? createIsoTimestamp(this.now())
    });
  }

  upsertNote(
    item: ItemRecord,
    note: NoteDetailsRecord,
    input: SearchProjectionInput = {}
  ): SearchIndexRecord {
    const tagProjection = this.buildTagProjection({
      workspaceId: item.workspaceId,
      targetType: "item",
      targetId: item.id,
      tags: input.tags
    });

    return this.repository.upsert({
      id: input.id ?? this.idFactory("search"),
      workspaceId: item.workspaceId,
      targetType: "item",
      targetId: item.id,
      title: item.title,
      body: buildNoteSearchBody(note),
      tags: tagProjection.tags,
      category: input.category ?? this.findCategoryName(item.categoryId, item.workspaceId),
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
        format: note.format,
        preview: note.preview,
        ...tagProjection.metadata,
        ...input.metadata
      }),
      isDeleted: item.deletedAt !== null,
      timestamp: input.timestamp ?? createIsoTimestamp(this.now())
    });
  }

  upsertLink(
    item: ItemRecord,
    link: LinkRecord,
    input: SearchProjectionInput = {}
  ): SearchIndexRecord {
    const tagProjection = this.buildTagProjection({
      workspaceId: item.workspaceId,
      targetType: "item",
      targetId: item.id,
      tags: input.tags
    });

    return this.repository.upsert({
      id: input.id ?? this.idFactory("search"),
      workspaceId: item.workspaceId,
      targetType: "item",
      targetId: item.id,
      title: item.title,
      body: buildLinkSearchBody(link),
      tags: tagProjection.tags,
      category: input.category ?? this.findCategoryName(item.categoryId, item.workspaceId),
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
        url: link.url,
        normalizedUrl: link.normalizedUrl,
        linkTitle: link.title,
        linkDescription: link.description,
        domain: link.domain,
        faviconPath: link.faviconPath,
        previewImagePath: link.previewImagePath,
        ...tagProjection.metadata,
        ...input.metadata
      }),
      isDeleted: item.deletedAt !== null,
      timestamp: input.timestamp ?? createIsoTimestamp(this.now())
    });
  }

  upsertAttachment(
    attachment: AttachmentRecord,
    input: SearchProjectionInput = {},
    item?: ItemRecord
  ): SearchIndexRecord {
    const sourceItem = item ?? new ItemRepository(this.connection).getById(attachment.itemId);

    if (sourceItem === null || sourceItem.workspaceId !== attachment.workspaceId) {
      throw new Error(`Attachment source item was not found: ${attachment.itemId}.`);
    }

    const tagProjection = this.buildTagProjection({
      workspaceId: attachment.workspaceId,
      targetType: "item",
      targetId: sourceItem.id,
      tags: input.tags
    });

    return this.repository.upsert({
      id: input.id ?? this.idFactory("search"),
      workspaceId: attachment.workspaceId,
      targetType: "attachment",
      targetId: attachment.id,
      title: attachment.originalName,
      body: buildAttachmentSearchBody(attachment),
      tags: tagProjection.tags,
      category:
        input.category ??
        this.findCategoryName(sourceItem.categoryId, sourceItem.workspaceId),
      metadataJson: stringifyMetadata({
        itemId: sourceItem.id,
        itemTitle: sourceItem.title,
        itemType: sourceItem.type,
        containerId: sourceItem.containerId,
        containerTabId: sourceItem.containerTabId,
        itemDeletedAt: sourceItem.deletedAt,
        originalName: attachment.originalName,
        storedName: attachment.storedName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        checksum: attachment.checksum,
        storagePath: attachment.storagePath,
        description: attachment.description,
        deletedAt: attachment.deletedAt,
        ...tagProjection.metadata,
        ...input.metadata
      }),
      isDeleted: attachment.deletedAt !== null || sourceItem.deletedAt !== null,
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

  getSearchIndexHealth(workspaceId: string): SearchIndexHealthReport {
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
    const attachments = new AttachmentRepository(this.connection).listByWorkspace({
      workspaceId,
      includeDeleted: true
    });
    const itemsById = new Map(items.map((item) => [item.id, item]));
    const indexedRecords = this.repository.listByWorkspace(workspaceId, {
      targetTypes: ["container", "item", "list_item", "attachment"]
    });
    const expected = new Map<string, boolean>();
    const missingTargets: SearchIndexHealthTarget[] = [];
    const orphanedTargets: SearchIndexHealthTarget[] = [];
    const deletedFlagMismatches: SearchIndexDeletedFlagMismatch[] = [];

    for (const container of containers) {
      expected.set(createHealthKey("container", container.id), container.deletedAt !== null);
    }

    for (const item of items) {
      expected.set(createHealthKey("item", item.id), item.deletedAt !== null);
    }

    for (const listItem of listItems) {
      expected.set(createHealthKey("list_item", listItem.id), listItem.deletedAt !== null);
    }

    for (const attachment of attachments) {
      const item = itemsById.get(attachment.itemId);
      expected.set(
        createHealthKey("attachment", attachment.id),
        attachment.deletedAt !== null || item?.deletedAt !== null
      );
    }

    const indexed = new Map<string, SearchIndexRecord>();

    for (const record of indexedRecords) {
      if (!isCoreSearchTargetType(record.targetType)) {
        continue;
      }

      const key = createHealthKey(record.targetType, record.targetId);
      indexed.set(key, record);

      const expectedIsDeleted = expected.get(key);

      if (expectedIsDeleted === undefined) {
        orphanedTargets.push({
          targetType: record.targetType,
          targetId: record.targetId
        });
        continue;
      }

      if (expectedIsDeleted !== record.isDeleted) {
        deletedFlagMismatches.push({
          targetType: record.targetType,
          targetId: record.targetId,
          expectedIsDeleted,
          indexedIsDeleted: record.isDeleted
        });
      }
    }

    for (const [key] of expected) {
      if (indexed.has(key)) {
        continue;
      }

      missingTargets.push(parseHealthKey(key));
    }

    const indexedContainerCount = indexedRecords.filter(
      (record) => record.targetType === "container"
    ).length;
    const indexedItemCount = indexedRecords.filter(
      (record) => record.targetType === "item"
    ).length;
    const indexedListItemCount = indexedRecords.filter(
      (record) => record.targetType === "list_item"
    ).length;
    const indexedAttachmentCount = indexedRecords.filter(
      (record) => record.targetType === "attachment"
    ).length;

    return {
      workspaceId,
      status:
        missingTargets.length === 0 &&
        orphanedTargets.length === 0 &&
        deletedFlagMismatches.length === 0
          ? "healthy"
          : "degraded",
      containerSourceCount: containers.length,
      itemSourceCount: items.length,
      listItemSourceCount: listItems.length,
      attachmentSourceCount: attachments.length,
      indexedContainerCount,
      indexedItemCount,
      indexedListItemCount,
      indexedAttachmentCount,
      missingRecordCount: missingTargets.length,
      orphanedRecordCount: orphanedTargets.length,
      deletedFlagMismatchCount: deletedFlagMismatches.length,
      missingTargets,
      orphanedTargets,
      deletedFlagMismatches
    };
  }

  private rebuildWorkspaceIndexInCurrentTransaction(
    workspaceId: string
  ): RebuildWorkspaceIndexResult {
    this.repository.removeWorkspaceTargets({
      workspaceId,
      targetTypes: ["container", "item", "list_item", "attachment"]
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
    const notes = new NoteRepository(this.connection).listByWorkspace(workspaceId, {
      includeArchived: true,
      includeDeleted: true
    });
    const links = new LinkRepository(this.connection).listByWorkspace(workspaceId, {
      includeArchived: true,
      includeDeleted: true
    });
    const attachments = new AttachmentRepository(this.connection).listByWorkspace({
      workspaceId,
      includeDeleted: true
    });
    const itemsById = new Map(items.map((item) => [item.id, item]));

    for (const container of containers) {
      this.upsertContainer(container);
    }

    for (const item of items) {
      this.upsertItem(item);
    }

    for (const listItem of listItems) {
      this.upsertListItem(listItem);
    }

    for (const note of notes) {
      this.upsertNote(note.item, note.note);
    }

    for (const link of links) {
      this.upsertLink(link.item, link.link);
    }

    for (const attachment of attachments) {
      const item = itemsById.get(attachment.itemId);

      if (item !== undefined) {
        this.upsertAttachment(attachment, {}, item);
      }
    }

    return {
      indexedContainerCount: containers.length,
      indexedItemCount: items.length,
      indexedListItemCount: listItems.length,
      indexedAttachmentCount: attachments.length
    };
  }

  private buildTagProjection(input: {
    workspaceId: string;
    targetType: "container" | "item" | "list_item";
    targetId: string;
    tags?: string | string[] | undefined;
  }): {
    tags: string;
    metadata: {
      inlineTags?: string[];
      inlineTagSlugs?: string[];
      tagIds?: string[];
      tagSlugs?: string[];
    };
  } {
    if (input.tags !== undefined) {
      return {
        tags: normalizeTags(input.tags),
        metadata: {}
      };
    }

    const tags = new TagRepository(this.connection).listTagsForTarget({
      workspaceId: input.workspaceId,
      targetType: input.targetType,
      targetId: input.targetId
    });
    const tagSlugs = tags.map((tag) => tag.slug);
    const inlineTagSlugs = tags
      .filter((tag) => tag.taggingSource === "inline")
      .map((tag) => tag.slug);

    return {
      tags: tagSlugs.join(" "),
      metadata: {
        tagIds: tags.map((tag) => tag.id),
        tagSlugs,
        inlineTags: inlineTagSlugs,
        inlineTagSlugs
      }
    };
  }

  private findCategoryName(
    categoryId: string | null,
    workspaceId: string
  ): string | null {
    if (categoryId === null) {
      return null;
    }

    const category = new CategoryRepository(this.connection).getById(categoryId);

    if (category === null || category.workspaceId !== workspaceId) {
      return null;
    }

    return category.name;
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

function buildNoteSearchBody(note: NoteDetailsRecord): string {
  return [note.content, note.preview ?? ""]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n");
}

function buildAttachmentSearchBody(attachment: AttachmentRecord): string {
  return [
    attachment.description ?? "",
    attachment.storedName,
    attachment.storagePath,
    attachment.mimeType ?? "",
    attachment.checksum ?? ""
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n");
}

function buildLinkSearchBody(link: LinkRecord): string {
  return [
    link.description ?? "",
    link.title ?? "",
    link.url,
    link.normalizedUrl,
    link.domain ?? ""
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join("\n");
}

function createHealthKey(
  targetType: SearchIndexHealthTarget["targetType"],
  targetId: string
): string {
  return `${targetType}:${targetId}`;
}

function parseHealthKey(key: string): SearchIndexHealthTarget {
  const delimiterIndex = key.indexOf(":");

  if (delimiterIndex === -1) {
    throw new Error(`Invalid search index health key: ${key}.`);
  }

  const targetType = key.slice(0, delimiterIndex);
  const targetId = key.slice(delimiterIndex + 1);

  if (!isCoreSearchTargetType(targetType)) {
    throw new Error(`Invalid search index target type: ${targetType}.`);
  }

  return { targetType, targetId };
}

function isCoreSearchTargetType(
  targetType: string
): targetType is SearchIndexHealthTarget["targetType"] {
  return ["container", "item", "list_item", "attachment"].includes(targetType);
}
