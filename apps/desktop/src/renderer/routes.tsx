export type AppRouteId =
  | "welcome"
  | "workspace"
  | "today"
  | "inbox"
  | "projects"
  | "contacts"
  | "collections"
  | "tagsCategories"
  | "search"
  | "dashboard"
  | "settings";

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
    id: "contacts",
    path: "/contacts",
    label: "Contacts",
    title: "Contacts",
    summary: "Contact and client containers will appear here.",
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
    id: "settings",
    path: "/settings",
    label: "Settings",
    title: "Settings",
    summary: "Local workspace and app settings will appear here.",
    nav: true
  }
] as const satisfies readonly AppRoute[];

export const navRoutes = appRoutes.filter((route) => route.nav);

export function getRouteByPath(pathname: string): AppRoute {
  return (
    appRoutes.find((route) => route.path === pathname) ??
    appRoutes.find((route) => route.path === "/welcome")!
  );
}
