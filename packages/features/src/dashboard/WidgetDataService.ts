import {
  createIsoTimestamp,
  createLocalDayWindowRange,
  type Clock
} from "@local-work-os/core";
import type { DatabaseConnection } from "@local-work-os/db";
import { ActivityService } from "../activity";
import { ProjectHealthService, ProjectService } from "../projects";
import { TaskService } from "../tasks";
import { TodayService, toTodayTaskView } from "../today";
import {
  toActivityWidgetItem,
  toProjectHealthWidgetItem,
  toProjectWidgetItem,
  toTaskWidgetItem,
  type DashboardActivityWidgetItem,
  type DashboardProjectHealthWidgetItem,
  type DashboardProjectWidgetItem,
  type DashboardTaskWidgetItem,
  type DashboardWidgetData,
  type DashboardWidgetPage,
  type WidgetDataQueryInput
} from "./DashboardViewModel";

const DEFAULT_WIDGET_LIMIT = 10;
const MAX_WIDGET_LIMIT = 100;
const DEFAULT_UPCOMING_DAYS = 7;

export class WidgetDataService {
  readonly module = "dashboard.widgetData";

  private readonly connection: DatabaseConnection;
  private readonly now: Clock;

  constructor(input: { connection: DatabaseConnection; now?: Clock }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
  }

  getTodayWidgetData(input: WidgetDataQueryInput): DashboardWidgetData {
    const normalized = this.normalizeInput(input);
    const items = new TodayService({
      connection: this.connection,
      now: this.now
    })
      .listDueToday({
        workspaceId: normalized.workspaceId,
        date: normalized.date
      })
      .map(toTaskWidgetItem);

    return {
      widgetType: "today",
      generatedAt: createIsoTimestamp(this.now()),
      ...pageItems(items, normalized)
    };
  }

  getOverdueWidgetData(input: WidgetDataQueryInput): DashboardWidgetData {
    const normalized = this.normalizeInput(input);
    const items = new TaskService({
      connection: this.connection,
      now: this.now
    })
      .listOverdue(normalized.workspaceId, normalized.date)
      .map(toTodayTaskView)
      .map(toTaskWidgetItem);

    return {
      widgetType: "overdue",
      generatedAt: createIsoTimestamp(this.now()),
      ...pageItems(items, normalized)
    };
  }

  getUpcomingWidgetData(input: WidgetDataQueryInput): DashboardWidgetData {
    const normalized = this.normalizeInput(input);
    const range = createLocalDayWindowRange({
      date: normalized.date,
      startOffsetDays: 1,
      endOffsetDays: normalized.upcomingDays + 1
    });
    const items = new TaskService({
      connection: this.connection,
      now: this.now
    })
      .listUpcoming(normalized.workspaceId, range)
      .map(toTodayTaskView)
      .map(toTaskWidgetItem);

    return {
      widgetType: "upcoming",
      generatedAt: createIsoTimestamp(this.now()),
      ...pageItems(items, normalized)
    };
  }

  getFavoriteProjectsWidgetData(
    input: WidgetDataQueryInput
  ): DashboardWidgetData {
    const normalized = this.normalizeInput(input);
    const items = new ProjectService({
      connection: this.connection,
      now: this.now
    })
      .listProjects(normalized.workspaceId)
      .filter((project) => project.isFavorite)
      .map(toProjectWidgetItem);

    return {
      widgetType: "favorites",
      generatedAt: createIsoTimestamp(this.now()),
      ...pageItems(items, normalized)
    };
  }

  getProjectHealthWidgetData(input: WidgetDataQueryInput): DashboardWidgetData {
    const normalized = this.normalizeInput(input);
    const items = new ProjectHealthService({
      connection: this.connection,
      now: this.now
    })
      .listProjectHealthSummaries({
        workspaceId: normalized.workspaceId,
        limit: normalized.limit + normalized.offset,
        recentActivityLimit: 1
      })
      .map(toProjectHealthWidgetItem);

    return {
      widgetType: "project_health",
      generatedAt: createIsoTimestamp(this.now()),
      ...pageItems(items, normalized)
    };
  }

  getRecentActivityWidgetData(input: WidgetDataQueryInput): DashboardWidgetData {
    const normalized = this.normalizeInput(input);
    const requestedLimit = normalized.limit + normalized.offset + 1;
    const items = new ActivityService({ connection: this.connection })
      .listRecentActivity(normalized.workspaceId, requestedLimit)
      .map(toActivityWidgetItem);

    return {
      widgetType: "recent_activity",
      generatedAt: createIsoTimestamp(this.now()),
      ...pageItems(items, normalized)
    };
  }

  private normalizeInput(input: WidgetDataQueryInput): Required<
    Pick<WidgetDataQueryInput, "workspaceId" | "limit" | "offset" | "date" | "upcomingDays">
  > {
    validateNonEmptyString(input.workspaceId, "workspaceId");

    return {
      workspaceId: input.workspaceId,
      limit: normalizeLimit(input.limit),
      offset: normalizeOffset(input.offset),
      date: input.date ?? this.now(),
      upcomingDays: normalizeUpcomingDays(input.upcomingDays)
    };
  }
}

function pageItems<
  TItem extends
    | DashboardTaskWidgetItem
    | DashboardProjectWidgetItem
    | DashboardProjectHealthWidgetItem
    | DashboardActivityWidgetItem
>(
  items: TItem[],
  page: { limit: number; offset: number }
): { page: DashboardWidgetPage; items: TItem[] } {
  const paged = items.slice(page.offset, page.offset + page.limit);

  return {
    page: {
      limit: page.limit,
      offset: page.offset,
      totalCount: items.length,
      hasMore: page.offset + page.limit < items.length
    },
    items: paged
  };
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_WIDGET_LIMIT;
  }

  if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer.");
  }

  return Math.min(limit, MAX_WIDGET_LIMIT);
}

function normalizeOffset(offset: number | undefined): number {
  if (offset === undefined) {
    return 0;
  }

  if (!Number.isFinite(offset) || !Number.isInteger(offset) || offset < 0) {
    throw new Error("offset must be a non-negative integer.");
  }

  return offset;
}

function normalizeUpcomingDays(upcomingDays: number | undefined): number {
  if (upcomingDays === undefined) {
    return DEFAULT_UPCOMING_DAYS;
  }

  if (
    !Number.isFinite(upcomingDays) ||
    !Number.isInteger(upcomingDays) ||
    upcomingDays < 1 ||
    upcomingDays > 365
  ) {
    throw new Error("upcomingDays must be an integer between 1 and 365.");
  }

  return upcomingDays;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
