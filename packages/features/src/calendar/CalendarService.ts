import { createIsoTimestamp, type ListItemStatus, type TaskStatus } from "@local-work-os/core";
import {
  CalendarFeedRepository,
  CategoryRepository,
  ContainerRepository,
  ListRepository,
  TaskRepository,
  type CalendarEventRecord,
  type CategoryRecord,
  type ContainerRecord,
  type DatabaseConnection,
  type ListItemWithListRecord,
  type TaskWithItemRecord
} from "@local-work-os/db";
import type { FeatureModuleContract } from "../featureModuleContract";
import { ListService } from "../lists/ListService";
import { TaskService } from "../tasks/TaskService";
import { createTaskDateRange } from "../tasks/TaskQueries";

export type CalendarEntryKind = "task" | "list_item" | "calendar_event";

export type CalendarMonthInput = {
  workspaceId: string;
  month: string | Date;
  includeCompleted?: boolean;
};

export type CalendarWeekInput = {
  workspaceId: string;
  weekOf: string | Date;
  includeCompleted?: boolean;
};

export type CalendarDayInput = {
  workspaceId: string;
  date: string | Date;
  includeCompleted?: boolean;
};

export type CalendarMonthRange = {
  month: string;
  startInclusive: string;
  endExclusive: string;
};

export type CalendarRange = CalendarMonthRange & {
  label?: string;
};

export type CalendarNavigationTarget =
  | {
      targetType: "item" | "list_item";
      targetId: string;
      containerId: string;
      workspaceId: string;
      sourceItemId: string | null;
    }
  | {
      targetType: "calendar_event";
      targetId: string;
      workspaceId: string;
      sourceId: string;
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
  status: TaskStatus | ListItemStatus | "read_only";
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
  range: CalendarRange;
  includeCompleted: boolean;
  totalCount: number;
  days: CalendarDay[];
};

export type CalendarRescheduleItemInput = {
  workspaceId: string;
  itemId: string;
  kind: CalendarEntryKind;
  dueAt: string | null;
  startAt?: string | null;
  allDay?: boolean;
};

