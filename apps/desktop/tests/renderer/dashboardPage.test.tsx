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
    expect(html).toContain("Pinned &amp; Favorites");
    expect(html).toContain("Project Health");
    expect(html).toContain("Recent Activity");
    expect(html).toContain("Call accountant");
    expect(html).toContain("Send overdue report");
    expect(html).toContain("Review launch copy");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("1 overdue");
    expect(html).toContain("Container Created");
    expect(html).toContain("Created project");
    expect(html).toContain("Mini Calendar");
    expect(html).toContain("Mini Timeline");
    expect(html).toContain("Pomodoro");
    expect(html).toContain("Web widgets are disabled");
    expect(html).toContain("Make today count.");
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
              kind: "favorite",
              targetType: "container",
              targetId: "container_project_1",
              workspaceId: "workspace_1",
              title: "Launch Plan",
              subtitle: "Project - active",
              path: "/projects/container_project_1",
              source: "favorite",
              targetKind: "project",
              containerId: "container_project_1",
              containerType: "project",
              containerTitle: "Launch Plan",
              updatedAt: "2026-05-04T08:00:00.000Z",
              navigationTarget: {
                targetType: "container",
                targetId: "container_project_1",
                workspaceId: "workspace_1",
                path: "/projects/container_project_1"
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
              upcomingTaskCount: 1,
              waitingTaskCount: 0,
              completionRatio: 0.4,
              staleAfterDays: 14,
              lastActivityAt: "2026-05-04T00:00:00.000Z",
              isStale: false,
              hasRecentActivity: true,
              totalTaskCount: 5,
              nextDueTask: {
                itemId: "item_next",
                title: "Book launch venue",
                dueAt: "2026-05-05T09:00:00.000Z",
                taskStatus: "open",
                priority: 2
              },
              nextTask: {
                itemId: "item_next",
                title: "Book launch venue",
                dueAt: "2026-05-05T09:00:00.000Z",
                taskStatus: "open",
                priority: 2
              },
              healthBadges: [{ kind: "overdue", label: "1 overdue", tone: "risk" }],
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
        widget: widget("widget_calendar", "calendar", "Mini Calendar"),
        data: {
          widgetType: "calendar",
          generatedAt: "2026-05-04T08:00:00.000Z",
          month: "2026-05",
          totalCount: 1,
          days: [
            { date: "2026-05-04", dayOfMonth: 4, inCurrentMonth: true, isToday: true, itemCount: 1, items: [] }
          ]
        }
      },
      {
        widget: widget("widget_timeline", "timeline", "Mini Timeline"),
        data: {
          widgetType: "timeline",
          generatedAt: "2026-05-04T08:00:00.000Z",
          summary: {
            range: { startInclusive: "2026-05-04T00:00:00.000Z", endExclusive: "2026-05-11T00:00:00.000Z" },
            workload: { itemCount: 1, activeCount: 1, completedCount: 0, density: [] },
            groups: [{ key: "container_project_1", label: "Launch Plan", itemCount: 1, completedCount: 0, color: "#245c55" }]
          }
        }
      },
      {
        widget: { ...widget("widget_pomodoro", "pomodoro", "Pomodoro"), configJson: JSON.stringify({ focusMinutes: 25, breakMinutes: 5 }) },
        data: null
      },
      {
        widget: { ...widget("widget_web", "web", "Reference Link"), configJson: JSON.stringify({ url: "https://example.test", networkEnabled: false }) },
        data: null
      },
      {
        widget: { ...widget("widget_static", "static_text", "Quote"), configJson: JSON.stringify({ text: "Make today count." }) },
        data: null
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
