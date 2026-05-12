import { sql } from "drizzle-orm";
import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { workspaces } from "./workspaces";

export const workflowDefinitions = sqliteTable(
  "workflow_definitions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    triggerType: text("trigger_type").notNull().default("manual"),
    status: text("status").notNull().default("enabled"),
    actionsJson: text("actions_json").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    deletedAt: text("deleted_at")
  },
  (table) => [
    index("idx_workflow_definitions_workspace_status").on(
      table.workspaceId,
      table.status,
      table.deletedAt,
      table.updatedAt
    ),
    check("ck_workflow_definitions_trigger_type", sql`${table.triggerType} in ('manual', 'item_created', 'file_imported')`),
    check("ck_workflow_definitions_status", sql`${table.status} in ('enabled', 'disabled')`)
  ]
);

export const workflowRuns = sqliteTable(
  "workflow_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    workflowDefinitionId: text("workflow_definition_id").references(
      () => workflowDefinitions.id,
      { onDelete: "set null" }
    ),
    triggerType: text("trigger_type").notNull().default("manual"),
    status: text("status").notNull(),
    previewJson: text("preview_json").notNull(),
    actionResultsJson: text("action_results_json").notNull().default("[]"),
    errorMessage: text("error_message"),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    createdAt: text("created_at").notNull()
  },
  (table) => [
    index("idx_workflow_runs_workspace_created").on(
      table.workspaceId,
      table.createdAt
    ),
    index("idx_workflow_runs_definition_created").on(
      table.workflowDefinitionId,
      table.createdAt
    ),
    check("ck_workflow_runs_trigger_type", sql`${table.triggerType} in ('manual', 'item_created', 'file_imported')`),
    check("ck_workflow_runs_status", sql`${table.status} in ('running', 'completed', 'failed')`)
  ]
);
