import { describe, expect, it } from "vitest";
import { productionRouteManifest } from "../../src/shared/productionRouteManifest";

const requiredPaths = [
  "/welcome",
  "/workspace",
  "/today",
  "/inbox",
  "/projects",
  "/projects/:projectId",
  "/project-tags",
  "/contacts",
  "/contacts/:contactId",
  "/contact-labels",
  "/collections",
  "/tags-categories",
  "/templates",
  "/search?q=operator%20handoff",
  "/dashboard",
  "/timeline",
  "/calendar",
  "/workflows",
  "/help",
  "/settings",
  "/trash"
] as const;

describe("production route manifest", () => {
  it("inventories every regular production route with identity assertions", () => {
    expect(productionRouteManifest.map((route) => route.path)).toEqual(requiredPaths);

    for (const route of productionRouteManifest) {
      expect(route.expectedHeading.trim()).not.toHaveLength(0);
      expect(route.expectedLandmarks.length).toBeGreaterThanOrEqual(2);
      expect(route.screenshotKey).toMatch(/^[a-z0-9-]+$/);
      expect(route.primaryTask.trim()).not.toHaveLength(0);
    }
  });

  it("keeps screenshot keys and route identities distinct for historically confused routes", () => {
    const byId = new Map(productionRouteManifest.map((route) => [route.id, route]));
    const confusedRouteIds = [
      "project-detail",
      "dashboard",
      "calendar",
      "timeline",
      "search",
      "projects"
    ] as const;
    const screenshotKeys = confusedRouteIds.map((id) => byId.get(id)?.screenshotKey);
    const headings = confusedRouteIds.map((id) => byId.get(id)?.expectedHeading);

    expect(new Set(screenshotKeys).size).toBe(confusedRouteIds.length);
    expect(new Set(headings).size).toBe(confusedRouteIds.length);
    expect(byId.get("project-detail")?.path).toBe("/projects/:projectId");
    expect(byId.get("calendar")?.path).toBe("/calendar");
    expect(byId.get("timeline")?.path).toBe("/timeline");
  });
});
