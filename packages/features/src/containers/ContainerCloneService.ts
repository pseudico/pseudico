import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType,
  type AttachmentRecord,
  type RelationshipObjectType
} from "@local-work-os/core";
import {
  ActivityLogService,
  AttachmentRepository,
  ContactFieldRepository,
  ContainerRepository,
  ContainerTabRepository,
  ItemRepository,
  LinkRepository,
  ListRepository,
  NoteRepository,
  RelationshipRepository,
  SearchIndexService,
  TagRepository,
  TaskRepository,
  TransactionService,
  type ContainerRecord,
  type ContainerTabRecord,
  type DatabaseConnection,
  type ItemRecord,
  type ListItemRecord,
  type RelationshipRecord,
  type SearchIndexRecord,
  type TaggingRecord
} from "@local-work-os/db";

export type ContainerCloneServiceIdFactory = (prefix: string) => string;

export type CloneAttachmentFileInput = {
  source: AttachmentRecord;
  targetAttachmentId: string;
  targetItemId: string;
};

export type ClonedAttachmentFile = Pick<
  AttachmentRecord,
  "storedName" | "storagePath" | "sizeBytes" | "checksum" | "mimeType"
>;

export type ContainerCloneFileMode = "metadata_only" | "copy" | "skip";

export type CloneContainerInput = {
  containerId: string;
  actorType?: ActivityActorType;
  name?: string;
  includeTabs?: boolean;
  includeItems?: boolean;
  includeTags?: boolean;
  includeRelationships?: boolean;
  includeContactFields?: boolean;
  resetCompleted?: boolean;
  fileMode?: ContainerCloneFileMode;
  rebaseDates?: {
    from: string;
    to: string;
  };
};

export type ContainerCloneResult = {
  container: ContainerRecord;
  tabs: ContainerTabRecord[];
  items: ItemRecord[];
  listItems: ListItemRecord[];
  attachments: AttachmentRecord[];
  relationships: RelationshipRecord[];
  taggings: TaggingRecord[];
  searchRecords: SearchIndexRecord[];
  idMap: Record<string, string>;
};

