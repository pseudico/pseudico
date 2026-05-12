import {
  ActivityAction,
  createIsoTimestamp,
  createLocalDayRange,
  createRelativeLocalDayRange,
  type Clock,
  type LocalDateInput,
  type TaskDateRange
} from "@local-work-os/core";
import {
  ActivityLogRepository,
  CategoryRepository,
  ContainerRepository,
  DailyPlanRepository,
  ListRepository,
  TaskRepository,
  type CategoryRecord,
  type ContainerRecord,
  type DatabaseConnection
} from "@local-work-os/db";

export type PlanningSummaryInput = {
  workspaceId: string;
  date?: LocalDateInput;
};

export type PlanningSummaryMetric = {
  plannedCount: number;
  completedCount: number;
  snoozedCount: number;
  overdueCount: number;
};

export type PlanningSummaryGroup = PlanningSummaryMetric & {
  id: string | null;
  label: string;
};

export type PlanningSummaryView = {
  workspaceId: string;
  generatedAt: string;
  daily: PlanningSummaryMetric & {
    localDate: string;
    plannedByLane: {
      today: number;
      tomorrow: number;
      backlog: number;
    };
  };
  weekly: {
    startDate: string;
    endDate: string;
    byProject: PlanningSummaryGroup[];
    byCategory: PlanningSummaryGroup[];
  };
};

export class PlanningSummaryService {
  readonly module = "today";

  private readonly connection: DatabaseConnection;
  private readonly now: Clock;

  constructor(input: { connection: DatabaseConnection; now?: Clock }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
  }

  getSummary(input: PlanningSummaryInput): PlanningSummaryView {
    validateWorkspaceId(input.workspaceId);

    const date = input.date ?? this.now();
    const day = createLocalDayRange(date);
    const week = createLocalWeekRange(date);
    const generatedAt = createIsoTimestamp(this.now());
    const dailyPlanRepository = new DailyPlanRepository(this.connection);
    const plan = dailyPlanRepository.findPlanByDate({
      workspaceId: input.workspaceId,
      planDate: day.localDate
    });
    const plannedItems = plan === null
      ? []
      : dailyPlanRepository.listPlanItems({ dailyPlanId: plan.id });
    const completedEvents = this.listActivity(input.workspaceId, day, [
      ActivityAction.taskCompleted,
      ActivityAction.listItemCompleted,
      ActivityAction.bulkTasksCompleted,
      ActivityAction.bulkListItemsCompleted
    ]);
    const snoozedEvents = this.listActivity(input.workspaceId, day, [
      ActivityAction.taskSnoozed,
      ActivityAction.reminderSnoozed
    ]);
    const overdueCount = this.countOverdueBefore(input.workspaceId, day.startInclusive);
    const weeklyGroups = this.buildWeeklyGroups(input.workspaceId, week, day.startInclusive);

    return {
      workspaceId: input.workspaceId,
      generatedAt,
      daily: {
        localDate: day.localDate,
        plannedCount: plannedItems.length,
        completedCount: completedEvents.length,
        snoozedCount: snoozedEvents.length,
        overdueCount,
        plannedByLane: {
          today: plannedItems.filter((item) => item.lane === "today").length,
          tomorrow: plannedItems.filter((item) => item.lane === "tomorrow").length,
          backlog: plannedItems.filter((item) => item.lane === "backlog").length
        }
      },
      weekly: {
        startDate: week.startDate,
        endDate: week.endDate,
        byProject: weeklyGroups.byProject,
        byCategory: weeklyGroups.byCategory
      }
    };
  }

