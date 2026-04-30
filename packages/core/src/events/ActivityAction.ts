export const ActivityAction = {
  workspaceCreated: "workspace_created",
  workspaceOpened: "workspace_opened",
  containerCreated: "container_created",
  containerUpdated: "container_updated",
  containerArchived: "container_archived",
  itemCreated: "item_created",
  itemUpdated: "item_updated",
  itemMoved: "item_moved",
  itemArchived: "item_archived",
  taskCompleted: "task_completed",
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

