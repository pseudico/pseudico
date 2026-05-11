import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { TimelineViewModelSummary } from "../../src/preload/api";
import {
  TimelinePage,
  getTimelineItemDestination
} from "../../src/renderer/pages/TimelinePage";

describe("Timeline renderer page", () => {
  it("renders workload filters and grouped timeline tasks", () => {
    const html = renderToString(
      <MemoryRouter>
        <TimelinePage initialTimeline={timelineViewModel()} />
      </MemoryRouter>
    );

    expect(html).toContain("Timeline");
    expect(html).toContain("Group by");
    expect(html).toContain("Zoom");
    expect(html).toContain("Contact");
    expect(html).toContain("Show completed");
    expect(html).toContain("timeline-range-marker");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("Launch checklist");
    expect(html).toContain("Operations");
    expect(html).toContain("P2");
  });

  it("opens list item timeline entries in the parent list context", () => {
    expect(
      getTimelineItemDestination({
        kind: "list_item",
        itemId: "list_item_1",
        sourceItemId: "item_list_1",
        title: "Confirm launch window",
        body: null,
        containerId: "container_project_1",
        containerName: "Launch Plan",
        containerType: "project",
        categoryName: null,
        categoryColor: null,
        taskStatus: "open",
        priority: null,
        timelineStartAt: "2026-05-15T12:00:00.000Z",
        timelineEndAt: "2026-05-15T12:00:00.000Z",
        completedAt: null
      })
    ).toBe("/projects/container_project_1?item=item_list_1");
  });
});

function timelineViewModel(): TimelineViewModelSummary {
  return {
    workspaceId: "workspace_1",
    generatedAt: "2026-05-15T09:30:00.000Z",
    range: {
      startInclusive: "2026-05-15T00:00:00.000Z",
      endExclusive: "2026-05-29T00:00:00.000Z"
    },
    includeCompleted: false,
    groupBy: "project",
    totalCount: 1,
    groups: [
      {
        key: "container_project_1",
        label: "Launch Plan",
        groupBy: "project",
        color: "#245c55",
        itemCount: 1,
        completedCount: 0,
        items: [
          {
            kind: "task",
            itemId: "item_1",
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
            taskStatus: "open",
            itemStatus: "active",
            priority: 2,
            startAt: null,
            dueAt: "2026-05-15T12:00:00.000Z",
            timelineStartAt: "2026-05-15T12:00:00.000Z",
            timelineEndAt: "2026-05-15T12:00:00.000Z",
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
          }
        ]
      }
    ]
  };
}
