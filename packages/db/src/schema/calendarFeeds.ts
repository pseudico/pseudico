import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const calendarSources = sqliteTable(
  "calendar_sources",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sourceType: text("source_type").notNull(),
    sourcePath: text("source_path"),
    sourceUrl: text("source_url"),
    networkEnabled: integer("network_enabled").notNull().default(0),
    readOnly: integer("read_only").notNull().default(1),
    importedAt: text("imported_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_calendar_sources_workspace").on(table.workspaceId, table.deletedAt),
    uniqueIndex("idx_calendar_sources_workspace_name_unique").on(table.workspaceId, table.name),
    check("ck_calendar_sources_source_type", sql`${table.sourceType} in ('file', 'network')`),
    check("ck_calendar_sources_network_bool", sql`${table.networkEnabled} in (0, 1)`),
    check("ck_calendar_sources_read_only_bool", sql`${table.readOnly} in (0, 1)`)
  ]
);

export const calendarEvents = sqliteTable(
  "calendar_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => calendarSources.id, { onDelete: "cascade" }),
    externalUid: text("external_uid").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    startAt: text("start_at").notNull(),
    endAt: text("end_at").notNull(),
    allDay: integer("all_day").notNull().default(0),
    timezone: text("timezone"),
    rawJson: text("raw_json").notNull().default("{}"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_calendar_events_workspace_range").on(table.workspaceId, table.startAt, table.endAt),
    index("idx_calendar_events_source").on(table.sourceId),
    uniqueIndex("idx_calendar_events_source_uid_unique").on(table.sourceId, table.externalUid),
    check("ck_calendar_events_all_day_bool", sql`${table.allDay} in (0, 1)`)
  ]
);
