import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppTabStrip } from "../src";

describe("AppTabStrip", () => {
  it("renders open tabs with active, close, and reorder controls", () => {
    const html = renderToStaticMarkup(
      <AppTabStrip
        activeTabId="tab_project"
        tabs={[
          {
            id: "tab_project",
            label: "Launch Plan",
            subtitle: "Recently opened project",
            path: "/projects/project_1"
          },
          {
            id: "tab_search",
            label: "Search",
            subtitle: "Local full-text search",
            path: "/search?q=launch"
          }
        ]}
        onCloseTab={() => undefined}
        onMoveTab={() => undefined}
        onSelectTab={() => undefined}
      />
    );

    expect(html).toContain("Open app tabs");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("Recently opened project");
    expect(html).toContain("title=\"Launch Plan - Recently opened project\"");
    expect(html).toContain("Search");
    expect(html).toContain("aria-current=\"page\"");
    expect(html).toContain("Close Launch Plan tab");
    expect(html).toContain("Move tab right");
  });
});
