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
  "relationships",
  "search",
  "savedViews",
  "today",
  "dashboard",
  "timeline",
  "calendar",
  "backup",
  "export",
  "activity"
] as const;

export type { FeatureModuleContract, FeatureModulePriority } from "./featureModuleContract";
export {
  ActivityService,
  activityModuleContract,
  formatActivityEvent,
  formatActionLabel,
  formatActorLabel,
  formatTargetLabel
} from "./activity";
export type { ActivityEventView } from "./activity";
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
export { ListService, listsModuleContract, parseBulkListItems } from "./lists";
export {
  CategoryService,
  categoriesModuleContract,
  MetadataBrowserService,
  metadataBrowserModuleContract,
  TagService,
  tagsModuleContract
} from "./metadata";
export {
  NoteService,
  extractInlineNoteTags,
  generateNotePreview,
  notesModuleContract
} from "./notes";
export { ProjectService, projectsModuleContract } from "./projects";
export { RelationshipService, relationshipsModuleContract } from "./relationships";
export {
  QueryEvaluator,
  SAVED_VIEW_QUERY_VERSION,
  CollectionService,
  SavedViewService,
  createKeywordCollectionQuery,
  createTagCollectionQuery,
  parseSavedViewQueryJson,
  savedViewsModuleContract,
  stringifySavedViewQuery,
  toCollectionSummary,
  validateSavedViewQuery
} from "./savedViews";
export {
  SearchIndexOrchestrator,
  SearchService,
  searchModuleContract
} from "./search";
export { TaskService, tasksModuleContract } from "./tasks";
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
export type {
  AddListItemInput,
  BulkCreateListItemsInput,
  CreateListInput,
  ListItemMutationResult,
  ListMutationResult,
  ListServiceIdFactory,
  ParsedBulkListItem,
  ReorderListItemsInput,
  UpdateListItemInput
} from "./lists";
export type {
  AddTagToTargetInput,
  AssignCategoryToContainerInput,
  AssignCategoryToItemInput,
  CategoryAssignmentResult,
  CategoryServiceIdFactory,
  CreateCategoryInput,
  DeleteOrArchiveCategoryResult,
  HydrateItemTagsInput,
  ListMetadataTargetsInput,
  RemoveTagFromTargetInput,
  SyncInlineTagsForNoteInput,
  SyncInlineTagsForTaskInput,
  SyncInlineTagsInput,
  SyncInlineTagsResult,
  TagMutationResult,
  TagServiceIdFactory,
  TaggingTargetInput,
  UpdateCategoryInput
} from "./metadata";
export type {
  CreateNoteInput,
  GenerateNotePreviewOptions,
  NoteMutationResult,
  NoteServiceIdFactory,
  UpdateNoteInput
} from "./notes";
export type {
  CreateProjectInput,
  CreateProjectResult,
  ProjectMutableStatus,
  ProjectRecord,
  ProjectServiceIdFactory,
  ProjectStatus,
  UpdateProjectInput
} from "./projects";
export type {
  CreateRelationshipInput,
  ListRelationshipsInput,
  RelationshipEndpoint,
  RelationshipMutationResult,
  RelationshipServiceIdFactory,
  RemoveRelationshipInput
} from "./relationships";
export type {
  CreateSavedViewInput,
  CollectionEvaluationResult,
  CollectionKind,
  CollectionSummary,
  CollectionTaskMutationResult,
  CreateKeywordCollectionInput,
  CreateTagCollectionInput,
  CreateTaskInCollectionInput,
  SavedViewEvaluationResult,
  SavedViewGroupBy,
  SavedViewMutationResult,
  SavedViewQuery,
  SavedViewQueryCondition,
  SavedViewQueryMatch,
  SavedViewQueryTarget,
  SavedViewQueryV1,
  SavedViewQueryValidationResult,
  SavedViewResultGroup,
  SavedViewResultRef,
  SavedViewServiceIdFactory,
  SavedViewSort,
  SavedViewSortDirection,
  SavedViewSortField,
  UpdateSavedViewInput
} from "./savedViews";
export type {
  SearchInput,
  SearchResult,
  SearchResultKind,
  SearchResultTargetType,
  UpsertListIndexResult,
  UpsertSearchTargetInput
} from "./search";
export type {
  CreateTaskInput,
  TaskMutationResult,
  TaskRangeInput,
  TaskServiceIdFactory,
  UpdateTaskInput
} from "./tasks";
export type { TimelineService } from "./timeline";
export type { TodayService } from "./today";
export type { WorkspaceService } from "./workspace";
