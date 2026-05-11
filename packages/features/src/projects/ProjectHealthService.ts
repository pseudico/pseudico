import {
  createIsoTimestamp,
  createLocalDayRange,
  type Clock
} from "@local-work-os/core";
import {
  ContainerRepository,
  ItemRepository,
  TabSummaryRepository,
  TaskRepository,
  type ContainerRecord,
  type DatabaseConnection,
  type TaskWithItemRecord,
  type TabSummaryRecord
} from "@local-work-os/db";
import { ActivityService, type ActivityEventView } from "../activity";
import type { ProjectRecord } from "./ProjectCommands";

export type ProjectHealthTaskSummary = {
  itemId: string;
  title: string;
  dueAt: string | null;
  taskStatus: string;
  priority: number | null;
};

export type ProjectHealthSummary = {
  projectId: string;
  workspaceId: string;
  name: string;
  status: string;
  color: string | null;
  generatedAt: string;
  openTaskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  totalTaskCount: number;
  upcomingTaskCount: number;
  waitingTaskCount: number;
  completionRatio: number;
  staleAfterDays: number;
  lastActivityAt: string | null;
  isStale: boolean;
  hasRecentActivity: boolean;
  nextDueTask: ProjectHealthTaskSummary | null;
  nextTask: ProjectHealthTaskSummary | null;
  healthBadges: ProjectHealthBadge[];
  recentActivity: ActivityEventView[];
};

export type ProjectHealthBadge = {
  kind: "overdue" | "upcoming" | "waiting" | "stale" | "no_recent_activity" | "complete";
  label: string;
  tone: "risk" | "warning" | "info" | "success" | "neutral";
};

export type ProjectHealthQueryInput = {
  recentActivityLimit?: number;
  staleAfterDays?: number;
  upcomingDays?: number;
};

export type ListProjectHealthSummariesInput = ProjectHealthQueryInput & {
  workspaceId: string;
  limit?: number;
};

const DEFAULT_PROJECT_HEALTH_LIMIT = 10;
const DEFAULT_RECENT_ACTIVITY_LIMIT = 3;
const DEFAULT_STALE_AFTER_DAYS = 14;
const DEFAULT_UPCOMING_DAYS = 7;
const MAX_PROJECT_HEALTH_LIMIT = 100;
const MAX_RECENT_ACTIVITY_SCAN = 100;

export class ProjectHealthService {
  readonly module = "projects.health";

  private readonly connection: DatabaseConnection;
  private readonly now: Clock;

  constructor(input: { connection: DatabaseConnection; now?: Clock }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
  }

  getProjectHealth(
    projectId: string,
    input: ProjectHealthQueryInput = {}
  ): ProjectHealthSummary {
    validateNonEmptyString(projectId, "projectId");
    const project = this.requireProject(projectId);

    return this.buildSummary(project, input);
  }


  listProjectTabSummaries(
    projectId: string,
    input: { previewLimit?: number } = {}
  ): TabSummaryRecord[] {
    validateNonEmptyString(projectId, "projectId");
    this.requireProject(projectId);

    return new TabSummaryRepository(this.connection).listByContainer({
      containerId: projectId,
      todayStart: createLocalDayRange(this.now()).startInclusive,
      ...(input.previewLimit === undefined ? {} : { previewLimit: input.previewLimit })
    });
  }

  listProjectHealthSummaries(
    input: ListProjectHealthSummariesInput
  ): ProjectHealthSummary[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const limit = normalizeLimit(input.limit, DEFAULT_PROJECT_HEALTH_LIMIT);

    return new ContainerRepository(this.connection)
      .listByWorkspace(input.workspaceId, { type: "project" })
      .map((project) => this.buildSummary(asProjectRecord(project), input))
      .sort(compareProjectHealthSummaries)
      .slice(0, limit);
  }