  buildMarkdown(input: PlanningSummaryInput): string {
    const summary = this.getSummary(input);
    const lines = [
      `# Planning summary for ${summary.daily.localDate}`,
      "",
      `Generated: ${summary.generatedAt}`,
      "",
      "## Daily review",
      "",
      `- Planned: ${summary.daily.plannedCount}`,
      `  - Today: ${summary.daily.plannedByLane.today}`,
      `  - Tomorrow: ${summary.daily.plannedByLane.tomorrow}`,
      `  - Backlog: ${summary.daily.plannedByLane.backlog}`,
      `- Completed: ${summary.daily.completedCount}`,
      `- Snoozed: ${summary.daily.snoozedCount}`,
      `- Overdue at day start: ${summary.daily.overdueCount}`,
      "",
      `## Weekly review (${summary.weekly.startDate} to ${summary.weekly.endDate})`,
      "",
      "### By project",
      "",
      ...formatGroups(summary.weekly.byProject),
      "",
      "### By category",
      "",
      ...formatGroups(summary.weekly.byCategory),
      ""
    ];

    return lines.join("\n");
  }

  private listActivity(
    workspaceId: string,
    range: TaskDateRange,
    actions: string[]
  ) {
    return new ActivityLogRepository(this.connection).listByActionsBetween({
      workspaceId,
      actions,
      startInclusive: range.startInclusive,
      endExclusive: range.endExclusive
    });
  }

  private countOverdueBefore(workspaceId: string, before: string): number {
    const range = {
      startInclusive: "1970-01-01T00:00:00.000Z",
      endExclusive: before
    };
    const tasks = new TaskRepository(this.connection).listTimelineBetween({
      workspaceId,
      range
    }).filter((record) => record.task.dueAt !== null && record.task.dueAt < before);
    const listItems = new ListRepository(this.connection).listDatedItemsBetween({
      workspaceId,
      range
    }).filter((record) => record.listItem.dueAt !== null && record.listItem.dueAt < before);

    return tasks.length + listItems.length;
  }

  private buildWeeklyGroups(
    workspaceId: string,
    range: TaskDateRange & { startDate: string; endDate: string },
    overdueBefore: string
  ): { byProject: PlanningSummaryGroup[]; byCategory: PlanningSummaryGroup[] } {
    const containers = new Map(
      new ContainerRepository(this.connection)
        .listByWorkspace(workspaceId, { includeArchived: true })
        .map((container) => [container.id, container])
    );
    const categories = new Map(
      new CategoryRepository(this.connection)
        .listByWorkspace(workspaceId, { includeDeleted: true })
        .map((category) => [category.id, category])
    );
    const byProject = new Map<string, PlanningSummaryGroup>();
    const byCategory = new Map<string, PlanningSummaryGroup>();
    const dailyPlanRepository = new DailyPlanRepository(this.connection);
    const plannedIds = new Set<string>();

    for (let offset = 0; offset < 7; offset += 1) {
      const planDate = createRelativeLocalDayRange(range.startDate, offset).localDate;
      const plan = dailyPlanRepository.findPlanByDate({ workspaceId, planDate });

      if (plan === null) {
        continue;
      }

      for (const planned of dailyPlanRepository.listPlannedTasks({ workspaceId, dailyPlanId: plan.id })) {
        plannedIds.add(planned.task.item.id);
        incrementGroup(byProject, projectGroup(planned.task.item.containerId, containers), "plannedCount");
        incrementGroup(byCategory, categoryGroup(planned.task.item.categoryId, categories), "plannedCount");
      }
    }

    for (const record of new TaskRepository(this.connection).listTimelineBetween({
      workspaceId,
      range,
      includeCompleted: true
    })) {
      const completed = record.task.taskStatus === "done" || record.task.completedAt !== null || record.item.completedAt !== null;
      const overdue = !completed && record.task.dueAt !== null && record.task.dueAt < overdueBefore;
      const project = projectGroup(record.item.containerId, containers);
      const category = categoryGroup(record.item.categoryId, categories);

      if (!plannedIds.has(record.item.id)) {
        incrementGroup(byProject, project, "plannedCount");
        incrementGroup(byCategory, category, "plannedCount");
      }
      if (completed) {
        incrementGroup(byProject, project, "completedCount");
        incrementGroup(byCategory, category, "completedCount");
      }
      if (overdue) {
        incrementGroup(byProject, project, "overdueCount");
        incrementGroup(byCategory, category, "overdueCount");
      }
    }

    for (const record of new ListRepository(this.connection).listDatedItemsBetween({
      workspaceId,
      range,
      includeCompleted: true
    })) {
      const completed = record.listItem.status === "done" || record.listItem.completedAt !== null;
      const overdue = !completed && record.listItem.dueAt !== null && record.listItem.dueAt < overdueBefore;
      const project = projectGroup(record.list.item.containerId, containers);
      const category = categoryGroup(record.list.item.categoryId, categories);

      incrementGroup(byProject, project, "plannedCount");
      incrementGroup(byCategory, category, "plannedCount");
      if (completed) {
        incrementGroup(byProject, project, "completedCount");
        incrementGroup(byCategory, category, "completedCount");
      }
      if (overdue) {
        incrementGroup(byProject, project, "overdueCount");
        incrementGroup(byCategory, category, "overdueCount");
      }
    }

    const weeklySnoozedCount = this.listActivity(workspaceId, range, [
      ActivityAction.taskSnoozed,
      ActivityAction.reminderSnoozed
    ]).length;

    for (let index = 0; index < weeklySnoozedCount; index += 1) {
      const group = { id: null, label: "Snoozed locally" };
      incrementGroup(byProject, group, "snoozedCount");
      incrementGroup(byCategory, group, "snoozedCount");
    }

    return {
      byProject: sortGroups([...byProject.values()]),
      byCategory: sortGroups([...byCategory.values()])
    };
  }
}

