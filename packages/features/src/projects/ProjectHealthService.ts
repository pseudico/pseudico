import {
  createIsoTimestamp,
  createLocalDayRange,
  type Clock
} from "@local-work-os/core";
import {
  ContainerRepository,
  ItemRepository,
  TaskRepository,
  type ContainerRecord,
  type DatabaseConnection,
  type TaskWithItemRecord
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
  nextDueTask: ProjectHealthTaskSummary | null;
  recentActivity: ActivityEventView[];
};

export type ProjectHealthQueryInput = {
  recentActivityLimit?: number;
};

export type ListProjectHealthSummariesInput = ProjectHealthQueryInput & {
  workspaceId: string;
  limit?: number;
};

const DEFAULT_PROJECT_HEALTH_LIMIT = 10;
const DEFAULT_RECENT_ACTIVITY_LIMIT = 3;
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
    const todayStart = createLocalDayRange(this.now()).startInclusive;
    const activeTasks = tasks.filter(isActiveTask);
    const completedTasks = tasks.filter(isCompletedTask);
    const overdueTasks = activeTasks.filter(
      (task) => task.task.dueAt !== null && task.task.dueAt < todayStart
    );
    const nextDueTask = activeTasks
      .filter((task) => task.task.dueAt !== null && task.task.dueAt >= todayStart)
      .sort(compareTasksByDueDate)[0];

    return {
      projectId: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      status: project.status,
      color: project.color,
      generatedAt: createIsoTimestamp(this.now()),
      openTaskCount: activeTasks.length,
      completedTaskCount: completedTasks.length,
      overdueTaskCount: overdueTasks.length,
      totalTaskCount: tasks.length,
      nextDueTask:
        nextDueTask === undefined ? null : toProjectHealthTaskSummary(nextDueTask),
      recentActivity: this.listRecentProjectActivity({
        project,
        limit: normalizeLimit(
          input.recentActivityLimit,
          DEFAULT_RECENT_ACTIVITY_LIMIT
        )
      })
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
  const overdueDelta = right.overdueTaskCount - left.overdueTaskCount;

  if (overdueDelta !== 0) {
    return overdueDelta;
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
