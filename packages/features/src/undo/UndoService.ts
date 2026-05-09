import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType,
  type ActivityTargetType
} from "@local-work-os/core";
import {
  ActivityLogRepository,
  ActivityLogService,
  SearchIndexService,
  TransactionService,
  type ActivityLogRecord,
  type DatabaseConnection,
  type ItemRecord,
  type TaskRecord
} from "@local-work-os/db";

export type UndoServiceIdFactory = (prefix: string) => string;

export type UndoableOperationKind =
  | "create"
  | "update"
  | "move"
  | "complete"
  | "tag"
  | "category"
  | "archive"
  | "delete";

export type UndoableOperation = {
  activityId: string;
  action: string;
  targetType: string;
  targetId: string;
  kind: UndoableOperationKind;
  label: string;
};

export type UndoSessionState = {
  undoStack: string[];
  redoStack: string[];
};

export type UndoApplyResult = {
  ok: boolean;
  mode: "undo" | "redo";
  operation: UndoableOperation;
  activityId: string | null;
  conflict: boolean;
  message: string;
};

type SnapshotEnvelope = {
  item?: ItemRecord;
  task?: TaskRecord;
  tag?: { id: string; workspaceId: string; slug: string };
  tagging?: {
    id: string;
    workspaceId: string;
    tagId: string;
    targetType: string;
    targetId: string;
    source: string;
    deletedAt: string | null;
  };
  container?: { id: string; workspaceId: string; categoryId: string | null };
  category?: unknown;
};

const DEFAULT_SESSION_LIMIT = 50;

