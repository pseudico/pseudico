import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  isTaskStatus,
  taskStatusToItemStatus,
  type ActivityActorType,
  type TaskDateRange,
  type TaskStatus
} from "@local-work-os/core";
import {
  ActivityLogService,
  ItemRepository,
  SearchIndexService,
  SortOrderService,
  TaskRepository,
  TransactionService,
  type DatabaseConnection,
  type ItemRecord,
  type SearchIndexRecord,
  type TaskRecord,
  type TaskWithItemRecord,
  type UpdateItemPatch,
  type UpdateTaskDetailsPatch
} from "@local-work-os/db";
import {
  assertTaskDateOrder,
  createTaskDateRange,
  createTaskDayRange,
  isTaskDateOnly,
  normalizeTaskDateTime,
  type TaskRangeInput
} from "./TaskQueries";

// Owns task-specific application operations.
// Does not own container persistence or calendar rendering.
export type TaskServiceIdFactory = (prefix: string) => string;

export type CreateTaskInput = {
  workspaceId: string;
  containerId: string;
  title: string;
  actorType?: ActivityActorType;
  body?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  priority?: number | null;
  status?: TaskStatus;
  allDay?: boolean;
  timezone?: string | null;
  sortOrder?: number;
  pinned?: boolean;
};

export type UpdateTaskInput = {
  itemId: string;
  actorType?: ActivityActorType;
  title?: string;
  body?: string | null;
  categoryId?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  priority?: number | null;
  status?: TaskStatus;
  allDay?: boolean;
  timezone?: string | null;
  sortOrder?: number;
  pinned?: boolean;
  containerTabId?: string | null;
};

export type TaskMutationResult = TaskWithItemRecord & {
  searchRecord: SearchIndexRecord;
};

