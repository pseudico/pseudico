import type { DatabaseConnection } from "../connection/createDatabaseConnection";

export type TrashTargetType = "container" | "item" | "list_item" | "attachment";

export type TrashEntryRecord = {
  id: string;
  workspaceId: string;
  targetType: TrashTargetType;
  title: string;
  subtitle: string | null;
  deletedAt: string;
  originalContainerId: string | null;
  originalContainerName: string | null;
  parentItemId: string | null;
  parentItemTitle: string | null;
};

export type RestoreTrashTargetInput = {
  targetType: TrashTargetType;
  targetId: string;
  timestamp: string;
};

export type ClearTrashCounts = Record<TrashTargetType, number>;

export class TrashRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  listDeletedByWorkspace(workspaceId: string): TrashEntryRecord[] {
    const rows = this.connection.sqlite
      .prepare<unknown[], TrashEntryRow>(
        `select
           'container' as target_type,
           c.id,
           c.workspace_id,
           c.name as title,
           c.type as subtitle,
           c.deleted_at,
           null as original_container_id,
           null as original_container_name,
           null as parent_item_id,
           null as parent_item_title
         from containers c
         where c.workspace_id = ?
           and c.deleted_at is not null

         union all

         select
           'item' as target_type,
           i.id,
           i.workspace_id,
           i.title,
           i.type as subtitle,
           i.deleted_at,
           i.container_id as original_container_id,
           c.name as original_container_name,
           null as parent_item_id,
           null as parent_item_title
         from items i
         left join containers c on c.id = i.container_id
         where i.workspace_id = ?
           and i.deleted_at is not null

         union all

         select
           'list_item' as target_type,
           li.id,
           li.workspace_id,
           li.title,
           li.status as subtitle,
           li.deleted_at,
           i.container_id as original_container_id,
           c.name as original_container_name,
           li.list_id as parent_item_id,
           i.title as parent_item_title
         from list_items li
         left join items i on i.id = li.list_id
         left join containers c on c.id = i.container_id
         where li.workspace_id = ?
           and li.deleted_at is not null

         union all

         select
           'attachment' as target_type,
           a.id,
           a.workspace_id,
           a.original_name as title,
           a.storage_path as subtitle,
           a.deleted_at,
           i.container_id as original_container_id,
           c.name as original_container_name,
           a.item_id as parent_item_id,
           i.title as parent_item_title
         from attachments a
         left join items i on i.id = a.item_id
         left join containers c on c.id = i.container_id
         where a.workspace_id = ?
           and a.deleted_at is not null

         order by deleted_at desc, title asc`
      )
      .all(workspaceId, workspaceId, workspaceId, workspaceId);

