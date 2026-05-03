import type { NoteFormat } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import type { ItemRecord } from "./ItemRepository";

type NoteDetailsRow = {
  item_id: string;
  workspace_id: string;
  format: string;
  content: string;
  preview: string | null;
  created_at: string;
  updated_at: string;
};

type NoteWithItemRow = {
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
  note_item_id: string;
  note_workspace_id: string;
  note_format: string;
  note_content: string;
  note_preview: string | null;
  note_created_at: string;
  note_updated_at: string;
};

export type NoteDetailsRecord = {
  itemId: string;
  workspaceId: string;
  format: NoteFormat;
  content: string;
  preview: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NoteWithItemRecord = {
  item: ItemRecord;
  note: NoteDetailsRecord;
};

export type CreateNoteDetailsInput = {
  itemId: string;
  workspaceId: string;
  content: string;
  timestamp: string;
  format?: NoteFormat;
  preview?: string | null;
};

export type UpdateNoteDetailsPatch = {
  content?: string;
  preview?: string | null;
  timestamp: string;
};

export type ListNotesFilter = {
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

const NOTE_WITH_ITEM_SELECT = `
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
    nd.item_id as note_item_id,
    nd.workspace_id as note_workspace_id,
    nd.format as note_format,
    nd.content as note_content,
    nd.preview as note_preview,
    nd.created_at as note_created_at,
    nd.updated_at as note_updated_at
  from note_details nd
  inner join items i on i.id = nd.item_id
`;

export class NoteRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getDetailsByItemId(itemId: string): NoteDetailsRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], NoteDetailsRow>(
        `select *
         from note_details
         where item_id = ?`
      )
      .get(itemId);

    return row === undefined ? null : toNoteDetailsRecord(row);
  }

  getByItemId(itemId: string): NoteWithItemRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], NoteWithItemRow>(
        `${NOTE_WITH_ITEM_SELECT}
         where i.id = ?
           and i.type = 'note'
           and i.deleted_at is null
         limit 1`
      )
      .get(itemId);

    return row === undefined ? null : toNoteWithItemRecord(row);
  }

  listByContainer(
    containerId: string,
    filters: ListNotesFilter = {}
  ): NoteWithItemRecord[] {
    const where = ["i.container_id = ?", "i.type = 'note'"];
    const values: unknown[] = [containerId];

    if (filters.includeArchived !== true) {
      where.push("i.archived_at is null");
    }

    if (filters.includeDeleted !== true) {
      where.push("i.deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], NoteWithItemRow>(
        `${NOTE_WITH_ITEM_SELECT}
         where ${where.join(" and ")}
         order by i.pinned desc, i.sort_order asc, i.created_at asc`
      )
      .all(...values);

    return rows.map(toNoteWithItemRecord);
  }

  listByWorkspace(
    workspaceId: string,
    filters: ListNotesFilter = {}
  ): NoteWithItemRecord[] {
    const where = ["nd.workspace_id = ?", "i.type = 'note'"];
    const values: unknown[] = [workspaceId];

    if (filters.includeArchived !== true) {
      where.push("i.archived_at is null");
    }

    if (filters.includeDeleted !== true) {
      where.push("i.deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], NoteWithItemRow>(
        `${NOTE_WITH_ITEM_SELECT}
         where ${where.join(" and ")}
         order by i.container_id asc, i.pinned desc, i.sort_order asc, i.created_at asc`
      )
      .all(...values);

    return rows.map(toNoteWithItemRecord);
  }

  createDetails(input: CreateNoteDetailsInput): NoteDetailsRecord {
    this.connection.sqlite
      .prepare(
        `insert into note_details (
          item_id,
          workspace_id,
          format,
          content,
          preview,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.itemId,
        input.workspaceId,
        input.format ?? "markdown",
        input.content,
        input.preview ?? null,
        input.timestamp,
        input.timestamp
      );

    const created = this.getDetailsByItemId(input.itemId);

    if (created === null) {
      throw new Error(`Note details row was not created: ${input.itemId}.`);
    }

    return created;
  }

  updateDetails(itemId: string, patch: UpdateNoteDetailsPatch): NoteDetailsRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.content !== undefined) {
      assignments.push("content = ?");
      values.push(patch.content);
    }

    if (patch.preview !== undefined) {
      assignments.push("preview = ?");
      values.push(patch.preview);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, itemId);

    this.connection.sqlite
      .prepare(
        `update note_details
         set ${assignments.join(", ")}
         where item_id = ?`
      )
      .run(...values);

    const updated = this.getDetailsByItemId(itemId);

    if (updated === null) {
      throw new Error(`Note details row was not found: ${itemId}.`);
    }

    return updated;
  }
}

function toNoteDetailsRecord(row: NoteDetailsRow): NoteDetailsRecord {
  return {
    itemId: row.item_id,
    workspaceId: row.workspace_id,
    format: row.format as NoteFormat,
    content: row.content,
    preview: row.preview,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toNoteWithItemRecord(row: NoteWithItemRow): NoteWithItemRecord {
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
    note: {
      itemId: row.note_item_id,
      workspaceId: row.note_workspace_id,
      format: row.note_format as NoteFormat,
      content: row.note_content,
      preview: row.note_preview,
      createdAt: row.note_created_at,
      updatedAt: row.note_updated_at
    }
  };
}
