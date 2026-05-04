import type {
  DashboardRecord,
  DashboardWidgetRecord,
  DashboardWidgetType
} from "@local-work-os/db";
import type { ActivityEventView } from "../activity";
import type { ProjectRecord } from "../projects";
import type { TodayTaskView } from "../today";

export type DashboardNavigationTarget = {
  targetType: string;
  targetId: string;
  workspaceId: string;
};

export type DashboardWidgetPage = {
  limit: number;
  offset: number;
  totalCount: number;
  hasMore: boolean;
};

export type DashboardTaskWidgetItem = {
  kind: "task";
  itemId: string;
  title: string;
  containerId: string;
  dueAt: string | null;
  taskStatus: string;
  priority: number | null;
  navigationTarget: DashboardNavigationTarget;
};

export type DashboardProjectWidgetItem = {
  kind: "project";
  projectId: string;
  name: string;
  status: string;
  color: string | null;
  navigationTarget: DashboardNavigationTarget;
};

export type DashboardActivityWidgetItem = {
  kind: "activity";
  activityId: string;
  action: string;
  description: string;
  createdAt: string;
  targetNavigationTarget: DashboardNavigationTarget;
};

export type DashboardWidgetData =
  | {
      widgetType: "today" | "overdue" | "upcoming";
      generatedAt: string;
      page: DashboardWidgetPage;
      items: DashboardTaskWidgetItem[];
    }
  | {
      widgetType: "favorites";
      generatedAt: string;
      page: DashboardWidgetPage;
      items: DashboardProjectWidgetItem[];
    }
  | {
      widgetType: "recent_activity";
      generatedAt: string;
      page: DashboardWidgetPage;
      items: DashboardActivityWidgetItem[];
    };

export type DashboardWidgetViewModel = {
  widget: DashboardWidgetRecord;
  data: DashboardWidgetData | null;
};

export type DashboardViewModel = {
  dashboard: DashboardRecord;
  widgets: DashboardWidgetViewModel[];
};

export type WidgetDataQueryInput = {
  workspaceId: string;
  limit?: number;
  offset?: number;
  date?: string | Date;
  upcomingDays?: number;
};

export function isDefaultDashboardWidgetType(
  value: string
): value is Extract<
  DashboardWidgetType,
  "today" | "overdue" | "upcoming" | "favorites" | "recent_activity"
> {
  return [
    "today",
    "overdue",
    "upcoming",
    "favorites",
    "recent_activity"
  ].includes(value);
}

export function toTaskWidgetItem(
  task: TodayTaskView
): DashboardTaskWidgetItem {
  return {
    kind: "task",
    itemId: task.itemId,
    title: task.title,
    containerId: task.containerId,
    dueAt: task.dueAt,
    taskStatus: task.taskStatus,
    priority: task.priority,
    navigationTarget: {
      targetType: "item",
      targetId: task.itemId,
      workspaceId: task.workspaceId
    }
  };
}

export function toProjectWidgetItem(
  project: ProjectRecord
): DashboardProjectWidgetItem {
  return {
    kind: "project",
    projectId: project.id,
    name: project.name,
    status: project.status,
    color: project.color,
    navigationTarget: {
      targetType: "container",
      targetId: project.id,
      workspaceId: project.workspaceId
    }
  };
}

export function toActivityWidgetItem(
  event: ActivityEventView
): DashboardActivityWidgetItem {
  return {
    kind: "activity",
    activityId: event.id,
    action: event.action,
    description: event.description,
    createdAt: event.createdAt,
    targetNavigationTarget: {
      targetType: event.targetType,
      targetId: event.targetId,
      workspaceId: event.workspaceId
    }
  };
}

