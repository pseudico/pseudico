export type ApiErrorCode =
  | "INVALID_INPUT"
  | "IPC_ERROR"
  | "NOT_IMPLEMENTED"
  | "WORKSPACE_ERROR"
  | "UNKNOWN_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
};

export type ApiResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: ApiError;
    };

export type WorkspaceSummary = {
  id: string;
  name: string;
  rootPath: string;
  openedAt: string;
  schemaVersion: number | null;
};

export type RecentWorkspace = {
  name: string;
  rootPath: string;
  lastOpenedAt: string;
};

export type WorkspaceManifest = {
  id: string;
  name: string;
  schemaVersion: number;
  createdAt: string;
  lastOpenedAt: string;
  app: {
    name: "Local Work OS";
    workspaceFormat: 1;
  };
};

export type WorkspacePaths = {
  workspaceRootPath: string;
  manifestPath: string;
  dataPath: string;
  databasePath: string;
  attachmentsPath: string;
  backupsPath: string;
  exportsPath: string;
  logsPath: string;
};

export type WorkspaceValidationProblem = {
  code: string;
  message: string;
  severity: "error" | "warning";
  repairable: boolean;
  path?: string;
};

export type WorkspaceValidationResult = {
  ok: boolean;
  workspaceRootPath: string;
  paths: WorkspacePaths;
  problems: WorkspaceValidationProblem[];
  manifest?: WorkspaceManifest;
};

export type CreateWorkspaceInput = {
  name: string;
  rootPath: string;
};

export type OpenWorkspaceInput = {
  rootPath: string;
};

export type ValidateWorkspaceInput = {
  rootPath: string;
  repair?: boolean;
};

export type DatabaseHealthStatus = {
  connected: boolean;
  schemaVersion: number | null;
  workspaceExists: boolean;
  inboxExists: boolean;
  defaultDashboardExists: boolean;
  activityLogAvailable: boolean;
  searchIndexAvailable: boolean;
  databasePath: string | null;
  error: string | null;
};

export type ProjectStatus = "active" | "waiting" | "completed" | "archived";
export type ProjectMutableStatus = Exclude<ProjectStatus, "archived">;

