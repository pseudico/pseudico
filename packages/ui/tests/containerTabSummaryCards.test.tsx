import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContainerTabSummaryCards } from "../src";

describe("ContainerTabSummaryCards", () => {
  it("renders task health, content counts, and clickable preview controls", () => {
    const html = renderToStaticMarkup(
      <ContainerTabSummaryCards
        activeTabId="tab_delivery"
        summaries={[
          {
            tabId: "tab_delivery",
            name: "Delivery",
            isDefault: false,
            totalItemCount: 4,
            openTaskCount: 2,
            completedTaskCount: 1,
            overdueTaskCount: 1,
            noteCount: 1,
            fileCount: 1,
            linkCount: 0,
            listCount: 1,
            openTaskPreviews: [
              {
                itemId: "task_1",
                type: "task",
                title: "Send launch brief",
                status: "active",
                preview: null,
                dueAt: "2026-05-09T00:00:00.000Z",
                createdAt: "2026-05-01T00:00:00.000Z",
                updatedAt: "2026-05-01T00:00:00.000Z",
                kind: "open_task"
              }
            ],
            recentContentPreviews: [
              {
                itemId: "note_1",
                type: "note",
                title: "Kickoff notes",
                status: "active",
                preview: "Agenda and risks",
                dueAt: null,
                createdAt: "2026-05-02T00:00:00.000Z",
                updatedAt: "2026-05-03T00:00:00.000Z",
                kind: "recent_content"
              }
            ]
          }
        ]}
        onSelectTab={() => undefined}
      />
    );

    expect(html).toContain("Tab previews");
    expect(html).toContain("Delivery");
    expect(html).toContain("Overdue");
    expect(html).toContain("Send launch brief");
    expect(html).toContain("Kickoff notes");
    expect(html).toContain("aria-pressed=\"true\"");
  });
});
