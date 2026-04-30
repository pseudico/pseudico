import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../src/renderer/App";
import { appRoutes, navRoutes } from "../../src/renderer/routes";

const expectedRoutePaths = [
  "/welcome",
  "/workspace",
  "/today",
  "/inbox",
  "/projects",
  "/contacts",
  "/collections",
  "/tags-categories",
  "/search",
  "/dashboard",
  "/settings"
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
      "Contacts",
      "Collections",
      "Tags & Categories",
      "Search",
      "Dashboard",
      "Settings"
    ]);
  });

  it("renders the welcome page", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/welcome"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(html).toContain("Local Work OS");
    expect(html).toContain("Local shell ready");
    expect(html).toContain("Network");
  });

  it("renders the app shell for placeholder modules", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/today"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(html).toContain("Primary navigation");
    expect(html).toContain("Today");
    expect(html).toContain("Quick add");
  });
});
