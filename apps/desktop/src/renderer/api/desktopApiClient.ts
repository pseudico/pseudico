import {
  apiError,
  type ApiResult,
  type LocalWorkOsApi
} from "../../preload/api";

function getPreloadApi(): LocalWorkOsApi {
  if (typeof window === "undefined" || window.localWorkOs === undefined) {
    throw new Error("Local Work OS preload API is unavailable.");
  }

  return window.localWorkOs;
}

async function callApi<T>(
  operation: () => Promise<ApiResult<T>>
): Promise<ApiResult<T>> {
  try {
    return await operation();
  } catch (error) {
    return apiError(
      "IPC_ERROR",
      error instanceof Error ? error.message : "Preload IPC call failed."
    );
  }
}

export function createDesktopApiClient(api: LocalWorkOsApi): LocalWorkOsApi {
  return {
    workspace: {
      createWorkspace: (input) =>
        callApi(() => api.workspace.createWorkspace(input)),
      openWorkspace: (input) => callApi(() => api.workspace.openWorkspace(input)),
      validateWorkspace: (input) =>
        callApi(() => api.workspace.validateWorkspace(input)),
      getCurrentWorkspace: () =>
        callApi(() => api.workspace.getCurrentWorkspace()),
      listRecentWorkspaces: () =>
        callApi(() => api.workspace.listRecentWorkspaces())
    },
    database: {
      getHealthStatus: () => callApi(() => api.database.getHealthStatus())
    },
    inbox: {
      getInbox: (workspaceId) => callApi(() => api.inbox.getInbox(workspaceId)),
      listItems: (workspaceId) => callApi(() => api.inbox.listItems(workspaceId)),
      moveItemToProject: (input) =>
        callApi(() => api.inbox.moveItemToProject(input))
    },
    tasks: {
      create: (input) => callApi(() => api.tasks.create(input)),
      update: (input) => callApi(() => api.tasks.update(input)),
      complete: (itemId) => callApi(() => api.tasks.complete(itemId)),
      reopen: (itemId) => callApi(() => api.tasks.reopen(itemId)),
      snooze: (input) => callApi(() => api.tasks.snooze(input)),
      reschedule: (input) => callApi(() => api.tasks.reschedule(input)),
      listByContainer: (containerId) =>
        callApi(() => api.tasks.listByContainer(containerId)),
      createTask: (input) => callApi(() => api.tasks.createTask(input)),
      updateTask: (input) => callApi(() => api.tasks.updateTask(input)),
      completeTask: (itemId) => callApi(() => api.tasks.completeTask(itemId)),
      reopenTask: (itemId) => callApi(() => api.tasks.reopenTask(itemId)),
      snoozeTask: (input) => callApi(() => api.tasks.snoozeTask(input)),
      rescheduleTask: (input) =>
        callApi(() => api.tasks.rescheduleTask(input))
    },
    lists: {
      create: (input) => callApi(() => api.lists.create(input)),
      addItem: (input) => callApi(() => api.lists.addItem(input)),
      updateItem: (input) => callApi(() => api.lists.updateItem(input)),
      completeItem: (listItemId) =>
        callApi(() => api.lists.completeItem(listItemId)),
      reopenItem: (listItemId) =>
        callApi(() => api.lists.reopenItem(listItemId)),
      bulkAddItems: (input) => callApi(() => api.lists.bulkAddItems(input)),
      listByContainer: (containerId) =>
        callApi(() => api.lists.listByContainer(containerId)),
      createList: (input) => callApi(() => api.lists.createList(input))
    },
    notes: {
      create: (input) => callApi(() => api.notes.create(input)),
      update: (input) => callApi(() => api.notes.update(input)),
      listByContainer: (containerId) =>
        callApi(() => api.notes.listByContainer(containerId)),
      createNote: (input) => callApi(() => api.notes.createNote(input)),
      updateNote: (input) => callApi(() => api.notes.updateNote(input))
    },
    projects: {
      create: (input) => callApi(() => api.projects.create(input)),
      update: (input) => callApi(() => api.projects.update(input)),
      archive: (projectId) => callApi(() => api.projects.archive(projectId)),
      softDelete: (projectId) =>
        callApi(() => api.projects.softDelete(projectId)),
      list: (workspaceId) => callApi(() => api.projects.list(workspaceId)),
      get: (projectId) => callApi(() => api.projects.get(projectId)),
      createProject: (input) => callApi(() => api.projects.createProject(input)),
      updateProject: (input) => callApi(() => api.projects.updateProject(input)),
      archiveProject: (projectId) =>
        callApi(() => api.projects.archiveProject(projectId)),
      softDeleteProject: (projectId) =>
        callApi(() => api.projects.softDeleteProject(projectId)),
      listProjects: (workspaceId) =>
        callApi(() => api.projects.listProjects(workspaceId)),
      getProject: (projectId) => callApi(() => api.projects.getProject(projectId))
    },
    categories: {
      create: (input) => callApi(() => api.categories.create(input)),
      update: (input) => callApi(() => api.categories.update(input)),
      delete: (categoryId) => callApi(() => api.categories.delete(categoryId)),
      list: (workspaceId) => callApi(() => api.categories.list(workspaceId)),
      assignToProject: (input) =>
        callApi(() => api.categories.assignToProject(input)),
      assignToItem: (input) =>
        callApi(() => api.categories.assignToItem(input)),
      createCategory: (input) =>
        callApi(() => api.categories.createCategory(input)),
      updateCategory: (input) =>
        callApi(() => api.categories.updateCategory(input)),
      deleteCategory: (categoryId) =>
        callApi(() => api.categories.deleteCategory(categoryId)),
      listCategories: (workspaceId) =>
        callApi(() => api.categories.listCategories(workspaceId))
    },
    metadata: {
      listTagsWithCounts: (workspaceId) =>
        callApi(() => api.metadata.listTagsWithCounts(workspaceId)),
      listCategoriesWithCounts: (workspaceId) =>
        callApi(() => api.metadata.listCategoriesWithCounts(workspaceId)),
      listTargetsByMetadata: (input) =>
        callApi(() => api.metadata.listTargetsByMetadata(input))
    },
    search: {
      searchWorkspace: (input) =>
        callApi(() => api.search.searchWorkspace(input))
    },
    collections: {
      listCollections: (workspaceId) =>
        callApi(() => api.collections.listCollections(workspaceId)),
      createTagCollection: (input) =>
        callApi(() => api.collections.createTagCollection(input)),
      createKeywordCollection: (input) =>
        callApi(() => api.collections.createKeywordCollection(input)),
      evaluateCollection: (collectionId) =>
        callApi(() => api.collections.evaluateCollection(collectionId)),
      createTaskInCollection: (input) =>
        callApi(() => api.collections.createTaskInCollection(input))
    },
    today: {
      getViewModel: (input) =>
        callApi(() => api.today.getViewModel(input)),
      getOrCreateDailyPlan: (input) =>
        callApi(() => api.today.getOrCreateDailyPlan(input)),
      planTask: (input) => callApi(() => api.today.planTask(input)),
      unplanTask: (input) => callApi(() => api.today.unplanTask(input)),
      reorderPlannedTask: (input) =>
        callApi(() => api.today.reorderPlannedTask(input)),
      getPlannedTasks: (input) =>
        callApi(() => api.today.getPlannedTasks(input))
    },
    dashboard: {
      getDefault: (input) => callApi(() => api.dashboard.getDefault(input))
    },
    activity: {
      listRecent: (input) => callApi(() => api.activity.listRecent(input)),
      listForTarget: (input) =>
        callApi(() => api.activity.listForTarget(input)),
      listRecentActivity: (input) =>
        callApi(() => api.activity.listRecentActivity(input)),
      listActivityForTarget: (input) =>
        callApi(() => api.activity.listActivityForTarget(input))
    },
    containers: {
      getStatus: () => callApi(() => api.containers.getStatus())
    },
    items: {
      getStatus: () => callApi(() => api.items.getStatus()),
      move: (input) => callApi(() => api.items.move(input)),
      archive: (itemId) => callApi(() => api.items.archive(itemId)),
      softDelete: (itemId) => callApi(() => api.items.softDelete(itemId)),
      getActivity: (itemId) => callApi(() => api.items.getActivity(itemId)),
      openInspector: (itemId) =>
        callApi(() => api.items.openInspector(itemId)),
      moveItem: (input) => callApi(() => api.items.moveItem(input)),
      archiveItem: (itemId) => callApi(() => api.items.archiveItem(itemId)),
      softDeleteItem: (itemId) =>
        callApi(() => api.items.softDeleteItem(itemId)),
      getItemActivity: (itemId) =>
        callApi(() => api.items.getItemActivity(itemId)),
      openItemInspector: (itemId) =>
        callApi(() => api.items.openItemInspector(itemId))
    },
    files: {
      getStatus: () => callApi(() => api.files.getStatus())
    }
  };
}