export type CalendarRescheduleItemResult = {
  itemId: string;
  kind: CalendarEntryKind;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
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
      ...this.hydrateListItems(input.workspaceId, listItems),
      ...this.hydrateCalendarEvents(input.workspaceId, range)
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

  getCalendarWeek(input: CalendarWeekInput): CalendarMonthViewModel {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const range = createCalendarWeekRange(input.weekOf);
    const items = this.listCalendarItems({
      workspaceId: input.workspaceId,
      range,
      includeCompleted: input.includeCompleted === true
    });

    return {
      workspaceId: input.workspaceId,
      generatedAt: createIsoTimestamp(this.now()),
      range,
      includeCompleted: input.includeCompleted === true,
      totalCount: items.length,
      days: buildCalendarDaysForRange({
        range,
        now: this.now(),
        items
      })
    };
  }

  getCalendarDay(input: CalendarDayInput): CalendarMonthViewModel {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const range = createCalendarDayRange(input.date);
    const items = this.listCalendarItems({
      workspaceId: input.workspaceId,
      range,
      includeCompleted: input.includeCompleted === true
    });

    return {
      workspaceId: input.workspaceId,
      generatedAt: createIsoTimestamp(this.now()),
      range,
      includeCompleted: input.includeCompleted === true,
      totalCount: items.length,
      days: buildCalendarDaysForRange({
        range,
        now: this.now(),
        items
      })
    };
  }

  async rescheduleCalendarItem(
    input: CalendarRescheduleItemInput
  ): Promise<CalendarRescheduleItemResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.itemId, "itemId");

    if (input.kind === "calendar_event") {
      throw new Error("Imported calendar feed events are read-only.");
    }

    if (input.kind === "task") {
      const result = await new TaskService({
        connection: this.connection,
        now: this.now
      }).rescheduleTask({
        itemId: input.itemId,
        dueAt: input.dueAt,
        ...(input.startAt === undefined ? {} : { startAt: input.startAt }),
        ...(input.allDay === undefined ? {} : { allDay: input.allDay })
      });

      if (result.item.workspaceId !== input.workspaceId) {
        throw new Error("Calendar item workspace mismatch.");
      }

      return {
        itemId: result.item.id,
        kind: "task",
        startAt: result.task.startAt,
        dueAt: result.task.dueAt,
        allDay: result.task.allDay
      };
    }

    const result = await new ListService({
      connection: this.connection,
      now: this.now
    }).updateListItem({
      listItemId: input.itemId,
      dueAt: input.dueAt,
      ...(input.startAt === undefined ? {} : { startAt: input.startAt })
    });

    if (result.listItem.workspaceId !== input.workspaceId) {
      throw new Error("Calendar item workspace mismatch.");
    }

    return {
      itemId: result.listItem.id,
      kind: "list_item",
      startAt: result.listItem.startAt,
      dueAt: result.listItem.dueAt,
      allDay: true
    };
  }

  private listCalendarItems(input: {
    workspaceId: string;
    range: CalendarRange | CalendarMonthRange;
    includeCompleted: boolean;
  }): CalendarItem[] {
    const tasks = new TaskRepository(this.connection).listTimelineBetween({
      workspaceId: input.workspaceId,
      range: input.range,
      includeCompleted: input.includeCompleted
    });
    const listItems = new ListRepository(this.connection).listDatedItemsBetween({
      workspaceId: input.workspaceId,
      range: input.range,
      includeCompleted: input.includeCompleted
    });

    return [
      ...this.hydrateTaskItems(input.workspaceId, tasks),
      ...this.hydrateListItems(input.workspaceId, listItems),
      ...this.hydrateCalendarEvents(input.workspaceId, input.range)
    ].sort(compareCalendarItems);
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

  private hydrateCalendarEvents(
    workspaceId: string,
    range: CalendarRange | CalendarMonthRange
  ): CalendarItem[] {
    const repository = new CalendarFeedRepository(this.connection);
    const sourceNames = new Map(
      repository.listSources(workspaceId).map((source) => [source.id, source.name])
    );
    const events = repository.listEventsBetween({
      workspaceId,
      startInclusive: range.startInclusive,
      endExclusive: range.endExclusive
    });

    return events.map((event) =>
      toCalendarEventItem(event, sourceNames.get(event.sourceId) ?? "Imported calendar")
    );
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

export function createCalendarWeekRange(weekOf: string | Date): CalendarRange {
  const date = parseDateInput(weekOf, "weekOf");
  const start = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return {
    month: toUtcDayKey(start).slice(0, 7),
    label: `${toUtcDayKey(start)} week`,
    ...createTaskDateRange({ start, end })
  };
}

export function createCalendarDayRange(day: string | Date): CalendarRange {
  const date = parseDateInput(day, "date");
  const start = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return {
    month: toUtcDayKey(start).slice(0, 7),
    label: toUtcDayKey(start),
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

function toCalendarEventItem(
  event: CalendarEventRecord,
  sourceName: string
): CalendarItem {
  return {
    id: event.id,
    kind: "calendar_event",
    workspaceId: event.workspaceId,
    title: event.title,
    body: event.description,
    containerId: event.sourceId,
    containerName: sourceName,
    containerType: "calendar_source",
    containerColor: null,
    categoryId: null,
    categoryName: "Calendar feed",
    categoryColor: null,
    status: "read_only",
    itemStatus: "read_only",
    priority: null,
    startAt: event.startAt,
    dueAt: event.endAt,
    allDay: event.allDay,
    completedAt: null,
    updatedAt: event.updatedAt,
    navigationTarget: {
      targetType: "calendar_event",
      targetId: event.id,
      workspaceId: event.workspaceId,
      sourceId: event.sourceId
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

function buildCalendarDaysForRange(input: {
  range: CalendarRange | CalendarMonthRange;
  now: Date;
  items: CalendarItem[];
}): CalendarDay[] {
  const start = new Date(input.range.startInclusive);
  const end = new Date(input.range.endExclusive);
  const today = toUtcDayKey(input.now);
  const days: CalendarDay[] = [];
  const rangeMonth = input.range.month;

  for (const cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = toUtcDayKey(cursor);
    days.push({
      date,
      dayOfMonth: cursor.getUTCDate(),
      weekday: cursor.getUTCDay(),
      inCurrentMonth: date.startsWith(rangeMonth),
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