export class ContainerCloneService {
  readonly module = "containerClone";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: ContainerCloneServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;
  private readonly cloneAttachmentFile:
    | ((
    input: CloneAttachmentFileInput
  ) => ClonedAttachmentFile | Promise<ClonedAttachmentFile>)
    | undefined;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: ContainerCloneServiceIdFactory;
    now?: () => Date;
    cloneAttachmentFile?: (
      input: CloneAttachmentFileInput
    ) => ClonedAttachmentFile | Promise<ClonedAttachmentFile>;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.cloneAttachmentFile = input.cloneAttachmentFile;
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async cloneContainer(input: CloneContainerInput): Promise<ContainerCloneResult> {
    validateNonEmptyString(input.containerId, "containerId");

    return await this.transactionService.runInTransaction(async () => {
      const timestamp = createIsoTimestamp(this.now());
      const source = this.requireCloneableContainer(input.containerId);
      const options = normalizeOptions(input, source);
      const idMap = new Map<string, string>();
      const containerRepository = new ContainerRepository(this.connection);
      const tabRepository = new ContainerTabRepository(this.connection);
      const itemRepository = new ItemRepository(this.connection);
      const listRepository = new ListRepository(this.connection);
      const tagRepository = new TagRepository(this.connection);
      const relationshipRepository = new RelationshipRepository(this.connection);
      const searchIndexService = new SearchIndexService({
        connection: this.connection,
        idFactory: this.idFactory,
        now: this.now
      });
      const targetContainerId = this.idFactory("container");
      idMap.set(keyFor("container", source.id), targetContainerId);

      const container = containerRepository.create({
        id: targetContainerId,
        workspaceId: source.workspaceId,
        type: source.type as "project" | "contact",
        name: options.name,
        slug: this.createUniqueSlug(source.workspaceId, options.name, source.type),
        description: source.description,
        status: "active",
        categoryId: source.categoryId,
        color: source.color,
        isFavorite: false,
        isSystem: false,
        sortOrder: source.sortOrder + 1,
        timestamp
      });
      const tabs = this.cloneTabs({
        source,
        container,
        includeTabs: options.includeTabs,
        timestamp,
        tabRepository,
        idMap
      });
      const defaultTargetTab =
        tabs.find((tab) => tab.isDefault) ?? tabs[0] ?? null;
      const taggings: TaggingRecord[] = [];
      const items: ItemRecord[] = [];
      const listItems: ListItemRecord[] = [];
      const attachments: AttachmentRecord[] = [];
      const searchRecords: SearchIndexRecord[] = [];

      if (options.includeContactFields && source.type === "contact") {
        this.cloneContactFields(source, container, timestamp);
      }

      if (options.includeTags) {
        taggings.push(
          ...this.cloneTaggings({
            workspaceId: source.workspaceId,
            sourceType: "container",
            sourceId: source.id,
            targetType: "container",
            targetId: container.id,
            timestamp,
            tagRepository
          })
        );
      }

      searchRecords.push(searchIndexService.upsertContainer(container, { timestamp }));

      if (options.includeItems) {
        const sourceItems = itemRepository.listByContainer(source.id);

        for (const sourceItem of sourceItems) {
          const targetItem = itemRepository.create({
            id: this.idFactory("item"),
            workspaceId: sourceItem.workspaceId,
            containerId: container.id,
            containerTabId: remapTabId(
              sourceItem.containerTabId,
              idMap,
              defaultTargetTab?.id ?? null
            ),
            type: sourceItem.type as never,
            title: sourceItem.title,
            body: sourceItem.body,
            categoryId: sourceItem.categoryId,
            status: resetItemStatus(sourceItem.status, options.resetCompleted),
            sortOrder: sourceItem.sortOrder,
            pinned: sourceItem.pinned,
            completedAt: options.resetCompleted ? null : sourceItem.completedAt,
            timestamp
          });

          idMap.set(keyFor("item", sourceItem.id), targetItem.id);
          items.push(targetItem);

          if (options.includeTags) {
            taggings.push(
              ...this.cloneTaggings({
                workspaceId: source.workspaceId,
                sourceType: "item",
                sourceId: sourceItem.id,
                targetType: "item",
                targetId: targetItem.id,
                timestamp,
                tagRepository
              })
            );
          }

          await this.cloneItemDetails({
            sourceItem,
            targetItem,
            options,
            timestamp,
            listRepository,
            idMap,
            listItems,
            attachments,
            taggings,
            searchRecords,
            searchIndexService,
            tagRepository
          });
        }
      }

      const relationships =
        options.includeRelationships
          ? this.cloneRelationships({
              workspaceId: source.workspaceId,
              sourceContainerId: source.id,
              idMap,
              relationshipRepository,
              timestamp
            })
          : [];

      this.logCloneActivity({
        source,
        container,
        options,
        idMap,
        timestamp,
        actorType: input.actorType
      });

      return {
        container,
        tabs,
        items,
        listItems,
        attachments,
        relationships,
        taggings,
        searchRecords,
        idMap: Object.fromEntries(idMap)
      };
    });
  }

  private requireCloneableContainer(containerId: string): ContainerRecord {
    const container = new ContainerRepository(this.connection).getById(containerId);

    if (container === null) {
      throw new Error(`Container was not found: ${containerId}.`);
    }

    if (container.type !== "project" && container.type !== "contact") {
      throw new Error("Only project and contact containers can be cloned.");
    }

    if (container.isSystem) {
      throw new Error("System containers cannot be cloned.");
    }

    return container;
  }

  private cloneTabs(input: {
    source: ContainerRecord;
    container: ContainerRecord;
    includeTabs: boolean;
    timestamp: string;
    tabRepository: ContainerTabRepository;
    idMap: Map<string, string>;
  }): ContainerTabRecord[] {
    if (!input.includeTabs) {
      const tab = input.tabRepository.createDefaultTab({
        id: this.idFactory("container_tab"),
        workspaceId: input.container.workspaceId,
        containerId: input.container.id,
        timestamp: input.timestamp
      });
      return [tab];
    }

    const sourceTabs = input.tabRepository.listByContainer(input.source.id, {
      includeHidden: true,
      includeArchived: true
    });
    const tabs = sourceTabs.map((sourceTab) => {
      const targetTab = input.tabRepository.create({
        id: this.idFactory("container_tab"),
        workspaceId: input.container.workspaceId,
        containerId: input.container.id,
        name: sourceTab.name,
        description: sourceTab.description,
        sortOrder: sourceTab.sortOrder,
        isDefault: sourceTab.isDefault,
        timestamp: input.timestamp
      });
      input.idMap.set(keyFor("container_tab", sourceTab.id), targetTab.id);
      return targetTab;
    });

    if (tabs.length === 0) {
      return [
        input.tabRepository.createDefaultTab({
          id: this.idFactory("container_tab"),
          workspaceId: input.container.workspaceId,
          containerId: input.container.id,
          timestamp: input.timestamp
        })
      ];
    }

    return tabs;
  }

