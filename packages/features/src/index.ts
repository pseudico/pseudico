export const featuresPackageName = "@local-work-os/features";

export const plannedFeatureAreas = [
  "workspace",
  "inbox",
  "items",
  "projects",
  "contacts",
  "tasks",
  "lists",
  "notes",
  "files",
  "links",
  "metadata",
  "search",
  "savedViews",
  "today",
  "dashboard",
  "timeline",
  "calendar",
  "backup",
  "export"
] as const;

export type { FeatureModuleContract, FeatureModulePriority } from "./featureModuleContract";
export { backupModuleContract } from "./backup";
export { calendarModuleContract } from "./calendar";
export { contactsModuleContract } from "./contacts";
export { CreateContainerCommand } from "./containers";
export type {
  CreateContainerCommandIdFactory,
  CreateContainerCommandInput,
  CreateContainerCommandResult
} from "./containers";
export { dashboardModuleContract } from "./dashboard";
export { exportModuleContract } from "./export";
export { filesModuleContract } from "./files";
export { InboxService, inboxModuleContract } from "./inbox";
export { ItemService, itemsModuleContract } from "./items";
export { linksModuleContract } from "./links";
export { listsModuleContract } from "./lists";
export { categoriesModuleContract, tagsModuleContract } from "./metadata";
export { notesModuleContract } from "./notes";
export { ProjectService, projectsModuleContract } from "./projects";
export { savedViewsModuleContract } from "./savedViews";
export { SearchService, searchModuleContract } from "./search";
export { tasksModuleContract } from "./tasks";
export { timelineModuleContract } from "./timeline";
export { todayModuleContract } from "./today";
export { workspaceModuleContract } from "./workspace";
export type { BackupService } from "./backup";
export type { CalendarService } from "./calendar";
export type { ContactService } from "./contacts";
export type { DashboardService } from "./dashboard";
export type { ExportService } from "./export";
export type { FileAttachmentService } from "./files";
export type {
  InboxServiceIdFactory,
  MoveInboxItemToProjectInput
} from "./inbox";
export type {
  CreateItemInput,
  ItemMutationResult,
  ItemServiceIdFactory,
  ListItemsByContainerInput,
  ListItemsByContainerTabInput,
  MoveItemInput,
  UpdateItemInput
} from "./items";
export type { LinkService } from "./links";
export type { ListService } from "./lists";
export type { CategoryService, TagService } from "./metadata";
export type { NoteService } from "./notes";
export type {
  CreateProjectInput,
  CreateProjectResult,
  ProjectMutableStatus,
  ProjectRecord,
  ProjectServiceIdFactory,
  ProjectStatus,
  UpdateProjectInput
} from "./projects";
export type { SavedViewService } from "./savedViews";
export type { TaskService } from "./tasks";
export type { TimelineService } from "./timeline";
export type { TodayService } from "./today";
export type { WorkspaceService } from "./workspace";
