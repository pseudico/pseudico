import { createIsoTimestamp, type ListItemStatus, type TaskStatus } from "@local-work-os/core";
import {
  CategoryRepository,
  ContainerRepository,
  ListRepository,
  TaskRepository,
  type CategoryRecord,
  type ContainerRecord,
  type DatabaseConnection,
  type ListItemWithListRecord,
  type TaskWithItemRecord
} from "@local-work-os/db";
import type { FeatureModuleContract } from "../featureModuleContract";
import { createTaskDateRange } from "../tasks/TaskQueries";

export type TimelineGroupBy = "project" | "category";

export type TimelineRangeInput = {
  start: string | Date;
  end: string | Date;
};

export type TimelineDateRange = {
  startInclusive: string;
  endExclusive: string;
};

export type TimelineItemsInput = TimelineRangeInput & {
  workspaceId: string;
  includeCompleted?: boolean;
};

export type GroupTimelineItemsInput = TimelineItemsInput & {
  groupBy?: TimelineGroupBy;
};

export type TimelineEntryKind = "task" | "list_item";

export type TimelineTaskNavigationTarget = {
  targetType: "item" | "list_item";
  targetId: string;
  containerId: string;
  workspaceId: string;
  sourceItemId: string | null;
};

export type TimelineItem = {
  kind: TimelineEntryKind;
  itemId: string;
  workspaceId: string;
  title: string;
  body: string | null;
  containerId: string;
  containerName: string;
  containerType: string;
  containerColor: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  taskStatus: TaskStatus | ListItemStatus;
  itemStatus: string;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  timelineStartAt: string;
  timelineEndAt: string;
  allDay: boolean;
  completedAt: string | null;
  updatedAt: string;
  navigationTarget: TimelineTaskNavigationTarget;
};

export type TimelineGroup = {
  key: string;
  label: string;
  groupBy: TimelineGroupBy;
  color: string | null;
  itemCount: number;
  completedCount: number;
  items: TimelineItem[];
};

export type TimelineViewModel = {
  workspaceId: string;
  generatedAt: string;
  range: TimelineDateRange;
  includeCompleted: boolean;
  groupBy: TimelineGroupBy;
  totalCount: number;
  groups: TimelineGroup[];
};

// Owns timeline projection application contracts.
// Does not own task persistence internals or calendar rendering.
export class TimelineService {
  readonly module = "timeline";

  private readonly connection: DatabaseConnection;
  private readonly now: () => Date;

  constructor(input: { connection: DatabaseConnection; now?: () => Date }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
  }

  setTimelineRange(range: TimelineRangeInput): TimelineDateRange {
    return createTaskDateRange(range);
  }

  getTimelineItems(input: TimelineItemsInput): TimelineItem[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const range = this.setTimelineRange(input);
    const tasks = new TaskRepository(this.connection).listTimelineBetween({
      workspaceId: input.workspaceId,
      range,
      includeCompleted: input.includeCompleted === true
    });
    const listItems = new ListRepository(this.connection).listDatedItemsBetween({
      workspaceId: input.workspaceId,
      range,
      includeCompleted: input.includeCompleted === true
    });

    return [
      ...this.hydrateTaskTimelineItems(input.workspaceId, tasks),
      ...this.hydrateListItemTimelineItems(input.workspaceId, listItems)
    ].sort(compareTimelineItems);
  }

  groupTimelineItems(input: GroupTimelineItemsInput): TimelineViewModel {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const groupBy = input.groupBy ?? "project";
    const range = this.setTimelineRange(input);
    const items = this.getTimelineItems(input);
    const groups = groupItems(items, groupBy);

    return {
      workspaceId: input.workspaceId,
      generatedAt: createIsoTimestamp(this.now()),
      range,
      includeCompleted: input.includeCompleted === true,
      groupBy,
      totalCount: items.length,
      groups
    };
  }

  private hydrateTaskTimelineItems(
    workspaceId: string,
    tasks: TaskWithItemRecord[]
  ): TimelineItem[] {
    const context = createHydrationContext(this.connection, workspaceId);

    return tasks.map((record) => {
      const container = context.getContainer(record.item.containerId);
      const category = context.getCategory(record.item.categoryId ?? container.categoryId);
      const timelineStartAt = record.task.startAt ?? record.task.dueAt;
      const timelineEndAt = record.task.dueAt ?? record.task.startAt;

      if (timelineStartAt === null || timelineEndAt === null) {
        throw new Error(`Timeline task is missing all task dates: ${record.item.id}.`);
      }

      return {
        kind: "task",
        itemId: record.item.id,
        workspaceId: record.item.workspaceId,
        title: record.item.title,
        body: record.item.body,
        containerId: container.id,
        containerName: container.name,
        containerType: container.type,
        containerColor: container.color,
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? null,
        categoryColor: category?.color ?? null,
        taskStatus: record.task.taskStatus,
        itemStatus: record.item.status,
        priority: record.task.priority,
        startAt: record.task.startAt,
        dueAt: record.task.dueAt,
        timelineStartAt,
        timelineEndAt,
        allDay: record.task.allDay,
        completedAt: record.task.completedAt ?? record.item.completedAt,
        updatedAt: record.item.updatedAt,
        navigationTarget: {
          targetType: "item",
          targetId: record.item.id,
          containerId: container.id,
          workspaceId: record.item.workspaceId,
          sourceItemId: null
        }
      };
    });
  }

