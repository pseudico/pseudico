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
  | "search"
  | "dashboard"
  | "timeline"
  | "calendar"
  | "workflows"
  | "settings"
  | "trash";

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
    label: "Welcome",
    title: "Welcome",
    summary: "Create or open a local workspace.",
    nav: false
  },
  {
    id: "workspace",
    path: "/workspace",
    label: "Workspace",
    title: "Workspace Home",
    summary: "Local workspace overview and health.",
    nav: false
  },
  {
    id: "today",
    path: "/today",
    label: "Today",
    title: "Today",
    summary: "Dated, planned, and overdue local work will appear here.",
    nav: true
  },
  {
    id: "inbox",
    path: "/inbox",
    label: "Inbox",
    title: "Inbox",
    summary: "Captured work waiting for triage will appear here.",
    nav: true
  },
  {
    id: "projects",
    path: "/projects",
    label: "Projects",
    title: "Projects",
    summary: "Project containers and mixed work feeds will appear here.",
    nav: true
  },
  {
    id: "projectTags",
    path: "/project-tags",
    label: "Project Tags",
    title: "Project Tag Browser",
    summary: "Facet and drill-down browser for tagged project containers.",
    nav: true
  },
  {
    id: "contacts",
    path: "/contacts",
    label: "Contacts",
    title: "Contacts",
    summary: "Contact and client containers will appear here.",
    nav: true
  },
  {
    id: "contactLabels",
    path: "/contact-labels",
    label: "Contact Labels",
    title: "Contact Label Browser",
    summary: "Facet and grouped browser for contact custom labels and CRM fields.",
    nav: true
  },
  {
    id: "collections",
    path: "/collections",
    label: "Collections",
    title: "Collections",
    summary: "Saved cross-workspace views will appear here.",
    nav: true
  },
  {
    id: "tagsCategories",
    path: "/tags-categories",
    label: "Tags & Categories",
    title: "Tags & Categories",
    summary: "Local classification controls will appear here.",
    nav: true
  },
  {
    id: "search",
    path: "/search",
    label: "Search",
    title: "Search",
    summary: "Local full-text search will appear here.",
    nav: true
  },
  {
    id: "dashboard",
    path: "/dashboard",
    label: "Dashboard",
    title: "Dashboard",
    summary: "Workspace status widgets will appear here.",
    nav: true
  },
  {
    id: "timeline",
    path: "/timeline",
    label: "Timeline",
    title: "Timeline",
    summary: "Dated task workload grouped by project or category.",
    nav: true
  },
  {
    id: "calendar",
    path: "/calendar",
    label: "Calendar",
    title: "Calendar",
    summary: "Month view of local dated tasks and list items.",
    nav: true
  },
  {
    id: "workflows",
    path: "/workflows",
    label: "Workflows",
    title: "Workflows",
    summary: "Versioned local-only manual workflow definitions and validation.",
    nav: true
  },
  {
    id: "settings",
    path: "/settings",
    label: "Settings",
    title: "Settings",
    summary: "Local workspace and app settings will appear here.",
    nav: true
  },
  {
    id: "trash",
    path: "/trash",
    label: "Trash",
    title: "Trash",
    summary: "Restore soft-deleted local records or clear Trash after backup.",
    nav: true
  }
] as const satisfies readonly AppRoute[];

export const navRoutes = appRoutes.filter((route) => route.nav);

export function getRouteByPath(pathname: string): AppRoute {
  return (
    appRoutes.find((route) => route.path === pathname) ??
    (pathname.startsWith("/projects/")
      ? appRoutes.find((route) => route.path === "/projects")
      : pathname.startsWith("/contacts/")
        ? appRoutes.find((route) => route.path === "/contacts")
      : undefined) ??
    appRoutes.find((route) => route.path === "/welcome")!
  );
}
