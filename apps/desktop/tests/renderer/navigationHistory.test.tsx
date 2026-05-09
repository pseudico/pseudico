import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { NavigationRecentTargetSummary } from "../../src/preload/api";
import {
  createAppTabTargetFromLocation,
  createNavigationTargetFromLocation
} from "../../src/renderer/navigation/navigationTargets";
import { RecentNavigationMenu } from "../../src/renderer/shell/TopBar";

describe("navigation history renderer helpers", () => {
  it("resolves routes into recent target types", () => {
    expect(
      createNavigationTargetFromLocation({
        pathname: "/projects/project_1",
        search: "?item=item_1"
      })
    ).toMatchObject({
      targetType: "item",
      targetId: "item_1",
      path: "/projects/project_1?item=item_1"
    });

    expect(
      createNavigationTargetFromLocation({ pathname: "/contacts/contact_1" })
    ).toMatchObject({
      targetType: "container",
      targetId: "contact_1",
      label: "Contact"
    });

    expect(createNavigationTargetFromLocation({ pathname: "/today" })).toMatchObject({
      targetType: "view",
      targetId: "today",
      label: "Today"
    });
  });

  it("limits app tab targets to project, contact, search, and collection views", () => {
    expect(
      createAppTabTargetFromLocation({ pathname: "/projects/project_1" })
    ).toMatchObject({
      targetType: "container",
      targetId: "project_1",
      label: "Project"
    });
    expect(
      createAppTabTargetFromLocation({ pathname: "/search", search: "?q=launch" })
    ).toMatchObject({
      targetType: "view",
      targetId: "search",
      path: "/search?q=launch"
    });
    expect(createAppTabTargetFromLocation({ pathname: "/today" })).toBeNull();
  });

  it("renders the recent menu button with recent target metadata", () => {
    const html = renderToString(
      <RecentNavigationMenu
        initialOpen
        recentTargets={[
          recent("view", "today", "/today", "Today", "Daily plan"),
          recent(
            "container",
            "project_1",
            "/projects/project_1",
            "Project",
            "Recently opened project"
          )
        ]}
        onNavigateRecent={() => undefined}
      />
    );

    expect(html).toContain("Recent");
    expect(html).toContain("Recently opened");
    expect(html).toContain("Today");
    expect(html).toContain("Recently opened project");
  });
});

function recent(
  targetType: NavigationRecentTargetSummary["targetType"],
  targetId: string,
  path: string,
  label: string,
  subtitle: string
): NavigationRecentTargetSummary {
  return {
    targetType,
    targetId,
    workspaceId: "workspace_1",
    path,
    label,
    subtitle,
    viewedAt: "2026-05-09T04:00:00.000Z"
  };
}
