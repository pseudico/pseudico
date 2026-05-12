import type { DatabaseConnection } from "../connection/createDatabaseConnection";

export type WorkflowTriggerType = "manual" | "item_created" | "file_imported";
export type WorkflowDefinitionStatus = "enabled" | "disabled";
export type WorkflowRunStatus = "running" | "completed" | "failed";

type WorkflowDefinitionRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  status: string;
  actions_json: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type WorkflowRunRow = {
  id: string;
  workspace_id: string;
  workflow_definition_id: string | null;
  trigger_type: string;
  status: string;
  preview_json: string;
  action_results_json: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

export type WorkflowDefinitionRecord = {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  triggerType: WorkflowTriggerType;
  status: WorkflowDefinitionStatus;
  actionsJson: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type WorkflowRunRecord = {
  id: string;
  workspaceId: string;
  workflowDefinitionId: string | null;
  triggerType: WorkflowTriggerType;
  status: WorkflowRunStatus;
  previewJson: string;
  actionResultsJson: string;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
};

export type CreateWorkflowDefinitionInput = {
  id: string;
  workspaceId: string;
  name: string;
  actionsJson: string;
  timestamp: string;
  description?: string | null;
  status?: WorkflowDefinitionStatus;
  triggerType?: WorkflowTriggerType;
};

export type ListWorkflowDefinitionsInput = {
  workspaceId: string;
  includeDeleted?: boolean;
  status?: WorkflowDefinitionStatus;
  triggerType?: WorkflowTriggerType;
};

export type CreateWorkflowRunInput = {
  id: string;
  workspaceId: string;
  workflowDefinitionId?: string | null;
  status: WorkflowRunStatus;
  previewJson: string;
  actionResultsJson?: string;
  errorMessage?: string | null;
  startedAt: string;
  completedAt?: string | null;
  triggerType?: WorkflowTriggerType;
};

export type UpdateWorkflowRunInput = {
  id: string;
  status: WorkflowRunStatus;
  actionResultsJson: string;
  completedAt: string;
  errorMessage?: string | null;
};

export class WorkflowRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  createDefinition(
    input: CreateWorkflowDefinitionInput
  ): WorkflowDefinitionRecord {
    this.connection.sqlite
      .prepare(
        `insert into workflow_definitions (
          id,
          workspace_id,
          name,
          description,
          trigger_type,
          status,
          actions_json,
          created_at,
          updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.name,
        input.description ?? null,
        input.triggerType ?? "manual",
        input.status ?? "enabled",
        input.actionsJson,
        input.timestamp,
        input.timestamp
      );

    const created = this.getDefinitionById(input.id);

    if (created === null) {
      throw new Error(`Workflow definition row was not created: ${input.id}.`);
    }

    return created;
  }

  getDefinitionById(
    id: string,
    filters: { includeDeleted?: boolean } = {}
  ): WorkflowDefinitionRecord | null {
    const deletedFilter =
      filters.includeDeleted === true ? "" : "and deleted_at is null";
    const row = this.connection.sqlite
      .prepare<[string], WorkflowDefinitionRow>(
        `select *
         from workflow_definitions
         where id = ?
           ${deletedFilter}`
      )
      .get(id);

    return row === undefined ? null : toWorkflowDefinitionRecord(row);
  }

  listDefinitions(
    input: ListWorkflowDefinitionsInput
  ): WorkflowDefinitionRecord[] {
    const where = ["workspace_id = ?"];
    const values: unknown[] = [input.workspaceId];

    if (input.status !== undefined) {
      where.push("status = ?");
      values.push(input.status);
    }

    if (input.triggerType !== undefined) {
      where.push("trigger_type = ?");
      values.push(input.triggerType);
    }

    if (input.includeDeleted !== true) {
      where.push("deleted_at is null");
    }

    const rows = this.connection.sqlite
      .prepare<unknown[], WorkflowDefinitionRow>(
        `select *
         from workflow_definitions
         where ${where.join(" and ")}
         order by updated_at desc, name collate nocase asc`
      )
      .all(...values);

    return rows.map(toWorkflowDefinitionRecord);
  }

  createRun(input: CreateWorkflowRunInput): WorkflowRunRecord {
    this.connection.sqlite
      .prepare(
        `insert into workflow_runs (
          id,
          workspace_id,
          workflow_definition_id,
          trigger_type,
          status,
          preview_json,
          action_results_json,
          error_message,
          started_at,
          completed_at,
          created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.workflowDefinitionId ?? null,
        input.triggerType ?? "manual",
        input.status,
        input.previewJson,
        input.actionResultsJson ?? "[]",
        input.errorMessage ?? null,
        input.startedAt,
        input.completedAt ?? null,
        input.startedAt
      );

    const created = this.getRunById(input.id);

    if (created === null) {
      throw new Error(`Workflow run row was not created: ${input.id}.`);
    }

    return created;
  }

  updateRun(input: UpdateWorkflowRunInput): WorkflowRunRecord {
    this.connection.sqlite
      .prepare(
        `update workflow_runs
         set status = ?,
             action_results_json = ?,
             error_message = ?,
             completed_at = ?
         where id = ?`
      )
      .run(
        input.status,
        input.actionResultsJson,
        input.errorMessage ?? null,
        input.completedAt,
        input.id
      );

    const updated = this.getRunById(input.id);

    if (updated === null) {
      throw new Error(`Workflow run row was not found: ${input.id}.`);
    }

    return updated;
  }

  getRunById(id: string): WorkflowRunRecord | null {
    const row = this.connection.sqlite
      .prepare<[string], WorkflowRunRow>(
        `select *
         from workflow_runs
         where id = ?`
      )
      .get(id);

    return row === undefined ? null : toWorkflowRunRecord(row);
  }

  listRunsForWorkflow(workflowDefinitionId: string): WorkflowRunRecord[] {
    const rows = this.connection.sqlite
      .prepare<[string], WorkflowRunRow>(
        `select *
         from workflow_runs
         where workflow_definition_id = ?
         order by created_at desc, id asc`
      )
      .all(workflowDefinitionId);

    return rows.map(toWorkflowRunRecord);
  }
}

function toWorkflowDefinitionRecord(
  row: WorkflowDefinitionRow
): WorkflowDefinitionRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description,
    triggerType: row.trigger_type as WorkflowTriggerType,
    status: row.status as WorkflowDefinitionStatus,
    actionsJson: row.actions_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

function toWorkflowRunRecord(row: WorkflowRunRow): WorkflowRunRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    workflowDefinitionId: row.workflow_definition_id,
    triggerType: row.trigger_type as WorkflowTriggerType,
    status: row.status as WorkflowRunStatus,
    previewJson: row.preview_json,
    actionResultsJson: row.action_results_json,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at
  };
}
