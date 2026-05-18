import { describe, expect, it } from "vitest";
import {
  apiOk,
  type ActivitySummary,
  type ApiResult,
  type CategorySummary,
  type CollectionEvaluationSummary,
  type CollectionSummary,
  type ContactFieldSummary,
  type ContactSummary,
  type DatabaseHealthStatus,
  type DashboardViewModelSummary,
  type FileAttachmentResultSummary,
  type ImportValidationSummary,
  type InboxSummary,
  type IpcModuleStatus,
  type ItemSummary,
  type LinkSummary,
  type ListItemSummary,
  type ListSummary,
  type LocalWorkOsApi,
  type ManualBackupSnapshotSummary,
  type MaintenanceJobSummary,
  type MetadataTargetSummary,
  type NoteSummary,
  type ProjectHealthSummary,
  type ProjectSummary,
  type RecentWorkspace,
  type RelationshipSummary,
  type RestoreValidationSummary,
  type RestoreWorkspaceSummary,
  type SmartListSummary,
  type WorkspaceJsonExportSummary,
  type WorkspaceIntegritySummary,
  type TaskSummary,
  type DailyPlanItemSummary,
  type DailyPlanSummary,
  type PlannedTaskSummary,
  type TodayViewModelSummary,
  type WorkspaceSummary
} from "../../src/preload/api";
import { createDesktopApiClient } from "../../src/renderer/api/desktopApiClient";

function moduleStatus(module: IpcModuleStatus["module"]): IpcModuleStatus {
  return {
    module,
    available: true,
    implemented: false,
    message: `${module} placeholder`
  };
}

