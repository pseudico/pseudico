import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PlanningSpaceBudgetFixturePage } from "../../src/renderer/pages/PlanningSpaceBudgetFixturePage";

describe("PSE-236 planning space-budget fixture", () => {
  it("renders timeline with readable row labels and selected detail", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/planning-space-budget-fixture"]}>
        <PlanningSpaceBudgetFixturePage />
      </MemoryRouter>
    );

    expect(html).toContain("data-space-budget-surface=\"timeline-planning\"");
    expect(html).toContain("timeline-row-label");
    expect(html).toContain("timeline-range-label");
    expect(html).toContain("Selected work");
    expect(html).toContain("Coordinate the multi-day supplier readiness review");
  });

  it("renders calendar with compact cells and readable agenda fallback", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/planning-space-budget-fixture?surface=calendar"]}>
        <PlanningSpaceBudgetFixturePage />
      </MemoryRouter>
    );

    expect(html).toContain("data-space-budget-surface=\"calendar-planning\"");
    expect(html).toContain("month-calendar-day-summary");
    expect(html).toContain("Readable agenda");
    expect(html).toContain("agenda keeps this long all-day risk review readable");
  });

  it("renders pipeline and kanban columns with long planning card titles", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/planning-space-budget-fixture?surface=pipeline"]}>
        <PlanningSpaceBudgetFixturePage />
      </MemoryRouter>
    );

    expect(html).toContain("Pipeline planning fixture");
    expect(html).toContain("pipeline-stage-board");
    expect(html).toContain("kanban-board");
    expect(html).toContain("Coordinate the multi-day supplier readiness review");
    expect(html).toContain("pipeline-card-meta");
    expect(html).toContain("Ready for operator review");
  });
});
