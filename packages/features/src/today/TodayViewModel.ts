import type { ListItemStatus, TaskDateRange, TaskStatus } from "@local-work-os/core";
import type { PlanningSummaryView } from "./PlanningSummaryService";
import type {
  DailyPlanLane,
  ListItemWithListRecord,
  TaskWithItemRecord
} from "@local-work-os/db";

export type TodayWorkItemType = "task" | "list_item";

export type TodayTaskView = {
  itemType: TodayWorkItemType;
  itemId: string;
  sourceItemId: string | null;
  workspaceId: string;
  containerId: string;
  containerTitle: string | null;
  containerTabId: string | null;
  title: string;
  body: string | null;
  categoryId: string | null;
  itemStatus: string;
  taskStatus: TaskStatus;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  timezone: string | null;
  sortOrder: number;
  plannedLane: DailyPlanLane | null;
  plannedSortOrder: number | null;
  addedManually: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TodayPlanningMode = "standard" | "top_six" | "ivy_lee";

export type TodayPreferencesView = {
  maxFocusTasks: number;
  planningMode: TodayPlanningMode;
  backlogDays: number;
  showWaiting: boolean;
  showDeferred: boolean;
  showDailyCompletionSummary: boolean;
};

export type TodayFocusSummary = {
  plannedTodayCount: number;
  maxFocusTasks: number;
  limitExceeded: boolean;
  warning: string | null;
};

export type TodayCompletionSummary = {
  completedTodayCount: number;
  plannedTodayCompletedCount: number;
  show: boolean;
};

export type TodayLaneSummary = {
  totalCount: number;
  returnedCount: number;
  limit: number | null;
  hasMore: boolean;
};

export type TodayViewModel = {
  workspaceId: string;
  generatedAt: string;
  localDate: string;
  backlogDays: number;
  preferences: TodayPreferencesView;
  focusSummary: TodayFocusSummary;
  completionSummary: TodayCompletionSummary;
  planningSummary: PlanningSummaryView;
  ranges: {
    today: TaskDateRange;
    overdueBacklog: TaskDateRange;
    tomorrow: TaskDateRange;
  };
  dueToday: TodayTaskView[];
  overdueBacklog: TodayTaskView[];
  tomorrowPreview: TodayTaskView[];
  laneSummaries: {
    dueToday: TodayLaneSummary;
    overdueBacklog: TodayLaneSummary;
    tomorrowPreview: TodayLaneSummary;
  };
};

export function toTodayTaskView(record: TaskWithItemRecord): TodayTaskView {
  return {
    itemType: "task",
    itemId: record.item.id,
    sourceItemId: null,
    workspaceId: record.item.workspaceId,
    containerId: record.item.containerId,
    containerTitle: null,
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
    plannedLane: null,
    plannedSortOrder: null,
    addedManually: false,
    pinned: record.item.pinned,
    createdAt: record.item.createdAt,
    updatedAt: record.item.updatedAt
  };
}

export function toTodayListItemView(
  record: ListItemWithListRecord
): TodayTaskView {
  return {
    itemType: "list_item",
    itemId: record.listItem.id,
    sourceItemId: record.list.item.id,
    workspaceId: record.listItem.workspaceId,
    containerId: record.list.item.containerId,
    containerTitle: null,
    containerTabId: record.list.item.containerTabId,
    title: record.listItem.title,
    body: record.listItem.body,
    categoryId: record.list.item.categoryId,
    itemStatus: record.list.item.status,
    taskStatus: listItemStatusToTaskStatus(record.listItem.status),
    priority: null,
    startAt: record.listItem.startAt,
    dueAt: record.listItem.dueAt,
    allDay: true,
    timezone: null,
    sortOrder: record.listItem.sortOrder,
    plannedLane: null,
    plannedSortOrder: null,
    addedManually: false,
    pinned: record.list.item.pinned,
    createdAt: record.listItem.createdAt,
    updatedAt: record.listItem.updatedAt
  };
}

function listItemStatusToTaskStatus(status: ListItemStatus): TaskStatus {
  switch (status) {
    case "done":
      return "done";
    case "waiting":
      return "waiting";
    case "cancelled":
      return "cancelled";
    case "open":
      return "open";
  }
}
