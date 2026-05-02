import type {
  ListDisplayMode,
  ListItemStatus,
  ListProgressMode
} from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import type { ItemRecord } from "./ItemRepository";

type ListDetailsRow = {
  item_id: string;
  workspace_id: string;
  display_mode: string;
  show_completed: number;
  progress_mode: string;
  created_at: string;
  updated_at: string;
};

type ListItemRow = {
  id: string;
  workspace_id: string;
  list_item_parent_id: string | null;
  list_id: string;
  title: string;
  body: string | null;
  status: string;
  depth: number;
  sort_order: number;
  start_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
};

type ListWithItemRow = {
  item_id: string;
  item_workspace_id: string;
  item_container_id: string;
  item_container_tab_id: string | null;
  item_type: string;
  item_title: string;
  item_body: string | null;
  item_category_id: string | null;
  item_status: string;
  item_sort_order: number;
  item_pinned: number;
  item_created_at: string;
  item_updated_at: string;
  item_completed_at: string | null;
  item_archived_at: string | null;
  item_deleted_at: string | null;
  list_item_id: string;
  list_workspace_id: string;
  list_display_mode: string;
  list_show_completed: number;
  list_progress_mode: string;
  list_created_at: string;
  list_updated_at: string;
};

export type ListDetailsRecord = {
  itemId: string;
  workspaceId: string;
  displayMode: ListDisplayMode;
  showCompleted: boolean;
  progressMode: ListProgressMode;
  createdAt: string;
  updatedAt: string;
};

export type ListItemRecord = {
  id: string;
  workspaceId: string;
  listItemParentId: string | null;
  listId: string;
  title: string;
  body: string | null;
  status: ListItemStatus;
  depth: number;
  sortOrder: number;
  startAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
};

export type ListWithItemRecord = {
  item: ItemRecord;
  list: ListDetailsRecord;
};

export type CreateListDetailsInput = {
  itemId: string;
  workspaceId: string;
  timestamp: string;
  displayMode?: ListDisplayMode;
  showCompleted?: boolean;
  progressMode?: ListProgressMode;
};

export type CreateListItemInput = {
  id: string;
  workspaceId: string;
  listId: string;
  title: string;
  timestamp: string;
  body?: string | null;
  status?: ListItemStatus;
  depth?: number;
  sortOrder?: number;
  listItemParentId?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
};

export type UpdateListItemPatch = {
  title?: string;
  body?: string | null;
  status?: ListItemStatus;
  depth?: number;
  sortOrder?: number;
  listItemParentId?: string | null;
  startAt?: string | null;
  dueAt?: string | null;
  completedAt?: string | null;
  timestamp: string;
};

