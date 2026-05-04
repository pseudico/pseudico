import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { DashboardViewModelSummary } from "../../src/preload/api";
import { DashboardPage } from "../../src/renderer/pages/DashboardPage";

describe("Dashboard renderer page", () => {
  it("renders default widgets with source navigation controls", () => {
    const html = renderToString(
      <MemoryRouter>
        <DashboardPage initialDashboard={dashboardViewModel()} />
      </MemoryRouter>
    );

    expect(html).toContain("Dashboard");
    expect(html).toContain("Today");
    expect(html).toContain("Overdue");
    expect(html).toContain("Upcoming");
    expect(html).toContain("Favorite Projects");
    expect(html).toContain("Project Health");
    expect(html).toContain("Recent Activity");
    expect(html).toContain("Call accountant");
    expect(html).toContain("Send overdue report");
    expect(html).toContain("Review launch copy");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("1 overdue");
    expect(html).toContain("Container Created");
    expect(html).toContain("Created project");
  });
});

function dashboardViewModel(): DashboardViewModelSummary {
  return {
    dashboard: {
      id: "dashboard_1",
      workspaceId: "workspace_1",
      name: "Dashboard",
      isDefault: true,
      layoutJson: "{}",
      createdAt: "2026-05-04T08:00:00.000Z",
      updatedAt: "2026-05-04T08:00:00.000Z",
      deletedAt: null
    },
    widgets: [
      taskWidget("widget_today", "today", "Today", [
        task("item_today", "Call accountant", "2026-05-04T09:00:00.000Z")
      ]),
      taskWidget("widget_overdue", "overdue", "Overdue", [
        task("item_overdue", "Send overdue report", "2026-05-03T09:00:00.000Z")
      ]),
      taskWidget("widget_upcoming", "upcoming", "Upcoming", [
        task("item_upcoming", "Review launch copy", "2026-05-05T09:00:00.000Z")
      ]),
      {
        widget: widget("widget_favorites", "favorites", "Favorite Projects"),
        data: {
          widgetType: "favorites",
          generatedAt: "2026-05-04T08:00:00.000Z",
          page: page(1),
          items: [
            {
              kind: "project",
              projectId: "container_project_1",
              name: "Launch Plan",
              status: "active",
              color: "#245c55",
              navigationTarget: {
                targetType: "container",
                targetId: "container_project_1",
                workspaceId: "workspace_1"
              }
            }
          ]
        }
      },
      {
        widget: widget("widget_project_health", "project_health", "Project Health"),
        data: {
          widgetType: "project_health",
          generatedAt: "2026-05-04T08:00:00.000Z",
          page: page(1),
          items: [
            {
              kind: "project_health",
              projectId: "container_project_1",
              workspaceId: "workspace_1",
              name: "Launch Plan",
              status: "active",
              color: "#245c55",
              generatedAt: "2026-05-04T08:00:00.000Z",
              openTaskCount: 3,
              completedTaskCount: 2,
              overdueTaskCount: 1,
              totalTaskCount: 5,
              nextDueTask: {
                itemId: "item_next",
                title: "Book launch venue",
                dueAt: "2026-05-05T09:00:00.000Z",
                taskStatus: "open",
                priority: 2
              },
              recentActivity: [],
              navigationTarget: {
                targetType: "container",
                targetId: "container_project_1",
                workspaceId: "workspace_1"
              }
            }
          ]
        }
      },
      {
        widget: widget("widget_activity", "recent_activity", "Recent Activity"),
        data: {
          widgetType: "recent_activity",
          generatedAt: "2026-05-04T08:00:00.000Z",
          page: page(1),
          items: [
            {
              kind: "activity",
              activityId: "activity_1",
              action: "container_created",
              description: "Created project \"Launch Plan\".",
              createdAt: "2026-05-04T08:00:00.000Z",
              targetNavigationTarget: {
                targetType: "container",
                targetId: "container_project_1",
                workspaceId: "workspace_1"
              }
            }
          ]
        }
      }
    ]
  };
}

function taskWidget(
  id: string,
  type: "today" | "overdue" | "upcoming",
  title: string,
  items: ReturnType<typeof task>[]
): DashboardViewModelSummary["widgets"][number] {
  return {
    widget: widget(id, type, title),
    data: {
      widgetType: type,
      generatedAt: "2026-05-04T08:00:00.000Z",
      page: page(items.length),
      items
    }
  };
}

function widget(id: string, type: string, title: string) {
  return {
    id,
    workspaceId: "workspace_1",
    dashboardId: "dashboard_1",
    type,
    title,
    savedViewId: null,
    configJson: "{}",
    positionJson: "{}",
    sortOrder: 0,
    createdAt: "2026-05-04T08:00:00.000Z",
    updatedAt: "2026-05-04T08:00:00.000Z",
    deletedAt: null
  };
}

function task(itemId: string, title: string, dueAt: string) {
  return {
    kind: "task" as const,
    itemId,
    title,
    containerId: "container_project_1",
    dueAt,
    taskStatus: "open",
    priority: 2,
    navigationTarget: {
      targetType: "item",
      targetId: itemId,
      workspaceId: "workspace_1"
    }
  };
}

function page(totalCount: number) {
  return {
    limit: 10,
    offset: 0,
    totalCount,
    hasMore: false
  };
}