  private buildSummary(
    project: ProjectRecord,
    input: ProjectHealthQueryInput
  ): ProjectHealthSummary {
    const tasks = new TaskRepository(this.connection).listByContainer(project.id);
    const generatedAt = createIsoTimestamp(this.now());
    const todayStart = createLocalDayRange(this.now()).startInclusive;
    const upcomingEnd = addDaysIso(todayStart, normalizeDays(input.upcomingDays, DEFAULT_UPCOMING_DAYS, "upcomingDays"));
    const staleAfterDays = normalizeDays(input.staleAfterDays, DEFAULT_STALE_AFTER_DAYS, "staleAfterDays");
    const activeTasks = tasks.filter(isActiveTask);
    const completedTasks = tasks.filter(isCompletedTask);
    const overdueTasks = activeTasks.filter(
      (task) => task.task.dueAt !== null && task.task.dueAt < todayStart
    );
    const upcomingTasks = activeTasks.filter(
      (task) =>
        task.task.dueAt !== null &&
        task.task.dueAt >= todayStart &&
        task.task.dueAt < upcomingEnd
    );
    const waitingTasks = activeTasks.filter((task) => task.task.taskStatus === "waiting");
    const nextDueTask = activeTasks
      .filter((task) => task.task.dueAt !== null && task.task.dueAt >= todayStart)
      .sort(compareTasksByDueDate)[0];
    const nextTask = [...activeTasks].sort(compareTasksByAttention)[0];
    const recentActivity = this.listRecentProjectActivity({
      project,
      limit: normalizeLimit(
        input.recentActivityLimit,
        DEFAULT_RECENT_ACTIVITY_LIMIT
      )
    });
    const lastActivityAt = recentActivity[0]?.createdAt ?? null;
    const staleReference = lastActivityAt ?? project.updatedAt;
    const isStale = isOlderThanDays(staleReference, generatedAt, staleAfterDays);
    const hasRecentActivity =
      lastActivityAt !== null && !isOlderThanDays(lastActivityAt, generatedAt, staleAfterDays);
    const completionRatio = tasks.length === 0 ? 0 : completedTasks.length / tasks.length;

    return {
      projectId: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      status: project.status,
      color: project.color,
      generatedAt,
      openTaskCount: activeTasks.length,
      completedTaskCount: completedTasks.length,
      overdueTaskCount: overdueTasks.length,
      upcomingTaskCount: upcomingTasks.length,
      waitingTaskCount: waitingTasks.length,
      completionRatio,
      staleAfterDays,
      lastActivityAt,
      isStale,
      hasRecentActivity,
      totalTaskCount: tasks.length,
      nextDueTask:
        nextDueTask === undefined ? null : toProjectHealthTaskSummary(nextDueTask),
      nextTask: nextTask === undefined ? null : toProjectHealthTaskSummary(nextTask),
      healthBadges: buildHealthBadges({
        overdueTaskCount: overdueTasks.length,
        upcomingTaskCount: upcomingTasks.length,
        waitingTaskCount: waitingTasks.length,
        totalTaskCount: tasks.length,
        completionRatio,
        isStale,
        noActivity: lastActivityAt === null
      }),
      recentActivity
    };
  }

  private listRecentProjectActivity(input: {
    project: ProjectRecord;
    limit: number;
  }): ActivityEventView[] {
    const projectItemIds = new Set(
      new ItemRepository(this.connection)
        .listByContainer(input.project.id)
        .map((item) => item.id)
    );

    return new ActivityService({ connection: this.connection })
      .listRecentActivity(input.project.workspaceId, MAX_RECENT_ACTIVITY_SCAN)
      .filter(
        (event) =>
          (event.targetType === "container" &&
            event.targetId === input.project.id) ||
          (event.targetType === "item" && projectItemIds.has(event.targetId))
      )
      .slice(0, input.limit);
  }

  private requireProject(projectId: string): ProjectRecord {
    const project = new ContainerRepository(this.connection).getById(projectId);

    if (project === null || project.type !== "project") {
      throw new Error(`Project was not found: ${projectId}.`);
    }

    return asProjectRecord(project);
  }
}

function isActiveTask(task: TaskWithItemRecord): boolean {
  return (
    task.item.archivedAt === null &&
    task.item.deletedAt === null &&
    task.item.completedAt === null &&
    task.task.completedAt === null &&
    (task.task.taskStatus === "open" || task.task.taskStatus === "waiting")
  );
}

function isCompletedTask(task: TaskWithItemRecord): boolean {
  return (
    task.item.completedAt !== null ||
    task.task.completedAt !== null ||
    task.task.taskStatus === "done"
  );
}

function compareTasksByDueDate(
  left: TaskWithItemRecord,
  right: TaskWithItemRecord
): number {
  const dueDelta = (left.task.dueAt ?? "").localeCompare(right.task.dueAt ?? "");

  if (dueDelta !== 0) {
    return dueDelta;
  }

  return left.item.createdAt.localeCompare(right.item.createdAt);
}

