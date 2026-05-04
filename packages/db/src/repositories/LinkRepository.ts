import type { LinkRecord } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import type { ItemRecord } from "./ItemRepository";

type LinkDetailsRow = {
  item_id: string;
  workspace_id: string;
  url: string;
  normalized_url: string | null;
  title: string | null;
  description: string | null;
  domain: string | null;
  favicon_path: string | null;
  preview_image_path: string | null;
  created_at: string;
  updated_at: string;
};

type LinkWithItemRow = {
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
  link_item_id: string;
  link_workspace_id: string;
  link_url: string;
  link_normalized_url: string | null;
  link_title: string | null;
  link_description: string | null;
  link_domain: string | null;
  link_favicon_path: string | null;
  link_preview_image_path: string | null;
  link_created_at: string;
  link_updated_at: string;
};

export type LinkWithItemRecord = {
  item: ItemRecord;
  link: LinkRecord;
};

export type CreateLinkDetailsInput = {
  itemId: string;
  workspaceId: string;
  url: string;
  normalizedUrl: string;
  timestamp: string;
  title?: string | null;
  description?: string | null;
  domain?: string | null;
  faviconPath?: string | null;
  previewImagePath?: string | null;
};

export type UpdateLinkDetailsPatch = {
  timestamp: string;
  url?: string;
  normalizedUrl?: string;
  title?: string | null;
  description?: string | null;
  domain?: string | null;
  faviconPath?: string | null;
  previewImagePath?: string | null;
};

export type ListLinksFilter = {
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

const LINK_WITH_ITEM_SELECT = `
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
    l.item_id as link_item_id,
    l.workspace_id as link_workspace_id,
    l.url as link_url,
    l.normalized_url as link_normalized_url,
    l.title as link_title,
    l.description as link_description,
    l.domain as link_domain,
    l.favicon_path as link_favicon_path,
    l.preview_image_path as link_preview_image_path,
    l.created_at as link_created_at,
    l.updated_at as link_updated_at
  from links l
  inner join items i on i.id = l.item_id
`;

export class LinkRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getDetailsByItemId(itemId: string): LinkRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], LinkDetailsRow>(
        `select *
         from links
         where item_id = ?`
      )
      .get(itemId);

    return row === undefined ? null : toLinkRecord(row);
  }

  getByItemId(itemId: string): LinkWithItemRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], LinkWithItemRow>(
        `${LINK_WITH_ITEM_SELECT}
         where i.id = ?
           and i.type = 'link'
           and i.deleted_at is null
         limit 1`
      )
      .get(itemId);

    return row === undefined ? null : toLinkWithItemRecord(row);
  }

  listByContainer(
    containerId: string,
    filters: ListLinksFilter = {}
  ): LinkWithItemRecord[] {
    const where = ["i.container_id = ?", "i.type = 'link'"];
    const values: unknown[] = [containerId];

    if (filters.includeArchived !== true) {
      where.push("i.archived_at is null");
    }

    if (filters.includeDeleted !== true) {
      where.push("i.deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], LinkWithItemRow>(
        `${LINK_WITH_ITEM_SELECT}
         where ${where.join(" and ")}
         order by i.pinned desc, i.sort_order asc, i.created_at asc`
      )
      .all(...values);

    return rows.map(toLinkWithItemRecord);
  }

  listByWorkspace(
    workspaceId: string,
    filters: ListLinksFilter = {}
  ): LinkWithItemRecord[] {
    const where = ["l.workspace_id = ?", "i.type = 'link'"];
    const values: unknown[] = [workspaceId];

    if (filters.includeArchived !== true) {
      where.push("i.archived_at is null");
    }

    if (filters.includeDeleted !== true) {
      where.push("i.deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], LinkWithItemRow>(
        `${LINK_WITH_ITEM_SELECT}
         where ${where.join(" and ")}
         order by i.container_id asc, i.pinned desc, i.sort_order asc, i.created_at asc`
      )
      .all(...values);

    return rows.map(toLinkWithItemRecord);
  }

  createDetails(input: CreateLinkDetailsInput): LinkRecord {
    this.connection.sqlite
      .prepare(
        `insert into links (
          item_id,
          workspace_id,
          url,
          normalized_url,
          title,
          description,
          domain,
          favicon_path,
          preview_image_path,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.itemId,
        input.workspaceId,
        input.url,
        input.normalizedUrl,
        input.title ?? null,
        input.description ?? null,
        input.domain ?? null,
        input.faviconPath ?? null,
        input.previewImagePath ?? null,
        input.timestamp,
        input.timestamp
      );

    const created = this.getDetailsByItemId(input.itemId);

    if (created === null) {
      throw new Error(`Link details row was not created: ${input.itemId}.`);
    }

    return created;
  }

  updateDetails(itemId: string, patch: UpdateLinkDetailsPatch): LinkRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.url !== undefined) {
      assignments.push("url = ?");
      values.push(patch.url);
    }

    if (patch.normalizedUrl !== undefined) {
      assignments.push("normalized_url = ?");
      values.push(patch.normalizedUrl);
    }

    if (patch.title !== undefined) {
      assignments.push("title = ?");
      values.push(patch.title);
    }

    if (patch.description !== undefined) {
      assignments.push("description = ?");
      values.push(patch.description);
    }

    if (patch.domain !== undefined) {
      assignments.push("domain = ?");
      values.push(patch.domain);
    }

    if (patch.faviconPath !== undefined) {
      assignments.push("favicon_path = ?");
      values.push(patch.faviconPath);
    }

    if (patch.previewImagePath !== undefined) {
      assignments.push("preview_image_path = ?");
      values.push(patch.previewImagePath);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, itemId);

    this.connection.sqlite
      .prepare(
        `update links
         set ${assignments.join(", ")}
         where item_id = ?`
      )
      .run(...values);

    const updated = this.getDetailsByItemId(itemId);

    if (updated === null) {
      throw new Error(`Link details row was not found: ${itemId}.`);
    }

    return updated;
  }
}

function toLinkRecord(row: LinkDetailsRow): LinkRecord {
  return {
    itemId: row.item_id,
    workspaceId: row.workspace_id,
    url: row.url,
    normalizedUrl: row.normalized_url ?? row.url,
    title: row.title,
    description: row.description,
    domain: row.domain,
    faviconPath: row.favicon_path,
    previewImagePath: row.preview_image_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toLinkWithItemRecord(row: LinkWithItemRow): LinkWithItemRecord {
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
    link: {
      itemId: row.link_item_id,
      workspaceId: row.link_workspace_id,
      url: row.link_url,
      normalizedUrl: row.link_normalized_url ?? row.link_url,
      title: row.link_title,
      description: row.link_description,
      domain: row.link_domain,
      faviconPath: row.link_favicon_path,
      previewImagePath: row.link_preview_image_path,
      createdAt: row.link_created_at,
      updatedAt: row.link_updated_at
    }
  };
}
