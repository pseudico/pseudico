import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CalendarMonthViewModelSummary } from "../../src/preload/api";
import { CalendarPage } from "../../src/renderer/pages/CalendarPage";

describe("Calendar renderer page", () => {
  it("renders month controls and dated work", () => {
    const html = renderToString(
      <MemoryRouter>
        <CalendarPage initialCalendar={calendarViewModel()} />
      </MemoryRouter>
    );

    expect(html).toContain("Calendar");
    expect(html).toContain("Month");
    expect(html).toContain("Show completed");
    expect(html).toContain("Launch checklist");
    expect(html).toContain("Confirm launch window");
    expect(html).toContain("Launch Plan");
  });
});

function calendarViewModel(): CalendarMonthViewModelSummary {
  return {
    workspaceId: "workspace_1",
    generatedAt: "2026-05-15T09:30:00.000Z",
    range: {
      month: "2026-05",
      startInclusive: "2026-05-01T00:00:00.000Z",
      endExclusive: "2026-06-01T00:00:00.000Z"
    },
    includeCompleted: false,
    totalCount: 2,
    days: [
      {
        date: "2026-05-15",
        dayOfMonth: 15,
        weekday: 5,
        inCurrentMonth: true,
        isToday: true,
        items: [
          {
            id: "item_1",
            kind: "task",
            workspaceId: "workspace_1",
            title: "Launch checklist",
            body: "Confirm launch materials.",
            containerId: "container_project_1",
            containerName: "Launch Plan",
            containerType: "project",
            containerColor: "#245c55",
            categoryId: "category_ops",
            categoryName: "Operations",
            categoryColor: "#2c6b8f",
            status: "open",
            itemStatus: "active",
            priority: 2,
            startAt: null,
            dueAt: "2026-05-15T00:00:00.000Z",
            allDay: true,
            completedAt: null,
            updatedAt: "2026-05-01T00:00:00.000Z",
            navigationTarget: {
              targetType: "item",
              targetId: "item_1",
              containerId: "container_project_1",
              workspaceId: "workspace_1",
              sourceItemId: null
            }
          },
          {
            id: "list_item_1",
            kind: "list_item",
            workspaceId: "workspace_1",
            title: "Confirm launch window",
            body: null,
            containerId: "container_project_1",
            containerName: "Launch Plan",
            containerType: "project",
            containerColor: "#245c55",
            categoryId: null,
            categoryName: null,
            categoryColor: null,
            status: "open",
            itemStatus: "active",
            priority: null,
            startAt: null,
            dueAt: "2026-05-15T12:00:00.000Z",
            allDay: true,
            completedAt: null,
            updatedAt: "2026-05-01T00:00:00.000Z",
            navigationTarget: {
              targetType: "list_item",
              targetId: "list_item_1",
              containerId: "container_project_1",
              workspaceId: "workspace_1",
              sourceItemId: "item_list_1"
            }
          }
        ]
      }
    ]
  };
}
