import { describe, expect, it } from "vitest";

import {
  backupModuleContract,
  BackupService,
  RestoreService,
  activityModuleContract,
  calendarModuleContract,
  CaptureService,
  captureModuleContract,
  categoriesModuleContract,
  contactsModuleContract,
  contextMenuActionProviders,
  contextMenusModuleContract,
  dashboardModuleContract,
  DashboardService,
  diagnosticsModuleContract,
  ExportService,
  exportModuleContract,
  filesModuleContract,
  ImportValidationService,
  IntegrityCheckService,
  importModuleContract,
  inboxModuleContract,
  itemsModuleContract,
  linksModuleContract,
  listsModuleContract,
  navigationHistoryModuleContract,
  NavigationHistoryService,
  notesModuleContract,
  plannedFeatureAreas,
  projectsModuleContract,
  quickStartActionProviders,
  recurrenceModuleContract,
  RecurrenceService,
  CollectionService,
  SavedViewService,
  relationshipsModuleContract,
  remindersModuleContract,
  ReminderService,
  savedViewsModuleContract,
  searchModuleContract,
  tagsModuleContract,
  TabService,
  tabsModuleContract,
  tasksModuleContract,
  timelineModuleContract,
  templatesModuleContract,
  ListTemplateService,
  todayModuleContract,
  workflowsModuleContract,
  WorkflowService,
  workspaceModuleContract
} from "../src";

describe("feature module exports", () => {
  it("exports the required placeholder feature areas", () => {
    expect(plannedFeatureAreas).toEqual([
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
      "timeline",
      "calendar",
      "backup",
      "export",
      "templates",
      "workflows",
      "quickStart",
      "activity",
      "diagnostics"
    ]);
  });

  it("exports module contracts for each required placeholder service", () => {
    const exportedModules = [
      workspaceModuleContract.module,
      inboxModuleContract.module,
      itemsModuleContract.module,
      projectsModuleContract.module,
      contactsModuleContract.module,
      tasksModuleContract.module,
      listsModuleContract.module,
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
      timelineModuleContract.module,
      calendarModuleContract.module,
      backupModuleContract.module,
      exportModuleContract.module,
      templatesModuleContract.module,
      workflowsModuleContract.module,
      activityModuleContract.module,
      diagnosticsModuleContract.module
    ];

    expect(exportedModules).toEqual([
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
      "timeline",
      "calendar",
      "backup",
      "export",
      "templates",
      "workflows",
      "activity",
      "diagnostics"
    ]);
  });

  it("exports the capture service implementation", () => {
    expect(CaptureService).toBeDefined();
  });

  it("exports the saved-view and collection service implementations", () => {
    expect(SavedViewService).toBeDefined();
    expect(CollectionService).toBeDefined();
  });

  it("exports the dashboard service implementation", () => {
    expect(DashboardService).toBeDefined();
  });

  it("exports the backup service implementation", () => {
    expect(BackupService).toBeDefined();
    expect(RestoreService).toBeDefined();
  });

  it("exports the workspace JSON export service implementation", () => {
    expect(ExportService).toBeDefined();
  });

  it("exports the import validation service implementation", () => {
    expect(ImportValidationService).toBeDefined();
  });

  it("exports the diagnostics service implementation", () => {
    expect(IntegrityCheckService).toBeDefined();
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

  it("exports the workflow service implementation", () => {
    expect(WorkflowService).toBeDefined();
  });

  it("exports the navigation history service implementation", () => {
    expect(NavigationHistoryService).toBeDefined();
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
