export type ProductionRouteKind = "entry" | "primary" | "secondary" | "maintenance";

export type ProductionRouteManifestEntry = {
  id: string;
  path: string;
  title: string;
  expectedHeading: string;
  expectedLandmarks: readonly string[];
  screenshotKey: string;
  seededData: "workspace" | "project" | "contact" | "search" | "timeline" | "none";
  kind: ProductionRouteKind;
  primaryTask: string;
};

export const productionRouteManifest = [
  { id: "welcome", path: "/welcome", title: "Welcome", expectedHeading: "Local Work OS", expectedLandmarks: ["Local-only desktop workspace", "Create workspace", "Recent workspaces"], screenshotKey: "welcome", seededData: "none", kind: "entry", primaryTask: "Open or create a local workspace." },
  { id: "workspace", path: "/workspace", title: "Workspace Home", expectedHeading: "PSE-241 full-app cohesion workspace", expectedLandmarks: ["Pinned and recent work", "Operator feed", "Plan and unblock"], screenshotKey: "workspace-home", seededData: "workspace", kind: "primary", primaryTask: "Scan the local workspace and choose the next safe work item." },
  { id: "today", path: "/today", title: "Today", expectedHeading: "Today", expectedLandmarks: ["Keyboard planner", "Today", "Tomorrow", "Selected task"], screenshotKey: "today", seededData: "workspace", kind: "primary", primaryTask: "Capture, schedule, and inspect the day's work." },
  { id: "inbox", path: "/inbox", title: "Inbox", expectedHeading: "Inbox", expectedLandmarks: ["Triage queue", "New task", "New checklist"], screenshotKey: "inbox", seededData: "workspace", kind: "primary", primaryTask: "Capture and triage unassigned local work." },
  { id: "projects", path: "/projects", title: "Projects", expectedHeading: "Projects", expectedLandmarks: ["Readable project browsing", "Project templates", "Project phase board"], screenshotKey: "projects", seededData: "project", kind: "primary", primaryTask: "Browse, create, and open project work containers." },
  { id: "project-detail", path: "/projects/:projectId", title: "Project Detail", expectedHeading: "Launch Readiness", expectedLandmarks: ["Mixed content feed", "Inspector", "Add work"], screenshotKey: "project-detail", seededData: "project", kind: "primary", primaryTask: "Work inside a mixed-content project room." },
  { id: "project-tags", path: "/project-tags", title: "Project Tags", expectedHeading: "Project Tag Browser", expectedLandmarks: ["Active project filters", "Project tags"], screenshotKey: "project-tags", seededData: "project", kind: "secondary", primaryTask: "Browse project containers by tag without squeezing project names." },
  { id: "contacts", path: "/contacts", title: "Contacts", expectedHeading: "Contacts", expectedLandmarks: ["Contact containers", "New contact", "Browse labels"], screenshotKey: "contacts", seededData: "contact", kind: "primary", primaryTask: "Browse and open contact work containers." },
  { id: "contact-detail", path: "/contacts/:contactId", title: "Contact Detail", expectedHeading: "Maya Chen", expectedLandmarks: ["Content feed", "Profile and linked work", "Follow-up context"], screenshotKey: "contact-detail", seededData: "contact", kind: "primary", primaryTask: "Review contact identity, follow-ups, related work, and activity in one bounded work room." },
  { id: "contact-labels", path: "/contact-labels", title: "Contact Labels", expectedHeading: "Contact Label Browser", expectedLandmarks: ["Active contact filters", "Contact labels"], screenshotKey: "contact-labels", seededData: "contact", kind: "secondary", primaryTask: "Browse contacts by labels and profile fields." },
  { id: "collections", path: "/collections", title: "Collections", expectedHeading: "Collections", expectedLandmarks: ["Saved views", "Collections"], screenshotKey: "collections", seededData: "search", kind: "primary", primaryTask: "Open saved local work views and understand their criteria." },
  { id: "tags-categories", path: "/tags-categories", title: "Tags & Categories", expectedHeading: "Tags & Categories", expectedLandmarks: ["Active metadata filters", "Metadata"], screenshotKey: "tags-categories", seededData: "project", kind: "secondary", primaryTask: "Manage and browse local metadata without hiding labels." },
  { id: "templates", path: "/templates", title: "Templates", expectedHeading: "Local template manager", expectedLandmarks: ["Template library", "Search templates", "Export pack"], screenshotKey: "templates", seededData: "project", kind: "secondary", primaryTask: "Review, import/export, and instantiate local templates safely." },
  { id: "search", path: "/search?q=operator%20handoff", title: "Search", expectedHeading: "Search", expectedLandmarks: ["operator handoff", "Why matched", "Active local records"], screenshotKey: "search", seededData: "search", kind: "primary", primaryTask: "Find cross-object local work and verify why it matched." },
  { id: "dashboard", path: "/dashboard", title: "Dashboard", expectedHeading: "Dashboard", expectedLandmarks: ["Overview", "Edit layout", "recent activity"], screenshotKey: "dashboard", seededData: "workspace", kind: "secondary", primaryTask: "Review actionable local work summaries without analytics clutter." },
  { id: "timeline", path: "/timeline", title: "Timeline", expectedHeading: "Timeline", expectedLandmarks: ["scheduled", "Selected work", "Save filter as view"], screenshotKey: "timeline", seededData: "timeline", kind: "primary", primaryTask: "Scan dated work while full task titles remain readable outside narrow bars." },
  { id: "calendar", path: "/calendar", title: "Calendar", expectedHeading: "Calendar", expectedLandmarks: ["Month", "Week", "Day"], screenshotKey: "calendar", seededData: "timeline", kind: "primary", primaryTask: "Review dated work in calendar form with agenda/detail fallback." },
  { id: "workflows", path: "/workflows", title: "Workflows", expectedHeading: "Workflows", expectedLandmarks: ["scaffold only", "Local registry", "No run UI"], screenshotKey: "workflows", seededData: "none", kind: "maintenance", primaryTask: "Understand workflow scaffold safety boundaries without mistaking it for daily automation." },
  { id: "help", path: "/help", title: "Help", expectedHeading: "Help center and onboarding", expectedLandmarks: ["Local Markdown guides", "Useful from here", "Command palette"], screenshotKey: "help", seededData: "none", kind: "secondary", primaryTask: "Read local help and onboarding guidance." },
  { id: "settings", path: "/settings", title: "Settings", expectedHeading: "Settings", expectedLandmarks: ["Operator settings", "Backups", "Local"], screenshotKey: "settings", seededData: "none", kind: "maintenance", primaryTask: "Adjust local-only settings and maintenance actions safely." },
  { id: "trash", path: "/trash", title: "Trash", expectedHeading: "Trash", expectedLandmarks: ["Clear Trash", "soft-deleted records", "Trash controls"], screenshotKey: "trash", seededData: "none", kind: "maintenance", primaryTask: "Review and restore soft-deleted local data before destructive cleanup." }
] as const satisfies readonly ProductionRouteManifestEntry[];

export type ProductionRouteId = (typeof productionRouteManifest)[number]["id"];

export function getProductionRouteManifestEntry(id: ProductionRouteId | string): ProductionRouteManifestEntry | undefined {
  return productionRouteManifest.find((entry) => entry.id === id);
}
