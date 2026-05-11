import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  taskStatusToItemStatus,
  type ActivityActorType,
  type ListItemStatus,
  type RelationshipObjectType,
  type TaskStatus
} from "@local-work-os/core";
import {
  ActivityLogService,
  AttachmentRepository,
  ItemRepository,
  ListRepository,
  RelationshipRepository,
  SearchIndexService,
  SortOrderService,
  TagRepository,
  TaskRepository,
  TransactionService,
  type AttachmentRecord,
  type BacklinkRecord,
  type DatabaseConnection,
  type ItemRecord,
  type ListItemRecord,
  type ListWithItemRecord,
  type SearchIndexRecord,
  type TaggedTargetRecord,
  type TaskWithItemRecord
} from "@local-work-os/db";

export type TaskListConversionServiceIdFactory = (prefix: string) => string;

export type ConvertTaskToListInput = {
  taskId: string;
  actorType?: ActivityActorType;
};

export type ConvertListItemToTaskInput = {
  listItemId: string;
  actorType?: ActivityActorType;
};

export type MergeTaskIntoListInput = {
  taskId: string;
  targetListId: string;
  actorType?: ActivityActorType;
};

export type ConvertTaskToListResult = {
  sourceTask: TaskWithItemRecord;
  list: ListWithItemRecord;
  firstListItem: ListItemRecord;
  listSearchRecord: SearchIndexRecord;
  listItemSearchRecord: SearchIndexRecord;
  deletedTaskSearchRecord: SearchIndexRecord;
  movedAttachments: AttachmentRecord[];
  copiedTagCount: number;
  copiedRelationshipCount: number;
  activityId: string;
};

export type ConvertListItemToTaskResult = {
  sourceListItem: ListItemRecord;
  task: TaskWithItemRecord;
  taskSearchRecord: SearchIndexRecord;
  deletedListItemSearchRecord: SearchIndexRecord;
  copiedTagCount: number;
  copiedRelationshipCount: number;
  activityId: string;
};

export type MergeTaskIntoListResult = {
  sourceTask: TaskWithItemRecord;
  targetList: ListWithItemRecord;
  listItem: ListItemRecord;
  listItemSearchRecord: SearchIndexRecord;
  targetListSearchRecord: SearchIndexRecord;
  deletedTaskSearchRecord: SearchIndexRecord;
  movedAttachments: AttachmentRecord[];
  copiedTagCount: number;
  copiedRelationshipCount: number;
  activityId: string;
};

