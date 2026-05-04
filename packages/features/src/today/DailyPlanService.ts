import {
  ActivityAction,
  createIsoTimestamp,
  createLocalDayRange,
  createLocalId,
  type ActivityActorType,
  type Clock,
  type LocalDateInput
} from "@local-work-os/core";
import {
  ActivityLogService,
  DailyPlanRepository,
  TaskRepository,
  TransactionService,
  type DailyPlanItemRecord,
  type DailyPlanLane,
  type DailyPlanRecord,
  type DatabaseConnection,
  type TaskWithItemRecord
} from "@local-work-os/db";
import { toTodayTaskView, type TodayTaskView } from "./TodayViewModel";

export type DailyPlanServiceIdFactory = (prefix: string) => string;

export type DailyPlanDateInput = {
  workspaceId: string;
  date?: LocalDateInput;
};

export type PlanTaskInput = DailyPlanDateInput & {
  itemId: string;
  lane: DailyPlanLane;
  sortOrder?: number;
  actorType?: ActivityActorType;
};

export type UnplanTaskInput = DailyPlanDateInput & {
  itemId: string;
  lane?: DailyPlanLane;
  actorType?: ActivityActorType;
};

export type ReorderPlannedTaskInput = DailyPlanDateInput & {
  itemId: string;
  lane: DailyPlanLane;
  sortOrder: number;
  actorType?: ActivityActorType;
};

export type GetPlannedTasksInput = DailyPlanDateInput & {
  lane?: DailyPlanLane;
};

export type PlannedTaskView = TodayTaskView & {
  planItemId: string;
  lane: DailyPlanLane;
  plannedSortOrder: number;
};

export class DailyPlanService {
  readonly module = "today";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: DailyPlanServiceIdFactory;
  private readonly now: Clock;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: DailyPlanServiceIdFactory;
    now?: Clock;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async getOrCreateDailyPlan(
    input: DailyPlanDateInput
  ): Promise<DailyPlanRecord> {
    this.validateDateInput(input);

    return await this.transactionService.runInTransaction(() => {
      return this.getOrCreatePlan(input);
    });
  }

