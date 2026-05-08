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
  "import",
  "links",
  "metadata",
  "relationships",
  "reminders",
  "search",
  "savedViews",
  "tabs",
  "today",
  "dashboard",
  "timeline",
  "calendar",
  "backup",
  "export",
  "templates",
  "activity",
  "diagnostics"
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
export { BackupService, backupModuleContract, createBackupManifest } from "./backup";
export {
  CalendarService,
  calendarModuleContract,
  createCalendarMonthRange
} from "./calendar";
export {
  ContactRelationshipService,
  ContactService,
  PROJECT_CONTACT_RELATIONSHIP_LABEL,
  contactsModuleContract
} from "./contacts";
export { CreateContainerCommand } from "./containers";
export type {
  CreateContainerCommandIdFactory,
  CreateContainerCommandInput,
  CreateContainerCommandResult
} from "./containers";
export {
  DashboardService,
  WidgetDataService,
  dashboardModuleContract
} from "./dashboard";
export {
  ExportService,
  ProjectMarkdownExporter,
  TaskCsvExporter,
  createAttachmentManifest,
  exportModuleContract,
  WORKSPACE_EXPORT_SCHEMA_VERSION
} from "./export";
export { FileAttachmentService, filesModuleContract } from "./files";
export { ImportValidationService, importModuleContract } from "./import";
export { IntegrityCheckService, diagnosticsModuleContract } from "./diagnostics";
export { InboxService, inboxModuleContract } from "./inbox";
export { ItemService, itemsModuleContract } from "./items";
export { LinkService, linksModuleContract } from "./links";
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
export { ProjectHealthService, ProjectService, projectsModuleContract } from "./projects";
export { RelationshipService, relationshipsModuleContract } from "./relationships";
export { ReminderService, remindersModuleContract } from "./reminders";
export {
  QueryEvaluator,
  SAVED_VIEW_QUERY_VERSION,
  CollectionService,
  SavedViewService,
  SmartListService,
  createKeywordCollectionQuery,
  createTagCollectionQuery,
  mapFormToSavedViewQuery,
  parseSavedViewQueryJson,
  savedViewsModuleContract,
  stringifySavedViewQuery,
  toCollectionSummary,
  toSmartListSummary,
  validateSavedViewQuery
} from "./savedViews";
export {
  SearchIndexOrchestrator,
  SearchService,
  searchModuleContract
} from "./search";
export { TaskService, tasksModuleContract } from "./tasks";
export {
  ListTemplateService,
  TemplateService,
  TEMPLATE_JSON_VERSION,
  applyRelativeDates,
  templatesModuleContract,
  validateTemplateJson
} from "./templates";
export { TabService, tabsModuleContract } from "./tabs";
export { TimelineService, timelineModuleContract } from "./timeline";
export {
  DEFAULT_TODAY_BACKLOG_DAYS,
  TODAY_BACKLOG_DAYS_SETTING_KEY,
  DailyPlanService,
  normalizePlanDate,
  TodayService,
  todayModuleContract,
  toTodayTaskView
} from "./today";
export { workspaceModuleContract } from "./workspace";
export type {
  BackupFileSystemAdapter,
  BackupManifest,
  BackupManifestAttachment,
  BackupServiceIdFactory,
  BackupSnapshotSummary,
  CreateBackupManifestInput,
  CreateManualBackupInput,
  ListBackupsInput,
  ManualBackupSnapshot
} from "./backup";
export type {
  CalendarDay,
  CalendarItem,
  CalendarMonthInput,
  CalendarMonthRange,
  CalendarMonthViewModel,
  CalendarNavigationTarget
} from "./calendar";
export type {
  AddContactFieldInput,
  ContactFieldInput,
  ContactMutableStatus,
  ContactProjectRelationshipResult,
  ContactRecord,
  ContactServiceIdFactory,
  CreateContactInput,
  CreateContactResult,
  DeleteContactFieldInput,
  LinkContactToProjectInput,
  RelatedContactSummary,
  RelatedProjectSummary,
  UnlinkContactFromProjectInput,
  UpdateContactFieldInput,
  UpdateContactInput
} from "./contacts";
export type {
  DashboardActivityWidgetItem,
  DashboardNavigationTarget,
  DashboardProjectHealthWidgetItem,
  DashboardProjectWidgetItem,
  DashboardServiceIdFactory,
  DashboardTaskWidgetItem,
  DashboardViewModel,
  DashboardWidgetData,
  DashboardWidgetPage,
  DashboardWidgetViewModel,
  GetDefaultDashboardInput,
  WidgetDataQueryInput
} from "./dashboard";
export type {
  BuildProjectMarkdownInput,
  BuildTaskDelimitedExportInput,
  BuildWorkspaceExportInput,
  ExportProjectMarkdownInput,
  ExportFileSystemAdapter,
  ExportServiceIdFactory,
  ExportTasksCsvInput,
  ExportWorkspaceJsonInput,
  ProjectMarkdownExportItem,
  TaskDelimitedExportFormat,
  TaskDelimitedExportRow,
  TextExportResult,
  WorkspaceExportAttachmentManifest,
  WorkspaceExportAttachmentManifestEntry,
  WorkspaceExportV1,
  WorkspaceJsonExportResult,
  WriteExportFileInput,
  WriteTextExportInput
} from "./export";
export type {
  AttachFileToContainerInput,
  AttachFileToItemInput,
  CopiedAttachmentFileInput,
  FileAttachmentMutationResult,
  FileAttachmentServiceIdFactory
} from "./files";
export type {
  ImportValidationCounts,
  ImportValidationFileSystemAdapter,
  ImportValidationIssue,
  ImportValidationSeverity,
  ImportValidationSummary
} from "./import";
export type {
  IntegrityCheckIssue,
  IntegrityCheckKind,
  IntegrityCheckSection,
  IntegrityCheckServiceIdFactory,
  IntegrityCheckStatus,
  IntegrityFileSystemAdapter,
  IntegrityIssueSeverity,
  RepairSystemRowsResult,
  WorkspaceIntegrityReport
} from "./diagnostics";
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
export type {
  CreateLinkInput,
  LinkMutationResult,
  LinkServiceIdFactory,
  UpdateLinkInput
} from "./links";
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
  ProjectHealthQueryInput,
  ProjectHealthSummary,
  ProjectHealthTaskSummary,
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
  ClearTaskReminderInput,
  DismissReminderInput,
  ReminderEventMutationResult,
  ReminderServiceIdFactory,
  RescheduleTaskReminderInput,
  SetTaskReminderInput,
  SnoozeReminderInput,
  TaskReminderMutationResult
} from "./reminders";
export type {
  CreateSavedViewInput,
  CollectionEvaluationResult,
  CollectionKind,
  CollectionSummary,
  CollectionTaskMutationResult,
  CreateKeywordCollectionInput,
  CreateTagCollectionInput,
  CreateTaskInCollectionInput,
  CreateSmartListInput,
  PreviewSmartListInput,
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
  SmartListContainerType,
  SmartListCriteriaForm,
  SmartListDueFilter,
  SmartListPreviewResult,
  SmartListSummary,
  UpdateSmartListInput,
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
  CreateTabInput,
  DeleteTabInput,
  RenameTabInput,
  ReorderTabsInput,
  TabServiceIdFactory
} from "./tabs";
export type {
  CreateTaskInput,
  TaskMutationResult,
  TaskRangeInput,
  TaskServiceIdFactory,
  UpdateTaskInput
} from "./tasks";
export type {
  CreateListFromTemplateInput,
  ListTemplateCreationResult,
  SaveListAsTemplateInput,
  TemplateDateFields,
  TemplateJsonV1,
  TemplateKind,
  TemplateListItemJsonV1,
  TemplateListJsonV1,
  TemplateServiceIdFactory,
  TemplateTagRef
} from "./templates";
export type {
  GroupTimelineItemsInput,
  TimelineDateRange,
  TimelineGroup,
  TimelineGroupBy,
  TimelineItem,
  TimelineItemsInput,
  TimelineRangeInput,
  TimelineTaskNavigationTarget,
  TimelineViewModel
} from "./timeline";
export type {
  DailyPlanDateInput,
  DailyPlanServiceIdFactory,
  GetPlannedTasksInput,
  PlannedTaskView,
  PlanTaskInput,
  ReorderPlannedTaskInput,
  TodayQueryInput,
  TodayTaskView,
  TodayViewModel,
  UnplanTaskInput
} from "./today";
export type { WorkspaceService } from "./workspace";
