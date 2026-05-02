export const ActivityAction = {
  workspaceCreated: "workspace_created",
  workspaceOpened: "workspace_opened",
  containerCreated: "container_created",
  containerUpdated: "container_updated",
  containerArchived: "container_archived",
  containerDeleted: "container_deleted",
  itemCreated: "item_created",
  itemUpdated: "item_updated",
  itemMoved: "item_moved",
  itemArchived: "item_archived",
  itemDeleted: "item_deleted",
  taskCreated: "task_created",
  taskUpdated: "task_updated",
  taskCompleted: "task_completed",
  taskReopened: "task_reopened",
  tagAdded: "tag_added",
  tagRemoved: "tag_removed",
  categoryAssigned: "category_assigned",
  relationshipCreated: "relationship_created",
  fileAttached: "file_attached",
  searchIndexRebuilt: "search_index_rebuilt",
  backupCreated: "backup_created",
  exportCreated: "export_created"
} as const;

export type ActivityAction =
  (typeof ActivityAction)[keyof typeof ActivityAction];