export class TaskListConversionService {
  readonly module = "task-list-conversions";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: TaskListConversionServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: TaskListConversionServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({ connection: input.connection });
  }

  async convertTaskToList(
    input: ConvertTaskToListInput
  ): Promise<ConvertTaskToListResult> {
    validateNonEmptyString(input.taskId, "taskId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const sourceTask = this.requireTask(input.taskId);
      const actorType = input.actorType ?? "local_user";
      const before = this.createTaskSnapshot(sourceTask);
      const itemRepository = new ItemRepository(this.connection);
      const listRepository = new ListRepository(this.connection);
      const searchIndex = this.createSearchIndexService();

      const listItem = itemRepository.create({
        id: this.idFactory("item"),
        workspaceId: sourceTask.item.workspaceId,
        containerId: sourceTask.item.containerId,
        containerTabId: sourceTask.item.containerTabId,
        type: "list",
        title: sourceTask.item.title,
        body: sourceTask.item.body,
        categoryId: sourceTask.item.categoryId,
        status: sourceTask.item.status,
        sortOrder: sourceTask.item.sortOrder,
        pinned: sourceTask.item.pinned,
        completedAt: sourceTask.item.completedAt,
        timestamp
      });
      const listDetails = listRepository.createDetails({
        itemId: listItem.id,
        workspaceId: listItem.workspaceId,
        timestamp
      });
      const firstListItem = listRepository.createListItem({
        id: this.idFactory("list_item"),
        workspaceId: listItem.workspaceId,
        listId: listItem.id,
        title: sourceTask.item.title,
        body: sourceTask.item.body,
        status: taskStatusToListItemStatus(sourceTask.task.taskStatus),
        startAt: sourceTask.task.startAt,
        dueAt: sourceTask.task.dueAt,
        completedAt: sourceTask.task.completedAt,
        sortOrder: 1024,
        timestamp
      });

      const copiedTagCount = this.copyTaggings({
        workspaceId: listItem.workspaceId,
        from: { targetType: "item", targetId: sourceTask.item.id },
        to: { targetType: "item", targetId: listItem.id },
        timestamp
      });
      const copiedRelationshipCount = this.copyRelationships({
        workspaceId: listItem.workspaceId,
        from: { type: "item", id: sourceTask.item.id },
        to: { type: "item", id: listItem.id },
        timestamp
      });
      const movedAttachments = this.moveAttachments({
        workspaceId: listItem.workspaceId,
        fromItemId: sourceTask.item.id,
        toItemId: listItem.id,
        timestamp,
        searchIndex
      });
      const deletedTask = itemRepository.softDelete(sourceTask.item.id, timestamp);
      const listSearchRecord = searchIndex.upsertItem(listItem, {
        timestamp,
        metadata: createListSearchMetadata(listDetails)
      });
      const listItemSearchRecord = searchIndex.upsertListItem(firstListItem, {
        timestamp
      });
      const deletedTaskSearchRecord = searchIndex.upsertItem(deletedTask, {
        timestamp,
        metadata: createTaskSearchMetadata(sourceTask.task)
      });
      const activityId = this.logConversionEvent({
        workspaceId: listItem.workspaceId,
        actorType,
        action: ActivityAction.taskConvertedToList,
        targetType: "item",
        targetId: listItem.id,
        summary: `Converted task "${sourceTask.item.title}" to a list.`,
        before,
        after: {
          list: { item: listItem, list: listDetails },
          firstListItem,
          movedAttachmentIds: movedAttachments.map((attachment) => attachment.id),
          copiedTagCount,
          copiedRelationshipCount
        },
        timestamp
      });

      return {
        sourceTask,
        list: { item: listItem, list: listDetails },
        firstListItem,
        listSearchRecord,
        listItemSearchRecord,
        deletedTaskSearchRecord,
        movedAttachments,
        copiedTagCount,
        copiedRelationshipCount,
        activityId
      };
    });
  }

  async convertListItemToTask(
    input: ConvertListItemToTaskInput
  ): Promise<ConvertListItemToTaskResult> {
    validateNonEmptyString(input.listItemId, "listItemId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const sourceListItem = this.requireListItem(input.listItemId);
      const sourceList = this.requireList(sourceListItem.listId);
      const actorType = input.actorType ?? "local_user";
      const before = this.createListItemSnapshot(sourceListItem, sourceList);
      const itemRepository = new ItemRepository(this.connection);
      const taskRepository = new TaskRepository(this.connection);
      const listRepository = new ListRepository(this.connection);
      const searchIndex = this.createSearchIndexService();
      const taskStatus = listItemStatusToTaskStatus(sourceListItem.status);
      const completedAt = taskStatus === "done" ? sourceListItem.completedAt ?? timestamp : null;
      const sortOrder = new SortOrderService({
        connection: this.connection
      }).getNextItemSortOrder({
        containerId: sourceList.item.containerId,
        containerTabId: sourceList.item.containerTabId
      });

      const item = itemRepository.create({
        id: this.idFactory("item"),
        workspaceId: sourceListItem.workspaceId,
        containerId: sourceList.item.containerId,
        containerTabId: sourceList.item.containerTabId,
        type: "task",
        title: sourceListItem.title,
        body: sourceListItem.body,
        categoryId: sourceList.item.categoryId,
        status: taskStatusToItemStatus(taskStatus),
        sortOrder,
        completedAt,
        timestamp
      });
      const task = taskRepository.createDetails({
        itemId: item.id,
        workspaceId: item.workspaceId,
        taskStatus,
        startAt: sourceListItem.startAt,
        dueAt: sourceListItem.dueAt,
        completedAt,
        timestamp
      });
      const copiedTagCount = this.copyTaggings({
        workspaceId: item.workspaceId,
        from: { targetType: "list_item", targetId: sourceListItem.id },
        to: { targetType: "item", targetId: item.id },
        timestamp
      });
      const copiedRelationshipCount = this.copyRelationships({
        workspaceId: item.workspaceId,
        from: { type: "list_item", id: sourceListItem.id },
        to: { type: "item", id: item.id },
        timestamp
      });
      const deletedListItem = listRepository.softDeleteListItem(
        sourceListItem.id,
        timestamp
      );
      const taskSearchRecord = searchIndex.upsertItem(item, {
        timestamp,
        metadata: createTaskSearchMetadata(task)
      });
      const deletedListItemSearchRecord = searchIndex.upsertListItem(
        deletedListItem,
        { timestamp }
      );
      const activityId = this.logConversionEvent({
        workspaceId: item.workspaceId,
        actorType,
        action: ActivityAction.listItemConvertedToTask,
        targetType: "item",
        targetId: item.id,
        summary: `Converted list item "${sourceListItem.title}" to a task.`,
        before,
        after: {
          task: { item, task },
          copiedTagCount,
          copiedRelationshipCount
        },
        timestamp
      });

      return {
        sourceListItem,
        task: { item, task },
        taskSearchRecord,
        deletedListItemSearchRecord,
        copiedTagCount,
        copiedRelationshipCount,
        activityId
      };
    });
  }

  async mergeTaskIntoList(
    input: MergeTaskIntoListInput
  ): Promise<MergeTaskIntoListResult> {
    validateNonEmptyString(input.taskId, "taskId");
    validateNonEmptyString(input.targetListId, "targetListId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const sourceTask = this.requireTask(input.taskId);
      const targetList = this.requireList(input.targetListId);
      const actorType = input.actorType ?? "local_user";

      if (sourceTask.item.workspaceId !== targetList.list.workspaceId) {
        throw new Error("targetListId must belong to the same workspace as taskId.");
      }

      const before = this.createTaskSnapshot(sourceTask);
      const listRepository = new ListRepository(this.connection);
      const itemRepository = new ItemRepository(this.connection);
      const searchIndex = this.createSearchIndexService();
      const listItem = listRepository.createListItem({
        id: this.idFactory("list_item"),
        workspaceId: targetList.list.workspaceId,
        listId: targetList.item.id,
        title: sourceTask.item.title,
        body: sourceTask.item.body,
        status: taskStatusToListItemStatus(sourceTask.task.taskStatus),
        startAt: sourceTask.task.startAt,
        dueAt: sourceTask.task.dueAt,
        completedAt: sourceTask.task.completedAt,
        sortOrder: this.getNextListItemSortOrder(targetList.item.id),
        timestamp
      });
      const copiedTagCount = this.copyTaggings({
        workspaceId: targetList.list.workspaceId,
        from: { targetType: "item", targetId: sourceTask.item.id },
        to: { targetType: "list_item", targetId: listItem.id },
        timestamp
      });
      const copiedRelationshipCount = this.copyRelationships({
        workspaceId: targetList.list.workspaceId,
        from: { type: "item", id: sourceTask.item.id },
        to: { type: "list_item", id: listItem.id },
        timestamp
      });
      const movedAttachments = this.moveAttachments({
        workspaceId: targetList.list.workspaceId,
        fromItemId: sourceTask.item.id,
        toItemId: targetList.item.id,
        timestamp,
        searchIndex
      });
      const deletedTask = itemRepository.softDelete(sourceTask.item.id, timestamp);
      const listItemSearchRecord = searchIndex.upsertListItem(listItem, {
        timestamp
      });
      const targetListSearchRecord = searchIndex.upsertItem(targetList.item, {
        timestamp,
        metadata: createListSearchMetadata(targetList.list)
      });
      const deletedTaskSearchRecord = searchIndex.upsertItem(deletedTask, {
        timestamp,
        metadata: createTaskSearchMetadata(sourceTask.task)
      });
      const activityId = this.logConversionEvent({
        workspaceId: targetList.list.workspaceId,
        actorType,
        action: ActivityAction.taskMergedIntoList,
        targetType: "list_item",
        targetId: listItem.id,
        summary: `Merged task "${sourceTask.item.title}" into list "${targetList.item.title}".`,
        before,
        after: {
          targetList,
          listItem,
          movedAttachmentIds: movedAttachments.map((attachment) => attachment.id),
          copiedTagCount,
          copiedRelationshipCount
        },
        timestamp
      });

      return {
        sourceTask,
        targetList,
        listItem,
        listItemSearchRecord,
        targetListSearchRecord,
        deletedTaskSearchRecord,
        movedAttachments,
        copiedTagCount,
        copiedRelationshipCount,
        activityId
      };
    });
  }

  private requireTask(taskId: string): TaskWithItemRecord {
    const task = new TaskRepository(this.connection).getByItemId(taskId);

    if (task === null) {
      throw new Error(`Task was not found: ${taskId}.`);
    }

    return task;
  }

  private requireList(listId: string): ListWithItemRecord {
    const list = new ListRepository(this.connection).getByItemId(listId);

    if (list === null) {
      throw new Error(`List was not found: ${listId}.`);
    }

    return list;
  }

  private requireListItem(listItemId: string): ListItemRecord {
    const listItem = new ListRepository(this.connection).getListItemById(listItemId);

    if (listItem === null) {
      throw new Error(`List item was not found: ${listItemId}.`);
    }

    return listItem;
  }

  private copyTaggings(input: {
    workspaceId: string;
    from: { targetType: "item" | "list_item"; targetId: string };
    to: { targetType: "item" | "list_item"; targetId: string };
    timestamp: string;
  }): number {
    const repository = new TagRepository(this.connection);
    const sourceTags = repository.listTagsForTarget({
      workspaceId: input.workspaceId,
      targetType: input.from.targetType,
      targetId: input.from.targetId
    });
    let copiedCount = 0;

    for (const tag of sourceTags) {
      const before = repository.findActiveTagging({
        workspaceId: input.workspaceId,
        tagId: tag.id,
        targetType: input.to.targetType,
        targetId: input.to.targetId
      });
      repository.createTagging({
        id: this.idFactory("tagging"),
        workspaceId: input.workspaceId,
        tagId: tag.id,
        targetType: input.to.targetType,
        targetId: input.to.targetId,
        source: tag.taggingSource,
        timestamp: input.timestamp
      });

      if (before === null) {
        copiedCount += 1;
      }
    }

    return copiedCount;
  }

  private copyRelationships(input: {
    workspaceId: string;
    from: { type: RelationshipObjectType; id: string };
    to: { type: RelationshipObjectType; id: string };
    timestamp: string;
  }): number {
    const repository = new RelationshipRepository(this.connection);
    const backlinks = repository.listBacklinks({
      workspaceId: input.workspaceId,
      target: input.from
    });
    let copiedCount = 0;

    for (const backlink of backlinks) {
      const duplicate = this.copyRelationship(backlink, input.to, input.timestamp);

      if (duplicate) {
        copiedCount += 1;
      }
    }

    return copiedCount;
  }

  private copyRelationship(
    backlink: BacklinkRecord,
    replacement: { type: RelationshipObjectType; id: string },
    timestamp: string
  ): boolean {
    const relationship = backlink.relationship;
    const next =
      backlink.direction === "outgoing"
        ? {
            sourceType: replacement.type,
            sourceId: replacement.id,
            targetType: relationship.targetType,
            targetId: relationship.targetId
          }
        : {
            sourceType: relationship.sourceType,
            sourceId: relationship.sourceId,
            targetType: replacement.type,
            targetId: replacement.id
          };
    const repository = new RelationshipRepository(this.connection);
    const before = repository.findActiveDuplicate({
      workspaceId: relationship.workspaceId,
      sourceType: next.sourceType,
      sourceId: next.sourceId,
      targetType: next.targetType,
      targetId: next.targetId,
      relationType: relationship.relationType,
      label: relationship.label
    });

    repository.create({
      id: this.idFactory("relationship"),
      workspaceId: relationship.workspaceId,
      sourceType: next.sourceType,
      sourceId: next.sourceId,
      targetType: next.targetType,
      targetId: next.targetId,
      relationType: relationship.relationType,
      label: relationship.label,
      timestamp
    });

    return before === null;
  }

  private moveAttachments(input: {
    workspaceId: string;
    fromItemId: string;
    toItemId: string;
    timestamp: string;
    searchIndex: SearchIndexService;
  }): AttachmentRecord[] {
    const repository = new AttachmentRepository(this.connection);
    const attachments = repository.listForItem({
      workspaceId: input.workspaceId,
      itemId: input.fromItemId
    });

    return attachments.map((attachment) => {
      const moved = repository.moveToItem(attachment.id, {
        itemId: input.toItemId,
        timestamp: input.timestamp
      });
      input.searchIndex.upsertAttachment(moved, { timestamp: input.timestamp });
      return moved;
    });
  }

  private createSearchIndexService(): SearchIndexService {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
  }

  private getNextListItemSortOrder(listId: string): number {
    const max = new ListRepository(this.connection).getMaxListItemSortOrder(listId);

    return max === null ? 1024 : max + 1024;
  }

  private createTaskSnapshot(task: TaskWithItemRecord): {
    item: ItemRecord;
    task: TaskWithItemRecord["task"];
    tags: TaggedTargetRecord[];
    attachments: AttachmentRecord[];
    relationships: BacklinkRecord[];
  } {
    return {
      item: task.item,
      task: task.task,
      tags: new TagRepository(this.connection).listTagsForTarget({
        workspaceId: task.item.workspaceId,
        targetType: "item",
        targetId: task.item.id
      }),
      attachments: new AttachmentRepository(this.connection).listForItem({
        workspaceId: task.item.workspaceId,
        itemId: task.item.id
      }),
      relationships: new RelationshipRepository(this.connection).listBacklinks({
        workspaceId: task.item.workspaceId,
        target: { type: "item", id: task.item.id }
      })
    };
  }

  private createListItemSnapshot(
    listItem: ListItemRecord,
    list: ListWithItemRecord
  ): {
    listItem: ListItemRecord;
    list: ListWithItemRecord;
    tags: TaggedTargetRecord[];
    relationships: BacklinkRecord[];
  } {
    return {
      listItem,
      list,
      tags: new TagRepository(this.connection).listTagsForTarget({
        workspaceId: listItem.workspaceId,
        targetType: "list_item",
        targetId: listItem.id
      }),
      relationships: new RelationshipRepository(this.connection).listBacklinks({
        workspaceId: listItem.workspaceId,
        target: { type: "list_item", id: listItem.id }
      })
    };
  }

  private logConversionEvent(input: {
    workspaceId: string;
    actorType: ActivityActorType;
    action:
      | typeof ActivityAction.taskConvertedToList
      | typeof ActivityAction.listItemConvertedToTask
      | typeof ActivityAction.taskMergedIntoList;
    targetType: "item" | "list_item";
    targetId: string;
    summary: string;
    before: unknown;
    after: unknown;
    timestamp: string;
  }): string {
    const event = new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      beforeJson: JSON.stringify(input.before),
      afterJson: JSON.stringify(input.after),
      timestamp: input.timestamp
    });

    return event.id;
  }
}

