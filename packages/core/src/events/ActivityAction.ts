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
  listCreated: "list_created",
  listItemCreated: "list_item_created",
  listItemUpdated: "list_item_updated",
  listItemCompleted: "list_item_completed",
  listItemReopened: "list_item_reopened",
  listItemReordered: "list_item_reordered",
  noteCreated: "note_created",
  noteUpdated: "note_updated",
  noteArchived: "note_archived",
  taskCreated: "task_created",
  taskUpdated: "task_updated",
  taskCompleted: "task_completed",
  taskReopened: "task_reopened",
  tagCreated: "tag_created",
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