  private cloneContactFields(
    source: ContainerRecord,
    container: ContainerRecord,
    timestamp: string
  ): void {
    const repository = new ContactFieldRepository(this.connection);

    for (const field of repository.listForContact({
      workspaceId: source.workspaceId,
      containerId: source.id
    })) {
      repository.create({
        id: this.idFactory("contact_field"),
        workspaceId: container.workspaceId,
        containerId: container.id,
        label: field.label,
        value: field.value,
        type: field.type,
        sortOrder: field.sortOrder,
        timestamp
      });
    }
  }

  private async cloneItemDetails(input: {
    sourceItem: ItemRecord;
    targetItem: ItemRecord;
    options: RequiredCloneOptions;
    timestamp: string;
    listRepository: ListRepository;
    idMap: Map<string, string>;
    listItems: ListItemRecord[];
    attachments: AttachmentRecord[];
    taggings: TaggingRecord[];
    searchRecords: SearchIndexRecord[];
    searchIndexService: SearchIndexService;
    tagRepository: TagRepository;
  }): Promise<void> {
    if (input.sourceItem.type === "task") {
      const task = new TaskRepository(this.connection).getDetailsByItemId(
        input.sourceItem.id
      );
      if (task !== null) {
        new TaskRepository(this.connection).createDetails({
          itemId: input.targetItem.id,
          workspaceId: input.targetItem.workspaceId,
          taskStatus: input.options.resetCompleted && task.taskStatus === "done" ? "open" : task.taskStatus,
          priority: task.priority,
          startAt: rebaseDate(task.startAt, input.options),
          dueAt: rebaseDate(task.dueAt, input.options),
          allDay: task.allDay,
          timezone: task.timezone,
          reminderPolicyId: null,
          recurrenceRuleId: null,
          completedAt: input.options.resetCompleted ? null : task.completedAt,
          timestamp: input.timestamp
        });
      }
    }

    if (input.sourceItem.type === "note") {
      const note = new NoteRepository(this.connection).getDetailsByItemId(
        input.sourceItem.id
      );
      if (note !== null) {
        new NoteRepository(this.connection).createDetails({
          itemId: input.targetItem.id,
          workspaceId: input.targetItem.workspaceId,
          content: note.content,
          format: note.format,
          preview: note.preview,
          timestamp: input.timestamp
        });
      }
    }

    if (input.sourceItem.type === "link") {
      const link = new LinkRepository(this.connection).getDetailsByItemId(
        input.sourceItem.id
      );
      if (link !== null) {
        new LinkRepository(this.connection).createDetails({
          itemId: input.targetItem.id,
          workspaceId: input.targetItem.workspaceId,
          url: link.url,
          normalizedUrl: link.normalizedUrl,
          title: link.title,
          description: link.description,
          domain: link.domain,
          faviconPath: link.faviconPath,
          previewImagePath: link.previewImagePath,
          timestamp: input.timestamp
        });
      }
    }

    if (input.sourceItem.type === "list") {
      const list = input.listRepository.getDetailsByItemId(input.sourceItem.id);
      if (list !== null) {
        input.listRepository.createDetails({
          itemId: input.targetItem.id,
          workspaceId: input.targetItem.workspaceId,
          displayMode: list.displayMode,
          showCompleted: list.showCompleted,
          progressMode: list.progressMode,
          timestamp: input.timestamp
        });
      }

      for (const sourceListItem of input.listRepository.listItems(input.sourceItem.id)) {
        const targetListItem = input.listRepository.createListItem({
          id: this.idFactory("list_item"),
          workspaceId: input.targetItem.workspaceId,
          listId: input.targetItem.id,
          title: sourceListItem.title,
          body: sourceListItem.body,
          status: input.options.resetCompleted && sourceListItem.status === "done" ? "open" : sourceListItem.status,
          depth: sourceListItem.depth,
          sortOrder: sourceListItem.sortOrder,
          listItemParentId: remapListItemParent(sourceListItem.listItemParentId, input.idMap),
          startAt: rebaseDate(sourceListItem.startAt, input.options),
          dueAt: rebaseDate(sourceListItem.dueAt, input.options),
          completedAt: input.options.resetCompleted ? null : sourceListItem.completedAt,
          timestamp: input.timestamp
        });
        input.idMap.set(keyFor("list_item", sourceListItem.id), targetListItem.id);
        input.listItems.push(targetListItem);
        input.searchRecords.push(
          input.searchIndexService.upsertListItem(targetListItem, {
            timestamp: input.timestamp
          })
        );
        if (input.options.includeTags) {
          input.taggings.push(
            ...this.cloneTaggings({
              workspaceId: sourceListItem.workspaceId,
              sourceType: "list_item",
              sourceId: sourceListItem.id,
              targetType: "list_item",
              targetId: targetListItem.id,
              timestamp: input.timestamp,
              tagRepository: input.tagRepository
            })
          );
        }
      }
    }

    if (input.options.fileMode !== "skip") {
      await this.cloneAttachments(input);
    }

    input.searchRecords.push(
      upsertItemByType(input.searchIndexService, input.targetItem, input.timestamp)
    );
  }