    return rows.map(toTrashEntryRecord);
  }

  getDeletedTarget(input: {
    workspaceId: string;
    targetType: TrashTargetType;
    targetId: string;
  }): TrashEntryRecord | null {
    return this.listDeletedByWorkspace(input.workspaceId).find(
      (entry) => entry.targetType === input.targetType && entry.id === input.targetId
    ) ?? null;
  }

  restoreTarget(input: RestoreTrashTargetInput): TrashEntryRecord {
    const table = tableForTarget(input.targetType);
    this.connection.sqlite
      .prepare(
        `update ${table}
         set deleted_at = null,
             updated_at = ?
         where id = ?
           and deleted_at is not null`
      )
      .run(input.timestamp, input.targetId);

    const restored = this.getActiveRestoredTarget(input.targetType, input.targetId);
    if (restored === null) {
      throw new Error(`Trash target was not found or is not restorable: ${input.targetType} ${input.targetId}.`);
    }

    return restored;
  }

  clearDeletedByWorkspace(workspaceId: string): ClearTrashCounts {
    const count = (sql: string) =>
      (this.connection.sqlite.prepare<[string], { count: number }>(sql).get(workspaceId)?.count ?? 0);

    const counts: ClearTrashCounts = {
      attachment: count("select count(*) as count from attachments where workspace_id = ? and deleted_at is not null"),
      list_item: count("select count(*) as count from list_items where workspace_id = ? and deleted_at is not null"),
      item: count("select count(*) as count from items where workspace_id = ? and deleted_at is not null"),
      container: count("select count(*) as count from containers where workspace_id = ? and deleted_at is not null and is_system = 0")
    };

    this.connection.sqlite.prepare("delete from search_index where workspace_id = ? and is_deleted = 1").run(workspaceId);
    this.connection.sqlite.prepare("delete from attachments where workspace_id = ? and deleted_at is not null").run(workspaceId);
    this.connection.sqlite.prepare("delete from list_items where workspace_id = ? and deleted_at is not null").run(workspaceId);
    this.connection.sqlite.prepare("delete from items where workspace_id = ? and deleted_at is not null").run(workspaceId);
    this.connection.sqlite.prepare("delete from containers where workspace_id = ? and deleted_at is not null and is_system = 0").run(workspaceId);

    return counts;
  }

  private getActiveRestoredTarget(
    targetType: TrashTargetType,
    targetId: string
  ): TrashEntryRecord | null {
    const row = this.connection.sqlite
      .prepare<unknown[], TrashEntryRow>(activeSelectForTarget(targetType))
      .get(targetId);

    return row === undefined ? null : toTrashEntryRecord(row);
  }
}

type TrashEntryRow = {
  target_type: string;
  id: string;
  workspace_id: string;
  title: string;
  subtitle: string | null;
  deleted_at: string | null;
  original_container_id: string | null;
  original_container_name: string | null;
  parent_item_id: string | null;
  parent_item_title: string | null;
};

function tableForTarget(targetType: TrashTargetType): string {
  switch (targetType) {
    case "container":
      return "containers";
    case "item":
      return "items";
    case "list_item":
      return "list_items";
    case "attachment":
      return "attachments";
  }
}

function activeSelectForTarget(targetType: TrashTargetType): string {
  switch (targetType) {
    case "container":
      return `select 'container' as target_type, id, workspace_id, name as title, type as subtitle,
              deleted_at, null as original_container_id, null as original_container_name,
              null as parent_item_id, null as parent_item_title
              from containers where id = ? and deleted_at is null`;
    case "item":
      return `select 'item' as target_type, i.id, i.workspace_id, i.title, i.type as subtitle,
              i.deleted_at, i.container_id as original_container_id, c.name as original_container_name,
              null as parent_item_id, null as parent_item_title
              from items i left join containers c on c.id = i.container_id
              where i.id = ? and i.deleted_at is null`;
    case "list_item":
      return `select 'list_item' as target_type, li.id, li.workspace_id, li.title, li.status as subtitle,
              li.deleted_at, i.container_id as original_container_id, c.name as original_container_name,
              li.list_id as parent_item_id, i.title as parent_item_title
              from list_items li left join items i on i.id = li.list_id left join containers c on c.id = i.container_id
              where li.id = ? and li.deleted_at is null`;
    case "attachment":
      return `select 'attachment' as target_type, a.id, a.workspace_id, a.original_name as title, a.storage_path as subtitle,
              a.deleted_at, i.container_id as original_container_id, c.name as original_container_name,
              a.item_id as parent_item_id, i.title as parent_item_title
              from attachments a left join items i on i.id = a.item_id left join containers c on c.id = i.container_id
              where a.id = ? and a.deleted_at is null`;
  }
}

function toTrashEntryRecord(row: TrashEntryRow): TrashEntryRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    targetType: row.target_type as TrashTargetType,
    title: row.title,
    subtitle: row.subtitle,
    deletedAt: row.deleted_at ?? "",
    originalContainerId: row.original_container_id,
    originalContainerName: row.original_container_name,
    parentItemId: row.parent_item_id,
    parentItemTitle: row.parent_item_title
  };
}
