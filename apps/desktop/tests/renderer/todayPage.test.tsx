import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { TodayViewModelSummary } from "../../src/preload/api";
import { TodayPage } from "../../src/renderer/pages/TodayPage";

describe("Today renderer page", () => {
  it("renders Today, Tomorrow, and Backlog lanes from the view model", () => {
    const html = renderToString(
      <MemoryRouter>
        <TodayPage initialViewModel={todayViewModel()} />
      </MemoryRouter>
    );

    expect(html).toContain("Today");
    expect(html).toContain("Tomorrow");
    expect(html).toContain("Backlog");
    expect(html).toContain("Call accountant");
    expect(html).toContain("Review launch copy");
    expect(html).toContain("Send overdue report");
    expect(html).toContain("Complete");
    expect(html).toContain("Open source");
  });
});

function todayViewModel(): TodayViewModelSummary {
  return {
    workspaceId: "workspace_1",
    generatedAt: "2026-05-04T08:00:00.000Z",
    localDate: "2026-05-04",
    backlogDays: 14,
    ranges: {
      today: {
        startInclusive: "2026-05-04T00:00:00.000Z",
        endExclusive: "2026-05-05T00:00:00.000Z"
      },
      overdueBacklog: {
        startInclusive: "2026-04-20T00:00:00.000Z",
        endExclusive: "2026-05-04T00:00:00.000Z"
      },
      tomorrow: {
        startInclusive: "2026-05-05T00:00:00.000Z",
        endExclusive: "2026-05-06T00:00:00.000Z"
      }
    },
    dueToday: [todayTask("item_today", "Call accountant", "2026-05-04T09:00:00.000Z")],
    tomorrowPreview: [
      todayTask("item_tomorrow", "Review launch copy", "2026-05-05T09:00:00.000Z")
    ],
    overdueBacklog: [
      todayTask("item_overdue", "Send overdue report", "2026-05-03T09:00:00.000Z")
    ]
  };
}

function todayTask(itemId: string, title: string, dueAt: string) {
  return {
    itemId,
    workspaceId: "workspace_1",
    containerId: "container_project_1",
    containerTabId: null,
    title,
    body: null,
    categoryId: null,
    itemStatus: "active",
    taskStatus: "open" as const,
    priority: null,
    startAt: null,
    dueAt,
    allDay: true,
    timezone: null,
    sortOrder: 1024,
    pinned: false,
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z"
  };
}
