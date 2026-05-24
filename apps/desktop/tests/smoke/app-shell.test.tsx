import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../src/renderer/App";
import {
  appRoutes,
  getActiveNavRouteId,
  navRoutes
} from "../../src/renderer/routes";

const expectedRoutePaths = [
  "/welcome",
  "/workspace",
  "/today",
  "/inbox",
  "/projects",
  "/project-tags",
  "/contacts",
  "/contact-labels",
  "/collections",
  "/tags-categories",
  "/templates",
  "/search",
  "/dashboard",
  "/timeline",
  "/calendar",
  "/workflows",
  "/help",
  "/settings",
  "/trash",
  "/space-budget-primitives"
];

describe("desktop shell routes", () => {
  it("defines the scoped placeholder routes", () => {
    expect(appRoutes.map((route) => route.path)).toEqual(expectedRoutePaths);
  });

  it("exposes planned module routes in sidebar order", () => {
    expect(navRoutes.map((route) => route.label)).toEqual([
      "Today",
      "Inbox",
      "Projects",
      "Project Tags",
      "Contacts",
      "Contact Labels",
      "Collections",
      "Tags & Categories",
      "Templates",
      "Search",
      "Dashboard",
      "Timeline",
      "Calendar",
      "Workflows",
      "Help",
      "Settings",
      "Trash"
    ]);
  });

  it("maps visible routes to the correct active sidebar item", () => {
    expect(
      [
        "/today",
        "/dashboard",
        "/project-tags",
        "/search?q=launch",
        "/settings",
        "/projects",
        "/projects/project_1"
      ].map((path) => getActiveNavRouteId(path.split("?")[0]!))
    ).toEqual([
      "today",
      "dashboard",
      "projectTags",
      "search",
      "settings",
      "projects",
      "projects"
    ]);
  });

  it("keeps the SBUX primitive fixture hidden from primary navigation", () => {
    expect(navRoutes.map((route) => route.path)).not.toContain(
      "/space-budget-primitives"
    );
  });

  it("renders the welcome page", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/welcome"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(html).toContain("Local Work OS");
    expect(html).toContain("Waiting for workspace");
    expect(html).toContain("Network");
  });

  it("renders the app shell for placeholder modules", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/today"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(html).toContain("Skip to workspace content");
    expect(html).toContain("Primary navigation");
    expect(html).toContain("Today");
    expect(html).toContain("Quick Start");
    expect(html).toContain("Commands");
    expect(html).toContain("Ctrl/Cmd K");
  });
});
