import { t } from "@local-work-os/core";

export type AppRouteId =
  | "welcome"
  | "workspace"
  | "today"
  | "inbox"
  | "projects"
  | "projectTags"
  | "contacts"
  | "contactLabels"
  | "collections"
  | "tagsCategories"
  | "templates"
  | "search"
  | "dashboard"
  | "timeline"
  | "calendar"
  | "workflows"
  | "help"
  | "settings"
  | "trash"
  | "spaceBudgetPrimitives"
  | "searchCollectionsSpaceBudget"
  | "planningSpaceBudget";

export type AppRoute = {
  id: AppRouteId;
  path: string;
  label: string;
  title: string;
  summary: string;
  nav: boolean;
};

export const appRoutes = [
  {
    id: "welcome",
    path: "/welcome",
    label: t("nav.welcome.label"),
    title: t("nav.welcome.title"),
    summary: t("nav.welcome.summary"),
    nav: false
  },
  {
    id: "workspace",
    path: "/workspace",
    label: t("nav.workspace.label"),
    title: t("nav.workspace.title"),
    summary: t("nav.workspace.summary"),
    nav: false
  },
  {
    id: "today",
    path: "/today",
    label: t("nav.today.label"),
    title: t("nav.today.title"),
    summary: t("nav.today.summary"),
    nav: true
  },
  {
    id: "inbox",
    path: "/inbox",
    label: t("nav.inbox.label"),
    title: t("nav.inbox.title"),
    summary: t("nav.inbox.summary"),
    nav: true
  },
  {
    id: "projects",
    path: "/projects",
    label: t("nav.projects.label"),
    title: t("nav.projects.title"),
    summary: t("nav.projects.summary"),
    nav: true
  },
  {
    id: "projectTags",
    path: "/project-tags",
    label: t("nav.projectTags.label"),
    title: t("nav.projectTags.title"),
    summary: t("nav.projectTags.summary"),
    nav: true
  },
  {
    id: "contacts",
    path: "/contacts",
    label: t("nav.contacts.label"),
    title: t("nav.contacts.title"),
    summary: t("nav.contacts.summary"),
    nav: true
  },
  {
    id: "contactLabels",
    path: "/contact-labels",
    label: t("nav.contactLabels.label"),
    title: t("nav.contactLabels.title"),
    summary: t("nav.contactLabels.summary"),
    nav: true
  },
  {
    id: "collections",
    path: "/collections",
    label: t("nav.collections.label"),
    title: t("nav.collections.title"),
    summary: t("nav.collections.summary"),
    nav: true
  },
  {
    id: "tagsCategories",
    path: "/tags-categories",
    label: t("nav.tagsCategories.label"),
    title: t("nav.tagsCategories.title"),
    summary: t("nav.tagsCategories.summary"),
    nav: true
  },
  {
    id: "templates",
    path: "/templates",
    label: t("nav.templates.label"),
    title: t("nav.templates.title"),
    summary: t("nav.templates.summary"),
    nav: true
  },
  {
    id: "search",
    path: "/search",
    label: t("nav.search.label"),
    title: t("nav.search.title"),
    summary: t("nav.search.summary"),
    nav: true
  },
  {
    id: "dashboard",
    path: "/dashboard",
    label: t("nav.dashboard.label"),
    title: t("nav.dashboard.title"),
    summary: t("nav.dashboard.summary"),
    nav: true
  },
  {
    id: "timeline",
    path: "/timeline",
    label: t("nav.timeline.label"),
    title: t("nav.timeline.title"),
    summary: t("nav.timeline.summary"),
    nav: true
  },
  {
    id: "calendar",
    path: "/calendar",
    label: t("nav.calendar.label"),
    title: t("nav.calendar.title"),
    summary: t("nav.calendar.summary"),
    nav: true
  },
  {
    id: "workflows",
    path: "/workflows",
    label: t("nav.workflows.label"),
    title: t("nav.workflows.title"),
    summary: t("nav.workflows.summary"),
    nav: true
  },
  {
    id: "help",
    path: "/help",
    label: t("nav.help.label"),
    title: t("nav.help.title"),
    summary: t("nav.help.summary"),
    nav: true
  },
  {
    id: "settings",
    path: "/settings",
    label: t("nav.settings.label"),
    title: t("nav.settings.title"),
    summary: t("nav.settings.summary"),
    nav: true
  },
  {
    id: "trash",
    path: "/trash",
    label: t("nav.trash.label"),
    title: t("nav.trash.title"),
    summary: t("nav.trash.summary"),
    nav: true
  },
  {
    id: "spaceBudgetPrimitives",
    path: "/space-budget-primitives",
    label: "SBUX Demo",
    title: "SBUX Demo",
    summary: "Hidden SBUX route fixture for shared readable UI primitives.",
    nav: false
  },
  {
    id: "searchCollectionsSpaceBudget",
    path: "/search-collections-space-budget-fixture",
    label: "SBUX Search",
    title: "SBUX Search",
    summary: "Hidden PSE-235 route fixture for readable search, collections, and saved views.",
    nav: false
  },
  {
    id: "planningSpaceBudget",
    path: "/planning-space-budget-fixture",
    label: "SBUX Planning",
    title: "SBUX Planning",
    summary: "Hidden PSE-236 route fixture for readable timeline, calendar, and pipeline planning.",
    nav: false
  }
] as const satisfies readonly AppRoute[];

export const navRoutes = appRoutes.filter((route) => route.nav);

const routeParentByPrefix: Array<{
  id: AppRouteId;
  prefix: string;
}> = [
  { id: "projects", prefix: "/projects/" },
  { id: "contacts", prefix: "/contacts/" }
];

export function getRouteByPath(pathname: string): AppRoute {
  return (
    appRoutes.find((route) => route.path === pathname) ??
    getActiveNavRoute(pathname) ??
    appRoutes.find((route) => route.path === "/welcome")!
  );
}

export function getActiveNavRoute(pathname: string): AppRoute | undefined {
  const exactRoute = navRoutes.find((route) => route.path === pathname);

  if (exactRoute !== undefined) {
    return exactRoute;
  }

  const parentRoute = routeParentByPrefix.find((route) =>
    pathname.startsWith(route.prefix)
  );

  if (parentRoute === undefined) {
    return undefined;
  }

  return navRoutes.find((route) => route.id === parentRoute.id);
}

export function getActiveNavRouteId(pathname: string): AppRouteId | null {
  return getActiveNavRoute(pathname)?.id ?? null;
}
