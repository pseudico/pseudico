import {
  apiError,
  type ApiResult,
  type LocalWorkOsApi
} from "../../preload/api";
import { formatUserError } from "@local-work-os/ui";

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
      formatUserError(error)
    );
  }
}

function unavailable<T>(message: string): Promise<ApiResult<T>> {
  return Promise.resolve(apiError("IPC_ERROR", message));
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
    reminders: {
      setTaskReminder: (input) =>
        callApi(() => api.reminders!.setTaskReminder(input)),
      clearTaskReminder: (input) =>
        callApi(() => api.reminders!.clearTaskReminder(input)),
      setListItemReminder: (input) =>
        callApi(() => api.reminders!.setListItemReminder(input)),
      clearListItemReminder: (input) =>
        callApi(() => api.reminders!.clearListItemReminder(input)),
      dismissReminder: (input) =>
        callApi(() => api.reminders!.dismissReminder(input)),
      snoozeReminder: (input) =>
        callApi(() => api.reminders!.snoozeReminder(input))
    },
    lists: {
      create: (input) => callApi(() => api.lists.create(input)),
      addItem: (input) => callApi(() => api.lists.addItem(input)),
      updateItem: (input) => callApi(() => api.lists.updateItem(input)),
      completeItem: (listItemId) =>
        callApi(() => api.lists.completeItem(listItemId)),
      reopenItem: (listItemId) =>
        callApi(() => api.lists.reopenItem(listItemId)),
      enablePipelineMode: (listId) =>
        callApi(() => api.lists.enablePipelineMode(listId)),
      disablePipelineMode: (listId) =>
        callApi(() => api.lists.disablePipelineMode(listId)),
      getPipelineViewModel: (listId) =>
        callApi(() => api.lists.getPipelineViewModel(listId)),
      movePipelineCard: (input) =>
        callApi(() => api.lists.movePipelineCard(input)),
      indentItem: (listItemId) =>
        callApi(() => api.lists.indentItem(listItemId)),
      outdentItem: (listItemId) =>
        callApi(() => api.lists.outdentItem(listItemId)),
      moveItem: (input) => callApi(() => api.lists.moveItem(input)),
      moveItemToList: (input) =>
        callApi(() => api.lists.moveItemToList(input)),
      bulkAddItems: (input) => callApi(() => api.lists.bulkAddItems(input)),
      bulkUpdateItems: (input) =>
        callApi(() => api.lists.bulkUpdateItems(input)),
      listByContainer: (containerId) =>
        callApi(() => api.lists.listByContainer(containerId)),
      createList: (input) => callApi(() => api.lists.createList(input)),
      saveAsTemplate: (input) =>
        callApi(() => api.lists.saveAsTemplate(input)),
      createFromTemplate: (input) =>
        callApi(() => api.lists.createFromTemplate(input)),
      listTemplates: (workspaceId) =>
        callApi(() => api.lists.listTemplates(workspaceId))
    },
    templates: {
      saveContainerAsTemplate: (input) =>
        callApi(() => api.templates!.saveContainerAsTemplate(input)),
      createContainerFromTemplate: (input) =>
        callApi(() => api.templates!.createContainerFromTemplate(input)),
      listTemplates: (input) =>
        callApi(() => api.templates!.listTemplates(input))
    },
    notes: {
      create: (input) => callApi(() => api.notes.create(input)),
      update: (input) => callApi(() => api.notes.update(input)),
      listByContainer: (containerId) =>
        callApi(() => api.notes.listByContainer(containerId)),
      createNote: (input) => callApi(() => api.notes.createNote(input)),
      updateNote: (input) => callApi(() => api.notes.updateNote(input))
    },
    links: {
      create: (input) => callApi(() => api.links.create(input)),
      update: (input) => callApi(() => api.links.update(input)),
      listByContainer: (containerId) =>
        callApi(() => api.links.listByContainer(containerId)),
      openExternal: (itemId) => callApi(() => api.links.openExternal(itemId)),
      openUrlExternal: (url) => callApi(() => api.links.openUrlExternal(url)),
      createLink: (input) => callApi(() => api.links.createLink(input)),
      updateLink: (input) => callApi(() => api.links.updateLink(input))
    },
    projects: {
        create: (input) => callApi(() => api.projects.create(input)),
        update: (input) => callApi(() => api.projects.update(input)),
        clone: (input) =>
          api.projects.clone === undefined
            ? unavailable("Project clone API is not available.")
            : callApi(() => api.projects.clone!(input)),
        archive: (projectId) => callApi(() => api.projects.archive(projectId)),
        complete: (projectId) =>
          api.projects.complete === undefined
            ? unavailable("Project complete API is not available.")
            : callApi(() => api.projects.complete!(projectId)),
        restore: (projectId) =>
          api.projects.restore === undefined
            ? unavailable("Project restore API is not available.")
            : callApi(() => api.projects.restore!(projectId)),
      softDelete: (projectId) =>
        callApi(() => api.projects.softDelete(projectId)),
      list: (workspaceId) => callApi(() => api.projects.list(workspaceId)),
      get: (projectId) => callApi(() => api.projects.get(projectId)),
      getHealth: (projectId) => callApi(() => api.projects.getHealth(projectId)),
        createProject: (input) => callApi(() => api.projects.createProject(input)),
        updateProject: (input) => callApi(() => api.projects.updateProject(input)),
        cloneProject: (input) =>
          api.projects.cloneProject === undefined
            ? unavailable("Project clone API is not available.")
            : callApi(() => api.projects.cloneProject!(input)),
      archiveProject: (projectId) =>
        callApi(() => api.projects.archiveProject(projectId)),
      completeProject: (projectId) =>
        api.projects.completeProject === undefined
          ? unavailable("Project complete API is not available.")
          : callApi(() => api.projects.completeProject!(projectId)),
      restoreProject: (projectId) =>
        api.projects.restoreProject === undefined
          ? unavailable("Project restore API is not available.")
          : callApi(() => api.projects.restoreProject!(projectId)),
      softDeleteProject: (projectId) =>
        callApi(() => api.projects.softDeleteProject(projectId)),
      listProjects: (workspaceId) =>
        callApi(() => api.projects.listProjects(workspaceId)),
      getProject: (projectId) => callApi(() => api.projects.getProject(projectId)),
      getProjectHealth: (projectId) =>
        callApi(() => api.projects.getProjectHealth(projectId))
    },
    contacts: {
        create: (input) => callApi(() => api.contacts.create(input)),
        update: (input) => callApi(() => api.contacts.update(input)),
        clone: (input) =>
          api.contacts.clone === undefined
            ? unavailable("Contact clone API is not available.")
            : callApi(() => api.contacts.clone!(input)),
      archive: (contactId) =>
        api.contacts.archive === undefined
          ? unavailable("Contact archive API is not available.")
          : callApi(() => api.contacts.archive!(contactId)),
      complete: (contactId) =>
        api.contacts.complete === undefined
          ? unavailable("Contact complete API is not available.")
          : callApi(() => api.contacts.complete!(contactId)),
      restore: (contactId) =>
        api.contacts.restore === undefined
          ? unavailable("Contact restore API is not available.")
          : callApi(() => api.contacts.restore!(contactId)),
      list: (workspaceId) => callApi(() => api.contacts.list(workspaceId)),
      get: (contactId) => callApi(() => api.contacts.get(contactId)),
      addField: (input) => callApi(() => api.contacts.addField(input)),
      updateField: (input) => callApi(() => api.contacts.updateField(input)),
        createContact: (input) => callApi(() => api.contacts.createContact(input)),
        updateContact: (input) => callApi(() => api.contacts.updateContact(input)),
      cloneContact: (input) =>
          api.contacts.cloneContact === undefined
            ? unavailable("Contact clone API is not available.")
            : callApi(() => api.contacts.cloneContact!(input)),
      archiveContact: (contactId) =>
        api.contacts.archiveContact === undefined
          ? unavailable("Contact archive API is not available.")
          : callApi(() => api.contacts.archiveContact!(contactId)),
      completeContact: (contactId) =>
        api.contacts.completeContact === undefined
          ? unavailable("Contact complete API is not available.")
          : callApi(() => api.contacts.completeContact!(contactId)),
      restoreContact: (contactId) =>
        api.contacts.restoreContact === undefined
          ? unavailable("Contact restore API is not available.")
          : callApi(() => api.contacts.restoreContact!(contactId)),
      listContacts: (workspaceId) =>
        callApi(() => api.contacts.listContacts(workspaceId)),
      getContact: (contactId) =>
        callApi(() => api.contacts.getContact(contactId)),
      getTimeline: (input) =>
        api.contacts.getTimeline === undefined
          ? Promise.resolve({
              ok: false,
              error: {
                code: "IPC_ERROR",
                message: "Contact timeline API is not available."
              }
            })
          : callApi(() => api.contacts.getTimeline!(input))
    },
    tabs: {
      list: (containerId) => callApi(() => api.tabs.list(containerId)),
      listManaged: (containerId) =>
        callApi(() => api.tabs.listManaged(containerId)),
      listSummaries: (containerId) =>
        callApi(() => api.tabs.listSummaries(containerId)),
      listTemplates: () => callApi(() => api.tabs.listTemplates()),
      create: (input) => callApi(() => api.tabs.create(input)),
      createFromTemplate: (input) =>
        callApi(() => api.tabs.createFromTemplate(input)),
      rename: (input) => callApi(() => api.tabs.rename(input)),
      reorder: (input) => callApi(() => api.tabs.reorder(input)),
      hide: (tabId) => callApi(() => api.tabs.hide(tabId)),
      show: (tabId) => callApi(() => api.tabs.show(tabId)),
      duplicate: (tabId) => callApi(() => api.tabs.duplicate(tabId)),
      archive: (tabId) => callApi(() => api.tabs.archive(tabId)),
      delete: (tabId) => callApi(() => api.tabs.delete(tabId)),
      listTabs: (containerId) => callApi(() => api.tabs.listTabs(containerId)),
      listManagedTabs: (containerId) =>
        callApi(() => api.tabs.listManagedTabs(containerId)),
      listTabSummaries: (containerId) =>
        callApi(() => api.tabs.listTabSummaries(containerId)),
      createTab: (input) => callApi(() => api.tabs.createTab(input)),
      createTabFromTemplate: (input) =>
        callApi(() => api.tabs.createTabFromTemplate(input)),
      renameTab: (input) => callApi(() => api.tabs.renameTab(input)),
      reorderTabs: (input) => callApi(() => api.tabs.reorderTabs(input)),
      hideTab: (tabId) => callApi(() => api.tabs.hideTab(tabId)),
      showTab: (tabId) => callApi(() => api.tabs.showTab(tabId)),
      duplicateTab: (tabId) => callApi(() => api.tabs.duplicateTab(tabId)),
      archiveTab: (tabId) => callApi(() => api.tabs.archiveTab(tabId)),
      deleteTab: (tabId) => callApi(() => api.tabs.deleteTab(tabId))
    },
    relationships: {
      getGraph: (input) =>
        callApi(() => api.relationships.getGraph(input)),
      createRelationship: (input) =>
        callApi(() => api.relationships.createRelationship(input)),
      removeRelationship: (relationshipId) =>
        callApi(() => api.relationships.removeRelationship(relationshipId)),
      linkContactToProject: (input) =>
        callApi(() => api.relationships.linkContactToProject(input)),
      unlinkContactFromProject: (relationshipId) =>
        callApi(() =>
          api.relationships.unlinkContactFromProject(relationshipId)
        ),
      listContactsForProject: (projectId) =>
        callApi(() => api.relationships.listContactsForProject(projectId)),
      listProjectsForContact: (contactId) =>
        callApi(() => api.relationships.listProjectsForContact(contactId))
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
        callApi(() => api.metadata.listTargetsByMetadata(input)),
      getProjectTagBrowser: (input) =>
        callApi(() => api.metadata.getProjectTagBrowser(input)),
      getContactLabelBrowser: (input) =>
        callApi(() => api.metadata.getContactLabelBrowser(input)),
      addTagToTarget: (input) =>
        callApi(() => api.metadata.addTagToTarget(input)),
      removeTagFromTarget: (input) =>
        callApi(() => api.metadata.removeTagFromTarget(input))
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
        callApi(() => api.collections.createTaskInCollection(input)),
      listSmartLists: (workspaceId) =>
        callApi(() => api.collections.listSmartLists(workspaceId)),
      createSmartList: (input) =>
        callApi(() => api.collections.createSmartList(input)),
      updateSmartList: (input) =>
        callApi(() => api.collections.updateSmartList(input)),
      previewSmartList: (input) =>
        callApi(() => api.collections.previewSmartList(input))
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
    timeline: {
      getViewModel: (input) =>
        callApi(() => api.timeline!.getViewModel(input))
    },
    calendar: {
      getMonth: (input) => callApi(() => api.calendar!.getMonth(input))
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
      getStatus: () => callApi(() => api.containers.getStatus()),
      getPreferences: (containerId) =>
        callApi(() => api.containers.getPreferences(containerId)),
      updatePreferences: (input) =>
        callApi(() => api.containers.updatePreferences(input)),
      getGrouping: (input) => callApi(() => api.containers.getGrouping(input)),
      getGroupingPreferences: (input) =>
        callApi(() => api.containers.getGroupingPreferences(input)),
      updateGroupingPreferences: (input) =>
        callApi(() => api.containers.updateGroupingPreferences(input))
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
        callApi(() => api.items.openItemInspector(itemId)),
      bulkMoveItems: (input) =>
        callApi(() => api.items.bulkMoveItems!(input)),
      bulkTagItems: (input) =>
        callApi(() => api.items.bulkTagItems!(input)),
      bulkCategorizeItems: (input) =>
        callApi(() => api.items.bulkCategorizeItems!(input)),
      bulkArchiveItems: (input) =>
        callApi(() => api.items.bulkArchiveItems!(input)),
      bulkDeleteItems: (input) =>
        callApi(() => api.items.bulkDeleteItems!(input)),
      bulkCompleteTasks: (input) =>
        callApi(() => api.items.bulkCompleteTasks!(input)),
      bulkExportItems: (input) =>
        callApi(() => api.items.bulkExportItems!(input)),
      undoActivity: (input) =>
        callApi(() => api.items.undoActivity!(input)),
      redoActivity: (input) =>
        callApi(() => api.items.redoActivity!(input))
    },

    trash: {
      listTrash: (input) => callApi(() => api.trash!.listTrash(input)),
      restoreTrash: (input) => callApi(() => api.trash!.restoreTrash(input)),
      clearTrash: (input) => callApi(() => api.trash!.clearTrash(input))
    },

  dragDrop: {
      reorderItems: (input) => callApi(() => api.dragDrop!.reorderItems(input)),
      moveItem: (input) => callApi(() => api.dragDrop!.moveItem(input)),
      reorderListItems: (input) =>
        callApi(() => api.dragDrop!.reorderListItems(input)),
      reorderTabs: (input) => callApi(() => api.dragDrop!.reorderTabs(input)),
      attachFilesToContainer: (input) =>
        callApi(() => api.dragDrop!.attachFilesToContainer(input)),
      attachFilesToItem: (input) =>
        callApi(() => api.dragDrop!.attachFilesToItem(input)),
      getDroppedFilePaths: (files) => api.dragDrop!.getDroppedFilePaths(files)
    },
    containerMedia: {
      chooseAndSet: (input) => callApi(() => api.containerMedia!.chooseAndSet(input)),
      getActive: (input) => callApi(() => api.containerMedia!.getActive(input)),
      remove: (input) => callApi(() => api.containerMedia!.remove(input))
    },
    files: {
      getStatus: () => callApi(() => api.files.getStatus()),
      attachFileToContainer: (input) =>
        callApi(() => api.files.attachFileToContainer(input)),
      attachFileToItem: (input) =>
        callApi(() => api.files.attachFileToItem(input)),
      chooseAndAttach: (input) =>
        callApi(() => api.files.chooseAndAttach(input)),
      listByContainer: (containerId) =>
        callApi(() => api.files.listByContainer(containerId)),
      openAttachment: (attachmentId) =>
        callApi(() => api.files.openAttachment(attachmentId)),
      revealAttachment: (attachmentId) =>
        callApi(() => api.files.revealAttachment(attachmentId)),
      updateMetadata: (input) =>
        callApi(() => api.files.updateMetadata(input)),
      verifyAttachment: (attachmentId) =>
        callApi(() => api.files.verifyAttachment(attachmentId)),
      createFileSnapshot: (input) =>
        callApi(() => api.files.createFileSnapshot(input)),
      listFileVersions: (attachmentId) =>
        callApi(() => api.files.listFileVersions(attachmentId)),
      openFileVersion: (versionId) =>
        callApi(() => api.files.openFileVersion(versionId)),
      restoreFileVersion: (input) =>
        callApi(() => api.files.restoreFileVersion(input))
    },
    backup: {
      createManualBackup: (input) =>
        callApi(() => api.backup.createManualBackup(input)),
      listBackups: (input) => callApi(() => api.backup.listBackups(input)),
      validateRestoreSource: (input) =>
        callApi(() => api.backup.validateRestoreSource(input)),
      restoreBackupToNewWorkspace: (input) =>
        callApi(() => api.backup.restoreBackupToNewWorkspace(input)),
      restoreExportToNewWorkspace: (input) =>
        callApi(() => api.backup.restoreExportToNewWorkspace(input))
    },
    import: {
      validateWorkspaceExportJson: (input) =>
        callApi(() => api.import.validateWorkspaceExportJson(input)),
      chooseAndValidateWorkspaceExportJson: () =>
        callApi(() => api.import.chooseAndValidateWorkspaceExportJson())
    },
    export: {
      exportWorkspaceJson: (input) =>
        callApi(() => api.export.exportWorkspaceJson(input)),
      exportProjectMarkdown: (input) =>
        callApi(() => api.export.exportProjectMarkdown(input)),
      exportTasksCsv: (input) =>
        callApi(() => api.export.exportTasksCsv(input))
    },
    print: {
      printPdf: (input) =>
        callApi(() => {
          if (api.print === undefined) {
            throw new Error("Print/PDF export is not available.");
          }

          return api.print.printPdf(input);
        })
    },
    appearance: {
      getSettings: (workspaceId) =>
        callApi(() => api.appearance.getSettings(workspaceId)),
      updateSettings: (input) =>
        callApi(() => api.appearance.updateSettings(input))
    },
    diagnostics: {
      runWorkspaceIntegrityCheck: (input) =>
        callApi(() => api.diagnostics.runWorkspaceIntegrityCheck(input)),
      repairAttachment: (input) =>
        callApi(() => api.diagnostics.repairAttachment(input))
    },
    navigation: {
      listRecentTargets: (workspaceId) =>
        callApi(() => api.navigation.listRecentTargets(workspaceId)),
      recordTarget: (input) =>
        callApi(() => api.navigation.recordTarget(input)),
      listPinnedFavorites: (workspaceId) =>
        callApi(() => api.navigation.listPinnedFavorites(workspaceId)),
      listAppTabs: (workspaceId) =>
        callApi(() => api.navigation.listAppTabs(workspaceId)),
      openAppTab: (input) => callApi(() => api.navigation.openAppTab(input)),
      closeAppTab: (input) => callApi(() => api.navigation.closeAppTab(input)),
      reorderAppTabs: (input) =>
        callApi(() => api.navigation.reorderAppTabs(input)),
      setActiveAppTab: (input) =>
        callApi(() => api.navigation.setActiveAppTab(input))
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
  reminders: {
    setTaskReminder: (input) =>
      getDesktopApiClient().reminders!.setTaskReminder(input),
    clearTaskReminder: (input) =>
      getDesktopApiClient().reminders!.clearTaskReminder(input),
    setListItemReminder: (input) =>
      getDesktopApiClient().reminders!.setListItemReminder(input),
    clearListItemReminder: (input) =>
      getDesktopApiClient().reminders!.clearListItemReminder(input),
    dismissReminder: (input) =>
      getDesktopApiClient().reminders!.dismissReminder(input),
    snoozeReminder: (input) =>
      getDesktopApiClient().reminders!.snoozeReminder(input)
  },
  lists: {
    create: (input) => getDesktopApiClient().lists.create(input),
    addItem: (input) => getDesktopApiClient().lists.addItem(input),
    updateItem: (input) => getDesktopApiClient().lists.updateItem(input),
    completeItem: (listItemId) =>
      getDesktopApiClient().lists.completeItem(listItemId),
    reopenItem: (listItemId) =>
      getDesktopApiClient().lists.reopenItem(listItemId),
    enablePipelineMode: (listId) =>
      getDesktopApiClient().lists.enablePipelineMode(listId),
    disablePipelineMode: (listId) =>
      getDesktopApiClient().lists.disablePipelineMode(listId),
    getPipelineViewModel: (listId) =>
      getDesktopApiClient().lists.getPipelineViewModel(listId),
    movePipelineCard: (input) =>
      getDesktopApiClient().lists.movePipelineCard(input),
    indentItem: (listItemId) =>
      getDesktopApiClient().lists.indentItem(listItemId),
    outdentItem: (listItemId) =>
      getDesktopApiClient().lists.outdentItem(listItemId),
    moveItem: (input) => getDesktopApiClient().lists.moveItem(input),
    moveItemToList: (input) =>
      getDesktopApiClient().lists.moveItemToList(input),
    bulkAddItems: (input) => getDesktopApiClient().lists.bulkAddItems(input),
    bulkUpdateItems: (input) =>
      getDesktopApiClient().lists.bulkUpdateItems(input),
    listByContainer: (containerId) =>
      getDesktopApiClient().lists.listByContainer(containerId),
    createList: (input) => getDesktopApiClient().lists.createList(input),
    saveAsTemplate: (input) =>
      getDesktopApiClient().lists.saveAsTemplate(input),
    createFromTemplate: (input) =>
      getDesktopApiClient().lists.createFromTemplate(input),
    listTemplates: (workspaceId) =>
      getDesktopApiClient().lists.listTemplates(workspaceId)
  },
  templates: {
    saveContainerAsTemplate: (input) =>
      getDesktopApiClient().templates!.saveContainerAsTemplate(input),
    createContainerFromTemplate: (input) =>
      getDesktopApiClient().templates!.createContainerFromTemplate(input),
    listTemplates: (input) =>
      getDesktopApiClient().templates!.listTemplates(input)
  },
  notes: {
    create: (input) => getDesktopApiClient().notes.create(input),
    update: (input) => getDesktopApiClient().notes.update(input),
    listByContainer: (containerId) =>
      getDesktopApiClient().notes.listByContainer(containerId),
    createNote: (input) => getDesktopApiClient().notes.createNote(input),
    updateNote: (input) => getDesktopApiClient().notes.updateNote(input)
  },
  links: {
    create: (input) => getDesktopApiClient().links.create(input),
    update: (input) => getDesktopApiClient().links.update(input),
    listByContainer: (containerId) =>
      getDesktopApiClient().links.listByContainer(containerId),
    openExternal: (itemId) => getDesktopApiClient().links.openExternal(itemId),
    openUrlExternal: (url) => getDesktopApiClient().links.openUrlExternal(url),
    createLink: (input) => getDesktopApiClient().links.createLink(input),
    updateLink: (input) => getDesktopApiClient().links.updateLink(input)
  },
  projects: {
      create: (input) => getDesktopApiClient().projects.create(input),
      update: (input) => getDesktopApiClient().projects.update(input),
      clone: (input) =>
        getDesktopApiClient().projects.clone?.(input) ??
        unavailable("Project clone API is not available."),
      archive: (projectId) => getDesktopApiClient().projects.archive(projectId),
      complete: (projectId) =>
        getDesktopApiClient().projects.complete?.(projectId) ??
        unavailable("Project complete API is not available."),
      restore: (projectId) =>
        getDesktopApiClient().projects.restore?.(projectId) ??
        unavailable("Project restore API is not available."),
    softDelete: (projectId) =>
      getDesktopApiClient().projects.softDelete(projectId),
    list: (workspaceId) => getDesktopApiClient().projects.list(workspaceId),
    get: (projectId) => getDesktopApiClient().projects.get(projectId),
    getHealth: (projectId) =>
      getDesktopApiClient().projects.getHealth(projectId),
    createProject: (input) =>
      getDesktopApiClient().projects.createProject(input),
      updateProject: (input) =>
        getDesktopApiClient().projects.updateProject(input),
      cloneProject: (input) =>
        getDesktopApiClient().projects.cloneProject?.(input) ??
        unavailable("Project clone API is not available."),
    archiveProject: (projectId) =>
      getDesktopApiClient().projects.archiveProject(projectId),
    completeProject: (projectId) =>
      getDesktopApiClient().projects.completeProject?.(projectId) ??
      unavailable("Project complete API is not available."),
    restoreProject: (projectId) =>
      getDesktopApiClient().projects.restoreProject?.(projectId) ??
      unavailable("Project restore API is not available."),
    softDeleteProject: (projectId) =>
      getDesktopApiClient().projects.softDeleteProject(projectId),
    listProjects: (workspaceId) =>
      getDesktopApiClient().projects.listProjects(workspaceId),
    getProject: (projectId) =>
      getDesktopApiClient().projects.getProject(projectId),
    getProjectHealth: (projectId) =>
      getDesktopApiClient().projects.getProjectHealth(projectId)
  },
  contacts: {
      create: (input) => getDesktopApiClient().contacts.create(input),
      update: (input) => getDesktopApiClient().contacts.update(input),
      clone: (input) =>
        getDesktopApiClient().contacts.clone?.(input) ??
        unavailable("Contact clone API is not available."),
    archive: (contactId) =>
      getDesktopApiClient().contacts.archive?.(contactId) ??
      unavailable("Contact archive API is not available."),
    complete: (contactId) =>
      getDesktopApiClient().contacts.complete?.(contactId) ??
      unavailable("Contact complete API is not available."),
    restore: (contactId) =>
      getDesktopApiClient().contacts.restore?.(contactId) ??
      unavailable("Contact restore API is not available."),
    list: (workspaceId) => getDesktopApiClient().contacts.list(workspaceId),
    get: (contactId) => getDesktopApiClient().contacts.get(contactId),
    addField: (input) => getDesktopApiClient().contacts.addField(input),
    updateField: (input) => getDesktopApiClient().contacts.updateField(input),
    createContact: (input) =>
      getDesktopApiClient().contacts.createContact(input),
      updateContact: (input) =>
        getDesktopApiClient().contacts.updateContact(input),
      cloneContact: (input) =>
        getDesktopApiClient().contacts.cloneContact?.(input) ??
        unavailable("Contact clone API is not available."),
    archiveContact: (contactId) =>
      getDesktopApiClient().contacts.archiveContact?.(contactId) ??
      unavailable("Contact archive API is not available."),
    completeContact: (contactId) =>
      getDesktopApiClient().contacts.completeContact?.(contactId) ??
      unavailable("Contact complete API is not available."),
    restoreContact: (contactId) =>
      getDesktopApiClient().contacts.restoreContact?.(contactId) ??
      unavailable("Contact restore API is not available."),
    listContacts: (workspaceId) =>
      getDesktopApiClient().contacts.listContacts(workspaceId),
    getContact: (contactId) =>
      getDesktopApiClient().contacts.getContact(contactId),
    getTimeline: (input) =>
      getDesktopApiClient().contacts.getTimeline?.(input) ??
      Promise.resolve({
        ok: false,
        error: {
          code: "IPC_ERROR",
          message: "Contact timeline API is not available."
        }
      })
  },
  tabs: {
    list: (containerId) => getDesktopApiClient().tabs.list(containerId),
    listManaged: (containerId) =>
      getDesktopApiClient().tabs.listManaged(containerId),
    listSummaries: (containerId) =>
      getDesktopApiClient().tabs.listSummaries(containerId),
    listTemplates: () => getDesktopApiClient().tabs.listTemplates(),
    create: (input) => getDesktopApiClient().tabs.create(input),
    createFromTemplate: (input) =>
      getDesktopApiClient().tabs.createFromTemplate(input),
    rename: (input) => getDesktopApiClient().tabs.rename(input),
    reorder: (input) => getDesktopApiClient().tabs.reorder(input),
    hide: (tabId) => getDesktopApiClient().tabs.hide(tabId),
    show: (tabId) => getDesktopApiClient().tabs.show(tabId),
    duplicate: (tabId) => getDesktopApiClient().tabs.duplicate(tabId),
    archive: (tabId) => getDesktopApiClient().tabs.archive(tabId),
    delete: (tabId) => getDesktopApiClient().tabs.delete(tabId),
    listTabs: (containerId) => getDesktopApiClient().tabs.listTabs(containerId),
    listManagedTabs: (containerId) =>
      getDesktopApiClient().tabs.listManagedTabs(containerId),
    listTabSummaries: (containerId) =>
      getDesktopApiClient().tabs.listTabSummaries(containerId),
    createTab: (input) => getDesktopApiClient().tabs.createTab(input),
    createTabFromTemplate: (input) =>
      getDesktopApiClient().tabs.createTabFromTemplate(input),
    renameTab: (input) => getDesktopApiClient().tabs.renameTab(input),
    reorderTabs: (input) => getDesktopApiClient().tabs.reorderTabs(input),
    hideTab: (tabId) => getDesktopApiClient().tabs.hideTab(tabId),
    showTab: (tabId) => getDesktopApiClient().tabs.showTab(tabId),
    duplicateTab: (tabId) => getDesktopApiClient().tabs.duplicateTab(tabId),
    archiveTab: (tabId) => getDesktopApiClient().tabs.archiveTab(tabId),
    deleteTab: (tabId) => getDesktopApiClient().tabs.deleteTab(tabId)
  },
  relationships: {
    getGraph: (input) =>
      getDesktopApiClient().relationships.getGraph(input),
    createRelationship: (input) =>
      getDesktopApiClient().relationships.createRelationship(input),
    removeRelationship: (relationshipId) =>
      getDesktopApiClient().relationships.removeRelationship(relationshipId),
    linkContactToProject: (input) =>
      getDesktopApiClient().relationships.linkContactToProject(input),
    unlinkContactFromProject: (relationshipId) =>
      getDesktopApiClient().relationships.unlinkContactFromProject(
        relationshipId
      ),
    listContactsForProject: (projectId) =>
      getDesktopApiClient().relationships.listContactsForProject(projectId),
    listProjectsForContact: (contactId) =>
      getDesktopApiClient().relationships.listProjectsForContact(contactId)
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
      getDesktopApiClient().metadata.listTargetsByMetadata(input),
    getProjectTagBrowser: (input) =>
      getDesktopApiClient().metadata.getProjectTagBrowser(input),
    getContactLabelBrowser: (input) =>
      getDesktopApiClient().metadata.getContactLabelBrowser(input),
    addTagToTarget: (input) =>
      getDesktopApiClient().metadata.addTagToTarget(input),
    removeTagFromTarget: (input) =>
      getDesktopApiClient().metadata.removeTagFromTarget(input)
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
      getDesktopApiClient().collections.createTaskInCollection(input),
    listSmartLists: (workspaceId) =>
      getDesktopApiClient().collections.listSmartLists(workspaceId),
    createSmartList: (input) =>
      getDesktopApiClient().collections.createSmartList(input),
    updateSmartList: (input) =>
      getDesktopApiClient().collections.updateSmartList(input),
    previewSmartList: (input) =>
      getDesktopApiClient().collections.previewSmartList(input)
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
  timeline: {
    getViewModel: (input) =>
      getDesktopApiClient().timeline!.getViewModel(input)
  },
  calendar: {
    getMonth: (input) => getDesktopApiClient().calendar!.getMonth(input)
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
    getStatus: () => getDesktopApiClient().containers.getStatus(),
    getPreferences: (containerId) =>
      getDesktopApiClient().containers.getPreferences(containerId),
    updatePreferences: (input) =>
      getDesktopApiClient().containers.updatePreferences(input),
    getGrouping: (input) =>
      getDesktopApiClient().containers.getGrouping(input),
    getGroupingPreferences: (input) =>
      getDesktopApiClient().containers.getGroupingPreferences(input),
    updateGroupingPreferences: (input) =>
      getDesktopApiClient().containers.updateGroupingPreferences(input)
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
      getDesktopApiClient().items.openItemInspector(itemId),
    bulkMoveItems: (input) =>
      getDesktopApiClient().items.bulkMoveItems!(input),
    bulkTagItems: (input) =>
      getDesktopApiClient().items.bulkTagItems!(input),
    bulkCategorizeItems: (input) =>
      getDesktopApiClient().items.bulkCategorizeItems!(input),
    bulkArchiveItems: (input) =>
      getDesktopApiClient().items.bulkArchiveItems!(input),
    bulkDeleteItems: (input) =>
      getDesktopApiClient().items.bulkDeleteItems!(input),
    bulkCompleteTasks: (input) =>
      getDesktopApiClient().items.bulkCompleteTasks!(input),
    bulkExportItems: (input) =>
      getDesktopApiClient().items.bulkExportItems!(input),
    undoActivity: (input) =>
      getDesktopApiClient().items.undoActivity!(input),
    redoActivity: (input) =>
      getDesktopApiClient().items.redoActivity!(input)
  },
  trash: {
    listTrash: (input) => getDesktopApiClient().trash!.listTrash(input),
    restoreTrash: (input) => getDesktopApiClient().trash!.restoreTrash(input),
    clearTrash: (input) => getDesktopApiClient().trash!.clearTrash(input)
  },
  dragDrop: {
    reorderItems: (input) =>
      getDesktopApiClient().dragDrop!.reorderItems(input),
    moveItem: (input) => getDesktopApiClient().dragDrop!.moveItem(input),
    reorderListItems: (input) =>
      getDesktopApiClient().dragDrop!.reorderListItems(input),
    reorderTabs: (input) => getDesktopApiClient().dragDrop!.reorderTabs(input),
    attachFilesToContainer: (input) =>
      getDesktopApiClient().dragDrop!.attachFilesToContainer(input),
    attachFilesToItem: (input) =>
      getDesktopApiClient().dragDrop!.attachFilesToItem(input),
    getDroppedFilePaths: (files) =>
      getDesktopApiClient().dragDrop!.getDroppedFilePaths(files)
  },
  containerMedia: {
    chooseAndSet: (input) => getDesktopApiClient().containerMedia!.chooseAndSet(input),
    getActive: (input) => getDesktopApiClient().containerMedia!.getActive(input),
    remove: (input) => getDesktopApiClient().containerMedia!.remove(input)
  },
  files: {
    getStatus: () => getDesktopApiClient().files.getStatus(),
    attachFileToContainer: (input) =>
      getDesktopApiClient().files.attachFileToContainer(input),
    attachFileToItem: (input) =>
      getDesktopApiClient().files.attachFileToItem(input),
    chooseAndAttach: (input) =>
      getDesktopApiClient().files.chooseAndAttach(input),
    listByContainer: (containerId) =>
      getDesktopApiClient().files.listByContainer(containerId),
    openAttachment: (attachmentId) =>
      getDesktopApiClient().files.openAttachment(attachmentId),
    revealAttachment: (attachmentId) =>
      getDesktopApiClient().files.revealAttachment(attachmentId),
    updateMetadata: (input) =>
      getDesktopApiClient().files.updateMetadata(input),
    verifyAttachment: (attachmentId) =>
      getDesktopApiClient().files.verifyAttachment(attachmentId),
    createFileSnapshot: (input) =>
      getDesktopApiClient().files.createFileSnapshot(input),
    listFileVersions: (attachmentId) =>
      getDesktopApiClient().files.listFileVersions(attachmentId),
    openFileVersion: (versionId) =>
      getDesktopApiClient().files.openFileVersion(versionId),
    restoreFileVersion: (input) =>
      getDesktopApiClient().files.restoreFileVersion(input)
  },
  backup: {
    createManualBackup: (input) =>
      getDesktopApiClient().backup.createManualBackup(input),
    listBackups: (input) => getDesktopApiClient().backup.listBackups(input),
    validateRestoreSource: (input) =>
      getDesktopApiClient().backup.validateRestoreSource(input),
    restoreBackupToNewWorkspace: (input) =>
      getDesktopApiClient().backup.restoreBackupToNewWorkspace(input),
    restoreExportToNewWorkspace: (input) =>
      getDesktopApiClient().backup.restoreExportToNewWorkspace(input)
  },
  import: {
    validateWorkspaceExportJson: (input) =>
      getDesktopApiClient().import.validateWorkspaceExportJson(input),
    chooseAndValidateWorkspaceExportJson: () =>
      getDesktopApiClient().import.chooseAndValidateWorkspaceExportJson()
  },
  export: {
    exportWorkspaceJson: (input) =>
      getDesktopApiClient().export.exportWorkspaceJson(input),
    exportProjectMarkdown: (input) =>
      getDesktopApiClient().export.exportProjectMarkdown(input),
    exportTasksCsv: (input) => getDesktopApiClient().export.exportTasksCsv(input)
  },
  print: {
    printPdf: (input) => getDesktopApiClient().print!.printPdf(input)
  },
  appearance: {
    getSettings: (workspaceId) =>
      getDesktopApiClient().appearance.getSettings(workspaceId),
    updateSettings: (input) =>
      getDesktopApiClient().appearance.updateSettings(input)
  },
  diagnostics: {
    runWorkspaceIntegrityCheck: (input) =>
      getDesktopApiClient().diagnostics.runWorkspaceIntegrityCheck(input),
    repairAttachment: (input) =>
      getDesktopApiClient().diagnostics.repairAttachment(input)
  },
  navigation: {
    listRecentTargets: (workspaceId) =>
      getDesktopApiClient().navigation.listRecentTargets(workspaceId),
    recordTarget: (input) =>
      getDesktopApiClient().navigation.recordTarget(input),
    listPinnedFavorites: (workspaceId) =>
      getDesktopApiClient().navigation.listPinnedFavorites(workspaceId),
    listAppTabs: (workspaceId) =>
      getDesktopApiClient().navigation.listAppTabs(workspaceId),
    openAppTab: (input) =>
      getDesktopApiClient().navigation.openAppTab(input),
    closeAppTab: (input) =>
      getDesktopApiClient().navigation.closeAppTab(input),
    reorderAppTabs: (input) =>
      getDesktopApiClient().navigation.reorderAppTabs(input),
    setActiveAppTab: (input) =>
      getDesktopApiClient().navigation.setActiveAppTab(input)
  }
};
