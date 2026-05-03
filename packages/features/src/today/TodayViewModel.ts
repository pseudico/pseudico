import type { TaskDateRange, TaskStatus } from "@local-work-os/core";
import type { TaskWithItemRecord } from "@local-work-os/db";

export type TodayTaskView = {
  itemId: string;
  workspaceId: string;
  containerId: string;
  containerTabId: string | null;
  title: string;
  body: string | null;
  categoryId: string | null;
  itemStatus: string;
  taskStatus: TaskStatus;
  priority: number | null;
  startAt: string | null;
  dueAt: string;
  allDay: boolean;
  timezone: string | null;
  sortOrder: number;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TodayViewModel = {
  workspaceId: string;
  generatedAt: string;
  localDate: string;
  backlogDays: number;
  ranges: {
    today: TaskDateRange;
    overdueBacklog: TaskDateRange;
    tomorrow: TaskDateRange;
  };
  dueToday: TodayTaskView[];
  overdueBacklog: TodayTaskView[];
  tomorrowPreview: TodayTaskView[];
};

export function toTodayTaskView(record: TaskWithItemRecord): TodayTaskView {
  if (record.task.dueAt === null) {
    throw new Error(`Today task projection requires a due date: ${record.item.id}.`);
  }

  return {
    itemId: record.item.id,
    workspaceId: record.item.workspaceId,
    containerId: record.item.containerId,
    containerTabId: record.item.containerTabId,
    title: record.item.title,
    body: record.item.body,
    categoryId: record.item.categoryId,
    itemStatus: record.item.status,
    taskStatus: record.task.taskStatus,
    priority: record.task.priority,
    startAt: record.task.startAt,
    dueAt: record.task.dueAt,
    allDay: record.task.allDay,
    timezone: record.task.timezone,
    sortOrder: record.item.sortOrder,
    pinned: record.item.pinned,
    createdAt: record.item.createdAt,
    updatedAt: record.item.updatedAt
  };
}
