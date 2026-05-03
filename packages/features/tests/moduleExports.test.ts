import { describe, expect, it } from "vitest";

import {
  backupModuleContract,
  calendarModuleContract,
  categoriesModuleContract,
  contactsModuleContract,
  dashboardModuleContract,
  exportModuleContract,
  filesModuleContract,
  inboxModuleContract,
  itemsModuleContract,
  linksModuleContract,
  listsModuleContract,
  notesModuleContract,
  plannedFeatureAreas,
  projectsModuleContract,
  CollectionService,
  SavedViewService,
  relationshipsModuleContract,
  savedViewsModuleContract,
  searchModuleContract,
  tagsModuleContract,
  tasksModuleContract,
  timelineModuleContract,
  todayModuleContract,
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
      "export"
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
      linksModuleContract.module,
      tagsModuleContract.module,
      categoriesModuleContract.module,
      relationshipsModuleContract.module,
      searchModuleContract.module,
      savedViewsModuleContract.module,
      todayModuleContract.module,
      dashboardModuleContract.module,
      timelineModuleContract.module,
      calendarModuleContract.module,
      backupModuleContract.module,
      exportModuleContract.module
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
      "links",
      "metadata.tags",
      "metadata.categories",
      "relationships",
      "search",
      "savedViews",
      "today",
      "dashboard",
      "timeline",
      "calendar",
      "backup",
      "export"
    ]);
  });

  it("exports the saved-view and collection service implementations", () => {
    expect(SavedViewService).toBeDefined();
    expect(CollectionService).toBeDefined();
  });
});