  private async cloneAttachments(input: {
    sourceItem: ItemRecord;
    targetItem: ItemRecord;
    options: RequiredCloneOptions;
    timestamp: string;
    attachments: AttachmentRecord[];
    searchRecords: SearchIndexRecord[];
    searchIndexService: SearchIndexService;
  }): Promise<void> {
    const repository = new AttachmentRepository(this.connection);

    for (const sourceAttachment of repository.listForItem({
      workspaceId: input.sourceItem.workspaceId,
      itemId: input.sourceItem.id
    })) {
      const targetAttachmentId = this.idFactory("attachment");
      const file =
        input.options.fileMode === "copy"
          ? await this.requireAttachmentCloner()({
              source: sourceAttachment,
              targetAttachmentId,
              targetItemId: input.targetItem.id
            })
          : createMetadataOnlyAttachmentCopy(sourceAttachment, targetAttachmentId);
      const attachment = repository.create({
        id: targetAttachmentId,
        workspaceId: input.targetItem.workspaceId,
        itemId: input.targetItem.id,
        originalName: sourceAttachment.originalName,
        storedName: file.storedName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        checksum: file.checksum,
        storagePath: file.storagePath,
        description: sourceAttachment.description,
        timestamp: input.timestamp
      });

      input.attachments.push(attachment);
      input.searchRecords.push(
        input.searchIndexService.upsertAttachment(attachment, {
          timestamp: input.timestamp
        }, input.targetItem)
      );
    }
  }

  private requireAttachmentCloner(): NonNullable<ContainerCloneService["cloneAttachmentFile"]> {
    if (this.cloneAttachmentFile === undefined) {
      throw new Error("fileMode copy requires a cloneAttachmentFile adapter.");
    }

    return this.cloneAttachmentFile;
  }

  private cloneTaggings(input: {
    workspaceId: string;
    sourceType: "container" | "item" | "list_item";
    sourceId: string;
    targetType: "container" | "item" | "list_item";
    targetId: string;
    timestamp: string;
    tagRepository: TagRepository;
  }): TaggingRecord[] {
    return input.tagRepository
      .listTaggingsForTarget({
        workspaceId: input.workspaceId,
        targetType: input.sourceType,
        targetId: input.sourceId
      })
      .map((tagging) =>
        input.tagRepository.createTagging({
          id: this.idFactory("tagging"),
          workspaceId: input.workspaceId,
          tagId: tagging.tagId,
          targetType: input.targetType,
          targetId: input.targetId,
          source: tagging.source,
          timestamp: input.timestamp
        })
      );
  }

  private cloneRelationships(input: {
    workspaceId: string;
    sourceContainerId: string;
    idMap: Map<string, string>;
    relationshipRepository: RelationshipRepository;
    timestamp: string;
  }): RelationshipRecord[] {
    const sourceScope = new Set(input.idMap.keys());
    const cloned: RelationshipRecord[] = [];

    for (const relationship of input.relationshipRepository.listByWorkspace(input.workspaceId)) {
      const sourceKey = keyFor(relationship.sourceType, relationship.sourceId);
      const targetKey = keyFor(relationship.targetType, relationship.targetId);

      if (!sourceScope.has(sourceKey) && !sourceScope.has(targetKey)) {
        continue;
      }

      cloned.push(
        input.relationshipRepository.create({
          id: this.idFactory("relationship"),
          workspaceId: relationship.workspaceId,
          sourceType: relationship.sourceType,
          sourceId: input.idMap.get(sourceKey) ?? relationship.sourceId,
          targetType: relationship.targetType,
          targetId: input.idMap.get(targetKey) ?? relationship.targetId,
          relationType: relationship.relationType,
          label: relationship.label,
          timestamp: input.timestamp
        })
      );
    }

    return cloned;
  }

