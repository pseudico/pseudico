import type {
  NavigationRecentTargetSummary,
  NavigationTargetType
} from "../../preload/api";
import { appRoutes, getRouteByPath } from "../routes";

export type NavigationRouteTarget = {
  targetType: NavigationTargetType;
  targetId: string | null;
  path: string;
  label: string;
  subtitle: string | null;
};

export function createNavigationTargetFromLocation(input: {
  pathname: string;
  search?: string;
}): NavigationRouteTarget | null {
  const routePath = `${input.pathname}${input.search ?? ""}`;

  if (input.pathname === "/welcome") {
    return null;
  }

  const projectItemId = new URLSearchParams(input.search ?? "").get("item");
  const projectMatch = /^\/projects\/([^/]+)$/.exec(input.pathname);

  if (projectMatch?.[1] !== undefined) {
    const projectId = decodeURIComponent(projectMatch[1]);

    if (projectItemId !== null && projectItemId.trim().length > 0) {
      return {
        targetType: "item",
        targetId: projectItemId,
        path: routePath,
        label: "Project item",
        subtitle: "Recently opened item context"
      };
    }

    return {
      targetType: "container",
      targetId: projectId,
      path: routePath,
      label: "Project",
      subtitle: "Recently opened project"
    };
  }

  const contactMatch = /^\/contacts\/([^/]+)$/.exec(input.pathname);

  if (contactMatch?.[1] !== undefined) {
    return {
      targetType: "container",
      targetId: decodeURIComponent(contactMatch[1]),
      path: routePath,
      label: "Contact",
      subtitle: "Recently opened contact"
    };
  }

  const matchedRoute = getRouteByPath(input.pathname);

  if (!appRoutes.some((route) => route.path === matchedRoute.path)) {
    return null;
  }

  return {
    targetType: "view",
    targetId: matchedRoute.id,
    path: routePath,
    label: matchedRoute.label,
    subtitle: matchedRoute.summary
  };
}

export function createAppTabTargetFromLocation(input: {
  pathname: string;
  search?: string;
}): NavigationRouteTarget | null {
  const target = createNavigationTargetFromLocation(input);

  if (target === null) {
    return null;
  }

  if (target.targetType === "item") {
    return target;
  }

  if (target.targetType === "container") {
    return target;
  }

  if (
    target.targetType === "view" &&
    (target.targetId === "projects" ||
      target.targetId === "contacts" ||
      target.targetId === "search" ||
      target.targetId === "collections")
  ) {
    return target;
  }

  return null;
}

export function getRecentTargetDestination(
  target: NavigationRecentTargetSummary
): string {
  return target.path.startsWith("/") ? target.path : "/workspace";
}
