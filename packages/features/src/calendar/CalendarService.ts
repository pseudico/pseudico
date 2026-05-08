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

export type CalendarEntryKind = "task" | "list_item";

export type CalendarMonthInput = {
  workspaceId: string;
  month: string | Date;
  includeCompleted?: boolean;
};

export type CalendarMonthRange = {
  month: string;
  startInclusive: string;
  endExclusive: string;
};

export type CalendarNavigationTarget = {
  targetType: "item" | "list_item";
  targetId: string;
  containerId: string;
  workspaceId: string;
  sourceItemId: string | null;
};

export type CalendarItem = {
  id: string;
  kind: CalendarEntryKind;
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
  status: TaskStatus | ListItemStatus;
  itemStatus: string | null;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  completedAt: string | null;
  updatedAt: string;
  navigationTarget: CalendarNavigationTarget;
};

export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  weekday: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  items: CalendarItem[];
};

export type CalendarMonthViewModel = {
  workspaceId: string;
  generatedAt: string;
  range: CalendarMonthRange;
  includeCompleted: boolean;
  totalCount: number;
  days: CalendarDay[];
};

// Owns calendar projection application contracts.
// Does not own external live calendar sync or task lifecycle internals.
export class CalendarService {
  readonly module = "calendar";

  private readonly connection: DatabaseConnection;
  private readonly now: () => Date;

  constructor(input: { connection: DatabaseConnection; now?: () => Date }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
  }

  getCalendarMonth(input: CalendarMonthInput): CalendarMonthViewModel {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const range = createCalendarMonthRange(input.month);
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
    const items = [
      ...this.hydrateTaskItems(input.workspaceId, tasks),
      ...this.hydrateListItems(input.workspaceId, listItems)
    ].sort(compareCalendarItems);

    return {
      workspaceId: input.workspaceId,
      generatedAt: createIsoTimestamp(this.now()),
      range,
      includeCompleted: input.includeCompleted === true,
      totalCount: items.length,
      days: buildCalendarDays({
        month: range.month,
        now: this.now(),
        items
      })
    };
  }

  getCalendarDayItems(input: CalendarMonthInput & { date: string | Date }): CalendarItem[] {
    const month = this.getCalendarMonth(input);
    const date = toUtcDayKey(parseDateInput(input.date, "date"));

    return month.days.find((day) => day.date === date)?.items ?? [];
  }

  private hydrateTaskItems(
    workspaceId: string,
    tasks: TaskWithItemRecord[]
  ): CalendarItem[] {
    const context = createHydrationContext(this.connection, workspaceId);

    return tasks.map((record) => {
      const container = context.getContainer(record.item.containerId);
      const category = context.getCategory(record.item.categoryId ?? container.categoryId);

      return {
        id: record.item.id,
        kind: "task",
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
        status: record.task.taskStatus,
        itemStatus: record.item.status,
        priority: record.task.priority,
        startAt: record.task.startAt,
        dueAt: record.task.dueAt,
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

  private hydrateListItems(
    workspaceId: string,
    records: ListItemWithListRecord[]
  ): CalendarItem[] {
    const context = createHydrationContext(this.connection, workspaceId);

    return records.map((record) => {
      const container = context.getContainer(record.list.item.containerId);
      const category = context.getCategory(record.list.item.categoryId ?? container.categoryId);

      return {
        id: record.listItem.id,
        kind: "list_item",
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
        status: record.listItem.status,
        itemStatus: record.list.item.status,
        priority: null,
        startAt: record.listItem.startAt,
        dueAt: record.listItem.dueAt,
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

export const calendarModuleContract = {
  module: "calendar",
  purpose: "Project local dated work into month, week, and day calendar views.",
  owns: ["calendar projections", "date query contracts", "local calendar import coordination contracts"],
  doesNotOwn: ["external live calendar sync", "task lifecycle internals", "timeline rendering"],
  integrationPoints: ["tasks", "timeline", "metadata", "today", "dashboard"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

export function createCalendarMonthRange(month: string | Date): CalendarMonthRange {
  const parsed = parseMonthInput(month);
  const start = new Date(Date.UTC(parsed.year, parsed.monthIndex, 1));
  const end = new Date(Date.UTC(parsed.year, parsed.monthIndex + 1, 1));

  return {
    month: `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, "0")}`,
    ...createTaskDateRange({ start, end })
  };
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
        throw new Error(`Calendar source container was not found: ${containerId}.`);
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

function buildCalendarDays(input: {
  month: string;
  now: Date;
  items: CalendarItem[];
}): CalendarDay[] {
  const { year, month } = parseMonthParts(input.month);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const nextMonth = new Date(Date.UTC(year, month, 1));
  const today = toUtcDayKey(input.now);
  const days: CalendarDay[] = [];

  for (const cursor = new Date(firstDay); cursor < nextMonth; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = toUtcDayKey(cursor);
    days.push({
      date,
      dayOfMonth: cursor.getUTCDate(),
      weekday: cursor.getUTCDay(),
      inCurrentMonth: true,
      isToday: date === today,
      items: input.items.filter((item) => itemTouchesDay(item, date))
    });
  }

  return days;
}

function parseMonthParts(value: string): { year: number; month: number } {
  const [yearText, monthText] = value.split("-");

  if (yearText === undefined || monthText === undefined) {
    throw new Error("month must be a valid YYYY-MM value.");
  }

  return {
    year: Number(yearText),
    month: Number(monthText)
  };
}

function itemTouchesDay(item: CalendarItem, date: string): boolean {
  const start = item.startAt ?? item.dueAt;
  const end = item.dueAt ?? item.startAt;

  if (start === null || end === null) {
    return false;
  }

  return date >= toUtcDayKey(new Date(start)) && date <= toUtcDayKey(new Date(end));
}

function compareCalendarItems(left: CalendarItem, right: CalendarItem): number {
  const leftDate = left.startAt ?? left.dueAt ?? "";
  const rightDate = right.startAt ?? right.dueAt ?? "";
  const dateDelta = leftDate.localeCompare(rightDate);

  if (dateDelta !== 0) {
    return dateDelta;
  }

  return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
}

function parseMonthInput(value: string | Date): { year: number; monthIndex: number } {
  if (value instanceof Date) {
    return { year: value.getUTCFullYear(), monthIndex: value.getUTCMonth() };
  }

  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})$/.exec(trimmed);

  if (match === null) {
    const date = parseDateInput(value, "month");
    return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (month < 1 || month > 12) {
    throw new Error("month must be a valid YYYY-MM value.");
  }

  return { year, monthIndex: month - 1 };
}

function parseDateInput(value: string | Date, fieldName: string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value.trim());

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date or ISO timestamp.`);
  }

  return date;
}

function toUtcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
