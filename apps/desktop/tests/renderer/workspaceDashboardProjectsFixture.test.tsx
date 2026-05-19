import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { WorkspaceDashboardProjectsSpaceBudgetFixturePage } from "../../src/renderer/pages/WorkspaceDashboardProjectsSpaceBudgetFixturePage";

describe("PSE-237 workspace/dashboard/projects space-budget fixture", () => {
  it("renders long-data launch surfaces with daily work ahead of maintenance", () => {
    const html = renderToString(
      <MemoryRouter>
        <WorkspaceDashboardProjectsSpaceBudgetFixturePage />
      </MemoryRouter>
    );

    expect(html).toContain("Workspace, dashboard, and projects library budgets");
    expect(html).toContain("Pinned and recent work");
    expect(html).toContain("Operator feed");
    expect(html).toContain("Daily work first");
    expect(html).toContain("Maintenance stays secondary");
    expect(html).toContain("Readable project browsing");
    expect(html).toContain("Category board plus readable table rows");
    expect(html).toContain("Client onboarding program with legal review");
    expect(html).toContain("Local backup readiness, restore rehearsal");
    expect(html).toContain("2026-05-operator-readiness-backup-restore-evidence");
    expect(html).toContain("data-space-budget-surface=\"workspace-home\"");
    expect(html).toContain("data-space-budget-surface=\"dashboard-work-loop\"");
    expect(html).toContain("data-space-budget-surface=\"projects-library\"");
  });
});