function createLocalWeekRange(input: LocalDateInput): TaskDateRange & { startDate: string; endDate: string } {
  const current = createLocalDayRange(input);
  const date = new Date(current.startInclusive);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = createRelativeLocalDayRange(date, mondayOffset);
  const endExclusive = createRelativeLocalDayRange(start.localDate, 7);
  const endInclusive = createRelativeLocalDayRange(start.localDate, 6);

  return {
    startDate: start.localDate,
    endDate: endInclusive.localDate,
    startInclusive: start.startInclusive,
    endExclusive: endExclusive.startInclusive
  };
}

function projectGroup(
  containerId: string,
  containers: Map<string, ContainerRecord>
): Pick<PlanningSummaryGroup, "id" | "label"> {
  const container = containers.get(containerId);
  return {
    id: containerId,
    label: container?.name ?? "Unknown project"
  };
}

function categoryGroup(
  categoryId: string | null,
  categories: Map<string, CategoryRecord>
): Pick<PlanningSummaryGroup, "id" | "label"> {
  if (categoryId === null) {
    return { id: null, label: "Uncategorized" };
  }

  return {
    id: categoryId,
    label: categories.get(categoryId)?.name ?? "Unknown category"
  };
}

function incrementGroup(
  groups: Map<string, PlanningSummaryGroup>,
  group: Pick<PlanningSummaryGroup, "id" | "label">,
  metric: keyof PlanningSummaryMetric
): void {
  const key = group.id ?? `__${group.label}`;
  const existing = groups.get(key) ?? {
    id: group.id,
    label: group.label,
    plannedCount: 0,
    completedCount: 0,
    snoozedCount: 0,
    overdueCount: 0
  };
  existing[metric] += 1;
  groups.set(key, existing);
}

function sortGroups(groups: PlanningSummaryGroup[]): PlanningSummaryGroup[] {
  return groups.sort(
    (left, right) =>
      right.plannedCount - left.plannedCount ||
      right.completedCount - left.completedCount ||
      left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
  );
}

function formatGroups(groups: PlanningSummaryGroup[]): string[] {
  if (groups.length === 0) {
    return ["- No local planning activity in this week."];
  }

  return groups.map(
    (group) =>
      `- ${escapeMarkdown(group.label)}: planned ${group.plannedCount}, completed ${group.completedCount}, snoozed ${group.snoozedCount}, overdue ${group.overdueCount}`
  );
}

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_{}[\]()#+.!-])/g, "\\$1");
}

function validateWorkspaceId(workspaceId: string): void {
  if (workspaceId.trim().length === 0) {
    throw new Error("workspaceId must be a non-empty string.");
  }
}