export const taskListConversionsModuleContract = {
  module: "task-list-conversions",
  purpose: "Convert tasks and list rows through local service-layer mutations.",
  owns: ["task/list conversion orchestration", "metadata and relationship preservation", "conversion activity events"],
  doesNotOwn: ["renderer-only database writes", "cloud synchronization", "new persisted conversion tables"],
  integrationPoints: ["tasks", "lists", "attachments", "metadata", "relationships", "activity log", "search"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function taskStatusToListItemStatus(status: TaskStatus): ListItemStatus {
  switch (status) {
    case "done":
      return "done";
    case "waiting":
      return "waiting";
    case "cancelled":
      return "cancelled";
    case "open":
    case "someday":
    case "deferred":
      return "open";
  }
}

function listItemStatusToTaskStatus(status: ListItemStatus): TaskStatus {
  switch (status) {
    case "done":
      return "done";
    case "waiting":
      return "waiting";
    case "cancelled":
      return "cancelled";
    case "open":
      return "open";
  }
}

function createListSearchMetadata(list: ListWithItemRecord["list"]): Record<string, unknown> {
  return {
    displayMode: list.displayMode,
    showCompleted: list.showCompleted,
    progressMode: list.progressMode
  };
}

function createTaskSearchMetadata(task: TaskWithItemRecord["task"]): Record<string, unknown> {
  return {
    taskStatus: task.taskStatus,
    priority: task.priority,
    startAt: task.startAt,
    dueAt: task.dueAt,
    allDay: task.allDay,
    timezone: task.timezone,
    completedAt: task.completedAt
  };
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