export class TaskService {
  readonly module = "tasks";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: TaskServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: TaskServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async createTask(input: CreateTaskInput): Promise<TaskMutationResult> {
    this.validateCreateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const taskStatus = input.status ?? "open";
      const startAt = normalizeTaskDateTime(input.startAt, "startAt") ?? null;
      const dueAt = normalizeTaskDateTime(input.dueAt, "dueAt") ?? null;
      const completedAt = taskStatus === "done" ? timestamp : null;
      assertTaskDateOrder(startAt, dueAt);

      const itemRepository = new ItemRepository(this.connection);
      const taskRepository = new TaskRepository(this.connection);
      const sortOrderService = new SortOrderService({
        connection: this.connection
      });
      const item = itemRepository.create({
        id: this.idFactory("item"),
        workspaceId: input.workspaceId,
        containerId: input.containerId,
        containerTabId: input.containerTabId ?? null,
        type: "task",
        title: input.title.trim(),
        body: normalizeNullableString(input.body),
        categoryId: normalizeNullableString(input.categoryId),
        status: taskStatusToItemStatus(taskStatus),
        sortOrder:
          input.sortOrder ??
          sortOrderService.getNextItemSortOrder({
            containerId: input.containerId,
            containerTabId: input.containerTabId ?? null
          }),
        ...(input.pinned === undefined ? {} : { pinned: input.pinned }),
        completedAt,
        timestamp
      });
      const task = taskRepository.createDetails({
        itemId: item.id,
        workspaceId: input.workspaceId,
        taskStatus,
        priority: input.priority ?? null,
        startAt,
        dueAt,
        allDay: input.allDay ?? inferAllDay(input.startAt, input.dueAt),
        timezone: normalizeNullableString(input.timezone),
        completedAt,
        timestamp
      });

      this.logTaskEvent({
        item,
        task,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.taskCreated,
        summary: `Created task "${item.title}".`,
        before: null,
        timestamp
      });

      const searchRecord = this.upsertSearchRecord(item, task, timestamp);

      return { item, task, searchRecord };
    });
  }

  async updateTask(input: UpdateTaskInput): Promise<TaskMutationResult> {
    this.validateUpdateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireTask(input.itemId);
      const itemPatch: UpdateItemPatch = { timestamp };
      const taskPatch: UpdateTaskDetailsPatch = { timestamp };

      if (input.title !== undefined) {
        itemPatch.title = input.title.trim();
      }

      if (input.body !== undefined) {
        itemPatch.body = normalizeNullableString(input.body);
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

      if (input.priority !== undefined) {
        taskPatch.priority = input.priority;
      }

      if (input.startAt !== undefined) {
        taskPatch.startAt =
          normalizeTaskDateTime(input.startAt, "startAt") ?? null;
      }

      if (input.dueAt !== undefined) {
        taskPatch.dueAt = normalizeTaskDateTime(input.dueAt, "dueAt") ?? null;
      }

      if (input.allDay !== undefined) {
        taskPatch.allDay = input.allDay;
      }

      if (input.timezone !== undefined) {
        taskPatch.timezone = normalizeNullableString(input.timezone);
      }

      if (input.status !== undefined) {
        taskPatch.taskStatus = input.status;
        itemPatch.status = taskStatusToItemStatus(input.status);
        const completedAt = input.status === "done" ? timestamp : null;
        itemPatch.completedAt = completedAt;
        taskPatch.completedAt = completedAt;
      }

      const nextStartAt =
        taskPatch.startAt === undefined ? before.task.startAt : taskPatch.startAt;
      const nextDueAt =
        taskPatch.dueAt === undefined ? before.task.dueAt : taskPatch.dueAt;
      assertTaskDateOrder(nextStartAt, nextDueAt);

      const item = new ItemRepository(this.connection).update(
        input.itemId,
        itemPatch
      );
      const task = new TaskRepository(this.connection).updateDetails(
        input.itemId,
        taskPatch
      );

      this.logTaskEvent({
        item,
        task,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.taskUpdated,
        summary: `Updated task "${item.title}".`,
        before,
        timestamp
      });

      const searchRecord = this.upsertSearchRecord(item, task, timestamp);

      return { item, task, searchRecord };
    });
  }

  async completeTask(
    itemId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<TaskMutationResult> {
    validateNonEmptyString(itemId, "itemId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireTask(itemId);
      const item = new ItemRepository(this.connection).update(itemId, {
        status: "completed",
        completedAt: timestamp,
        timestamp
      });
      const task = new TaskRepository(this.connection).updateDetails(itemId, {
        taskStatus: "done",
        completedAt: timestamp,
        timestamp
      });

      this.logTaskEvent({
        item,
        task,
        actorType,
        action: ActivityAction.taskCompleted,
        summary: `Completed task "${item.title}".`,
        before,
        timestamp
      });

      const searchRecord = this.upsertSearchRecord(item, task, timestamp);

      return { item, task, searchRecord };
    });
  }

  async reopenTask(
    itemId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<TaskMutationResult> {
    validateNonEmptyString(itemId, "itemId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireTask(itemId);
      const item = new ItemRepository(this.connection).update(itemId, {
        status: "active",
        completedAt: null,
        timestamp
      });
      const task = new TaskRepository(this.connection).updateDetails(itemId, {
        taskStatus: "open",
        completedAt: null,
        timestamp
      });

      this.logTaskEvent({
        item,
        task,
        actorType,
        action: ActivityAction.taskReopened,
        summary: `Reopened task "${item.title}".`,
        before,
        timestamp
      });

      const searchRecord = this.upsertSearchRecord(item, task, timestamp);

      return { item, task, searchRecord };
    });
  }

  listDueToday(workspaceId: string, date: string | Date): TaskWithItemRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return new TaskRepository(this.connection).listDueBetween(
      workspaceId,
      createTaskDayRange(date)
    );
  }

  listOverdue(workspaceId: string, date: string | Date): TaskWithItemRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return new TaskRepository(this.connection).listOverdue(
      workspaceId,
      createTaskDayRange(date).startInclusive
    );
  }

  listUpcoming(
    workspaceId: string,
    range: TaskRangeInput | TaskDateRange
  ): TaskWithItemRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");
    const normalizedRange =
      "startInclusive" in range ? range : createTaskDateRange(range);

    return new TaskRepository(this.connection).listUpcoming(
      workspaceId,
      normalizedRange
    );
  }

  private requireTask(itemId: string): TaskWithItemRecord {
    const task = new TaskRepository(this.connection).getByItemId(itemId);

    if (task === null) {
      throw new Error(`Task was not found: ${itemId}.`);
    }

    return task;
  }

  private upsertSearchRecord(
    item: ItemRecord,
    task: TaskRecord,
    timestamp: string
  ): SearchIndexRecord {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertItem(item, {
      timestamp,
      metadata: {
        taskStatus: task.taskStatus,
        priority: task.priority,
        startAt: task.startAt,
        dueAt: task.dueAt,
        allDay: task.allDay,
        timezone: task.timezone,
        completedAt: task.completedAt
      }
    });
  }

  private logTaskEvent(input: {
    item: ItemRecord;
    task: TaskRecord;
    actorType?: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: TaskWithItemRecord | null;
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
      afterJson: JSON.stringify({ item: input.item, task: input.task }),
      timestamp: input.timestamp
    });
  }

  private validateCreateInput(input: CreateTaskInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");
    validateNonEmptyString(input.title, "title");

    if (input.status !== undefined && !isTaskStatus(input.status)) {
      throw new Error("status must be open, done, waiting, or cancelled.");
    }

    validatePriority(input.priority);
  }

  private validateUpdateInput(input: UpdateTaskInput): void {
    validateNonEmptyString(input.itemId, "itemId");

    if (input.title !== undefined) {
      validateNonEmptyString(input.title, "title");
    }

    if (input.status !== undefined && !isTaskStatus(input.status)) {
      throw new Error("status must be open, done, waiting, or cancelled.");
    }

    validatePriority(input.priority);

    if (
      input.title === undefined &&
      input.body === undefined &&
      input.categoryId === undefined &&
      input.dueAt === undefined &&
      input.startAt === undefined &&
      input.priority === undefined &&
      input.status === undefined &&
      input.allDay === undefined &&
      input.timezone === undefined &&
      input.sortOrder === undefined &&
      input.pinned === undefined &&
      input.containerTabId === undefined
    ) {
      throw new Error("At least one task field must be provided.");
    }
  }
}

export const tasksModuleContract = {
  module: "tasks",
  purpose: "Manage task lifecycle behavior and task-specific projections.",
  owns: ["task lifecycle operations", "task date/status rules", "task projections"],
  doesNotOwn: ["container persistence", "calendar rendering", "reminder scheduling internals"],
  integrationPoints: ["projects", "contacts", "inbox", "metadata", "search", "today", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function validatePriority(value: number | null | undefined): void {
  if (value === undefined || value === null) {
    return;
  }

  if (!Number.isInteger(value) || value < 0 || value > 5) {
    throw new Error("priority must be an integer between 0 and 5.");
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

function inferAllDay(
  startAt: string | null | undefined,
  dueAt: string | null | undefined
): boolean {
  if (startAt === undefined && dueAt === undefined) {
    return true;
  }

  return isTaskDateOnly(startAt) || isTaskDateOnly(dueAt);
}