  private createUniqueSlug(workspaceId: string, value: string, type: string): string {
    const baseSlug = slugify(value, type);
    const existingSlugs = new Set(
      new ContainerRepository(this.connection)
        .listByWorkspace(workspaceId, {
          includeArchived: true,
          includeDeleted: true
        })
        .map((container) => container.slug)
    );

    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let suffix = 2;

    while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
      suffix += 1;
    }

    return `${baseSlug}-${suffix}`;
  }

  private logCloneActivity(input: {
    source: ContainerRecord;
    container: ContainerRecord;
    options: RequiredCloneOptions;
    idMap: Map<string, string>;
    timestamp: string;
    actorType: ActivityActorType | undefined;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.container.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.containerCloned,
      targetType: "container",
      targetId: input.container.id,
      summary: `Cloned ${input.source.type} "${input.source.name}" to "${input.container.name}".`,
      beforeJson: JSON.stringify(input.source),
      afterJson: JSON.stringify({
        container: input.container,
        options: input.options,
        idMap: Object.fromEntries(input.idMap)
      }),
      timestamp: input.timestamp
    });
  }
}

export const containerCloneModuleContract = {
  module: "containerClone",
  purpose: "Safely clone local project and contact containers with remapped content.",
  owns: ["container clone operations", "old-to-new id mapping", "clone activity records"],
  doesNotOwn: ["renderer filesystem access", "cloud duplication", "template authoring"],
  integrationPoints: ["projects", "contacts", "tabs", "items", "files", "metadata", "relationships", "search"],
  priority: "V1"
} as const;

type RequiredCloneOptions = {
  name: string;
  includeTabs: boolean;
  includeItems: boolean;
  includeTags: boolean;
  includeRelationships: boolean;
  includeContactFields: boolean;
  resetCompleted: boolean;
  fileMode: ContainerCloneFileMode;
  rebaseDates: CloneContainerInput["rebaseDates"];
};

function normalizeOptions(
  input: CloneContainerInput,
  source: ContainerRecord
): RequiredCloneOptions {
  return {
    name: input.name?.trim() ?? `${source.name} Copy`,
    includeTabs: input.includeTabs ?? true,
    includeItems: input.includeItems ?? true,
    includeTags: input.includeTags ?? true,
    includeRelationships: input.includeRelationships ?? true,
    includeContactFields: input.includeContactFields ?? true,
    resetCompleted: input.resetCompleted ?? true,
    fileMode: input.fileMode ?? "metadata_only",
    rebaseDates: input.rebaseDates
  };
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function keyFor(type: RelationshipObjectType | "container_tab", id: string): string {
  return `${type}:${id}`;
}

function remapTabId(
  sourceTabId: string | null,
  idMap: Map<string, string>,
  fallbackTabId: string | null
): string | null {
  if (sourceTabId === null) {
    return fallbackTabId;
  }

  return idMap.get(keyFor("container_tab", sourceTabId)) ?? fallbackTabId;
}

function remapListItemParent(
  sourceParentId: string | null,
  idMap: Map<string, string>
): string | null {
  return sourceParentId === null
    ? null
    : idMap.get(keyFor("list_item", sourceParentId)) ?? null;
}

function resetItemStatus(status: string, resetCompleted: boolean): string {
  return resetCompleted && status === "completed" ? "active" : status;
}

function rebaseDate(
  value: string | null,
  options: RequiredCloneOptions
): string | null {
  if (value === null || options.rebaseDates === undefined) {
    return value;
  }

  const from = new Date(options.rebaseDates.from);
  const to = new Date(options.rebaseDates.to);
  const date = new Date(value);

  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(to.getTime()) ||
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return new Date(date.getTime() + (to.getTime() - from.getTime())).toISOString();
}

function upsertItemByType(
  searchIndexService: SearchIndexService,
  item: ItemRecord,
  timestamp: string
): SearchIndexRecord {
  return searchIndexService.upsertItem(item, { timestamp });
}

function slugify(value: string, fallback: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length === 0 ? fallback : slug;
}

function createMetadataOnlyAttachmentCopy(
  source: AttachmentRecord,
  targetAttachmentId: string
): ClonedAttachmentFile {
  const safeStoredName = source.storedName.replace(/[\\/]/g, "-");

  return {
    storedName: safeStoredName,
    storagePath: `attachments/clones/${targetAttachmentId}/${safeStoredName}`,
    sizeBytes: source.sizeBytes,
    checksum: source.checksum,
    mimeType: source.mimeType
  };
}