  async planTask(input: PlanTaskInput): Promise<DailyPlanItemRecord> {
    this.validatePlanTaskInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const task = this.requirePlannableTask(input.workspaceId, input.itemId);
      const repository = new DailyPlanRepository(this.connection);
      const plan = this.getOrCreatePlan(input, timestamp);
      const before = repository.deletePlanItems({
        dailyPlanId: plan.id,
        itemType: "task",
        itemId: input.itemId
      });
      const planItem = repository.createPlanItem({
        id: this.idFactory("daily_plan_item"),
        workspaceId: input.workspaceId,
        dailyPlanId: plan.id,
        itemType: "task",
        itemId: input.itemId,
        lane: input.lane,
        sortOrder:
          input.sortOrder ??
          repository.getNextSortOrder({
            dailyPlanId: plan.id,
            lane: input.lane
          }),
        addedManually: true,
        timestamp
      });

      repository.touchPlan(plan.id, timestamp);
      this.logPlanningEvent({
        workspaceId: input.workspaceId,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.taskPlanned,
        targetId: input.itemId,
        summary: `Planned task "${task.item.title}" for ${input.lane}.`,
        before: before.length === 0 ? null : before,
        after: planItem,
        timestamp
      });

      return planItem;
    });
  }

  async unplanTask(input: UnplanTaskInput): Promise<DailyPlanItemRecord[]> {
    this.validateUnplanTaskInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const task = this.requireWorkspaceTask(input.workspaceId, input.itemId);
      const repository = new DailyPlanRepository(this.connection);
      const plan = repository.findPlanByDate({
        workspaceId: input.workspaceId,
        planDate: normalizePlanDate(input.date ?? this.now())
      });

      if (plan === null) {
        return [];
      }

      const removed = repository.deletePlanItems({
        dailyPlanId: plan.id,
        itemType: "task",
        itemId: input.itemId,
        ...(input.lane === undefined ? {} : { lane: input.lane })
      });

      if (removed.length > 0) {
        repository.touchPlan(plan.id, timestamp);
        this.logPlanningEvent({
          workspaceId: input.workspaceId,
          ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
          action: ActivityAction.taskUnplanned,
          targetId: input.itemId,
          summary: `Removed task "${task.item.title}" from the daily plan.`,
          before: removed,
          after: null,
          timestamp
        });
      }

      return removed;
    });
  }

  async reorderPlannedTask(
    input: ReorderPlannedTaskInput
  ): Promise<DailyPlanItemRecord> {
    this.validateReorderInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const task = this.requireWorkspaceTask(input.workspaceId, input.itemId);
      const repository = new DailyPlanRepository(this.connection);
      const plan = repository.findPlanByDate({
        workspaceId: input.workspaceId,
        planDate: normalizePlanDate(input.date ?? this.now())
      });

      if (plan === null) {
        throw new Error("Daily plan item was not found.");
      }

      const before = repository.findPlanItemsForTarget({
        dailyPlanId: plan.id,
        itemType: "task",
        itemId: input.itemId,
        lane: input.lane
      })[0];

      if (before === undefined) {
        throw new Error("Daily plan item was not found.");
      }

      const updated = repository.updatePlanItemSortOrder({
        dailyPlanId: plan.id,
        itemType: "task",
        itemId: input.itemId,
        lane: input.lane,
        sortOrder: input.sortOrder,
        timestamp
      });

      repository.touchPlan(plan.id, timestamp);
      this.logPlanningEvent({
        workspaceId: input.workspaceId,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.taskPlanReordered,
        targetId: input.itemId,
        summary: `Reordered task "${task.item.title}" in ${input.lane}.`,
        before,
        after: updated,
        timestamp
      });

      return updated;
    });
  }

  getPlannedTasks(input: GetPlannedTasksInput): PlannedTaskView[] {
    this.validateDateInput(input);

    const repository = new DailyPlanRepository(this.connection);
    const plan = repository.findPlanByDate({
      workspaceId: input.workspaceId,
      planDate: normalizePlanDate(input.date ?? this.now())
    });

    if (plan === null) {
      return [];
    }

    return repository
      .listPlannedTasks({
        workspaceId: input.workspaceId,
        dailyPlanId: plan.id,
        ...(input.lane === undefined ? {} : { lane: input.lane })
      })
      .map((record) => ({
        ...toTodayTaskView(record.task),
        sortOrder: record.planItem.sortOrder,
        planItemId: record.planItem.id,
        lane: record.planItem.lane,
        plannedSortOrder: record.planItem.sortOrder
      }));
  }

  private getOrCreatePlan(
    input: DailyPlanDateInput,
    timestamp = createIsoTimestamp(this.now())
  ): DailyPlanRecord {
    const planDate = normalizePlanDate(input.date ?? this.now());
    const repository = new DailyPlanRepository(this.connection);
    const existing = repository.findPlanByDate({
      workspaceId: input.workspaceId,
      planDate
    });

    if (existing !== null) {
      return existing;
    }

    return repository.createPlan({
      id: this.idFactory("daily_plan"),
      workspaceId: input.workspaceId,
      planDate,
      timestamp
    });
  }

  private requirePlannableTask(
    workspaceId: string,
    itemId: string
  ): TaskWithItemRecord {
    const task = this.requireWorkspaceTask(workspaceId, itemId);

    if (task.item.archivedAt !== null || task.item.deletedAt !== null) {
      throw new Error("Only active tasks can be planned.");
    }

    if (
      task.item.completedAt !== null ||
      task.task.completedAt !== null ||
      task.task.taskStatus === "done" ||
      task.task.taskStatus === "cancelled"
    ) {
      throw new Error("Only open or waiting tasks can be planned.");
    }

    return task;
  }

  private requireWorkspaceTask(workspaceId: string, itemId: string) {
    const task = new TaskRepository(this.connection).getByItemId(itemId);

    if (task === null || task.item.workspaceId !== workspaceId) {
      throw new Error(`Task was not found: ${itemId}.`);
    }

    return task;
  }

  private logPlanningEvent(input: {
    workspaceId: string;
    actorType?: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    targetId: string;
    summary: string;
    before: unknown;
    after: unknown;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: input.action,
      targetType: "item",
      targetId: input.targetId,
      summary: input.summary,
      beforeJson:
        input.before === null || input.before === undefined
          ? null
          : JSON.stringify(input.before),
      afterJson:
        input.after === null || input.after === undefined
          ? null
          : JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }

  private validateDateInput(input: DailyPlanDateInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
  }

  private validatePlanTaskInput(input: PlanTaskInput): void {
    this.validateDateInput(input);
    validateNonEmptyString(input.itemId, "itemId");
    validateLane(input.lane);
    validateSortOrder(input.sortOrder);
  }

  private validateUnplanTaskInput(input: UnplanTaskInput): void {
    this.validateDateInput(input);
    validateNonEmptyString(input.itemId, "itemId");

    if (input.lane !== undefined) {
      validateLane(input.lane);
    }
  }

  private validateReorderInput(input: ReorderPlannedTaskInput): void {
    this.validateDateInput(input);
    validateNonEmptyString(input.itemId, "itemId");
    validateLane(input.lane);
    validateSortOrder(input.sortOrder);
  }
}

export function normalizePlanDate(date: LocalDateInput): string {
  return createLocalDayRange(date).localDate;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function validateLane(value: string): asserts value is DailyPlanLane {
  if (value !== "today" && value !== "tomorrow" && value !== "backlog") {
    throw new Error("lane must be today, tomorrow, or backlog.");
  }
}

function validateSortOrder(value: number | undefined): void {
  if (value === undefined) {
    return;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error("sortOrder must be a non-negative integer.");
  }
}