export type ProjectSummary = {
  id: string;
  workspaceId: string;
  type: "project";
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  categoryId: string | null;
  color: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type InboxSummary = {
  id: string;
  workspaceId: string;
  type: "inbox";
  name: string;
  slug: string;
  description: string | null;
  status: ProjectStatus;
  categoryId: string | null;
  color: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ItemSummary = {
  id: string;
  workspaceId: string;
  containerId: string;
  containerTabId: string | null;
  type: string;
  title: string;
  body: string | null;
  categoryId: string | null;
  status: string;
  sortOrder: number;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
  deletedAt: string | null;
  tags?: ItemTagSummary[];
};

export type ItemTagSummary = {
  id: string;
  name: string;
  slug: string;
  source: "inline" | "manual" | "imported";
};

export type CategorySummary = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TagCountSummary = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  targetCount: number;
};

export type CategoryCountSummary = CategorySummary & {
  targetCount: number;
};

export type MetadataTargetType = "container" | "item" | "list_item";

export type MetadataTargetCategorySummary = {
  id: string;
  name: string;
  slug: string;
  color: string;
};

export type MetadataTargetSummary = {
  targetType: MetadataTargetType;
  targetId: string;
  workspaceId: string;
  kind: string;
  title: string;
  body: string | null;
  status: string;
  category: MetadataTargetCategorySummary | null;
  tags: ItemTagSummary[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type SearchResultKind =
  | "inbox"
  | "project"
  | "contact"
  | "task"
  | "list"
  | "note"
  | "file"
  | "link"
  | "heading"
  | "location"
  | "comment"
  | "list_item"
  | "unknown";

export type SearchWorkspaceInput = {
  workspaceId?: string;
  query: string;
  kinds?: SearchResultKind[];
  limit?: number;
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export type SearchResultSummary = {
  id: string;
  workspaceId: string;
  targetType: "container" | "item" | "list_item";
  targetId: string;
  kind: SearchResultKind;
  title: string;
  body: string | null;
  status: string | null;
  tags: string[];
  category: string | null;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
  containerId: string | null;
  containerTitle: string | null;
  parentItemId: string | null;
  parentItemTitle: string | null;
  destinationPath: string | null;
};

export type CollectionKind = "tag" | "keyword" | "custom";

export type CollectionSummary = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  kind: CollectionKind;
  tagSlug: string | null;
  keyword: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CollectionResultSummary = {
  targetType: "container" | "item";
  targetId: string;
  kind: string;
  title: string;
  containerId: string;
  containerType: string;
  containerTitle: string;
  categoryId: string | null;
  categoryName: string | null;
  taskStatus: string | null;
  dueAt: string | null;
  tags: string[];
  destinationPath: string;
};

export type CollectionResultGroupSummary = {
  key: string;
  label: string;
  results: CollectionResultSummary[];
};

export type CollectionEvaluationSummary = {
  collection: CollectionSummary;
  total: number;
  results: CollectionResultSummary[];
  groups: CollectionResultGroupSummary[];
};

export type TodayTaskSummary = {
  itemId: string;
  workspaceId: string;
  containerId: string;
  containerTabId: string | null;
  title: string;
  body: string | null;
  categoryId: string | null;
  itemStatus: string;
  taskStatus: TaskStatus;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  timezone: string | null;
  sortOrder: number;
  plannedLane: DailyPlanLane | null;
  plannedSortOrder: number | null;
  addedManually: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DailyPlanLane = "today" | "tomorrow" | "backlog";

export type DailyPlanSummary = {
  id: string;
  workspaceId: string;
  planDate: string;
  createdAt: string;
  updatedAt: string;
};

export type DailyPlanItemSummary = {
  id: string;
  workspaceId: string;
  dailyPlanId: string;
  itemType: "task" | "item" | "list_item";
  itemId: string;
  lane: DailyPlanLane;
  sortOrder: number;
  addedManually: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PlannedTaskSummary = TodayTaskSummary & {
  planItemId: string;
  lane: DailyPlanLane;
  plannedSortOrder: number;
};

export type TodayDateRangeSummary = {
  startInclusive: string;
  endExclusive: string;
};

export type TodayViewModelSummary = {
  workspaceId: string;
  generatedAt: string;
  localDate: string;
  backlogDays: number;
  ranges: {
    today: TodayDateRangeSummary;
    overdueBacklog: TodayDateRangeSummary;
    tomorrow: TodayDateRangeSummary;
  };
  dueToday: TodayTaskSummary[];
  overdueBacklog: TodayTaskSummary[];
  tomorrowPreview: TodayTaskSummary[];
};

export type TodayViewModelInput = {
  workspaceId?: string;
  date?: string | Date;
  backlogDays?: number;
};

export type DailyPlanDateInput = {
  workspaceId?: string;
  date?: string | Date;
};

export type PlanTaskInput = DailyPlanDateInput & {
  itemId: string;
  lane: DailyPlanLane;
  sortOrder?: number;
};

export type UnplanTaskInput = DailyPlanDateInput & {
  itemId: string;
  lane?: DailyPlanLane;
};

export type ReorderPlannedTaskInput = DailyPlanDateInput & {
  itemId: string;
  lane: DailyPlanLane;
  sortOrder: number;
};

export type GetPlannedTasksInput = DailyPlanDateInput & {
  lane?: DailyPlanLane;
};

export type CreateTagCollectionInput = {
  workspaceId?: string;
  tagSlug: string;
  name?: string;
  description?: string | null;
};

export type CreateKeywordCollectionInput = {
  workspaceId?: string;
  query: string;
  name?: string;
  description?: string | null;
};

export type CreateTaskInCollectionInput = CreateTaskInput & {
  collectionId: string;
};

export type ListTargetsByMetadataInput = {
  workspaceId?: string;
  tagSlugs?: string[];
  categoryId?: string | null;
  categorySlug?: string | null;
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export type CreateCategoryInput = {
  workspaceId?: string;
  name: string;
  color: string;
  description?: string | null;
};

export type UpdateCategoryInput = {
  categoryId: string;
  name?: string;
  color?: string;
  description?: string | null;
};

export type AssignCategoryToProjectInput = {
  projectId: string;
  categoryId?: string | null;
};

export type AssignCategoryToItemInput = {
  itemId: string;
  categoryId?: string | null;
};

export type CreateProjectInput = {
  workspaceId?: string;
  name: string;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  isFavorite?: boolean;
  slug?: string;
  sortOrder?: number;
};

export type CreateProjectResult = {
  project: ProjectSummary;
  defaultTabId: string;
};

export type UpdateProjectInput = {
  projectId: string;
  categoryId?: string | null;
  color?: string | null;
  description?: string | null;
  isFavorite?: boolean;
  name?: string;
  slug?: string;
  sortOrder?: number;
  status?: ProjectMutableStatus;
};

export type MoveInboxItemToProjectInput = {
  itemId: string;
  projectId: string;
};

export type MoveItemInput = {
  itemId: string;
  targetContainerId: string;
  targetContainerTabId?: string | null;
  sortOrder?: number;
};

export type ActivitySummary = {
  id: string;
  workspaceId: string;
  actorType: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
  actionLabel: string;
  actorLabel: string;
  targetLabel: string;
  description: string;
};

export type ListRecentActivityInput = {
  workspaceId?: string;
  limit?: number;
};

export type ListActivityForTargetInput = {
  targetType: string;
  targetId: string;
  limit?: number;
};

export type ItemInspectorSummary = {
  item: ItemSummary;
  activity: ActivitySummary[];
};

export type TaskStatus = "open" | "done" | "waiting" | "cancelled";
export type ListItemStatus = "open" | "done" | "waiting" | "cancelled";
export type ListDisplayMode = "checklist" | "pipeline";
export type ListProgressMode = "count" | "manual" | "none";
export type NoteFormat = "markdown";

export type TaskSummary = ItemSummary & {
  type: "task";
  taskStatus: TaskStatus;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  timezone: string | null;
  taskCompletedAt: string | null;
  taskCreatedAt: string;
  taskUpdatedAt: string;
};

export type CreateTaskInput = {
  workspaceId?: string;
  containerId: string;
  title: string;
  actorType?: "local_user" | "system" | "importer";
  body?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  priority?: number | null;
  status?: TaskStatus;
  allDay?: boolean;
  timezone?: string | null;
  sortOrder?: number;
  pinned?: boolean;
};

export type UpdateTaskInput = {
  itemId: string;
  actorType?: "local_user" | "system" | "importer";
  title?: string;
  body?: string | null;
  categoryId?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  priority?: number | null;
  status?: TaskStatus;
  allDay?: boolean;
  timezone?: string | null;
  sortOrder?: number;
  pinned?: boolean;
  containerTabId?: string | null;
};

export type ListItemSummary = {
  id: string;
  workspaceId: string;
  listItemParentId: string | null;
  listId: string;
  title: string;
  body: string | null;
  status: ListItemStatus;
  depth: number;
  sortOrder: number;
  startAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ListSummary = ItemSummary & {
  type: "list";
  displayMode: ListDisplayMode;
  showCompleted: boolean;
  progressMode: ListProgressMode;
  listCreatedAt: string;
  listUpdatedAt: string;
  items: ListItemSummary[];
};

export type CreateListInput = {
  workspaceId?: string;
  containerId: string;
  title: string;
  actorType?: "local_user" | "system" | "importer";
  body?: string | null;
  categoryId?: string | null;
  containerTabId?: string | null;
  displayMode?: ListDisplayMode;
  showCompleted?: boolean;
  progressMode?: ListProgressMode;
  sortOrder?: number;
  pinned?: boolean;
};

export type AddListItemInput = {
  listId: string;
  title: string;
  actorType?: "local_user" | "system" | "importer";
  body?: string | null;
  status?: ListItemStatus;
  depth?: number;
  sortOrder?: number;
  listItemParentId?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
};

export type UpdateListItemInput = {
  listItemId: string;
  actorType?: "local_user" | "system" | "importer";
  title?: string;
  body?: string | null;
  status?: ListItemStatus;
  depth?: number;
  sortOrder?: number;
  listItemParentId?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
};

export type BulkAddListItemsInput = {
  listId: string;
  text: string;
  actorType?: "local_user" | "system" | "importer";
  startSortOrder?: number;
};

export type NoteSummary = ItemSummary & {
  type: "note";
  format: NoteFormat;
  content: string;
  preview: string | null;
  noteCreatedAt: string;
  noteUpdatedAt: string;
};

export type CreateNoteInput = {
  workspaceId?: string;
  containerId: string;
  title: string;
  content: string;
  actorType?: "local_user" | "system" | "importer";
  categoryId?: string | null;
  containerTabId?: string | null;
  format?: NoteFormat;
  sortOrder?: number;
  pinned?: boolean;
};

export type UpdateNoteInput = {
  itemId: string;
  actorType?: "local_user" | "system" | "importer";
  title?: string;
  content?: string;
  categoryId?: string | null;
  containerTabId?: string | null;
  sortOrder?: number;
  pinned?: boolean;
};

export type LocalWorkOsModuleName =
  | "containers"
  | "items"
  | "files";

export type IpcModuleStatus = {
  module: LocalWorkOsModuleName;
  available: boolean;
  implemented: boolean;
  message: string;
};

export const LOCAL_WORK_OS_IPC_CHANNELS = {
  workspace: {
    createWorkspace: "local-work-os:workspace:create-workspace",
    openWorkspace: "local-work-os:workspace:open-workspace",
    validateWorkspace: "local-work-os:workspace:validate-workspace",
    getCurrentWorkspace: "local-work-os:workspace:get-current-workspace",
    listRecentWorkspaces: "local-work-os:workspace:list-recent-workspaces"
  },
  database: {
    getHealthStatus: "local-work-os:database:get-health-status"
  },
  inbox: {
    getInbox: "local-work-os:inbox:get-inbox",
    listItems: "local-work-os:inbox:list-items",
    moveItemToProject: "local-work-os:inbox:move-item-to-project"
  },
  tasks: {
    createTask: "local-work-os:tasks:create-task",
    updateTask: "local-work-os:tasks:update-task",
    completeTask: "local-work-os:tasks:complete-task",
    reopenTask: "local-work-os:tasks:reopen-task",
    listByContainer: "local-work-os:tasks:list-by-container"
  },
  lists: {
    createList: "local-work-os:lists:create-list",
    addItem: "local-work-os:lists:add-item",
    updateItem: "local-work-os:lists:update-item",
    completeItem: "local-work-os:lists:complete-item",
    reopenItem: "local-work-os:lists:reopen-item",
    bulkAddItems: "local-work-os:lists:bulk-add-items",
    listByContainer: "local-work-os:lists:list-by-container"
  },
  notes: {
    createNote: "local-work-os:notes:create-note",
    updateNote: "local-work-os:notes:update-note",
    listByContainer: "local-work-os:notes:list-by-container"
  },
  projects: {
    createProject: "local-work-os:projects:create-project",
    updateProject: "local-work-os:projects:update-project",
    archiveProject: "local-work-os:projects:archive-project",
    softDeleteProject: "local-work-os:projects:soft-delete-project",
    listProjects: "local-work-os:projects:list-projects",
    getProject: "local-work-os:projects:get-project"
  },
  categories: {
    createCategory: "local-work-os:categories:create-category",
    updateCategory: "local-work-os:categories:update-category",
    deleteCategory: "local-work-os:categories:delete-category",
    listCategories: "local-work-os:categories:list-categories",
    assignToProject: "local-work-os:categories:assign-to-project",
    assignToItem: "local-work-os:categories:assign-to-item"
  },
  metadata: {
    listTagsWithCounts: "local-work-os:metadata:list-tags-with-counts",
    listCategoriesWithCounts:
      "local-work-os:metadata:list-categories-with-counts",
    listTargetsByMetadata: "local-work-os:metadata:list-targets-by-metadata"
  },
  search: {
    searchWorkspace: "local-work-os:search:search-workspace"
  },
  collections: {
    listCollections: "local-work-os:collections:list-collections",
    createTagCollection: "local-work-os:collections:create-tag-collection",
    createKeywordCollection:
      "local-work-os:collections:create-keyword-collection",
    evaluateCollection: "local-work-os:collections:evaluate-collection",
    createTaskInCollection:
      "local-work-os:collections:create-task-in-collection"
  },
  today: {
    getViewModel: "local-work-os:today:get-view-model",
    getOrCreateDailyPlan: "local-work-os:today:get-or-create-daily-plan",
    planTask: "local-work-os:today:plan-task",
    unplanTask: "local-work-os:today:unplan-task",
    reorderPlannedTask: "local-work-os:today:reorder-planned-task",
    getPlannedTasks: "local-work-os:today:get-planned-tasks"
  },
  activity: {
    listRecentActivity: "local-work-os:activity:list-recent-activity",
    listActivityForTarget: "local-work-os:activity:list-activity-for-target"
  },
  containers: {
    getStatus: "local-work-os:containers:get-status"
  },
  items: {
    getStatus: "local-work-os:items:get-status",
    moveItem: "local-work-os:items:move-item",
    archiveItem: "local-work-os:items:archive-item",
    softDeleteItem: "local-work-os:items:soft-delete-item",
    getItemActivity: "local-work-os:items:get-item-activity",
    openItemInspector: "local-work-os:items:open-item-inspector"
  },
  files: {
    getStatus: "local-work-os:files:get-status"
  }
} as const;

export type LocalWorkOsIpcContracts = {
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.createWorkspace]: {
    input: CreateWorkspaceInput;
    result: ApiResult<WorkspaceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.openWorkspace]: {
    input: OpenWorkspaceInput;
    result: ApiResult<WorkspaceSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.validateWorkspace]: {
    input: ValidateWorkspaceInput;
    result: ApiResult<WorkspaceValidationResult>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace]: {
    input: undefined;
    result: ApiResult<WorkspaceSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.workspace.listRecentWorkspaces]: {
    input: undefined;
    result: ApiResult<RecentWorkspace[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.database.getHealthStatus]: {
    input: undefined;
    result: ApiResult<DatabaseHealthStatus>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.inbox.getInbox]: {
    input: string | undefined;
    result: ApiResult<InboxSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.inbox.listItems]: {
    input: string | undefined;
    result: ApiResult<ItemSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.inbox.moveItemToProject]: {
    input: MoveInboxItemToProjectInput;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask]: {
    input: CreateTaskInput;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask]: {
    input: UpdateTaskInput;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask]: {
    input: string;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask]: {
    input: string;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.tasks.listByContainer]: {
    input: string;
    result: ApiResult<TaskSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.createList]: {
    input: CreateListInput;
    result: ApiResult<ListSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.addItem]: {
    input: AddListItemInput;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.updateItem]: {
    input: UpdateListItemInput;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.completeItem]: {
    input: string;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.reopenItem]: {
    input: string;
    result: ApiResult<ListItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.bulkAddItems]: {
    input: BulkAddListItemsInput;
    result: ApiResult<ListItemSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.lists.listByContainer]: {
    input: string;
    result: ApiResult<ListSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.notes.createNote]: {
    input: CreateNoteInput;
    result: ApiResult<NoteSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.notes.updateNote]: {
    input: UpdateNoteInput;
    result: ApiResult<NoteSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.notes.listByContainer]: {
    input: string;
    result: ApiResult<NoteSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject]: {
    input: CreateProjectInput;
    result: ApiResult<CreateProjectResult>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.updateProject]: {
    input: UpdateProjectInput;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject]: {
    input: string;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.softDeleteProject]: {
    input: string;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.listProjects]: {
    input: string | undefined;
    result: ApiResult<ProjectSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.projects.getProject]: {
    input: string;
    result: ApiResult<ProjectSummary | null>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.createCategory]: {
    input: CreateCategoryInput;
    result: ApiResult<CategorySummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.updateCategory]: {
    input: UpdateCategoryInput;
    result: ApiResult<CategorySummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.deleteCategory]: {
    input: string;
    result: ApiResult<CategorySummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.listCategories]: {
    input: string | undefined;
    result: ApiResult<CategorySummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToProject]: {
    input: AssignCategoryToProjectInput;
    result: ApiResult<ProjectSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToItem]: {
    input: AssignCategoryToItemInput;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTagsWithCounts]: {
    input: string | undefined;
    result: ApiResult<TagCountSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.metadata.listCategoriesWithCounts]: {
    input: string | undefined;
    result: ApiResult<CategoryCountSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTargetsByMetadata]: {
    input: ListTargetsByMetadataInput;
    result: ApiResult<MetadataTargetSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.search.searchWorkspace]: {
    input: SearchWorkspaceInput;
    result: ApiResult<SearchResultSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.listCollections]: {
    input: string | undefined;
    result: ApiResult<CollectionSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.createTagCollection]: {
    input: CreateTagCollectionInput;
    result: ApiResult<CollectionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.createKeywordCollection]: {
    input: CreateKeywordCollectionInput;
    result: ApiResult<CollectionSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.evaluateCollection]: {
    input: string;
    result: ApiResult<CollectionEvaluationSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.collections.createTaskInCollection]: {
    input: CreateTaskInCollectionInput;
    result: ApiResult<TaskSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.getViewModel]: {
    input: TodayViewModelInput | undefined;
    result: ApiResult<TodayViewModelSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.getOrCreateDailyPlan]: {
    input: DailyPlanDateInput | undefined;
    result: ApiResult<DailyPlanSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.planTask]: {
    input: PlanTaskInput;
    result: ApiResult<DailyPlanItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.unplanTask]: {
    input: UnplanTaskInput;
    result: ApiResult<DailyPlanItemSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.reorderPlannedTask]: {
    input: ReorderPlannedTaskInput;
    result: ApiResult<DailyPlanItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.today.getPlannedTasks]: {
    input: GetPlannedTasksInput | undefined;
    result: ApiResult<PlannedTaskSummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.activity.listRecentActivity]: {
    input: ListRecentActivityInput | undefined;
    result: ApiResult<ActivitySummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.activity.listActivityForTarget]: {
    input: ListActivityForTargetInput;
    result: ApiResult<ActivitySummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.containers.getStatus]: {
    input: undefined;
    result: ApiResult<IpcModuleStatus>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.getStatus]: {
    input: undefined;
    result: ApiResult<IpcModuleStatus>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.moveItem]: {
    input: MoveItemInput;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.archiveItem]: {
    input: string;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.softDeleteItem]: {
    input: string;
    result: ApiResult<ItemSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.getItemActivity]: {
    input: string;
    result: ApiResult<ActivitySummary[]>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.items.openItemInspector]: {
    input: string;
    result: ApiResult<ItemInspectorSummary>;
  };
  [LOCAL_WORK_OS_IPC_CHANNELS.files.getStatus]: {
    input: undefined;
    result: ApiResult<IpcModuleStatus>;
  };
};

export type LocalWorkOsIpcChannel = keyof LocalWorkOsIpcContracts & string;

export type LocalWorkOsIpcInput<Channel extends LocalWorkOsIpcChannel> =
  LocalWorkOsIpcContracts[Channel]["input"];

export type LocalWorkOsIpcResult<Channel extends LocalWorkOsIpcChannel> =
  LocalWorkOsIpcContracts[Channel]["result"];

export type LocalWorkOsIpcInvoke = <Channel extends LocalWorkOsIpcChannel>(
  channel: Channel,
  input: LocalWorkOsIpcInput<Channel>
) => Promise<LocalWorkOsIpcResult<Channel>>;

export type LocalWorkOsApi = {
  workspace: {
    createWorkspace: (
      input: CreateWorkspaceInput
    ) => Promise<ApiResult<WorkspaceSummary>>;
    openWorkspace: (
      input: OpenWorkspaceInput
    ) => Promise<ApiResult<WorkspaceSummary>>;
    validateWorkspace: (
      input: ValidateWorkspaceInput
    ) => Promise<ApiResult<WorkspaceValidationResult>>;
    getCurrentWorkspace: () => Promise<ApiResult<WorkspaceSummary | null>>;
    listRecentWorkspaces: () => Promise<ApiResult<RecentWorkspace[]>>;
  };
  database: {
    getHealthStatus: () => Promise<ApiResult<DatabaseHealthStatus>>;
  };
  inbox: {
    getInbox: (workspaceId?: string) => Promise<ApiResult<InboxSummary>>;
    listItems: (workspaceId?: string) => Promise<ApiResult<ItemSummary[]>>;
    moveItemToProject: (
      input: MoveInboxItemToProjectInput
    ) => Promise<ApiResult<ItemSummary>>;
  };
  tasks: {
    create: (input: CreateTaskInput) => Promise<ApiResult<TaskSummary>>;
    update: (input: UpdateTaskInput) => Promise<ApiResult<TaskSummary>>;
    complete: (itemId: string) => Promise<ApiResult<TaskSummary>>;
    reopen: (itemId: string) => Promise<ApiResult<TaskSummary>>;
    listByContainer: (
      containerId: string
    ) => Promise<ApiResult<TaskSummary[]>>;
    createTask: (input: CreateTaskInput) => Promise<ApiResult<TaskSummary>>;
    updateTask: (input: UpdateTaskInput) => Promise<ApiResult<TaskSummary>>;
    completeTask: (itemId: string) => Promise<ApiResult<TaskSummary>>;
    reopenTask: (itemId: string) => Promise<ApiResult<TaskSummary>>;
  };
  lists: {
    create: (input: CreateListInput) => Promise<ApiResult<ListSummary>>;
    addItem: (input: AddListItemInput) => Promise<ApiResult<ListItemSummary>>;
    updateItem: (
      input: UpdateListItemInput
    ) => Promise<ApiResult<ListItemSummary>>;
    completeItem: (listItemId: string) => Promise<ApiResult<ListItemSummary>>;
    reopenItem: (listItemId: string) => Promise<ApiResult<ListItemSummary>>;
    bulkAddItems: (
      input: BulkAddListItemsInput
    ) => Promise<ApiResult<ListItemSummary[]>>;
    listByContainer: (
      containerId: string
    ) => Promise<ApiResult<ListSummary[]>>;
    createList: (input: CreateListInput) => Promise<ApiResult<ListSummary>>;
  };
  notes: {
    create: (input: CreateNoteInput) => Promise<ApiResult<NoteSummary>>;
    update: (input: UpdateNoteInput) => Promise<ApiResult<NoteSummary>>;
    listByContainer: (
      containerId: string
    ) => Promise<ApiResult<NoteSummary[]>>;
    createNote: (input: CreateNoteInput) => Promise<ApiResult<NoteSummary>>;
    updateNote: (input: UpdateNoteInput) => Promise<ApiResult<NoteSummary>>;
  };
  projects: {
    create: (
      input: CreateProjectInput
    ) => Promise<ApiResult<CreateProjectResult>>;
    update: (
      input: UpdateProjectInput
    ) => Promise<ApiResult<ProjectSummary>>;
    archive: (projectId: string) => Promise<ApiResult<ProjectSummary>>;
    softDelete: (projectId: string) => Promise<ApiResult<ProjectSummary>>;
    list: (
      workspaceId?: string
    ) => Promise<ApiResult<ProjectSummary[]>>;
    get: (projectId: string) => Promise<ApiResult<ProjectSummary | null>>;
    createProject: (
      input: CreateProjectInput
    ) => Promise<ApiResult<CreateProjectResult>>;
    updateProject: (
      input: UpdateProjectInput
    ) => Promise<ApiResult<ProjectSummary>>;
    archiveProject: (projectId: string) => Promise<ApiResult<ProjectSummary>>;
    softDeleteProject: (projectId: string) => Promise<ApiResult<ProjectSummary>>;
    listProjects: (
      workspaceId?: string
    ) => Promise<ApiResult<ProjectSummary[]>>;
    getProject: (projectId: string) => Promise<ApiResult<ProjectSummary | null>>;
  };
  categories: {
    create: (input: CreateCategoryInput) => Promise<ApiResult<CategorySummary>>;
    update: (input: UpdateCategoryInput) => Promise<ApiResult<CategorySummary>>;
    delete: (categoryId: string) => Promise<ApiResult<CategorySummary>>;
    list: (workspaceId?: string) => Promise<ApiResult<CategorySummary[]>>;
    assignToProject: (
      input: AssignCategoryToProjectInput
    ) => Promise<ApiResult<ProjectSummary>>;
    assignToItem: (
      input: AssignCategoryToItemInput
    ) => Promise<ApiResult<ItemSummary>>;
    createCategory: (
      input: CreateCategoryInput
    ) => Promise<ApiResult<CategorySummary>>;
    updateCategory: (
      input: UpdateCategoryInput
    ) => Promise<ApiResult<CategorySummary>>;
    deleteCategory: (categoryId: string) => Promise<ApiResult<CategorySummary>>;
    listCategories: (
      workspaceId?: string
    ) => Promise<ApiResult<CategorySummary[]>>;
  };
  metadata: {
    listTagsWithCounts: (
      workspaceId?: string
    ) => Promise<ApiResult<TagCountSummary[]>>;
    listCategoriesWithCounts: (
      workspaceId?: string
    ) => Promise<ApiResult<CategoryCountSummary[]>>;
    listTargetsByMetadata: (
      input: ListTargetsByMetadataInput
    ) => Promise<ApiResult<MetadataTargetSummary[]>>;
  };
  search: {
    searchWorkspace: (
      input: SearchWorkspaceInput
    ) => Promise<ApiResult<SearchResultSummary[]>>;
  };
  collections: {
    listCollections: (
      workspaceId?: string
    ) => Promise<ApiResult<CollectionSummary[]>>;
    createTagCollection: (
      input: CreateTagCollectionInput
    ) => Promise<ApiResult<CollectionSummary>>;
    createKeywordCollection: (
      input: CreateKeywordCollectionInput
    ) => Promise<ApiResult<CollectionSummary>>;
    evaluateCollection: (
      collectionId: string
    ) => Promise<ApiResult<CollectionEvaluationSummary>>;
    createTaskInCollection: (
      input: CreateTaskInCollectionInput
    ) => Promise<ApiResult<TaskSummary>>;
  };
  today: {
    getViewModel: (
      input?: TodayViewModelInput
    ) => Promise<ApiResult<TodayViewModelSummary>>;
    getOrCreateDailyPlan: (
      input?: DailyPlanDateInput
    ) => Promise<ApiResult<DailyPlanSummary>>;
    planTask: (input: PlanTaskInput) => Promise<ApiResult<DailyPlanItemSummary>>;
    unplanTask: (
      input: UnplanTaskInput
    ) => Promise<ApiResult<DailyPlanItemSummary[]>>;
    reorderPlannedTask: (
      input: ReorderPlannedTaskInput
    ) => Promise<ApiResult<DailyPlanItemSummary>>;
    getPlannedTasks: (
      input?: GetPlannedTasksInput
    ) => Promise<ApiResult<PlannedTaskSummary[]>>;
  };
  activity: {
    listRecent: (
      input?: ListRecentActivityInput
    ) => Promise<ApiResult<ActivitySummary[]>>;
    listForTarget: (
      input: ListActivityForTargetInput
    ) => Promise<ApiResult<ActivitySummary[]>>;
    listRecentActivity: (
      input?: ListRecentActivityInput
    ) => Promise<ApiResult<ActivitySummary[]>>;
    listActivityForTarget: (
      input: ListActivityForTargetInput
    ) => Promise<ApiResult<ActivitySummary[]>>;
  };
  containers: {
    getStatus: () => Promise<ApiResult<IpcModuleStatus>>;
  };
  items: {
    getStatus: () => Promise<ApiResult<IpcModuleStatus>>;
    move: (input: MoveItemInput) => Promise<ApiResult<ItemSummary>>;
    archive: (itemId: string) => Promise<ApiResult<ItemSummary>>;
    softDelete: (itemId: string) => Promise<ApiResult<ItemSummary>>;
    getActivity: (itemId: string) => Promise<ApiResult<ActivitySummary[]>>;
    openInspector: (
      itemId: string
    ) => Promise<ApiResult<ItemInspectorSummary>>;
    moveItem: (input: MoveItemInput) => Promise<ApiResult<ItemSummary>>;
    archiveItem: (itemId: string) => Promise<ApiResult<ItemSummary>>;
    softDeleteItem: (itemId: string) => Promise<ApiResult<ItemSummary>>;
    getItemActivity: (
      itemId: string
    ) => Promise<ApiResult<ActivitySummary[]>>;
    openItemInspector: (
      itemId: string
    ) => Promise<ApiResult<ItemInspectorSummary>>;
  };
  files: {
    getStatus: () => Promise<ApiResult<IpcModuleStatus>>;
  };
};

export function apiOk<T>(data: T): ApiResult<T> {
  return {
    ok: true,
    data
  };
}

export function apiError<T = never>(
  code: ApiErrorCode,
  message: string
): ApiResult<T> {
  return {
    ok: false,
    error: {
      code,
      message
    }
  };
}

export function createLocalWorkOsApi(
  invoke: LocalWorkOsIpcInvoke
): LocalWorkOsApi {
  return {
    workspace: {
      createWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.workspace.createWorkspace, input),
      openWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.workspace.openWorkspace, input),
      validateWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.workspace.validateWorkspace, input),
      getCurrentWorkspace: () =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.workspace.getCurrentWorkspace,
          undefined
        ),
      listRecentWorkspaces: () =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.workspace.listRecentWorkspaces,
          undefined
        )
    },
    database: {
      getHealthStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.database.getHealthStatus, undefined)
    },
    inbox: {
      getInbox: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.inbox.getInbox, workspaceId),
      listItems: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.inbox.listItems, workspaceId),
      moveItemToProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.inbox.moveItemToProject, input)
    },
    tasks: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask, input),
      complete: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask, itemId),
      reopen: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask, itemId),
      listByContainer: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.listByContainer, containerId),
      createTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.createTask, input),
      updateTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.updateTask, input),
      completeTask: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.completeTask, itemId),
      reopenTask: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.tasks.reopenTask, itemId)
    },
    lists: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.createList, input),
      addItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.addItem, input),
      updateItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.updateItem, input),
      completeItem: (listItemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.completeItem, listItemId),
      reopenItem: (listItemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.reopenItem, listItemId),
      bulkAddItems: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.bulkAddItems, input),
      listByContainer: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.listByContainer, containerId),
      createList: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.lists.createList, input)
    },
    notes: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.notes.createNote, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.notes.updateNote, input),
      listByContainer: (containerId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.notes.listByContainer, containerId),
      createNote: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.notes.createNote, input),
      updateNote: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.notes.updateNote, input)
    },
    projects: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.updateProject, input),
      archive: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject, projectId),
      softDelete: (projectId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.projects.softDeleteProject,
          projectId
        ),
      list: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.listProjects, workspaceId),
      get: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.getProject, projectId),
      createProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.createProject, input),
      updateProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.updateProject, input),
      archiveProject: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.archiveProject, projectId),
      softDeleteProject: (projectId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.projects.softDeleteProject,
          projectId
        ),
      listProjects: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.listProjects, workspaceId),
      getProject: (projectId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.projects.getProject, projectId)
    },
    categories: {
      create: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.createCategory, input),
      update: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.updateCategory, input),
      delete: (categoryId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.deleteCategory, categoryId),
      list: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.listCategories, workspaceId),
      assignToProject: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToProject, input),
      assignToItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.assignToItem, input),
      createCategory: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.createCategory, input),
      updateCategory: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.updateCategory, input),
      deleteCategory: (categoryId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.deleteCategory, categoryId),
      listCategories: (workspaceId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.categories.listCategories, workspaceId)
    },
    metadata: {
      listTagsWithCounts: (workspaceId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTagsWithCounts,
          workspaceId
        ),
      listCategoriesWithCounts: (workspaceId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.metadata.listCategoriesWithCounts,
          workspaceId
        ),
      listTargetsByMetadata: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.metadata.listTargetsByMetadata, input)
    },
    search: {
      searchWorkspace: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.search.searchWorkspace, input)
    },
    collections: {
      listCollections: (workspaceId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.listCollections,
          workspaceId
        ),
      createTagCollection: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.createTagCollection,
          input
        ),
      createKeywordCollection: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.createKeywordCollection,
          input
        ),
      evaluateCollection: (collectionId) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.evaluateCollection,
          collectionId
        ),
      createTaskInCollection: (input) =>
        invoke(
          LOCAL_WORK_OS_IPC_CHANNELS.collections.createTaskInCollection,
          input
        )
    },
    today: {
      getViewModel: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.getViewModel, input),
      getOrCreateDailyPlan: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.getOrCreateDailyPlan, input),
      planTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.planTask, input),
      unplanTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.unplanTask, input),
      reorderPlannedTask: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.reorderPlannedTask, input),
      getPlannedTasks: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.today.getPlannedTasks, input)
    },
    activity: {
      listRecent: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.activity.listRecentActivity, input),
      listForTarget: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.activity.listActivityForTarget, input),
      listRecentActivity: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.activity.listRecentActivity, input),
      listActivityForTarget: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.activity.listActivityForTarget, input)
    },
    containers: {
      getStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.containers.getStatus, undefined)
    },
    items: {
      getStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.getStatus, undefined),
      move: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.moveItem, input),
      archive: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.archiveItem, itemId),
      softDelete: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.softDeleteItem, itemId),
      getActivity: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.getItemActivity, itemId),
      openInspector: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.openItemInspector, itemId),
      moveItem: (input) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.moveItem, input),
      archiveItem: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.archiveItem, itemId),
      softDeleteItem: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.softDeleteItem, itemId),
      getItemActivity: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.getItemActivity, itemId),
      openItemInspector: (itemId) =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.items.openItemInspector, itemId)
    },
    files: {
      getStatus: () =>
        invoke(LOCAL_WORK_OS_IPC_CHANNELS.files.getStatus, undefined)
    }
  };
}