  private hydrateListItemTimelineItems(
    workspaceId: string,
    records: ListItemWithListRecord[]
  ): TimelineItem[] {
    const context = createHydrationContext(this.connection, workspaceId);

    return records.map((record) => {
      const container = context.getContainer(record.list.item.containerId);
      const category = context.getCategory(record.list.item.categoryId ?? container.categoryId);
      const timelineStartAt = record.listItem.startAt ?? record.listItem.dueAt;
      const timelineEndAt = record.listItem.dueAt ?? record.listItem.startAt;

      if (timelineStartAt === null || timelineEndAt === null) {
        throw new Error(`Timeline list item is missing all dates: ${record.listItem.id}.`);
      }

      return {
        kind: "list_item",
        itemId: record.listItem.id,
        workspaceId: record.listItem.workspaceId,
        title: record.listItem.title,
        body: record.listItem.body,
        containerId: container.id,
        containerName: container.name,
        containerType: container.type,
        containerColor: container.color,
        categoryId: category?.id ?? null,
        categoryName: category?.name ?? null,
        categoryColor: category?.color ?? null,
        taskStatus: record.listItem.status,
        itemStatus: record.list.item.status,
        priority: null,
        startAt: record.listItem.startAt,
        dueAt: record.listItem.dueAt,
        timelineStartAt,
        timelineEndAt,
        allDay: true,
        completedAt: record.listItem.completedAt,
        updatedAt: record.listItem.updatedAt,
        navigationTarget: {
          targetType: "list_item",
          targetId: record.listItem.id,
          containerId: container.id,
          workspaceId: record.listItem.workspaceId,
          sourceItemId: record.list.item.id
        }
      };
    });
  }
}

export const timelineModuleContract = {
  module: "timeline",
  purpose: "Project dated work and project ranges into timeline-oriented views.",
  owns: ["timeline projections", "date-range grouping contracts", "rescheduling coordination contracts"],
  doesNotOwn: ["task date persistence", "calendar rendering", "reminder scheduling"],
  integrationPoints: ["tasks", "projects", "contacts", "metadata", "saved views", "calendar", "dashboard"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function groupItems(
  items: TimelineItem[],
  groupBy: TimelineGroupBy
): TimelineGroup[] {
  const groups = new Map<string, TimelineGroup>();

  for (const item of items) {
    const key =
      groupBy === "project"
        ? item.containerId
        : item.categoryId ?? "uncategorized";
    const existing = groups.get(key);

    if (existing === undefined) {
      groups.set(key, {
        key,
        label:
          groupBy === "project"
            ? item.containerName
            : item.categoryName ?? "Uncategorized",
        groupBy,
        color: groupBy === "project" ? item.containerColor : item.categoryColor,
        itemCount: 1,
        completedCount: isCompleted(item) ? 1 : 0,
        items: [item]
      });
      continue;
    }

    existing.items.push(item);
    existing.itemCount += 1;
    existing.completedCount += isCompleted(item) ? 1 : 0;
  }

  return [...groups.values()].sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base" })
  );
}

function isCompleted(item: TimelineItem): boolean {
  return item.taskStatus === "done" || item.completedAt !== null;
}

function createHydrationContext(connection: DatabaseConnection, workspaceId: string): {
  getCategory: (categoryId: string | null) => CategoryRecord | null;
  getContainer: (containerId: string) => ContainerRecord;
} {
  const containerRepository = new ContainerRepository(connection);
  const categoryRepository = new CategoryRepository(connection);
  const containers = new Map<string, ContainerRecord>();
  const categories = new Map<string, CategoryRecord | null>();

  return {
    getContainer(containerId) {
      const cached = containers.get(containerId);

      if (cached !== undefined) {
        return cached;
      }

      const container = containerRepository.getById(containerId);

      if (container === null || container.workspaceId !== workspaceId) {
        throw new Error(`Timeline source container was not found: ${containerId}.`);
      }

      containers.set(containerId, container);
      return container;
    },
    getCategory(categoryId) {
      if (categoryId === null) {
        return null;
      }

      if (categories.has(categoryId)) {
        return categories.get(categoryId) ?? null;
      }

      const category = categoryRepository.getById(categoryId);
      categories.set(categoryId, category);

      return category;
    }
  };
}

function compareTimelineItems(left: TimelineItem, right: TimelineItem): number {
  const leftDate = left.timelineStartAt;
  const rightDate = right.timelineStartAt;
  const dateDelta = leftDate.localeCompare(rightDate);

  if (dateDelta !== 0) {
    return dateDelta;
  }

  return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
