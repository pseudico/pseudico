import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../src/renderer/App";

describe("PSE-235 search and collections space-budget surfaces", () => {
  it("renders the search fixture with a command-sized input, why-matched rows, and preview detail", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/search-collections-space-budget-fixture"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(html).toContain("data-space-budget-surface=\"search-command\"");
    expect(html).toContain("data-space-budget-min-width=\"640px\"");
    expect(html).toContain("data-space-budget-surface=\"search-results\"");
    expect(html).toContain("data-space-budget-surface=\"search-preview\"");
    expect(html).toContain("Why matched");
    expect(html).toContain("Confirm redirect owner for the thirty eight legacy pages");
    expect(html).toContain("2026-05-operator-readiness-backup-restore-evidence");
  });

  it("renders the collections fixture with readable saved-view names and filter summaries", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter
        initialEntries={["/search-collections-space-budget-fixture?surface=collections"]}
      >
        <AppRoutes />
      </MemoryRouter>
    );

    expect(html).toContain("data-space-budget-surface=\"collections\"");
    expect(html).toContain("data-space-budget-surface=\"collection-results\"");
    expect(html).toContain("Open client launch work with files, notes, and due dates");
    expect(html).toContain("tags @client, @launch");
    expect(html).toContain("Launch blockers: client work due in the next seven days");
    expect(html).toContain("Saved local views keep cross-object work readable");
  });
});