export type ListItemsFilter = {
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

const LIST_WITH_ITEM_SELECT = `
  select
    i.id as item_id,
    i.workspace_id as item_workspace_id,
    i.container_id as item_container_id,
    i.container_tab_id as item_container_tab_id,
    i.type as item_type,
    i.title as item_title,
    i.body as item_body,
    i.category_id as item_category_id,
    i.status as item_status,
    i.sort_order as item_sort_order,
    i.pinned as item_pinned,
    i.created_at as item_created_at,
    i.updated_at as item_updated_at,
    i.completed_at as item_completed_at,
    i.archived_at as item_archived_at,
    i.deleted_at as item_deleted_at,
    ld.item_id as list_item_id,
    ld.workspace_id as list_workspace_id,
    ld.display_mode as list_display_mode,
    ld.show_completed as list_show_completed,
    ld.progress_mode as list_progress_mode,
    ld.created_at as list_created_at,
    ld.updated_at as list_updated_at
  from list_details ld
  inner join items i on i.id = ld.item_id
`;

export class ListRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getDetailsByItemId(itemId: string): ListDetailsRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ListDetailsRow>(
        `select *
         from list_details
         where item_id = ?`
      )
      .get(itemId);

    return row === undefined ? null : toListDetailsRecord(row);
  }

  getByItemId(itemId: string): ListWithItemRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ListWithItemRow>(
        `${LIST_WITH_ITEM_SELECT}
         where i.id = ?
           and i.type = 'list'
           and i.deleted_at is null
         limit 1`
      )
      .get(itemId);

    return row === undefined ? null : toListWithItemRecord(row);
  }

  createDetails(input: CreateListDetailsInput): ListDetailsRecord {
    this.connection.sqlite
      .prepare(
        `insert into list_details (
          item_id,
          workspace_id,
          display_mode,
          show_completed,
          progress_mode,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.itemId,
        input.workspaceId,
        input.displayMode ?? "checklist",
        input.showCompleted === false ? 0 : 1,
        input.progressMode ?? "count",
        input.timestamp,
        input.timestamp
      );

    const created = this.getDetailsByItemId(input.itemId);

    if (created === null) {
      throw new Error(`List details row was not created: ${input.itemId}.`);
    }

    return created;
  }

  getListItemById(id: string): ListItemRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], ListItemRow>(
        `select *
         from list_items
         where id = ?
           and deleted_at is null`
      )
      .get(id);

    return row === undefined ? null : toListItemRecord(row);
  }

  listItems(listId: string, filters: ListItemsFilter = {}): ListItemRecord[] {
    const where = ["list_id = ?"];
    const values: unknown[] = [listId];

    if (filters.includeArchived !== true) {
      where.push("archived_at is null");
    }

    if (filters.includeDeleted !== true) {
      where.push("deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], ListItemRow>(
        `select *
         from list_items
         where ${where.join(" and ")}
         order by sort_order asc, created_at asc`
      )
      .all(...values);

    return rows.map(toListItemRecord);
  }

  listItemsByWorkspace(
    workspaceId: string,
    filters: ListItemsFilter = {}
  ): ListItemRecord[] {
    const where = ["workspace_id = ?"];
    const values: unknown[] = [workspaceId];

    if (filters.includeArchived !== true) {
      where.push("archived_at is null");
    }

    if (filters.includeDeleted !== true) {
      where.push("deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], ListItemRow>(
        `select *
         from list_items
         where ${where.join(" and ")}
         order by list_id asc, sort_order asc, created_at asc`
      )
      .all(...values);

    return rows.map(toListItemRecord);
  }

  createListItem(input: CreateListItemInput): ListItemRecord {
    this.connection.sqlite
      .prepare(
        `insert into list_items (
          id,
          workspace_id,
          list_item_parent_id,
          list_id,
          title,
          body,
          status,
          depth,
          sort_order,
          start_at,
          due_at,
          completed_at,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.listItemParentId ?? null,
        input.listId,
        input.title,
        input.body ?? null,
        input.status ?? "open",
        input.depth ?? 0,
        input.sortOrder ?? 0,
        input.startAt ?? null,
        input.dueAt ?? null,
        input.completedAt ?? null,
        input.timestamp,
        input.timestamp
      );

    const created = this.getListItemById(input.id);

    if (created === null) {
      throw new Error(`List item row was not created: ${input.id}.`);
    }

    return created;
  }

  updateListItem(id: string, patch: UpdateListItemPatch): ListItemRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.title !== undefined) {
      assignments.push("title = ?");
      values.push(patch.title);
    }

    if (patch.body !== undefined) {
      assignments.push("body = ?");
      values.push(patch.body);
    }

    if (patch.status !== undefined) {
      assignments.push("status = ?");
      values.push(patch.status);
    }

    if (patch.depth !== undefined) {
      assignments.push("depth = ?");
      values.push(patch.depth);
    }

    if (patch.sortOrder !== undefined) {
      assignments.push("sort_order = ?");
      values.push(patch.sortOrder);
    }

    if (patch.listItemParentId !== undefined) {
      assignments.push("list_item_parent_id = ?");
      values.push(patch.listItemParentId);
    }

    if (patch.startAt !== undefined) {
      assignments.push("start_at = ?");
      values.push(patch.startAt);
    }

    if (patch.dueAt !== undefined) {
      assignments.push("due_at = ?");
      values.push(patch.dueAt);
    }

    if (patch.completedAt !== undefined) {
      assignments.push("completed_at = ?");
      values.push(patch.completedAt);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, id);

    this.connection.sqlite
      .prepare(
        `update list_items
         set ${assignments.join(", ")}
         where id = ?
           and deleted_at is null`
      )
      .run(...values);

    const updated = this.getListItemById(id);

    if (updated === null) {
      throw new Error(`List item row was not found: ${id}.`);
    }

    return updated;
  }

  getMaxListItemSortOrder(listId: string): number | null {
    const row = this.connection.sqlite
      .prepare<[string], { max_sort_order: number | null }>(
        `select max(sort_order) as max_sort_order
         from list_items
         where list_id = ?
           and deleted_at is null`
      )
      .get(listId);

    return row?.max_sort_order ?? null;
  }
}

function toListDetailsRecord(row: ListDetailsRow): ListDetailsRecord {
  return {
    itemId: row.item_id,
    workspaceId: row.workspace_id,
    displayMode: row.display_mode as ListDisplayMode,
    showCompleted: row.show_completed === 1,
    progressMode: row.progress_mode as ListProgressMode,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toListItemRecord(row: ListItemRow): ListItemRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    listItemParentId: row.list_item_parent_id,
    listId: row.list_id,
    title: row.title,
    body: row.body,
    status: row.status as ListItemStatus,
    depth: row.depth,
    sortOrder: row.sort_order,
    startAt: row.start_at,
    dueAt: row.due_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at
  };
}

function toListWithItemRecord(row: ListWithItemRow): ListWithItemRecord {
  return {
    item: {
      id: row.item_id,
      workspaceId: row.item_workspace_id,
      containerId: row.item_container_id,
      containerTabId: row.item_container_tab_id,
      type: row.item_type,
      title: row.item_title,
      body: row.item_body,
      categoryId: row.item_category_id,
      status: row.item_status,
      sortOrder: row.item_sort_order,
      pinned: row.item_pinned === 1,
      createdAt: row.item_created_at,
      updatedAt: row.item_updated_at,
      completedAt: row.item_completed_at,
      archivedAt: row.item_archived_at,
      deletedAt: row.item_deleted_at
    },
    list: {
      itemId: row.list_item_id,
      workspaceId: row.list_workspace_id,
      displayMode: row.list_display_mode as ListDisplayMode,
      showCompleted: row.list_show_completed === 1,
      progressMode: row.list_progress_mode as ListProgressMode,
      createdAt: row.list_created_at,
      updatedAt: row.list_updated_at
    }
  };
}