function createMockApi(
  overrides: Partial<LocalWorkOsApi> = {}
): LocalWorkOsApi {
  const api: LocalWorkOsApi = {
    workspace: {
      createWorkspace: async () =>
        apiOk({
          id: "workspace_1",
          name: "Personal",
          rootPath: "C:\\work",
          openedAt: "2026-04-30T00:00:00.000Z",
          schemaVersion: null
        }),
      createDemoWorkspace: async () =>
        apiOk({
          id: "workspace_1",
          name: "Demo Workspace",
          rootPath: "C:\\work",
          openedAt: "2026-04-30T00:00:00.000Z",
          schemaVersion: null
        }),
      openWorkspace: async () =>
        apiOk({
          id: "workspace_1",
          name: "Personal",
          rootPath: "C:\\work",
          openedAt: "2026-04-30T00:00:00.000Z",
          schemaVersion: null
        }),
      validateWorkspace: async () =>
        apiOk({
          ok: true,
          workspaceRootPath: "C:\\work",
          paths: {
            workspaceRootPath: "C:\\work",
            manifestPath: "C:\\work\\workspace.json",
            dataPath: "C:\\work\\data",
            databasePath: "C:\\work\\data\\local-work-os.sqlite",
            attachmentsPath: "C:\\work\\attachments",
            backupsPath: "C:\\work\\backups",
            exportsPath: "C:\\work\\exports",
            logsPath: "C:\\work\\logs"
          },
          problems: []
        }),
      getCurrentWorkspace: async (): Promise<
        ApiResult<WorkspaceSummary | null>
      > => apiOk(null),
      listRecentWorkspaces: async (): Promise<ApiResult<RecentWorkspace[]>> =>
        apiOk([])
    },
    database: {
      getHealthStatus: async (): Promise<ApiResult<DatabaseHealthStatus>> =>
        apiOk({
          connected: false,
          schemaVersion: null,
          workspaceExists: false,
          inboxExists: false,
          defaultDashboardExists: false,
          activityLogAvailable: false,
          searchIndexAvailable: false,
          databasePath: null,
          error: null
        })
    },
    inbox: {
      getInbox: async () => apiOk(inboxSummary()),
      listItems: async () => apiOk([itemSummary()]),
      moveItemToProject: async () =>
        apiOk({
          ...itemSummary(),
          containerId: "container_1"
        })
    },
    tasks: {
      create: async () => apiOk(taskSummary()),
      update: async () => apiOk(taskSummary()),
      complete: async () =>
        apiOk({
          ...taskSummary(),
          status: "completed",
          taskStatus: "done"
      }),
      reopen: async () => apiOk(taskSummary()),
      snooze: async () => apiOk(taskSummary()),
      reschedule: async () => apiOk(taskSummary()),
      listByContainer: async () => apiOk([taskSummary()]),
      createTask: async () => apiOk(taskSummary()),
      updateTask: async () => apiOk(taskSummary()),
      completeTask: async () =>
        apiOk({
          ...taskSummary(),
          status: "completed",
          taskStatus: "done"
        }),
      reopenTask: async () => apiOk(taskSummary()),
      snoozeTask: async () => apiOk(taskSummary()),
      rescheduleTask: async () => apiOk(taskSummary())
    },
    lists: {
      create: async () => apiOk(listSummary()),
      addItem: async () => apiOk(listItemSummary()),
      updateItem: async () => apiOk(listItemSummary()),
      completeItem: async () =>
        apiOk({
          ...listItemSummary(),
          status: "done",
          completedAt: "2026-04-30T01:00:00.000Z"
        }),
      reopenItem: async () => apiOk(listItemSummary()),
      enablePipelineMode: async () =>
        apiOk({ ...listSummary(), displayMode: "pipeline" }),
      disablePipelineMode: async () => apiOk(listSummary()),
      getPipelineViewModel: async () =>
        apiOk({
          list: { ...listSummary(), displayMode: "pipeline" },
          stages: [
            {
              stage: listItemSummary(),
              cards: []
            }
          ]
        }),
      movePipelineCard: async () =>
        apiOk({
          ...listItemSummary(),
          listItemParentId: "list_item_stage_1",
          depth: 1
        }),
      indentItem: async () => apiOk({ ...listItemSummary(), depth: 1 }),
      outdentItem: async () => apiOk({ ...listItemSummary(), depth: 0 }),
      moveItem: async () => apiOk(listItemSummary()),
      moveItemToList: async () => apiOk([listItemSummary()]),
      bulkAddItems: async () => apiOk([listItemSummary()]),
      bulkUpdateItems: async () => apiOk({
        listId: 'item_list_1',
        operation: 'complete',
        requestedCount: 1,
        changedCount: 1,
        skippedCount: 0,
        items: [],
        activityId: 'activity_1'
      }),
      listByContainer: async () => apiOk([listSummary()]),
      createList: async () => apiOk(listSummary()),
      saveAsTemplate: async () =>
        apiOk({
          id: "template_1",
          workspaceId: "workspace_1",
          kind: "list",
          name: "List template",
          description: null,
          sourceType: "list",
          sourceId: "item_list_1",
          templateJson: "{}",
          createdAt: "2026-05-01T00:00:00.000Z",
          updatedAt: "2026-05-01T00:00:00.000Z",
          deletedAt: null
        }),
      createFromTemplate: async () => apiOk(listSummary()),
      listTemplates: async () => apiOk([])
    },
    notes: {
      create: async () => apiOk(noteSummary()),
      update: async () => apiOk(noteSummary()),
      listByContainer: async () => apiOk([noteSummary()]),
      createNote: async () => apiOk(noteSummary()),
      updateNote: async () => apiOk(noteSummary())
    },
    links: {
      create: async () => apiOk(linkSummary()),
      update: async () => apiOk(linkSummary()),
      listByContainer: async () => apiOk([linkSummary()]),
      openExternal: async () =>
        apiOk({
          itemId: "item_link_1",
          url: "example.com/brief",
          normalizedUrl: "https://example.com/brief"
        }),
      openUrlExternal: async () =>
        apiOk({
          url: "https://example.com/inline",
          normalizedUrl: "https://example.com/inline"
        }),
      createLink: async () => apiOk(linkSummary()),
      updateLink: async () => apiOk(linkSummary())
    },
    locations: {
      create: async () => apiOk(null as never),
      update: async () => apiOk(null as never),
      listByContainer: async () => apiOk([]),
      openExternal: async () =>
        apiOk({
          itemId: "item_location_1",
          mapUrl: "https://www.openstreetmap.org/search?query=Launch"
        }),
      createLocation: async () => apiOk(null as never),
      updateLocation: async () => apiOk(null as never)
    },
    projects: {
      create: async () =>
        apiOk({
          project: projectSummary(),
          defaultTabId: "container_tab_1"
        }),
      update: async () => apiOk(projectSummary()),
      archive: async () =>
        apiOk({
          ...projectSummary(),
          status: "archived",
          archivedAt: "2026-04-30T01:00:00.000Z"
        }),
      softDelete: async () =>
        apiOk({
          ...projectSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      list: async () => apiOk([projectSummary()]),
      get: async () => apiOk(projectSummary()),
      getHealth: async () => apiOk(projectHealthSummary()),
      createProject: async () =>
        apiOk({
          project: projectSummary(),
          defaultTabId: "container_tab_1"
        }),
      updateProject: async () => apiOk(projectSummary()),
      archiveProject: async () =>
        apiOk({
          ...projectSummary(),
          status: "archived",
          archivedAt: "2026-04-30T01:00:00.000Z"
        }),
      softDeleteProject: async () =>
        apiOk({
          ...projectSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      listProjects: async () => apiOk([projectSummary()]),
      getProject: async () => apiOk(projectSummary()),
      getProjectHealth: async () => apiOk(projectHealthSummary())
    },
    contacts: {
      create: async () =>
        apiOk({
          contact: contactSummary(),
          defaultTabId: "container_tab_2",
          fields: [contactFieldSummary()]
        }),
      update: async () => apiOk(contactSummary()),
      list: async () => apiOk([contactSummary()]),
      get: async () =>
        apiOk({
          contact: contactSummary(),
          fields: [contactFieldSummary()]
        }),
      addField: async () => apiOk(contactFieldSummary()),
      updateField: async () =>
        apiOk({
          ...contactFieldSummary(),
          value: "alex.revised@example.com"
        }),
      createContact: async () =>
        apiOk({
          contact: contactSummary(),
          defaultTabId: "container_tab_2",
          fields: [contactFieldSummary()]
        }),
      updateContact: async () => apiOk(contactSummary()),
      listContacts: async () => apiOk([contactSummary()]),
      getContact: async () =>
        apiOk({
          contact: contactSummary(),
          fields: [contactFieldSummary()]
        })
    },
    tabs: {
      list: async () => apiOk([]),
      listManaged: async () => apiOk([]),
      listSummaries: async () => apiOk([]),
      listTemplates: async () => apiOk([]),
      create: async () => apiOk(null as never),
      createFromTemplate: async () => apiOk(null as never),
      rename: async () => apiOk(null as never),
      reorder: async () => apiOk([]),
      hide: async () => apiOk(null as never),
      show: async () => apiOk(null as never),
      duplicate: async () => apiOk(null as never),
      archive: async () => apiOk(null as never),
      delete: async () => apiOk(null as never),
      listTabs: async () => apiOk([]),
      listManagedTabs: async () => apiOk([]),
      listTabSummaries: async () => apiOk([]),
      createTab: async () => apiOk(null as never),
      createTabFromTemplate: async () => apiOk(null as never),
      renameTab: async () => apiOk(null as never),
      reorderTabs: async () => apiOk([]),
      hideTab: async () => apiOk(null as never),
      showTab: async () => apiOk(null as never),
      duplicateTab: async () => apiOk(null as never),
      archiveTab: async () => apiOk(null as never),
      deleteTab: async () => apiOk(null as never)
    },
    relationships: {
      getGraph: async () => apiOk(null as never),
      createRelationship: async () => apiOk(null as never),
      removeRelationship: async () => apiOk(null as never),
      linkContactToProject: async () =>
        apiOk({
          relationship: relationshipSummary(),
          changed: true
        }),
      unlinkContactFromProject: async () =>
        apiOk({
          relationship: {
            ...relationshipSummary(),
            deletedAt: "2026-04-30T01:00:00.000Z"
          },
          changed: true
        }),
      listContactsForProject: async () =>
        apiOk([
          {
            relationshipId: "relationship_1",
            relationshipCreatedAt: "2026-04-30T00:00:00.000Z",
            contact: contactSummary(),
            openTaskCount: 1,
            recentActivityCount: 1,
            recentActivity: [activitySummary()]
          }
        ]),
      listProjectsForContact: async () =>
        apiOk([
          {
            relationshipId: "relationship_1",
            relationshipCreatedAt: "2026-04-30T00:00:00.000Z",
            project: projectSummary(),
            openTaskCount: 1,
            recentActivityCount: 1,
            recentActivity: [activitySummary()]
          }
        ])
    },
    categories: {
      create: async () => apiOk(categorySummary()),
      update: async () => apiOk(categorySummary()),
      delete: async () =>
        apiOk({
          ...categorySummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      list: async () => apiOk([categorySummary()]),
      assignToProject: async () =>
        apiOk({
          ...projectSummary(),
          categoryId: "category_1"
        }),
      assignToItem: async () =>
        apiOk({
          ...itemSummary(),
          categoryId: "category_1"
        }),
      createCategory: async () => apiOk(categorySummary()),
      updateCategory: async () => apiOk(categorySummary()),
      deleteCategory: async () =>
        apiOk({
          ...categorySummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      listCategories: async () => apiOk([categorySummary()])
    },
    metadata: {
      listTagsWithCounts: async () =>
        apiOk([
          {
            id: "tag_1",
            workspaceId: "workspace_1",
            name: "Finance",
            slug: "finance",
            createdAt: "2026-04-30T00:00:00.000Z",
            updatedAt: "2026-04-30T00:00:00.000Z",
            deletedAt: null,
            targetCount: 2
          }
        ]),
      listCategoriesWithCounts: async () =>
        apiOk([
          {
            ...categorySummary(),
            targetCount: 2
          }
        ]),
      listTargetsByMetadata: async () => apiOk([metadataTargetSummary()]),
      getProjectTagBrowser: async () =>
        apiOk({
          workspaceId: "workspace_1",
          generatedAt: "2026-05-01T00:00:00.000Z",
          filters: { tagSlugs: [], categoryId: null, status: null },
          selectedTags: [],
          tagFacets: [],
          categoryFacets: [],
          statusFacets: [],
          projects: [],
          totalProjectCount: 0
        }),
      getContactLabelBrowser: async () =>
        apiOk({
          workspaceId: 'workspace_1',
          generatedAt: '2026-05-01T00:00:00.000Z',
          filters: { fieldFilters: [], company: null, role: null, location: null, emailDomain: null, tagSlugs: [], categoryId: null, status: null, groupBy: 'company', fieldGroupLabel: null },
          selectedTags: [],
          fieldFacets: [],
          companyFacets: [],
          roleFacets: [],
          locationFacets: [],
          emailDomainFacets: [],
          tagFacets: [],
          categoryFacets: [],
          statusFacets: [],
          contacts: [],
          groups: [],
          totalContactCount: 0
        }),
      addTagToTarget: async () =>
        apiOk({ id: "tag_1", name: "Finance", slug: "finance", source: "manual" }),
      removeTagFromTarget: async () =>
        apiOk({ id: "tag_1", name: "Finance", slug: "finance", source: "manual" })
    },
    search: {
      searchWorkspace: async () => apiOk([]),
      saveSearch: async () => apiOk({ savedViewId: "saved_search_1", name: "Saved search" }),
      listRecentSearches: async () => apiOk([])
    },
    collections: {
      listCollections: async () => apiOk([collectionSummary()]),
      createTagCollection: async () => apiOk(collectionSummary()),
      createKeywordCollection: async () => apiOk({
        ...collectionSummary(),
        id: "saved_view_2",
        kind: "keyword",
        tagSlug: null,
        keyword: "supplier"
      }),
      createMetadataCollection: async () => apiOk(collectionSummary()),
      evaluateCollection: async () => apiOk(collectionEvaluationSummary()),
      createTaskInCollection: async () =>
        apiOk({
          ...taskSummary(),
          tags: [
            {
              id: "tag_1",
              name: "Finance",
              slug: "finance",
              source: "manual"
            }
          ]
        }),
      createNoteInCollection: async () => apiOk(noteSummary()),
      listSmartLists: async () => apiOk([smartListSummary()]),
      createSmartList: async () => apiOk(smartListSummary()),
      updateSmartList: async () => apiOk({ ...smartListSummary(), name: "Due soon" }),
      previewSmartList: async () =>
        apiOk({
          query: smartListSummary().query,
          total: 0,
          results: [],
          groups: [],
          page: {
            limit: 50,
            offset: 0,
            hasMore: false
          }
        })
    },
    today: {
      getViewModel: async () => apiOk(todayViewModelSummary()),
      getOrCreateDailyPlan: async () => apiOk(dailyPlanSummary()),
      planTask: async () => apiOk(dailyPlanItemSummary()),
      unplanTask: async () => apiOk([dailyPlanItemSummary()]),
      reorderPlannedTask: async () =>
        apiOk({
          ...dailyPlanItemSummary(),
          sortOrder: 512
        }),
      getPlannedTasks: async () => apiOk([plannedTaskSummary()]),
      getPreferences: async () => apiOk(todayPreferencesSummary()),
      updatePreferences: async () => apiOk(todayPreferencesSummary())
    },
    dashboard: {
      getDefault: async () => apiOk(dashboardViewModelSummary())
    },
    activity: {
      listRecent: async () => apiOk([activitySummary()]),
      listForTarget: async () => apiOk([activitySummary()]),
      listRecentActivity: async () => apiOk([activitySummary()]),
      listActivityForTarget: async () => apiOk([activitySummary()])
    },
    containers: {
      getStatus: async () => apiOk(moduleStatus("containers")),
      getPreferences: async () =>
        apiOk({
          workspaceId: "workspace_1",
          containerId: "container_1",
          updatedAt: null,
          defaultView: "feed",
          defaultTabId: null,
          showCompleted: true,
          grouping: "none",
          defaultQuickAddType: "task",
          summaryFirst: false,
          compactMode: false
        }),
      updatePreferences: async (input) =>
        apiOk({
          workspaceId: "workspace_1",
          updatedAt: "2026-05-10T10:01:00.000Z",
          defaultView: input.defaultView ?? "feed",
          defaultTabId: input.defaultTabId ?? null,
          showCompleted: input.showCompleted ?? true,
          grouping: input.grouping ?? "none",
          defaultQuickAddType: input.defaultQuickAddType ?? "task",
          summaryFirst: input.summaryFirst ?? false,
          compactMode: input.compactMode ?? false,
          containerId: input.containerId
        }),
      getGrouping: async (input) =>
        apiOk({
          workspaceId: input.workspaceId ?? "workspace_1",
          containerType: input.containerType,
          mode: input.mode ?? (input.containerType === "project" ? "status" : "company"),
          generatedAt: "2026-05-10T10:01:00.000Z",
          staleAfterDays: 30,
          totalCount: 0,
          facets: [],
          preferences: {
            workspaceId: input.workspaceId ?? "workspace_1",
            containerType: input.containerType,
            mode: input.mode ?? (input.containerType === "project" ? "status" : "company"),
            collapsedGroupKeys: [],
            updatedAt: null
          },
          groups: []
        }),
      getGroupingPreferences: async (input) =>
        apiOk({
          workspaceId: input.workspaceId ?? "workspace_1",
          containerType: input.containerType,
          mode: input.containerType === "project" ? "status" : "company",
          collapsedGroupKeys: [],
          updatedAt: null
        }),
      updateGroupingPreferences: async (input) =>
        apiOk({
          workspaceId: input.workspaceId ?? "workspace_1",
          containerType: input.containerType,
          mode: input.mode ?? (input.containerType === "project" ? "status" : "company"),
          collapsedGroupKeys: input.collapsedGroupKeys ?? [],
          updatedAt: "2026-05-10T10:01:00.000Z"
        })
    },
    items: {
      getStatus: async () => apiOk(moduleStatus("items")),
      move: async () =>
        apiOk({
          ...itemSummary(),
          containerId: "container_1"
        }),
      archive: async () =>
        apiOk({
          ...itemSummary(),
          status: "archived",
          archivedAt: "2026-04-30T01:00:00.000Z"
        }),
      softDelete: async () =>
        apiOk({
          ...itemSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      getActivity: async () => apiOk([activitySummary()]),
      openInspector: async () =>
        apiOk({
          item: itemSummary(),
          activity: []
        }),
      moveItem: async () =>
        apiOk({
          ...itemSummary(),
          containerId: "container_1"
        }),
      archiveItem: async () =>
        apiOk({
          ...itemSummary(),
          status: "archived",
          archivedAt: "2026-04-30T01:00:00.000Z"
        }),
      softDeleteItem: async () =>
        apiOk({
          ...itemSummary(),
          deletedAt: "2026-04-30T01:00:00.000Z"
        }),
      getItemActivity: async () => apiOk([]),
      openItemInspector: async () =>
        apiOk({
          item: itemSummary(),
          activity: []
        })
    },
    files: {
      getStatus: async () => apiOk(moduleStatus("files")),
      attachFileToContainer: async () => apiOk(fileAttachmentResultSummary()),
      attachFileToItem: async () => apiOk(fileAttachmentResultSummary()),
      chooseAndAttach: async () => apiOk(fileAttachmentResultSummary()),
      listByContainer: async () => apiOk([]),
      openAttachment: async () =>
        apiOk({
          attachmentId: "attachment_1",
          itemId: "item_1",
          exists: true,
          storagePath: "attachments/2026/05/attachment_1/Brief.pdf"
        }),
      revealAttachment: async () =>
        apiOk({
          attachmentId: "attachment_1",
          itemId: "item_1",
          exists: true,
          storagePath: "attachments/2026/05/attachment_1/Brief.pdf"
        }),
      updateMetadata: async () => apiOk(fileAttachmentResultSummary()),
      verifyAttachment: async () =>
        apiOk({
          attachmentId: "attachment_1",
          itemId: "item_1",
          exists: true,
          storagePath: "attachments/2026/05/attachment_1/Brief.pdf"
        }),
      createFileSnapshot: async () =>
        apiOk({
          attachment: fileAttachmentResultSummary().attachment,
          version: {
            id: "version_1",
            workspaceId: "workspace_1",
            attachmentId: "attachment_1",
            versionNumber: 1,
            originalName: "Brief.pdf",
            storedName: "Brief.pdf",
            sizeBytes: 12,
            checksum: "abc123",
            storagePath:
              "attachments/2026/05/attachment_1/versions/v1/Brief.pdf",
            note: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null
          }
        }),
      listFileVersions: async () => apiOk([]),
      openFileVersion: async () =>
        apiOk({
          versionId: "version_1",
          attachmentId: "attachment_1",
          exists: true,
          storagePath: "attachments/2026/05/attachment_1/versions/v1/Brief.pdf"
        }),
      restoreFileVersion: async () =>
        apiOk({
          attachment: fileAttachmentResultSummary().attachment,
          version: {
            id: "version_1",
            workspaceId: "workspace_1",
            attachmentId: "attachment_1",
            versionNumber: 1,
            originalName: "Brief.pdf",
            storedName: "Brief.pdf",
            sizeBytes: 12,
            checksum: "abc123",
            storagePath:
              "attachments/2026/05/attachment_1/versions/v1/Brief.pdf",
            note: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            deletedAt: null
          }
        })
    },
    backup: {
      createManualBackup: async () => apiOk(backupSnapshotSummary()),
      listBackups: async () => apiOk([backupSnapshotSummary()]),
      listBackupsForWorkspacePath: async () => apiOk([backupSnapshotSummary()]),
      getAutomaticBackupSettings: async () => apiOk(backupSchedulerSummary()),
      updateAutomaticBackupSettings: async () => apiOk(backupSchedulerSummary()),
      runAutomaticBackupCheck: async () => apiOk({
        workspaceId: "workspace_1",
        trigger: "manual_check",
        due: false,
        skippedReason: "Automatic backups are disabled.",
        createdBackup: null,
        retentionDeletedBackups: [],
        ...backupSchedulerSummary()
      }),
      validateRestoreSource: async () => apiOk(restoreValidationSummary()),
      restoreBackupToNewWorkspace: async () => apiOk(restoreWorkspaceSummary()),
      restoreBackupFromWorkspacePath: async () => apiOk(restoreWorkspaceSummary()),
      restoreExportToNewWorkspace: async () => apiOk(restoreWorkspaceSummary())
    },
    import: {
      validateWorkspaceExportJson: async () => apiOk(importValidationSummary()),
      chooseAndValidateWorkspaceExportJson: async () =>
        apiOk(importValidationSummary())
    },
    export: {
      exportWorkspaceJson: async () => apiOk(workspaceJsonExportSummary()),
      exportProjectMarkdown: async () => apiOk(textExportSummary("project_markdown")),
      exportTasksCsv: async () => apiOk(textExportSummary("tasks_csv"))
    },
    appearance: {
      getSettings: async () =>
        apiOk({
          workspaceId: "workspace_1",
          theme: "system",
          density: "comfortable",
          fontSize: "medium",
          updatedAt: null
        }),
      updateSettings: async () =>
        apiOk({
          workspaceId: "workspace_1",
          theme: "dark",
          density: "compact",
          fontSize: "large",
          updatedAt: "2026-05-10T03:20:00.000Z"
        })
    },
    privacy: {
      getSettings: async () =>
        apiOk({
          workspaceId: "workspace_1",
          metadataFetchEnabled: false,
          webWidgetsEnabled: false,
          icsUrlImportEnabled: false,
          imapImportEnabled: false,
          browserCaptureEnabled: false,
          telemetryEnabled: false,
          telemetryNotice: "Local Work OS does not include telemetry.",
          updatedAt: null
        }),
      updateSettings: async () =>
        apiOk({
          workspaceId: "workspace_1",
          metadataFetchEnabled: true,
          webWidgetsEnabled: true,
          icsUrlImportEnabled: false,
          imapImportEnabled: false,
          browserCaptureEnabled: false,
          telemetryEnabled: false,
          telemetryNotice: "Local Work OS does not include telemetry.",
          updatedAt: "2026-05-14T02:30:00.000Z"
        })
    },
    diagnostics: {
      runWorkspaceIntegrityCheck: async () => apiOk(workspaceIntegritySummary()),
      repairAttachment: async () => apiOk(null),
      runSavedViewDiagnostics: async () =>
        apiOk({
          workspaceId: "workspace_1",
          checkedAt: "2026-05-03T00:00:00.000Z",
          total: 0,
          ok: 0,
          warnings: 0,
          errors: 0,
          repairable: 0,
          entries: []
        }),
      repairSavedViewQuery: async () =>
        apiOk({
          savedViewId: "saved_view_1",
          name: "Saved view",
          changed: false,
          issueCount: 0
        }),
      runMaintenanceJob: async () => apiOk(maintenanceJobSummary()),
      listMaintenanceJobs: async () => apiOk([maintenanceJobSummary()])
    },
    navigation: {
      listRecentTargets: async () => apiOk([]),
      recordTarget: async () => apiOk([]),
      listPinnedFavorites: async () => apiOk([]),
      listAppTabs: async () =>
        apiOk({ workspaceId: "workspace_1", tabs: [], activeTabId: null }),
      openAppTab: async () =>
        apiOk({ workspaceId: "workspace_1", tabs: [], activeTabId: null }),
      closeAppTab: async () =>
        apiOk({ workspaceId: "workspace_1", tabs: [], activeTabId: null }),
      reorderAppTabs: async () =>
        apiOk({ workspaceId: "workspace_1", tabs: [], activeTabId: null }),
      setActiveAppTab: async () =>
        apiOk({ workspaceId: "workspace_1", tabs: [], activeTabId: null })
    }
  };

  return {
    ...api,
    ...overrides
  };
}

function categorySummary(): CategorySummary {
  return {
    id: "category_1",
    workspaceId: "workspace_1",
    name: "Finance",
    slug: "finance",
    color: "#2c6b8f",
    description: null,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
    deletedAt: null
  };
}

function projectSummary(): ProjectSummary {
  return {
    id: "container_1",
    workspaceId: "workspace_1",
    type: "project",
    name: "Launch Plan",
    slug: "launch-plan",
    description: null,
    status: "active",
    categoryId: null,
    color: null,
    isFavorite: false,
    sortOrder: 0,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
    archivedAt: null,
    deletedAt: null
  };
}

function contactSummary(): ContactSummary {
  return {
    id: "container_contact_1",
    workspaceId: "workspace_1",
    type: "contact",
    name: "Alex Chen",
    slug: "alex-chen",
    description: "Client stakeholder",
    status: "active",
    categoryId: null,
    color: "#2c6b8f",
    isFavorite: false,
    sortOrder: 0,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
    archivedAt: null,
    deletedAt: null
  };
}

function contactFieldSummary(): ContactFieldSummary {
  return {
    id: "contact_field_1",
    workspaceId: "workspace_1",
    containerId: "container_contact_1",
    label: "Email",
    value: "alex@example.com",
    type: "email",
    sortOrder: 0,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
    deletedAt: null
  };
}

function relationshipSummary(): RelationshipSummary {
  return {
    id: "relationship_1",
    workspaceId: "workspace_1",
    sourceType: "container",
    sourceId: "container_contact_1",
    targetType: "container",
    targetId: "container_1",
    relationType: "related",
    label: "project_contact",
    createdAt: "2026-04-30T00:00:00.000Z",
    deletedAt: null
  };
}

function projectHealthSummary(): ProjectHealthSummary {
  return {
    projectId: "container_1",
    workspaceId: "workspace_1",
    name: "Launch Plan",
    status: "active",
    color: null,
    generatedAt: "2026-04-30T01:00:00.000Z",
    openTaskCount: 1,
    completedTaskCount: 0,
    overdueTaskCount: 0,
    upcomingTaskCount: 0,
    waitingTaskCount: 0,
    completionRatio: 0,
    staleAfterDays: 14,
    lastActivityAt: "2026-05-04T00:00:00.000Z",
    isStale: false,
    hasRecentActivity: true,
    totalTaskCount: 1,
    nextDueTask: {
      itemId: "item_1",
      title: "Call accountant",
      dueAt: "2026-05-04T00:00:00.000Z",
      taskStatus: "open",
      priority: 2
    },
    nextTask: {
      itemId: "item_1",
      title: "Call accountant",
      dueAt: "2026-05-04T00:00:00.000Z",
      taskStatus: "open",
      priority: 2
    },
    healthBadges: [{ kind: "upcoming", label: "1 upcoming", tone: "info" }],
    recentActivity: [activitySummary()]
  };
}

function inboxSummary(): InboxSummary {
  return {
    id: "container_inbox",
    workspaceId: "workspace_1",
    type: "inbox",
    name: "Inbox",
    slug: "inbox",
    description: null,
    status: "active",
    categoryId: null,
    color: null,
    isFavorite: true,
    sortOrder: 0,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
    archivedAt: null,
    deletedAt: null
  };
}

function itemSummary(): ItemSummary {
  return {
    id: "item_1",
    workspaceId: "workspace_1",
    containerId: "container_inbox",
    containerTabId: null,
    type: "task",
    title: "Call accountant",
    body: null,
    categoryId: null,
    status: "active",
    sortOrder: 1024,
    pinned: false,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
    completedAt: null,
    archivedAt: null,
    deletedAt: null
  };
}

function linkSummary(): LinkSummary {
  return {
    ...itemSummary(),
    id: "item_link_1",
    type: "link",
    title: "Launch brief",
    body: "Supplier reference",
    url: "example.com/brief",
    normalizedUrl: "https://example.com/brief",
    linkTitle: "Launch brief",
    description: "Supplier reference",
    domain: "example.com",
    faviconPath: null,
    previewImagePath: null,
    renderAsWidget: false,
    widgetHeight: 360,
    widgetWarningAcceptedAt: null,
    linkCreatedAt: "2026-04-30T00:00:00.000Z",
    linkUpdatedAt: "2026-04-30T00:00:00.000Z"
  };
}

function taskSummary(): TaskSummary {
  return {
    ...itemSummary(),
    type: "task",
    taskStatus: "open",
    priority: null,
    startAt: null,
    dueAt: null,
    allDay: true,
    timezone: null,
    taskCompletedAt: null,
    taskCreatedAt: "2026-04-30T00:00:00.000Z",
    taskUpdatedAt: "2026-04-30T00:00:00.000Z"
  };
}

function listItemSummary(): ListItemSummary {
  return {
    id: "list_item_1",
    workspaceId: "workspace_1",
    listItemParentId: null,
    listId: "item_list_1",
    title: "Confirm copy",
    body: null,
    status: "open",
    depth: 0,
    sortOrder: 1024,
    startAt: null,
    dueAt: null,
    completedAt: null,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
    archivedAt: null,
    deletedAt: null
  };
}

function listSummary(): ListSummary {
  return {
    ...itemSummary(),
    id: "item_list_1",
    type: "list",
    title: "Launch checklist",
    displayMode: "checklist",
    showCompleted: true,
    progressMode: "count",
    listCreatedAt: "2026-04-30T00:00:00.000Z",
    listUpdatedAt: "2026-04-30T00:00:00.000Z",
    items: [listItemSummary()]
  };
}

function noteSummary(): NoteSummary {
  return {
    ...itemSummary(),
    id: "item_note_1",
    type: "note",
    title: "Launch note",
    body: "Decision notes",
    format: "markdown",
    content: "# Decision notes",
    preview: "Decision notes",
    noteCreatedAt: "2026-04-30T00:00:00.000Z",
    noteUpdatedAt: "2026-04-30T00:00:00.000Z"
  };
}

function activitySummary(): ActivitySummary {
  return {
    id: "activity_1",
    workspaceId: "workspace_1",
    actorType: "local_user",
    action: "item_moved",
    targetType: "item",
    targetId: "item_1",
    summary: "Moved item.",
    beforeJson: null,
    afterJson: null,
    createdAt: "2026-04-30T01:00:00.000Z",
    actionLabel: "Item Moved",
    actorLabel: "Local user",
    targetLabel: "Item item_1",
    description: "Moved item."
  };
}

function fileAttachmentResultSummary(): FileAttachmentResultSummary {
  return {
    item: {
      ...itemSummary(),
      type: "file",
      title: "Brief.pdf"
    },
    attachment: {
      id: "attachment_1",
      workspaceId: "workspace_1",
      itemId: "item_1",
      originalName: "Brief.pdf",
      storedName: "Brief.pdf",
      mimeType: "application/pdf",
      sizeBytes: 42,
      checksum: "abc123",
      storagePath: "attachments/2026/05/attachment_1/Brief.pdf",
      description: "Brief",
      createdAt: "2026-04-30T00:00:00.000Z",
      updatedAt: "2026-04-30T00:00:00.000Z",
      deletedAt: null
    }
  };
}

function backupSnapshotSummary(): ManualBackupSnapshotSummary {
  return {
    id: "backup_1",
    workspaceId: "workspace_1",
    createdAt: "2026-05-01T00:00:00.000Z",
    relativePath: "backups/2026-05-01T00-00-00-000Z",
    databaseRelativePath:
      "backups/2026-05-01T00-00-00-000Z/local-work-os.sqlite",
    manifestRelativePath:
      "backups/2026-05-01T00-00-00-000Z/attachment-manifest.json",
    attachmentCount: 1,
    totalAttachmentBytes: 42,
    databaseSizeBytes: 2048,
    kind: "manual",
    manifest: {
      id: "backup_1",
      kind: "manual",
      workspaceId: "workspace_1",
      workspaceName: "Personal",
      createdAt: "2026-05-01T00:00:00.000Z",
      database: {
        sourceRelativePath: "data/local-work-os.sqlite",
        backupRelativePath:
          "backups/2026-05-01T00-00-00-000Z/local-work-os.sqlite",
        sizeBytes: 2048,
        checksum: "a".repeat(64)
      },
      attachments: [],
      attachmentCount: 1,
      totalAttachmentBytes: 42
    }
  };
}

function backupSchedulerSummary() {
  return {
    settings: {
      workspaceId: "workspace_1",
      enabled: false,
      intervalHours: 24,
      runOnAppClose: true,
      runBeforeMigration: true,
      retention: {
        maxCount: 10,
        maxAgeDays: 30,
        maxSizeBytes: 5 * 1024 * 1024 * 1024
      },
      updatedAt: null
    },
    status: {
      workspaceId: "workspace_1",
      lastCheckedAt: null,
      lastRunAt: null,
      lastSuccessfulBackupAt: null,
      lastBackupId: null,
      lastError: null,
      nextRunAt: null,
      lastRetentionDeletedCount: 0,
      updatedAt: null
    }
  };
}

function workspaceJsonExportSummary(): WorkspaceJsonExportSummary {
  return {
    id: "export_1",
    workspaceId: "workspace_1",
    createdAt: "2026-05-01T00:00:00.000Z",
    relativePath: "exports/2026-05-01T00-00-00-000Z-workspace-export.json",
    sizeBytes: 4096,
    schemaVersion: 1,
    itemCount: 5,
    attachmentCount: 1,
    totalAttachmentBytes: 42
  };
}

function importValidationSummary(): ImportValidationSummary {
  return {
    valid: true,
    sourcePath: "C:\\exports\\workspace.json",
    schemaVersion: 1,
    exportedAt: "2026-05-01T00:00:00.000Z",
    workspace: {
      id: "workspace_1",
      name: "Personal",
      schemaVersion: 1
    },
    counts: {
      containers: 1,
      containerTabs: 1,
      items: 5,
      taskDetails: 1,
      noteDetails: 1,
      listDetails: 1,
      listItems: 1,
      linkDetails: 1,
      tags: 1,
      taggings: 1,
      categories: 1,
      relationships: 1,
      savedViews: 1,
      dashboards: 1,
      dashboardWidgets: 1,
      dailyPlans: 1,
      dailyPlanItems: 1,
      attachments: 1
    },
    attachmentManifest: {
      attachmentCount: 1,
      totalAttachmentBytes: 42
    },
    targetPolicy: {
      mode: "new_workspace_only",
      canApplyToActiveWorkspace: false,
      message: "Validation only."
    },
    issues: []
  };
}

function restoreValidationSummary(): RestoreValidationSummary {
  return {
    valid: true,
    sourceType: "backup",
    sourcePath: "backups/2026-05-01T00-00-00-000Z",
    workspace: {
      id: "workspace_1",
      name: "Personal",
      schemaVersion: 1
    },
    counts: {
      containers: 1,
      items: 5,
      listItems: 1,
      attachments: 1
    },
    targetPolicy: {
      mode: "new_workspace_only",
      canApplyToActiveWorkspace: false,
      message: "Restore creates a new workspace."
    },
    issues: []
  };
}

function restoreWorkspaceSummary(): RestoreWorkspaceSummary {
  return {
    ...restoreValidationSummary(),
    restoredAt: "2026-05-01T00:00:00.000Z",
    targetWorkspaceRootPath: "C:\\restored-workspace",
    copiedAttachmentCount: 1,
    missingAttachmentCount: 0,
    searchIndex: {
      indexedContainerCount: 1,
      indexedItemCount: 5,
      indexedListItemCount: 1,
      indexedAttachmentCount: 1
    }
  };
}

function textExportSummary(kind: "project_markdown" | "tasks_csv" | "tasks_tsv") {
  return {
    id: "export_2",
    workspaceId: "workspace_1",
    createdAt: "2026-05-01T00:00:00.000Z",
    relativePath:
      kind === "project_markdown"
        ? "exports/2026-05-01T00-00-00-000Z-launch-plan-project.md"
        : "exports/2026-05-01T00-00-00-000Z-tasks.csv",
    sizeBytes: 1024,
    kind,
    sourceId: kind === "project_markdown" ? "container_1" : "workspace_1",
    rowCount: 1
  };
}

function workspaceIntegritySummary(): WorkspaceIntegritySummary {
  return {
    workspaceId: "workspace_1",
    generatedAt: "2026-05-01T00:00:00.000Z",
    status: "healthy",
    checkedCount: 6,
    issueCount: 0,
    errorCount: 0,
    warningCount: 0,
    sections: [
      {
        kind: "system_rows",
        title: "System rows",
        status: "healthy",
        checkedCount: 2,
        issueCount: 0,
        issues: []
      }
    ]
  };
}


function maintenanceJobSummary(): MaintenanceJobSummary {
  return {
    id: "maintenance_job_1",
    workspaceId: "workspace_1",
    status: "completed",
    operations: ["sqlite_integrity_check"],
    startedAt: "2026-05-01T00:00:00.000Z",
    completedAt: "2026-05-01T00:00:01.000Z",
    backup: { id: "backup_1", relativePath: "backups/pre-maintenance" },
    sqliteIntegrity: { ok: true, messages: ["ok"] },
    attachmentManifestAudit: null,
    searchReindex: null,
    vacuum: null,
    orphanAttachmentScan: null,
    orphanAttachmentCleanup: null,
    entries: [],
    error: null
  };
}

function metadataTargetSummary(): MetadataTargetSummary {
  return {
    targetType: "item",
    targetId: "item_1",
    workspaceId: "workspace_1",
    kind: "task",
    title: "Call accountant",
    body: null,
    status: "active",
    category: {
      id: "category_1",
      name: "Finance",
      slug: "finance",
      color: "#2c6b8f"
    },
    tags: [
      {
        id: "tag_1",
        name: "Finance",
        slug: "finance",
        source: "manual"
      }
    ],
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z",
    archivedAt: null,
    deletedAt: null
  };
}

function collectionSummary(): CollectionSummary {
  return {
    id: "saved_view_1",
    workspaceId: "workspace_1",
    name: "Finance",
    description: "Finance work",
    kind: "tag",
    tagSlug: "finance",
    keyword: null,
    isFavorite: true,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z"
  };
}

function smartListSummary(): SmartListSummary {
  return {
    id: "saved_view_smart_1",
    workspaceId: "workspace_1",
    name: "Waiting tasks",
    description: null,
    criteria: {
      itemTypes: ["task"],
      taskStatuses: ["waiting"],
      dueFilter: "today"
    },
    query: {
      version: 1,
      match: "all",
      conditions: [{ field: "taskStatus", operator: "is", value: "waiting" }]
    },
    isFavorite: false,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z"
  };
}

function collectionEvaluationSummary(): CollectionEvaluationSummary {
  return {
    collection: collectionSummary(),
    total: 1,
    results: [
      {
        targetType: "item",
        targetId: "item_1",
        kind: "task",
        title: "Call accountant",
        containerId: "container_1",
        containerType: "project",
        containerTitle: "Launch Plan",
        categoryId: null,
        categoryName: null,
        taskStatus: "open",
        dueAt: null,
        tags: ["finance"],
        destinationPath: "/projects/container_1/items/item_1"
      }
    ],
    groups: [
      {
        key: "container_1",
        label: "Launch Plan",
        results: [
          {
            targetType: "item",
            targetId: "item_1",
            kind: "task",
            title: "Call accountant",
            containerId: "container_1",
            containerType: "project",
            containerTitle: "Launch Plan",
            categoryId: null,
            categoryName: null,
            taskStatus: "open",
            dueAt: null,
            tags: ["finance"],
            destinationPath: "/projects/container_1/items/item_1"
          }
        ]
      }
    ]
  };
}

function todayViewModelSummary(): TodayViewModelSummary {
  return {
    workspaceId: "workspace_1",
    generatedAt: "2026-05-04T00:00:00.000Z",
    localDate: "2026-05-04",
    backlogDays: 14,
    preferences: {
      maxFocusTasks: 6,
      planningMode: "standard",
      backlogDays: 14,
      showWaiting: false,
      showDeferred: false,
      showDailyCompletionSummary: true
    },
    focusSummary: {
      plannedTodayCount: 0,
      maxFocusTasks: 6,
      limitExceeded: false,
      warning: null
    },
    completionSummary: {
      completedTodayCount: 0,
      plannedTodayCompletedCount: 0,
      show: true
    },
    ranges: {
      today: {
        startInclusive: "2026-05-04T00:00:00.000Z",
        endExclusive: "2026-05-05T00:00:00.000Z"
      },
      overdueBacklog: {
        startInclusive: "2026-04-20T00:00:00.000Z",
        endExclusive: "2026-05-04T00:00:00.000Z"
      },
      tomorrow: {
        startInclusive: "2026-05-05T00:00:00.000Z",
        endExclusive: "2026-05-06T00:00:00.000Z"
      }
    },
    dueToday: [
      {
        itemType: "task",
        itemId: "item_1",
        sourceItemId: null,
        workspaceId: "workspace_1",
        containerId: "container_1",
        containerTitle: "Launch Plan",
        containerTabId: null,
        title: "Call accountant",
        body: null,
        categoryId: null,
        itemStatus: "active",
        taskStatus: "open",
        priority: null,
        startAt: null,
        dueAt: "2026-05-04T00:00:00.000Z",
        allDay: true,
        timezone: null,
        sortOrder: 1024,
        plannedLane: null,
        plannedSortOrder: null,
        addedManually: false,
        pinned: false,
        createdAt: "2026-04-30T00:00:00.000Z",
        updatedAt: "2026-04-30T00:00:00.000Z"
      }
    ],
    overdueBacklog: [],
    tomorrowPreview: []
  };
}

function dailyPlanSummary(): DailyPlanSummary {
  return {
    id: "daily_plan_1",
    workspaceId: "workspace_1",
    planDate: "2026-05-04",
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z"
  };
}

function dailyPlanItemSummary(): DailyPlanItemSummary {
  return {
    id: "daily_plan_item_1",
    workspaceId: "workspace_1",
    dailyPlanId: "daily_plan_1",
    itemType: "task",
    itemId: "item_1",
    lane: "today",
    sortOrder: 1024,
    addedManually: true,
    createdAt: "2026-04-30T00:00:00.000Z",
    updatedAt: "2026-04-30T00:00:00.000Z"
  };
}

function plannedTaskSummary(): PlannedTaskSummary {
  return {
    ...todayViewModelSummary().dueToday[0]!,
    planItemId: "daily_plan_item_1",
    lane: "today",
    plannedSortOrder: 1024
  };
}

function dashboardViewModelSummary(): DashboardViewModelSummary {
  return {
    dashboard: {
      id: "dashboard_1",
      workspaceId: "workspace_1",
      name: "Dashboard",
      isDefault: true,
      layoutJson: "{}",
      createdAt: "2026-04-30T00:00:00.000Z",
      updatedAt: "2026-04-30T00:00:00.000Z",
      deletedAt: null
    },
    widgets: []
  };
}

describe("desktop API client", () => {
  it("passes typed preload results through to renderer callers", async () => {
    const client = createDesktopApiClient(createMockApi());

    await expect(client.workspace.getCurrentWorkspace()).resolves.toEqual({
      ok: true,
      data: null
    });
    await expect(client.database.getHealthStatus()).resolves.toMatchObject({
      ok: true,
      data: {
        connected: false,
        databasePath: null
      }
    });
    await expect(client.inbox.listItems()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "item_1",
          title: "Call accountant"
        }
      ]
    });
    await expect(client.projects.listProjects()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "container_1",
          type: "project"
        }
      ]
    });
    await expect(client.projects.list()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "container_1",
          type: "project"
        }
      ]
    });
    await expect(client.contacts.listContacts()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "container_contact_1",
          type: "contact"
        }
      ]
    });
    await expect(client.contacts.getContact("container_contact_1")).resolves.toMatchObject({
      ok: true,
      data: {
        contact: {
          id: "container_contact_1"
        },
        fields: [
          {
            label: "Email",
            value: "alex@example.com"
          }
        ]
      }
    });
    await expect(
      client.contacts.addField({
        contactId: "container_contact_1",
        label: "Phone",
        value: "555-1000",
        type: "phone"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        label: "Email"
      }
    });
    await expect(client.tasks.listByContainer("container_1")).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "item_1",
          taskStatus: "open"
        }
      ]
    });
    await expect(client.lists.listByContainer("container_1")).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "item_list_1",
          items: [
            {
              id: "list_item_1"
            }
          ]
        }
      ]
    });
    await expect(client.notes.listByContainer("container_1")).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "item_note_1",
          type: "note",
          content: "# Decision notes"
        }
      ]
    });
    await expect(client.categories.list()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "category_1",
          name: "Finance"
        }
      ]
    });
    await expect(
      client.categories.assignToProject({
        projectId: "container_1",
        categoryId: "category_1"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        categoryId: "category_1"
      }
    });
    await expect(client.metadata.listTagsWithCounts()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          slug: "finance",
          targetCount: 2
        }
      ]
    });
    await expect(
      client.metadata.listTargetsByMetadata({
        tagSlugs: ["finance"]
      })
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          targetId: "item_1",
          tags: [
            {
              slug: "finance"
            }
          ]
        }
      ]
    });
    await expect(
      client.search.searchWorkspace({
        query: "launch"
      })
    ).resolves.toEqual({
      ok: true,
      data: []
    });
    await expect(client.collections.listCollections()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "saved_view_1",
          kind: "tag",
          tagSlug: "finance"
        }
      ]
    });
    await expect(
      client.collections.evaluateCollection("saved_view_1")
    ).resolves.toMatchObject({
      ok: true,
      data: {
        total: 1,
        groups: [
          {
            label: "Launch Plan"
          }
        ]
      }
    });
    await expect(
      client.collections.createTaskInCollection({
        collectionId: "saved_view_1",
        containerId: "container_1",
        title: "Call accountant"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        tags: [
          {
            slug: "finance"
          }
        ]
      }
    });
    await expect(client.collections.listSmartLists()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "saved_view_smart_1",
          name: "Waiting tasks"
        }
      ]
    });
    await expect(
      client.collections.previewSmartList({
        criteria: {
          dueFilter: "today"
        }
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        total: 0
      }
    });
    await expect(client.today.getViewModel()).resolves.toMatchObject({
      ok: true,
      data: {
        localDate: "2026-05-04",
        dueToday: [
          {
            itemId: "item_1",
            title: "Call accountant"
          }
        ]
      }
    });
    await expect(
      client.today.planTask({ itemId: "item_1", lane: "today" })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        itemId: "item_1",
        lane: "today"
      }
    });
    await expect(
      client.today.reorderPlannedTask({
        itemId: "item_1",
        lane: "today",
        sortOrder: 512
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        itemId: "item_1",
        sortOrder: 512
      }
    });
    await expect(
      client.today.unplanTask({ itemId: "item_1", lane: "today" })
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          itemId: "item_1",
          lane: "today"
        }
      ]
    });
    await expect(client.today.getPlannedTasks()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          itemId: "item_1",
          planItemId: "daily_plan_item_1"
        }
      ]
    });
    await expect(client.dashboard.getDefault()).resolves.toMatchObject({
      ok: true,
      data: {
        dashboard: {
          id: "dashboard_1"
        }
      }
    });
    await expect(client.activity.listRecent()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          action: "item_moved",
          actionLabel: "Item Moved"
        }
      ]
    });
    await expect(
      client.activity.listForTarget({ targetType: "item", targetId: "item_1" })
    ).resolves.toMatchObject({
      ok: true,
      data: [
        {
          targetLabel: "Item item_1"
        }
      ]
    });
    await expect(
      client.items.move({
        itemId: "item_1",
        targetContainerId: "container_1"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        id: "item_1",
        containerId: "container_1"
      }
    });
    await expect(client.items.archive("item_1")).resolves.toMatchObject({
      ok: true,
      data: {
        status: "archived"
      }
    });
    await expect(client.items.getActivity("item_1")).resolves.toMatchObject({
      ok: true,
      data: [
        {
          action: "item_moved"
        }
      ]
    });
    await expect(client.items.openInspector("item_1")).resolves.toMatchObject({
      ok: true,
      data: {
        item: {
          id: "item_1"
        }
      }
    });
    await expect(
      client.files.attachFileToContainer({
        containerId: "container_1",
        sourcePath: "C:\\source\\Brief.pdf"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        attachment: {
          originalName: "Brief.pdf"
        }
      }
    });
    await expect(
      client.files.attachFileToItem({
        itemId: "item_1",
        sourcePath: "C:\\source\\Brief.pdf"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        item: {
          type: "file"
        }
      }
    });
    await expect(
      client.files.chooseAndAttach({
        containerId: "container_1"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        attachment: {
          originalName: "Brief.pdf"
        }
      }
    });
    await expect(client.files.listByContainer("container_1")).resolves.toEqual({
      ok: true,
      data: []
    });
    await expect(client.files.openAttachment("attachment_1")).resolves.toMatchObject({
      ok: true,
      data: {
        exists: true
      }
    });
    await expect(
      client.files.updateMetadata({
        attachmentId: "attachment_1",
        title: "Final brief"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        attachment: {
          originalName: "Brief.pdf"
        }
      }
    });
    await expect(client.backup.listBackups()).resolves.toMatchObject({
      ok: true,
      data: [
        {
          id: "backup_1",
          attachmentCount: 1
        }
      ]
    });
    await expect(client.backup.createManualBackup()).resolves.toMatchObject({
      ok: true,
      data: {
        id: "backup_1",
        databaseSizeBytes: 2048
      }
    });
    await expect(
      client.backup.validateRestoreSource({
        sourceType: "backup",
        backupRelativePath: "backups/2026-05-01T00-00-00-000Z"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        valid: true,
        sourceType: "backup"
      }
    });
    await expect(
      client.backup.restoreBackupToNewWorkspace({
        backupRelativePath: "backups/2026-05-01T00-00-00-000Z",
        targetRootPath: "C:\\restored-workspace"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        copiedAttachmentCount: 1,
        targetWorkspaceRootPath: "C:\\restored-workspace"
      }
    });
    await expect(
      client.import.validateWorkspaceExportJson({
        filePath: "C:\\exports\\workspace.json"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        valid: true,
        targetPolicy: {
          mode: "new_workspace_only",
          canApplyToActiveWorkspace: false
        }
      }
    });
    await expect(
      client.import.chooseAndValidateWorkspaceExportJson()
    ).resolves.toMatchObject({
      ok: true,
      data: {
        counts: {
          attachments: 1
        }
      }
    });
    await expect(client.export.exportWorkspaceJson()).resolves.toMatchObject({
      ok: true,
      data: {
        id: "export_1",
        schemaVersion: 1,
        itemCount: 5
      }
    });
    await expect(
      client.export.exportProjectMarkdown({ projectId: "container_1" })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        kind: "project_markdown",
        sourceId: "container_1"
      }
    });
    await expect(
      client.export.exportTasksCsv({ workspaceId: "workspace_1" })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        kind: "tasks_csv",
        rowCount: 1
      }
    });
    await expect(client.appearance.getSettings("workspace_1")).resolves.toMatchObject({
      ok: true,
      data: {
        theme: "system",
        density: "comfortable",
        fontSize: "medium"
      }
    });
    await expect(
      client.appearance.updateSettings({
        workspaceId: "workspace_1",
        theme: "dark",
        density: "compact",
        fontSize: "large"
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        theme: "dark",
        density: "compact",
        fontSize: "large"
      }
    });
    await expect(client.privacy!.getSettings("workspace_1")).resolves.toMatchObject({
      ok: true,
      data: {
        telemetryEnabled: false,
        metadataFetchEnabled: false
      }
    });
    await expect(
      client.privacy!.updateSettings({
        workspaceId: "workspace_1",
        metadataFetchEnabled: true,
        webWidgetsEnabled: true
      })
    ).resolves.toMatchObject({
      ok: true,
      data: {
        metadataFetchEnabled: true,
        webWidgetsEnabled: true,
        telemetryEnabled: false
      }
    });
    await expect(client.diagnostics.runWorkspaceIntegrityCheck()).resolves.toMatchObject({
      ok: true,
      data: {
        status: "healthy",
        issueCount: 0
      }
    });
  });

  it("converts thrown preload failures into structured API errors", async () => {
    const client = createDesktopApiClient(
      createMockApi({
        workspace: {
          ...createMockApi().workspace,
          getCurrentWorkspace: async () => {
            throw new Error("missing IPC handler");
          }
        }
      })
    );

    await expect(client.workspace.getCurrentWorkspace()).resolves.toEqual({
      ok: false,
      error: {
        code: "IPC_ERROR",
        message: "missing IPC handler"
      }
    });
  });
});




function todayPreferencesSummary() {
  return {
    workspaceId: "workspace_1",
    updatedAt: null,
    maxFocusTasks: 6,
    planningMode: "standard" as const,
    backlogDays: 14,
    showWaiting: false,
    showDeferred: false,
    showDailyCompletionSummary: true
  };
}