export function getDesktopApiClient(): LocalWorkOsApi {
  return createDesktopApiClient(getPreloadApi());
}

export const desktopApiClient: LocalWorkOsApi = {
  workspace: {
    createWorkspace: (input) =>
      getDesktopApiClient().workspace.createWorkspace(input),
    openWorkspace: (input) =>
      getDesktopApiClient().workspace.openWorkspace(input),
    validateWorkspace: (input) =>
      getDesktopApiClient().workspace.validateWorkspace(input),
    getCurrentWorkspace: () =>
      getDesktopApiClient().workspace.getCurrentWorkspace(),
    listRecentWorkspaces: () =>
      getDesktopApiClient().workspace.listRecentWorkspaces()
  },
  database: {
    getHealthStatus: () => getDesktopApiClient().database.getHealthStatus()
  },
  inbox: {
    getInbox: (workspaceId) =>
      getDesktopApiClient().inbox.getInbox(workspaceId),
    listItems: (workspaceId) =>
      getDesktopApiClient().inbox.listItems(workspaceId),
    moveItemToProject: (input) =>
      getDesktopApiClient().inbox.moveItemToProject(input)
  },
  tasks: {
    create: (input) => getDesktopApiClient().tasks.create(input),
    update: (input) => getDesktopApiClient().tasks.update(input),
    complete: (itemId) => getDesktopApiClient().tasks.complete(itemId),
    reopen: (itemId) => getDesktopApiClient().tasks.reopen(itemId),
    snooze: (input) => getDesktopApiClient().tasks.snooze(input),
    reschedule: (input) => getDesktopApiClient().tasks.reschedule(input),
    listByContainer: (containerId) =>
      getDesktopApiClient().tasks.listByContainer(containerId),
    createTask: (input) => getDesktopApiClient().tasks.createTask(input),
    updateTask: (input) => getDesktopApiClient().tasks.updateTask(input),
    completeTask: (itemId) =>
      getDesktopApiClient().tasks.completeTask(itemId),
    reopenTask: (itemId) => getDesktopApiClient().tasks.reopenTask(itemId),
    snoozeTask: (input) => getDesktopApiClient().tasks.snoozeTask(input),
    rescheduleTask: (input) =>
      getDesktopApiClient().tasks.rescheduleTask(input)
  },
  lists: {
    create: (input) => getDesktopApiClient().lists.create(input),
    addItem: (input) => getDesktopApiClient().lists.addItem(input),
    updateItem: (input) => getDesktopApiClient().lists.updateItem(input),
    completeItem: (listItemId) =>
      getDesktopApiClient().lists.completeItem(listItemId),
    reopenItem: (listItemId) =>
      getDesktopApiClient().lists.reopenItem(listItemId),
    bulkAddItems: (input) => getDesktopApiClient().lists.bulkAddItems(input),
    listByContainer: (containerId) =>
      getDesktopApiClient().lists.listByContainer(containerId),
    createList: (input) => getDesktopApiClient().lists.createList(input)
  },
  notes: {
    create: (input) => getDesktopApiClient().notes.create(input),
    update: (input) => getDesktopApiClient().notes.update(input),
    listByContainer: (containerId) =>
      getDesktopApiClient().notes.listByContainer(containerId),
    createNote: (input) => getDesktopApiClient().notes.createNote(input),
    updateNote: (input) => getDesktopApiClient().notes.updateNote(input)
  },
  projects: {
    create: (input) => getDesktopApiClient().projects.create(input),
    update: (input) => getDesktopApiClient().projects.update(input),
    archive: (projectId) => getDesktopApiClient().projects.archive(projectId),
    softDelete: (projectId) =>
      getDesktopApiClient().projects.softDelete(projectId),
    list: (workspaceId) => getDesktopApiClient().projects.list(workspaceId),
    get: (projectId) => getDesktopApiClient().projects.get(projectId),
    createProject: (input) =>
      getDesktopApiClient().projects.createProject(input),
    updateProject: (input) =>
      getDesktopApiClient().projects.updateProject(input),
    archiveProject: (projectId) =>
      getDesktopApiClient().projects.archiveProject(projectId),
    softDeleteProject: (projectId) =>
      getDesktopApiClient().projects.softDeleteProject(projectId),
    listProjects: (workspaceId) =>
      getDesktopApiClient().projects.listProjects(workspaceId),
    getProject: (projectId) =>
      getDesktopApiClient().projects.getProject(projectId)
  },
  categories: {
    create: (input) => getDesktopApiClient().categories.create(input),
    update: (input) => getDesktopApiClient().categories.update(input),
    delete: (categoryId) => getDesktopApiClient().categories.delete(categoryId),
    list: (workspaceId) => getDesktopApiClient().categories.list(workspaceId),
    assignToProject: (input) =>
      getDesktopApiClient().categories.assignToProject(input),
    assignToItem: (input) =>
      getDesktopApiClient().categories.assignToItem(input),
    createCategory: (input) =>
      getDesktopApiClient().categories.createCategory(input),
    updateCategory: (input) =>
      getDesktopApiClient().categories.updateCategory(input),
    deleteCategory: (categoryId) =>
      getDesktopApiClient().categories.deleteCategory(categoryId),
    listCategories: (workspaceId) =>
      getDesktopApiClient().categories.listCategories(workspaceId)
  },
  metadata: {
    listTagsWithCounts: (workspaceId) =>
      getDesktopApiClient().metadata.listTagsWithCounts(workspaceId),
    listCategoriesWithCounts: (workspaceId) =>
      getDesktopApiClient().metadata.listCategoriesWithCounts(workspaceId),
    listTargetsByMetadata: (input) =>
      getDesktopApiClient().metadata.listTargetsByMetadata(input)
  },
  search: {
    searchWorkspace: (input) =>
      getDesktopApiClient().search.searchWorkspace(input)
  },
  collections: {
    listCollections: (workspaceId) =>
      getDesktopApiClient().collections.listCollections(workspaceId),
    createTagCollection: (input) =>
      getDesktopApiClient().collections.createTagCollection(input),
    createKeywordCollection: (input) =>
      getDesktopApiClient().collections.createKeywordCollection(input),
    evaluateCollection: (collectionId) =>
      getDesktopApiClient().collections.evaluateCollection(collectionId),
    createTaskInCollection: (input) =>
      getDesktopApiClient().collections.createTaskInCollection(input)
  },
  today: {
    getViewModel: (input) =>
      getDesktopApiClient().today.getViewModel(input),
    getOrCreateDailyPlan: (input) =>
      getDesktopApiClient().today.getOrCreateDailyPlan(input),
    planTask: (input) => getDesktopApiClient().today.planTask(input),
    unplanTask: (input) => getDesktopApiClient().today.unplanTask(input),
    reorderPlannedTask: (input) =>
      getDesktopApiClient().today.reorderPlannedTask(input),
    getPlannedTasks: (input) =>
      getDesktopApiClient().today.getPlannedTasks(input)
  },
  dashboard: {
    getDefault: (input) =>
      getDesktopApiClient().dashboard.getDefault(input)
  },
  activity: {
    listRecent: (input) =>
      getDesktopApiClient().activity.listRecent(input),
    listForTarget: (input) =>
      getDesktopApiClient().activity.listForTarget(input),
    listRecentActivity: (input) =>
      getDesktopApiClient().activity.listRecentActivity(input),
    listActivityForTarget: (input) =>
      getDesktopApiClient().activity.listActivityForTarget(input)
  },
  containers: {
    getStatus: () => getDesktopApiClient().containers.getStatus()
  },
  items: {
    getStatus: () => getDesktopApiClient().items.getStatus(),
    move: (input) => getDesktopApiClient().items.move(input),
    archive: (itemId) => getDesktopApiClient().items.archive(itemId),
    softDelete: (itemId) => getDesktopApiClient().items.softDelete(itemId),
    getActivity: (itemId) => getDesktopApiClient().items.getActivity(itemId),
    openInspector: (itemId) =>
      getDesktopApiClient().items.openInspector(itemId),
    moveItem: (input) => getDesktopApiClient().items.moveItem(input),
    archiveItem: (itemId) => getDesktopApiClient().items.archiveItem(itemId),
    softDeleteItem: (itemId) =>
      getDesktopApiClient().items.softDeleteItem(itemId),
    getItemActivity: (itemId) =>
      getDesktopApiClient().items.getItemActivity(itemId),
    openItemInspector: (itemId) =>
      getDesktopApiClient().items.openItemInspector(itemId)
  },
  files: {
    getStatus: () => getDesktopApiClient().files.getStatus()
  }
};
