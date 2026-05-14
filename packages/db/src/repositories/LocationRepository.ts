import type { LocationRecord } from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import type { ItemRecord } from "./ItemRepository";

type LocationDetailsRow = {
  item_id: string;
  workspace_id: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  viewport_center_lat: number | null;
  viewport_center_lng: number | null;
  viewport_zoom: number;
  created_at: string;
  updated_at: string;
};

type LocationWithItemRow = {
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
  location_item_id: string;
  location_workspace_id: string;
  location_address: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  location_viewport_center_lat: number | null;
  location_viewport_center_lng: number | null;
  location_viewport_zoom: number;
  location_created_at: string;
  location_updated_at: string;
};

export type LocationWithItemRecord = {
  item: ItemRecord;
  location: LocationRecord;
};

export type CreateLocationDetailsInput = {
  itemId: string;
  workspaceId: string;
  timestamp: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  viewportCenterLat?: number | null;
  viewportCenterLng?: number | null;
  viewportZoom?: number;
};

export type UpdateLocationDetailsPatch = {
  timestamp: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  viewportCenterLat?: number | null;
  viewportCenterLng?: number | null;
  viewportZoom?: number;
};

export type ListLocationsFilter = {
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

const LOCATION_WITH_ITEM_SELECT = `
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
    ld.item_id as location_item_id,
    ld.workspace_id as location_workspace_id,
    ld.address as location_address,
    ld.latitude as location_latitude,
    ld.longitude as location_longitude,
    ld.viewport_center_lat as location_viewport_center_lat,
    ld.viewport_center_lng as location_viewport_center_lng,
    ld.viewport_zoom as location_viewport_zoom,
    ld.created_at as location_created_at,
    ld.updated_at as location_updated_at
  from location_details ld
  inner join items i on i.id = ld.item_id
`;

export class LocationRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getDetailsByItemId(itemId: string): LocationRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], LocationDetailsRow>(
        `select *
         from location_details
         where item_id = ?`
      )
      .get(itemId);

    return row === undefined ? null : toLocationRecord(row);
  }

  getByItemId(itemId: string): LocationWithItemRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], LocationWithItemRow>(
        `${LOCATION_WITH_ITEM_SELECT}
         where i.id = ?
           and i.type = 'location'
           and i.deleted_at is null
         limit 1`
      )
      .get(itemId);

    return row === undefined ? null : toLocationWithItemRecord(row);
  }

  listByContainer(
    containerId: string,
    filters: ListLocationsFilter = {}
  ): LocationWithItemRecord[] {
    const where = ["i.container_id = ?", "i.type = 'location'"];
    const values: unknown[] = [containerId];

    if (filters.includeArchived !== true) {
      where.push("i.archived_at is null");
    }

    if (filters.includeDeleted !== true) {
      where.push("i.deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], LocationWithItemRow>(
        `${LOCATION_WITH_ITEM_SELECT}
         where ${where.join(" and ")}
         order by i.pinned desc, i.sort_order asc, i.created_at asc`
      )
      .all(...values);

    return rows.map(toLocationWithItemRecord);
  }

  listByWorkspace(
    workspaceId: string,
    filters: ListLocationsFilter = {}
  ): LocationWithItemRecord[] {
    const where = ["ld.workspace_id = ?", "i.type = 'location'"];
    const values: unknown[] = [workspaceId];

    if (filters.includeArchived !== true) {
      where.push("i.archived_at is null");
    }

    if (filters.includeDeleted !== true) {
      where.push("i.deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], LocationWithItemRow>(
        `${LOCATION_WITH_ITEM_SELECT}
         where ${where.join(" and ")}
         order by i.container_id asc, i.pinned desc, i.sort_order asc, i.created_at asc`
      )
      .all(...values);

    return rows.map(toLocationWithItemRecord);
  }

  createDetails(input: CreateLocationDetailsInput): LocationRecord {
    this.connection.sqlite
      .prepare(
        `insert into location_details (
          item_id,
          workspace_id,
          address,
          latitude,
          longitude,
          viewport_center_lat,
          viewport_center_lng,
          viewport_zoom,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.itemId,
        input.workspaceId,
        input.address ?? null,
        input.latitude ?? null,
        input.longitude ?? null,
        input.viewportCenterLat ?? null,
        input.viewportCenterLng ?? null,
        input.viewportZoom ?? 14,
        input.timestamp,
        input.timestamp
      );

    const created = this.getDetailsByItemId(input.itemId);

    if (created === null) {
      throw new Error(`Location details row was not created: ${input.itemId}.`);
    }

    return created;
  }

  updateDetails(itemId: string, patch: UpdateLocationDetailsPatch): LocationRecord {
    const assignments: string[] = [];
    const values: unknown[] = [];

    if (patch.address !== undefined) {
      assignments.push("address = ?");
      values.push(patch.address);
    }

    if (patch.latitude !== undefined) {
      assignments.push("latitude = ?");
      values.push(patch.latitude);
    }

    if (patch.longitude !== undefined) {
      assignments.push("longitude = ?");
      values.push(patch.longitude);
    }

    if (patch.viewportCenterLat !== undefined) {
      assignments.push("viewport_center_lat = ?");
      values.push(patch.viewportCenterLat);
    }

    if (patch.viewportCenterLng !== undefined) {
      assignments.push("viewport_center_lng = ?");
      values.push(patch.viewportCenterLng);
    }

    if (patch.viewportZoom !== undefined) {
      assignments.push("viewport_zoom = ?");
      values.push(patch.viewportZoom);
    }

    assignments.push("updated_at = ?");
    values.push(patch.timestamp, itemId);

    this.connection.sqlite
      .prepare(
        `update location_details
         set ${assignments.join(", ")}
         where item_id = ?`
      )
      .run(...values);

    const updated = this.getDetailsByItemId(itemId);

    if (updated === null) {
      throw new Error(`Location details row was not found: ${itemId}.`);
    }

    return updated;
  }
}

function toLocationRecord(row: LocationDetailsRow): LocationRecord {
  return {
    itemId: row.item_id,
    workspaceId: row.workspace_id,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    viewportCenterLat: row.viewport_center_lat,
    viewportCenterLng: row.viewport_center_lng,
    viewportZoom: row.viewport_zoom,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toLocationWithItemRecord(row: LocationWithItemRow): LocationWithItemRecord {
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
    location: {
      itemId: row.location_item_id,
      workspaceId: row.location_workspace_id,
      address: row.location_address,
      latitude: row.location_latitude,
      longitude: row.location_longitude,
      viewportCenterLat: row.location_viewport_center_lat,
      viewportCenterLng: row.location_viewport_center_lng,
      viewportZoom: row.location_viewport_zoom,
      createdAt: row.location_created_at,
      updatedAt: row.location_updated_at
    }
  };
}