export class UndoService {
  readonly module = "undo";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: UndoServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;
  private readonly session: UndoSessionState;
  private readonly sessionLimit: number;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: UndoServiceIdFactory;
    now?: () => Date;
    session?: UndoSessionState;
    sessionLimit?: number;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
    this.session = input.session ?? { undoStack: [], redoStack: [] };
    this.sessionLimit = input.sessionLimit ?? DEFAULT_SESSION_LIMIT;
  }

  getSessionState(): UndoSessionState {
    return {
      undoStack: [...this.session.undoStack],
      redoStack: [...this.session.redoStack]
    };
  }

  registerActivity(activityId: string): UndoableOperation | null {
    validateNonEmptyString(activityId, "activityId");
    const operation = this.getUndoableOperation(activityId);

    if (operation === null) {
      return null;
    }

    pushBounded(this.session.undoStack, activityId, this.sessionLimit);
    this.session.redoStack.length = 0;
    return operation;
  }

  getUndoableOperation(activityId: string): UndoableOperation | null {
    validateNonEmptyString(activityId, "activityId");
    const activity = this.requireActivity(activityId);
    return toUndoableOperation(activity);
  }

  async undoLast(
    actorType: ActivityActorType = "local_user"
  ): Promise<UndoApplyResult> {
    const activityId = this.session.undoStack.pop();

    if (activityId === undefined) {
      throw new Error("There is no operation to undo.");
    }

    const result = await this.undoActivity(activityId, actorType);

    if (result.ok) {
      pushBounded(this.session.redoStack, activityId, this.sessionLimit);
    } else {
      pushBounded(this.session.undoStack, activityId, this.sessionLimit);
    }

    return result;
  }

  async redoLast(
    actorType: ActivityActorType = "local_user"
  ): Promise<UndoApplyResult> {
    const activityId = this.session.redoStack.pop();

    if (activityId === undefined) {
      throw new Error("There is no operation to redo.");
    }

    const result = await this.redoActivity(activityId, actorType);

    if (result.ok) {
      pushBounded(this.session.undoStack, activityId, this.sessionLimit);
    } else {
      pushBounded(this.session.redoStack, activityId, this.sessionLimit);
    }

    return result;
  }

  async undoActivity(
    activityId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<UndoApplyResult> {
    return await this.applyActivity(activityId, "undo", actorType);
  }

  async redoActivity(
    activityId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<UndoApplyResult> {
    return await this.applyActivity(activityId, "redo", actorType);
  }

  private async applyActivity(
    activityId: string,
    mode: "undo" | "redo",
    actorType: ActivityActorType
  ): Promise<UndoApplyResult> {
    validateNonEmptyString(activityId, "activityId");

    return await this.transactionService.runInTransaction(() => {
      const activity = this.requireActivity(activityId);
      const operation = toUndoableOperation(activity);

      if (operation === null) {
        throw new Error(`Activity is not undoable: ${activity.action}.`);
      }

      const before = parseSnapshot(activity.beforeJson);
      const after = parseSnapshot(activity.afterJson);
      const expected = mode === "undo" ? after : before;
      const next = mode === "undo" ? before : after;
      const timestamp = createIsoTimestamp(this.now());

      if (!this.currentMatches(activity, expected)) {
        return {
          ok: false,
          mode,
          operation,
          activityId: null,
          conflict: true,
          message: "The target changed after the original operation; undo/redo was not applied."
        };
      }

      this.applySnapshot(activity, next, timestamp);
      const log = this.logUndoRedoEvent({
        source: activity,
        operation,
        mode,
        actorType,
        timestamp
      });

      return {
        ok: true,
        mode,
        operation,
        activityId: log.id,
        conflict: false,
        message:
          mode === "undo"
            ? `Undid ${operation.label}.`
            : `Redid ${operation.label}.`
      };
    });
  }

  private currentMatches(
    activity: ActivityLogRecord,
    expected: SnapshotEnvelope | null
  ): boolean {
    switch (activity.action) {
      case ActivityAction.itemCreated:
      case ActivityAction.itemUpdated:
      case ActivityAction.itemMoved:
      case ActivityAction.itemArchived:
      case ActivityAction.itemDeleted:
        return expected?.item === undefined
          ? isAbsentItem(this.findItemAny(activity.targetId))
          : itemComparable(this.findItemAny(activity.targetId)) ===
              itemComparable(expected.item);
      case ActivityAction.taskCreated:
      case ActivityAction.taskUpdated:
      case ActivityAction.taskCompleted:
      case ActivityAction.taskReopened:
        if (expected === null) {
          return isAbsentItem(this.findItemAny(activity.targetId));
        }
        return (
          expected?.item !== undefined &&
          expected.task !== undefined &&
          itemComparable(this.findItemAny(activity.targetId)) ===
            itemComparable(expected.item) &&
          taskComparable(this.findTask(activity.targetId)) ===
            taskComparable(expected.task)
        );
      case ActivityAction.tagAdded:
      case ActivityAction.tagRemoved: {
        if (expected === null) {
          const after = parseSnapshot(activity.afterJson);
          const tagging = after?.tagging;
          if (tagging === undefined) {
            return false;
          }
          const current = this.findTagging(tagging.id);
          return current !== null && current.deletedAt !== null;
        }
        const tagging = expected?.tagging;
        if (tagging === undefined) {
          return false;
        }
        return taggingComparable(this.findTagging(tagging.id)) === taggingComparable(tagging);
      }
      case ActivityAction.categoryAssigned: {
        if (activity.targetType === "item") {
          return (
            expected?.item !== undefined &&
            this.findItemAny(activity.targetId)?.categoryId === expected.item.categoryId
          );
        }
        if (activity.targetType === "container") {
          return (
            expected?.container !== undefined &&
            this.findContainerCategoryId(activity.targetId) === expected.container.categoryId
          );
        }
        return false;
      }
      default:
        return false;
    }
  }

  private applySnapshot(
    activity: ActivityLogRecord,
    snapshot: SnapshotEnvelope | null,
    timestamp: string
  ): void {
    if (
      (activity.action === ActivityAction.tagAdded ||
        activity.action === ActivityAction.tagRemoved) &&
      snapshot === null
    ) {
      const after = parseSnapshot(activity.afterJson);
      if (after?.tagging !== undefined) {
        this.restoreTagging({ ...after.tagging, deletedAt: timestamp }, timestamp);
        this.refreshTargetSearch(after.tagging.targetType, after.tagging.targetId, timestamp);
      }
      return;
    }

    switch (activity.action) {
      case ActivityAction.itemCreated:
        if (snapshot === null) {
          this.softDeleteItem(activity.targetId, timestamp);
          return;
        }
        break;
      case ActivityAction.taskCreated:
        if (snapshot === null) {
          this.softDeleteItem(activity.targetId, timestamp);
          return;
        }
        break;
    }

    if (snapshot?.item !== undefined) {
      this.restoreItem(snapshot.item, timestamp);
    }

    if (snapshot?.task !== undefined) {
      this.restoreTask(snapshot.task, timestamp);
    }

    if (snapshot?.tagging !== undefined) {
      this.restoreTagging(snapshot.tagging, timestamp);
      this.refreshTargetSearch(snapshot.tagging.targetType, snapshot.tagging.targetId, timestamp);
    }

    if (activity.action === ActivityAction.categoryAssigned) {
      if (snapshot?.item !== undefined) {
        this.refreshTargetSearch("item", snapshot.item.id, timestamp);
      }
      if (snapshot?.container !== undefined) {
        this.restoreContainerCategory(snapshot.container.id, snapshot.container.categoryId, timestamp);
        this.refreshTargetSearch("container", snapshot.container.id, timestamp);
      }
    }
  }

  private restoreItem(item: ItemRecord, timestamp: string): void {
    this.connection.sqlite
      .prepare(
        `update items
         set container_id = ?,
             container_tab_id = ?,
             title = ?,
             body = ?,
             category_id = ?,
             status = ?,
             sort_order = ?,
             pinned = ?,
             completed_at = ?,
             archived_at = ?,
             deleted_at = ?,
             updated_at = ?
         where id = ?`
      )
      .run(
        item.containerId,
        item.containerTabId,
        item.title,
        item.body,
        item.categoryId,
        item.status,
        item.sortOrder,
        item.pinned ? 1 : 0,
        item.completedAt,
        item.archivedAt,
        item.deletedAt,
        timestamp,
        item.id
      );
    this.refreshTargetSearch("item", item.id, timestamp, item);
  }

  private restoreTask(task: TaskRecord, timestamp: string): void {
    this.connection.sqlite
      .prepare(
        `update task_details
         set task_status = ?,
             priority = ?,
             start_at = ?,
             due_at = ?,
             all_day = ?,
             timezone = ?,
             reminder_policy_id = ?,
             recurrence_rule_id = ?,
             completed_at = ?,
             updated_at = ?
         where item_id = ?`
      )
      .run(
        task.taskStatus,
        task.priority,
        task.startAt,
        task.dueAt,
        task.allDay ? 1 : 0,
        task.timezone,
        task.reminderPolicyId,
        task.recurrenceRuleId,
        task.completedAt,
        timestamp,
        task.itemId
      );
    this.refreshTargetSearch("item", task.itemId, timestamp);
  }

  private restoreTagging(tagging: NonNullable<SnapshotEnvelope["tagging"]>, timestamp: string): void {
    this.connection.sqlite
      .prepare(
        `update taggings
         set deleted_at = ?
         where id = ?`
      )
      .run(tagging.deletedAt, tagging.id);

    if (this.findTagging(tagging.id) === null) {
      this.connection.sqlite
        .prepare(
          `insert into taggings (
            id,
            workspace_id,
            tag_id,
            target_type,
            target_id,
            source,
            created_at,
            deleted_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          tagging.id,
          tagging.workspaceId,
          tagging.tagId,
          tagging.targetType,
          tagging.targetId,
          tagging.source,
          timestamp,
          tagging.deletedAt
        );
    }
  }

  private restoreContainerCategory(
    containerId: string,
    categoryId: string | null,
    timestamp: string
  ): void {
    this.connection.sqlite
      .prepare(
        `update containers
         set category_id = ?,
             updated_at = ?
         where id = ?`
      )
      .run(categoryId, timestamp, containerId);
  }

  private softDeleteItem(itemId: string, timestamp: string): void {
    this.connection.sqlite
      .prepare(
        `update items
         set deleted_at = ?,
             updated_at = ?
         where id = ?`
      )
      .run(timestamp, timestamp, itemId);
    const item = this.findItemAny(itemId);
    if (item !== null) {
      this.refreshTargetSearch("item", item.id, timestamp, item);
    }
  }

  private refreshTargetSearch(
    targetType: string,
    targetId: string,
    timestamp: string,
    itemSnapshot?: ItemRecord
  ): void {
    const search = new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });

    if (targetType === "item") {
      const item = itemSnapshot ?? this.findItemAny(targetId);
      if (item !== null) {
        const task = item.type === "task" ? this.findTask(item.id) : null;
        search.upsertItem(item, {
          timestamp,
          ...(task === null
            ? {}
            : {
                metadata: {
                  taskStatus: task.taskStatus,
                  priority: task.priority,
                  startAt: task.startAt,
                  dueAt: task.dueAt,
                  allDay: task.allDay,
                  timezone: task.timezone,
                  completedAt: task.completedAt
                }
              })
        });
      }
    }
  }

  private logUndoRedoEvent(input: {
    source: ActivityLogRecord;
    operation: UndoableOperation;
    mode: "undo" | "redo";
    actorType: ActivityActorType;
    timestamp: string;
  }): ActivityLogRecord {
    return new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.source.workspaceId,
      actorType: input.actorType,
      action:
        input.mode === "undo"
          ? ActivityAction.operationUndone
          : ActivityAction.operationRedone,
      targetType: input.source.targetType as ActivityTargetType,
      targetId: input.source.targetId,
      summary:
        input.mode === "undo"
          ? `Undid ${input.operation.label}.`
          : `Redid ${input.operation.label}.`,
      beforeJson: JSON.stringify({ sourceActivityId: input.source.id }),
      afterJson: JSON.stringify({
        sourceActivityId: input.source.id,
        sourceAction: input.source.action,
        mode: input.mode
      }),
      timestamp: input.timestamp
    });
  }

  private requireActivity(activityId: string): ActivityLogRecord {
    const activity = new ActivityLogRepository(this.connection).getById(activityId);

    if (activity === null) {
      throw new Error(`Activity was not found: ${activityId}.`);
    }

    return activity;
  }

  private findItemAny(itemId: string): ItemRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ItemRow>(
        `select *
         from items
         where id = ?
         limit 1`
      )
      .get(itemId);

    return row === undefined ? null : toItemRecord(row);
  }

  private findTask(itemId: string): TaskRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], TaskRow>(
        `select *
         from task_details
         where item_id = ?
         limit 1`
      )
      .get(itemId);

    return row === undefined ? null : toTaskRecord(row);
  }

  private findTagging(taggingId: string): NonNullable<SnapshotEnvelope["tagging"]> | null {
    const row = this.connection.sqlite
      .prepare<[string], TaggingRow>(
        `select *
         from taggings
         where id = ?
         limit 1`
      )
      .get(taggingId);

    return row === undefined ? null : toTagging(row);
  }

  private findContainerCategoryId(containerId: string): string | null | undefined {
    const row = this.connection.sqlite
      .prepare<[string], { category_id: string | null }>(
        `select category_id
         from containers
         where id = ?
         limit 1`
      )
      .get(containerId);

    return row?.category_id;
  }
}

export const undoModuleContract = {
  module: "undo",
  purpose: "Provide a bounded local undo/redo foundation from activity snapshots.",
  owns: ["undoable operation contracts", "session undo/redo stacks", "snapshot inverse application"],
  doesNotOwn: ["cloud history", "multi-user conflict resolution", "unbounded persistent undo history"],
  integrationPoints: ["activity log", "items", "tasks", "metadata", "search"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function toUndoableOperation(activity: ActivityLogRecord): UndoableOperation | null {
  const kind = kindForAction(activity.action);
  if (kind === null) {
    return null;
  }
  if (activity.beforeJson === null && activity.afterJson === null) {
    return null;
  }
  return {
    activityId: activity.id,
    action: activity.action,
    targetType: activity.targetType,
    targetId: activity.targetId,
    kind,
    label: activity.summary ?? activity.action.replaceAll("_", " ")
  };
}

function kindForAction(action: string): UndoableOperationKind | null {
  switch (action) {
    case ActivityAction.itemCreated:
    case ActivityAction.taskCreated:
      return "create";
    case ActivityAction.itemUpdated:
    case ActivityAction.taskUpdated:
      return "update";
    case ActivityAction.itemMoved:
      return "move";
    case ActivityAction.taskCompleted:
    case ActivityAction.taskReopened:
      return "complete";
    case ActivityAction.tagAdded:
    case ActivityAction.tagRemoved:
      return "tag";
    case ActivityAction.categoryAssigned:
      return "category";
    case ActivityAction.itemArchived:
      return "archive";
    case ActivityAction.itemDeleted:
      return "delete";
    default:
      return null;
  }
}

function parseSnapshot(value: string | null): SnapshotEnvelope | null {
  if (value === null) {
    return null;
  }
  const parsed = JSON.parse(value) as unknown;
  if (!isRecord(parsed)) {
    return null;
  }
  if (isItemSnapshot(parsed)) {
    return { item: parsed };
  }
  if (isContainerSnapshot(parsed)) {
    return { container: parsed };
  }
  return parsed as SnapshotEnvelope;
}

function pushBounded(stack: string[], activityId: string, limit: number): void {
  const existingIndex = stack.indexOf(activityId);
  if (existingIndex >= 0) {
    stack.splice(existingIndex, 1);
  }
  stack.push(activityId);
  while (stack.length > limit) {
    stack.shift();
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isItemSnapshot(value: Record<string, unknown>): value is ItemRecord {
  return (
    typeof value.id === "string" &&
    typeof value.workspaceId === "string" &&
    typeof value.containerId === "string" &&
    typeof value.type === "string" &&
    typeof value.title === "string" &&
    typeof value.status === "string"
  );
}

function isContainerSnapshot(
  value: Record<string, unknown>
): value is NonNullable<SnapshotEnvelope["container"]> {
  return (
    typeof value.id === "string" &&
    typeof value.workspaceId === "string" &&
    Object.prototype.hasOwnProperty.call(value, "categoryId")
  );
}

function itemComparable(item: ItemRecord | null | undefined): string | null {
  if (item === null || item === undefined) {
    return null;
  }
  return JSON.stringify({
    id: item.id,
    containerId: item.containerId,
    containerTabId: item.containerTabId,
    title: item.title,
    body: item.body,
    categoryId: item.categoryId,
    status: item.status,
    sortOrder: item.sortOrder,
    pinned: item.pinned,
    completedAt: item.completedAt,
    archivedAt: item.archivedAt,
    deletedAt: item.deletedAt
  });
}

function taskComparable(task: TaskRecord | null | undefined): string | null {
  if (task === null || task === undefined) {
    return null;
  }
  return JSON.stringify({
    itemId: task.itemId,
    taskStatus: task.taskStatus,
    priority: task.priority,
    startAt: task.startAt,
    dueAt: task.dueAt,
    allDay: task.allDay,
    timezone: task.timezone,
    reminderPolicyId: task.reminderPolicyId,
    recurrenceRuleId: task.recurrenceRuleId,
    completedAt: task.completedAt
  });
}

function taggingComparable(
  tagging: NonNullable<SnapshotEnvelope["tagging"]> | null | undefined
): string | null {
  if (tagging === null || tagging === undefined) {
    return null;
  }
  return JSON.stringify({
    id: tagging.id,
    tagId: tagging.tagId,
    targetType: tagging.targetType,
    targetId: tagging.targetId,
    source: tagging.source,
    deletedAt: tagging.deletedAt
  });
}

function isAbsentItem(item: ItemRecord | null): boolean {
  return item === null || item.deletedAt !== null;
}

type ItemRow = {
  id: string;
  workspace_id: string;
  container_id: string;
  container_tab_id: string | null;
  type: string;
  title: string;
  body: string | null;
  category_id: string | null;
  status: string;
  sort_order: number;
  pinned: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
};

type TaskRow = {
  item_id: string;
  workspace_id: string;
  task_status: string;
  priority: number | null;
  start_at: string | null;
  due_at: string | null;
  all_day: number;
  timezone: string | null;
  reminder_policy_id: string | null;
  recurrence_rule_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

type TaggingRow = {
  id: string;
  workspace_id: string;
  tag_id: string;
  target_type: string;
  target_id: string;
  source: string;
  created_at: string;
  deleted_at: string | null;
};

function toItemRecord(row: ItemRow): ItemRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    containerId: row.container_id,
    containerTabId: row.container_tab_id,
    type: row.type,
    title: row.title,
    body: row.body,
    categoryId: row.category_id,
    status: row.status,
    sortOrder: row.sort_order,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at
  };
}

function toTaskRecord(row: TaskRow): TaskRecord {
  return {
    itemId: row.item_id,
    workspaceId: row.workspace_id,
    taskStatus: row.task_status as TaskRecord["taskStatus"],
    priority: row.priority,
    startAt: row.start_at,
    dueAt: row.due_at,
    allDay: row.all_day === 1,
    timezone: row.timezone,
    reminderPolicyId: row.reminder_policy_id,
    recurrenceRuleId: row.recurrence_rule_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toTagging(row: TaggingRow): NonNullable<SnapshotEnvelope["tagging"]> {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    tagId: row.tag_id,
    targetType: row.target_type,
    targetId: row.target_id,
    source: row.source,
    deletedAt: row.deleted_at
  };
}
