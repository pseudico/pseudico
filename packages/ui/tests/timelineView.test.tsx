import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimelineView, type TimelineViewGroup } from "../src";

describe("TimelineView", () => {
  it("renders scale ticks, range bars, and due-only markers", () => {
    const html = renderToStaticMarkup(
      <TimelineView
        groups={groups}
        range={{
          startInclusive: "2026-05-15T00:00:00.000Z",
          endExclusive: "2026-05-22T00:00:00.000Z"
        }}
        workload={{ itemCount: 2, activeCount: 2, completedCount: 0, density: [{ date: "2026-05-16", itemCount: 1, completedCount: 0 }] }}
        zoom="week"
      />
    );

    expect(html).toContain("timeline-scale");
    expect(html).toContain("timeline-range-bar");
    expect(html).toContain("timeline-range-marker");
    expect(html).toContain("2 scheduled");
    expect(html).toContain("2026-05-16");
    expect(html).toContain("Spanning rollout");
    expect(html).toContain("Due marker");
  });
});

const groups: TimelineViewGroup[] = [
  {
    key: "container_project_1",
    label: "Launch Plan",
    color: "#245c55",
    itemCount: 2,
    completedCount: 0,
    items: [
      {
        kind: "task",
        itemId: "item_1",
        title: "Spanning rollout",
        body: null,
        containerId: "container_project_1",
        containerName: "Launch Plan",
        containerType: "project",
        categoryName: "Operations",
        categoryColor: "#2c6b8f",
        taskStatus: "open",
        priority: 2,
        startAt: "2026-05-16T00:00:00.000Z",
        dueAt: "2026-05-18T00:00:00.000Z",
        timelineStartAt: "2026-05-16T00:00:00.000Z",
        timelineEndAt: "2026-05-18T00:00:00.000Z",
        completedAt: null
      },
      {
        kind: "task",
        itemId: "item_2",
        title: "Due marker",
        body: null,
        containerId: "container_project_1",
        containerName: "Launch Plan",
        containerType: "project",
        categoryName: null,
        categoryColor: null,
        taskStatus: "open",
        priority: null,
        startAt: null,
        dueAt: "2026-05-20T12:00:00.000Z",
        timelineStartAt: "2026-05-20T12:00:00.000Z",
        timelineEndAt: "2026-05-20T12:00:00.000Z",
        completedAt: null
      }
    ]
  }
];
