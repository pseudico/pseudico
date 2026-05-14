import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { items } from "./items";
import { workspaces } from "./workspaces";

export const locationDetails = sqliteTable(
  "location_details",
  {
    itemId: text("item_id")
      .primaryKey()
      .references(() => items.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    address: text("address"),
    latitude: real("latitude"),
    longitude: real("longitude"),
    viewportCenterLat: real("viewport_center_lat"),
    viewportCenterLng: real("viewport_center_lng"),
    viewportZoom: integer("viewport_zoom").notNull().default(14),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    index("idx_location_details_workspace").on(table.workspaceId),
    check(
      "ck_location_details_latitude",
      sql`${table.latitude} is null or (${table.latitude} >= -90 and ${table.latitude} <= 90)`
    ),
    check(
      "ck_location_details_longitude",
      sql`${table.longitude} is null or (${table.longitude} >= -180 and ${table.longitude} <= 180)`
    ),
    check(
      "ck_location_details_viewport_center_lat",
      sql`${table.viewportCenterLat} is null or (${table.viewportCenterLat} >= -90 and ${table.viewportCenterLat} <= 90)`
    ),
    check(
      "ck_location_details_viewport_center_lng",
      sql`${table.viewportCenterLng} is null or (${table.viewportCenterLng} >= -180 and ${table.viewportCenterLng} <= 180)`
    ),
    check(
      "ck_location_details_viewport_zoom",
      sql`${table.viewportZoom} >= 1 and ${table.viewportZoom} <= 20`
    )
  ]
);
