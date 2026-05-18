import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { longDataFixtures, TodayTaskCard } from "../src";

describe("TodayTaskCard", () => {
  it("renders long operator task text with destination, due, planning, and action labels", () => {
    const html = renderToStaticMarkup(
      <TodayTaskCard
        lane="today"
        task={{
          itemId: "task_long_today",
          itemType: "task",
          title: longDataFixtures.taskTitle,
          body: longDataFixtures.notePreview,
          taskStatus: "open",
          itemStatus: "active",
          dueAt: "2026-05-18T14:00:00.000Z",
          priority: 2,
          containerId: "project_operator_handoff",
          containerLabel: longDataFixtures.projectName,
          plannedLane: "today",
          plannedSortOrder: 1024,
          addedManually: true,
          sourceLabel: "Open source"
        }}
      />
    );

    expect(html).toContain(longDataFixtures.taskTitle);
    expect(html).toContain(longDataFixtures.notePreview);
    expect(html).toContain(`Destination: ${longDataFixtures.projectName}`);
    expect(html).toContain("Planned: Today");
    expect(html).toContain("Moved manually");
    expect(html).toContain("Tomorrow");
    expect(html).toContain("Complete");
  });
});
