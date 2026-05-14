import { describe, expect, it } from "vitest";

import {
  backupModuleContract,
  appearanceModuleContract,
  AppearanceSettingsService,
  BackupService,
  BulkActionService,
  bulkActionsModuleContract,
  RestoreService,
  activityModuleContract,
  calendarModuleContract,
  CaptureService,
  captureModuleContract,
  categoriesModuleContract,
  contactsModuleContract,
  containerGroupingModuleContract,
  containerMediaModuleContract,
  containerPreferencesModuleContract,
  contextMenuActionProviders,
  contextMenusModuleContract,
  dashboardModuleContract,
  DashboardService,
  diagnosticsModuleContract,
  DragDropService,
  dragDropModuleContract,
  ExportService,
  exportModuleContract,
  filesModuleContract,
  ImportValidationService,
  IntegrityCheckService,
  MaintenanceService,
  maintenanceModuleContract,
  LargeWorkspaceBenchmarkService,
  importModuleContract,
  inboxModuleContract,
  itemsModuleContract,
  linksModuleContract,
  listsModuleContract,
  navigationHistoryModuleContract,
  NavigationHistoryService,
  notesModuleContract,
  plannedFeatureAreas,
  performanceModuleContract,
  privacyModuleContract,
  PrivacySettingsService,
  PrintService,
  printingModuleContract,
  projectsModuleContract,
  quickStartActionProviders,
  recurrenceModuleContract,
  RecurrenceService,
  CollectionService,
  SavedViewDiagnosticsService,
  SavedViewService,
  relationshipsModuleContract,
  remindersModuleContract,
  ReminderService,
  savedViewsModuleContract,
  searchModuleContract,
  tagsModuleContract,
  TabService,
  TaskListConversionService,
  taskListConversionsModuleContract,
  tabsModuleContract,
  tasksModuleContract,
  timelineModuleContract,
  templatesModuleContract,
  ListTemplateService,
  todayModuleContract,
  UndoService,
  undoModuleContract,
  workflowsModuleContract,
  WorkflowRunHistoryService,
  WorkflowService,
  workspaceModuleContract,
  WikilinkService,
  wikilinksModuleContract
} from "../src";