function compareProjectHealthSummaries(
  left: ProjectHealthSummary,
  right: ProjectHealthSummary
): number {
  const staleDelta = Number(right.isStale) - Number(left.isStale);

  if (staleDelta !== 0) {
    return staleDelta;
  }

  const overdueDelta = right.overdueTaskCount - left.overdueTaskCount;

  if (overdueDelta !== 0) {
    return overdueDelta;
  }

  const waitingDelta = right.waitingTaskCount - left.waitingTaskCount;

  if (waitingDelta !== 0) {
    return waitingDelta;
  }

  if (left.nextDueTask !== null && right.nextDueTask !== null) {
    const dueDelta = left.nextDueTask.dueAt!.localeCompare(right.nextDueTask.dueAt!);

    if (dueDelta !== 0) {
      return dueDelta;
    }
  }

  if (left.nextDueTask !== null) {
    return -1;
  }

  if (right.nextDueTask !== null) {
    return 1;
  }

  return left.name.localeCompare(right.name);
}

function compareTasksByAttention(
  left: TaskWithItemRecord,
  right: TaskWithItemRecord
): number {
  const dueDelta = taskAttentionDueValue(left).localeCompare(taskAttentionDueValue(right));

  if (dueDelta !== 0) {
    return dueDelta;
  }

  const priorityDelta = (left.task.priority ?? 99) - (right.task.priority ?? 99);

  if (priorityDelta !== 0) {
    return priorityDelta;
  }

  return left.item.createdAt.localeCompare(right.item.createdAt);
}

function taskAttentionDueValue(task: TaskWithItemRecord): string {
  return task.task.dueAt ?? "9999-12-31T23:59:59.999Z";
}

function toProjectHealthTaskSummary(
  task: TaskWithItemRecord
): ProjectHealthTaskSummary {
  return {
    itemId: task.item.id,
    title: task.item.title,
    dueAt: task.task.dueAt,
    taskStatus: task.task.taskStatus,
    priority: task.task.priority
  };
}

function buildHealthBadges(input: {
  overdueTaskCount: number;
  upcomingTaskCount: number;
  waitingTaskCount: number;
  totalTaskCount: number;
  completionRatio: number;
  isStale: boolean;
  noActivity: boolean;
}): ProjectHealthBadge[] {
  const badges: ProjectHealthBadge[] = [];

  if (input.overdueTaskCount > 0) {
    badges.push({ kind: "overdue", label: `${input.overdueTaskCount} overdue`, tone: "risk" });
  }

  if (input.waitingTaskCount > 0) {
    badges.push({ kind: "waiting", label: `${input.waitingTaskCount} waiting`, tone: "warning" });
  }

  if (input.upcomingTaskCount > 0) {
    badges.push({ kind: "upcoming", label: `${input.upcomingTaskCount} upcoming`, tone: "info" });
  }

  if (input.isStale) {
    badges.push({ kind: "stale", label: "Stale", tone: "warning" });
  }

  if (input.noActivity) {
    badges.push({ kind: "no_recent_activity", label: "No recent activity", tone: "neutral" });
  }

  if (input.totalTaskCount > 0 && input.completionRatio === 1) {
    badges.push({ kind: "complete", label: "All tasks complete", tone: "success" });
  }

  return badges;
}

function isOlderThanDays(value: string, generatedAt: string, days: number): boolean {
  return Date.parse(generatedAt) - Date.parse(value) >= days * 24 * 60 * 60 * 1000;
}

function addDaysIso(value: string, days: number): string {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function normalizeDays(value: number | undefined, fallback: number, fieldName: string): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > 3660) {
    throw new Error(`${fieldName} must be an integer from 1 to 3660.`);
  }

  return value;
}

function normalizeLimit(value: number | undefined, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    throw new Error("limit must be a positive integer.");
  }

  return Math.min(value, MAX_PROJECT_HEALTH_LIMIT);
}

function asProjectRecord(project: ContainerRecord): ProjectRecord {
  if (project.type !== "project") {
    throw new Error(`Expected project container but received ${project.type}.`);
  }

  if (!["active", "waiting", "completed", "archived"].includes(project.status)) {
    throw new Error(`Unexpected project status: ${project.status}.`);
  }

  return project as ProjectRecord;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
