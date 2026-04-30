import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";
import { dailyPlans } from "./dailyPlans";
import { workspaces } from "./workspaces";

export const dailyPlanItems = sqliteTable(
  "daily_plan_items",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    dailyPlanId: text("daily_plan_id")
      .notNull()
      .references(() => dailyPlans.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    itemId: text("item_id").notNull(),
    lane: text("lane").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    addedManually: integer("added_manually").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull()
  },
  (table) => [
    uniqueIndex("idx_daily_plan_items_unique").on(
      table.dailyPlanId,
      table.itemType,
      table.itemId,
      table.lane
    ),
    index("idx_daily_plan_items_plan_order").on(
      table.dailyPlanId,
      table.lane,
      table.sortOrder
    ),
    check(
      "ck_daily_plan_items_item_type",
      sql`${table.itemType} in ('task', 'item', 'list_item')`
    ),
    check(
      "ck_daily_plan_items_lane",
      sql`${table.lane} in ('today', 'tomorrow', 'backlog')`
    ),
    check(
      "ck_daily_plan_items_added_manually_bool",
      sql`${table.addedManually} in (0, 1)`
    )
  ]
);