describe("feature module exports", () => {
  it("exports the required placeholder feature areas", () => {
    expect(plannedFeatureAreas).toEqual([
      "workspace",
      "inbox",
      "items",
      "projects",
      "contacts",
      "comments",
      "containerGrouping",
      "containerPreferences",
      "containerMedia",
      "tasks",
      "lists",
      "taskListConversions",
      "notes",
      "files",
      "import",
      "links",
      "capture",
      "pipelines",
      "contextMenus",
      "metadata",
      "navigationHistory",
      "appTabs",
      "relationships",
      "recurrence",
      "reminders",
      "search",
      "savedViews",
      "tabs",
      "today",
      "dashboard",
      "dragDrop",
      "timeline",
      "calendar",
      "backup",
      "bulkActions",
      "export",
      "printing",
      "appearance",
      "performance",
      "privacy",
      "templates",
      "workflows",
      "help",
      "undo",
      "trash",
      "quickStart",
      "activity",
      "diagnostics",
      "maintenance",
      "wikilinks"
    ]);
  });

  it("exports module contracts for each required placeholder service", () => {
    const exportedModules = [
      workspaceModuleContract.module,
      inboxModuleContract.module,
      itemsModuleContract.module,
      projectsModuleContract.module,
      contactsModuleContract.module,
      containerGroupingModuleContract.module,
      containerPreferencesModuleContract.module,
      containerMediaModuleContract.module,
      tasksModuleContract.module,
      listsModuleContract.module,
      taskListConversionsModuleContract.module,
      notesModuleContract.module,
      filesModuleContract.module,
      importModuleContract.module,
      linksModuleContract.module,
      captureModuleContract.module,
      contextMenusModuleContract.module,
      tagsModuleContract.module,
      categoriesModuleContract.module,
      navigationHistoryModuleContract.module,
      relationshipsModuleContract.module,
      recurrenceModuleContract.module,
      remindersModuleContract.module,
      searchModuleContract.module,
      savedViewsModuleContract.module,
      tabsModuleContract.module,
      todayModuleContract.module,
      dashboardModuleContract.module,
      dragDropModuleContract.module,
      timelineModuleContract.module,
      calendarModuleContract.module,
      backupModuleContract.module,
      bulkActionsModuleContract.module,
      exportModuleContract.module,
      printingModuleContract.module,
      appearanceModuleContract.module,
      performanceModuleContract.module,
      privacyModuleContract.module,
      templatesModuleContract.module,
      workflowsModuleContract.module,
      undoModuleContract.module,
      activityModuleContract.module,
      diagnosticsModuleContract.module,
      maintenanceModuleContract.module,
      wikilinksModuleContract.module
    ];

    expect(exportedModules).toEqual([
      "workspace",
      "inbox",
      "items",
      "projects",
      "contacts",
      "containers.grouping",
      "containers.preferences",
      "containerMedia",
      "tasks",
      "lists",
      "task-list-conversions",
      "notes",
      "files",
      "import",
      "links",
      "capture",
      "context-menus",
      "metadata.tags",
      "metadata.categories",
      "navigation-history",
      "relationships",
      "recurrence",
      "reminders",
      "search",
      "savedViews",
      "tabs",
      "today",
      "dashboard",
      "dragDrop",
      "timeline",
      "calendar",
      "backup",
      "bulkActions",
      "export",
      "printing",
      "appearance",
      "performance",
      "privacy",
      "templates",
      "workflows",
      "undo",
      "activity",
      "diagnostics",
      "maintenance",
      "wikilinks"
    ]);
  });

  it("exports the capture service implementation", () => {
    expect(CaptureService).toBeDefined();
  });

  it("exports the saved-view and collection service implementations", () => {
    expect(SavedViewService).toBeDefined();
    expect(SavedViewDiagnosticsService).toBeDefined();
    expect(CollectionService).toBeDefined();
  });

  it("exports the dashboard service implementation", () => {
    expect(DashboardService).toBeDefined();
  });

  it("exports the drag/drop service implementation", () => {
    expect(DragDropService).toBeDefined();
  });

  it("exports the backup service implementation", () => {
    expect(BackupService).toBeDefined();
    expect(RestoreService).toBeDefined();
  });

  it("exports the workspace JSON export service implementation", () => {
    expect(ExportService).toBeDefined();
  });

  it("exports the print service implementation", () => {
    expect(PrintService).toBeDefined();
  });

  it("exports the appearance settings service implementation", () => {
    expect(AppearanceSettingsService).toBeDefined();
  });

  it("exports the privacy settings service implementation", () => {
    expect(PrivacySettingsService).toBeDefined();
  });

  it("exports the large workspace benchmark service implementation", () => {
    expect(LargeWorkspaceBenchmarkService).toBeDefined();
  });

  it("exports the bulk action service implementation", () => {
    expect(BulkActionService).toBeDefined();
  });

  it("exports the import validation service implementation", () => {
    expect(ImportValidationService).toBeDefined();
  });

  it("exports the diagnostics and maintenance service implementations", () => {
    expect(IntegrityCheckService).toBeDefined();
    expect(MaintenanceService).toBeDefined();
  });

  it("exports the tab service implementation", () => {
    expect(TabService).toBeDefined();
  });

  it("exports the reminder service implementation", () => {
    expect(ReminderService).toBeDefined();
  });

  it("exports the recurrence service implementation", () => {
    expect(RecurrenceService).toBeDefined();
  });

  it("exports the list template service implementation", () => {
    expect(ListTemplateService).toBeDefined();
  });

  it("exports the task/list conversion service implementation", () => {
    expect(TaskListConversionService).toBeDefined();
  });

  it("exports the workflow service implementation", () => {
    expect(WorkflowService).toBeDefined();
    expect(WorkflowRunHistoryService).toBeDefined();
  });

  it("exports the undo service implementation", () => {
    expect(UndoService).toBeDefined();
  });

  it("exports the navigation history service implementation", () => {
    expect(NavigationHistoryService).toBeDefined();
  });

  it("exports the wikilink service implementation", () => {
    expect(WikilinkService).toBeDefined();
  });

  it("exports Quick Start action providers", () => {
    expect(quickStartActionProviders.map((provider) => provider.module)).toEqual([
      "tasks",
      "notes",
      "lists",
      "files",
      "links",
      "projects",
      "contacts"
    ]);
  });

  it("exports Context Menu action providers", () => {
    expect(contextMenuActionProviders.map((provider) => provider.module)).toEqual([
      "context-menus.default"
    ]);
  });
});
