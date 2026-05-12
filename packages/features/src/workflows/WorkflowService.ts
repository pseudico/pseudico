import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  TransactionService,
  WorkflowRepository,
  type DatabaseConnection,
  type WorkflowDefinitionRecord,
  type WorkflowRunRecord
} from "@local-work-os/db";
import {
  WorkflowActionExecutor,
  type WorkflowActionExecutionResult,
  type WorkflowActionPreview,
  type WorkflowServiceIdFactory
} from "./WorkflowActionExecutor";
import {
  createWorkflowDefinitionSchema,
  parseWorkflowActions,
  parseWorkflowDefinitionSchema,
  stringifyWorkflowActions,
  stringifyWorkflowDefinitionSchema,
  validateWorkflowDefinitionSchema,
  type WorkflowAction,
  type WorkflowTrigger
} from "./WorkflowSchema";

export type CreateWorkflowInput = {
  workspaceId: string;
  name: string;
  actions: WorkflowAction[];
  actorType?: ActivityActorType;
  description?: string | null;
  status?: "enabled" | "disabled";
  trigger?: WorkflowTrigger;
};

export type PreviewWorkflowRunInput =
  | {
      workflowId: string;
      actorType?: ActivityActorType;
    }
  | {
      workspaceId: string;
      actions: WorkflowAction[];
      actorType?: ActivityActorType;
    };

export type RunManualWorkflowInput = {
  workflowId: string;
  actorType?: ActivityActorType;
};

export type WorkflowPreviewResult = {
  workspaceId: string;
  workflowId: string | null;
  triggerType: WorkflowTrigger["type"];
  canRun: boolean;
  actionPreviews: WorkflowActionPreview[];
};

export type WorkflowRunResult = {
  workflow: WorkflowDefinitionRecord;
  run: WorkflowRunRecord;
  preview: WorkflowPreviewResult;
  actionResults: WorkflowActionExecutionResult[];
};

export class WorkflowService {
  readonly module = "workflows";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: WorkflowServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: WorkflowServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async createWorkflow(input: CreateWorkflowInput): Promise<WorkflowDefinitionRecord> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.name, "name");
    const trigger = input.trigger ?? { type: "manual" };
    const definition = createWorkflowDefinitionSchema(input.actions, trigger);
    const validation = validateWorkflowDefinitionSchema(definition);
    if ((input.status ?? "enabled") === "enabled" && !validation.canEnable) {
      throw new Error(`Workflow cannot be enabled: ${validation.issues.map((issue) => issue.message).join(" ")}`);
    }
    const actionsJson = stringifyWorkflowDefinitionSchema(definition);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const workflow = new WorkflowRepository(this.connection).createDefinition({
        id: this.idFactory("workflow"),
        workspaceId: input.workspaceId,
        name: input.name.trim(),
        description: normalizeNullableString(input.description),
        status: input.status ?? "enabled",
        triggerType: trigger.type,
        actionsJson,
        timestamp
      });

      this.logWorkflowEvent({
        workflow,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.workflowCreated,
        summary: `Created ${trigger.type === "manual" ? "manual" : "item-created"} workflow "${workflow.name}".`,
        before: null,
        after: workflow,
        timestamp
      });

      return workflow;
    });
  }

  listWorkflows(workspaceId: string): WorkflowDefinitionRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return new WorkflowRepository(this.connection).listDefinitions({
      workspaceId
    });
  }

  async previewWorkflowRun(
    input: PreviewWorkflowRunInput
  ): Promise<WorkflowPreviewResult> {
    if ("workflowId" in input) {
      validateNonEmptyString(input.workflowId, "workflowId");
      const workflow = this.requireWorkflow(input.workflowId);

      return this.previewDefinition(workflow, input.actorType);
    }

    validateNonEmptyString(input.workspaceId, "workspaceId");
    stringifyWorkflowActions(input.actions);

    return this.previewActions({
      workspaceId: input.workspaceId,
      workflowId: null,
      actions: input.actions,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType })
    });
  }

  async runManualWorkflow(
    input: RunManualWorkflowInput
  ): Promise<WorkflowRunResult> {
    validateNonEmptyString(input.workflowId, "workflowId");
    const workflow = this.requireWorkflow(input.workflowId);

    if (workflow.triggerType !== "manual") {
      throw new Error("Only manual workflows can be run by this service.");
    }

    if (workflow.status !== "enabled") {
      throw new Error(`Workflow is not enabled: ${workflow.id}.`);
    }

    const actions = parseWorkflowActions(workflow.actionsJson);
    const preview = await this.previewDefinition(workflow, input.actorType);

    if (!preview.canRun) {
      return this.recordFailedRun({
        workflow,
        preview,
        actionResults: [],
        error: new Error("Workflow preview has blocked actions."),
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });
    }

    try {
      return await this.transactionService.runInTransaction(async () => {
        const timestamp = createIsoTimestamp(this.now());
        const repository = new WorkflowRepository(this.connection);
        const run = repository.createRun({
          id: this.idFactory("workflow_run"),
          workspaceId: workflow.workspaceId,
          workflowDefinitionId: workflow.id,
          status: "running",
          previewJson: JSON.stringify(preview),
          startedAt: timestamp
        });
        const executor = this.createExecutor();
        const actionResults: WorkflowActionExecutionResult[] = [];

        for (const [index, action] of actions.entries()) {
          actionResults.push(
            await executor.executeWorkflowAction(
              action,
              {
                workspaceId: workflow.workspaceId,
                actorType: input.actorType ?? "local_user"
              },
              index
            )
          );
        }

        const completedAt = createIsoTimestamp(this.now());
        const completedRun = repository.updateRun({
          id: run.id,
          status: "completed",
          actionResultsJson: JSON.stringify(actionResults),
          completedAt
        });

        this.logWorkflowEvent({
          workflow,
          actorType: input.actorType ?? "local_user",
          action: ActivityAction.workflowRunCompleted,
          summary: `Ran manual workflow "${workflow.name}" (${actionResults.length} actions).`,
          before: run,
          after: completedRun,
          timestamp: completedAt
        });

        return {
          workflow,
          run: completedRun,
          preview,
          actionResults
        };
      });
    } catch (error) {
      return this.recordFailedRun({
        workflow,
        preview,
        actionResults: [],
        error,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType })
      });
    }
  }

  private async previewDefinition(
    workflow: WorkflowDefinitionRecord,
    actorType: ActivityActorType | undefined
  ): Promise<WorkflowPreviewResult> {
    const definition = parseWorkflowDefinitionSchema(workflow.actionsJson);
    return this.previewActions({
      workspaceId: workflow.workspaceId,
      workflowId: workflow.id,
      triggerType: definition.trigger.type,
      actions: definition.actions,
      ...(actorType === undefined ? {} : { actorType })
    });
  }

  private previewActions(input: {
    workspaceId: string;
    workflowId: string | null;
    triggerType?: WorkflowTrigger["type"];
    actions: WorkflowAction[];
    actorType?: ActivityActorType;
  }): WorkflowPreviewResult {
    const executor = this.createExecutor();
    const actionPreviews = input.actions.map((action, index) =>
      executor.previewWorkflowAction(
        action,
        {
          workspaceId: input.workspaceId,
          actorType: input.actorType ?? "local_user"
        },
        index
      )
    );

    return {
      workspaceId: input.workspaceId,
      workflowId: input.workflowId,
      triggerType: input.triggerType ?? "manual",
      canRun: actionPreviews.every((preview) => preview.status === "ready"),
      actionPreviews
    };
  }

  private recordFailedRun(input: {
    workflow: WorkflowDefinitionRecord;
    preview: WorkflowPreviewResult;
    actionResults: WorkflowActionExecutionResult[];
    error: unknown;
    actorType?: ActivityActorType;
  }): WorkflowRunResult {
    const timestamp = createIsoTimestamp(this.now());
    const message =
      input.error instanceof Error
        ? input.error.message
        : "Workflow run failed.";
    const repository = new WorkflowRepository(this.connection);
    const run = repository.createRun({
      id: this.idFactory("workflow_run"),
      workspaceId: input.workflow.workspaceId,
      workflowDefinitionId: input.workflow.id,
      status: "failed",
      previewJson: JSON.stringify(input.preview),
      actionResultsJson: JSON.stringify(input.actionResults),
      errorMessage: message,
      startedAt: timestamp,
      completedAt: timestamp
    });

    this.logWorkflowEvent({
      workflow: input.workflow,
      actorType: input.actorType ?? "local_user",
      action: ActivityAction.workflowRunFailed,
      summary: `Manual workflow "${input.workflow.name}" failed: ${message}`,
      before: null,
      after: run,
      timestamp
    });

    return {
      workflow: input.workflow,
      run,
      preview: input.preview,
      actionResults: input.actionResults
    };
  }

  private requireWorkflow(id: string): WorkflowDefinitionRecord {
    const workflow = new WorkflowRepository(this.connection).getDefinitionById(id);

    if (workflow === null) {
      throw new Error(`Workflow was not found: ${id}.`);
    }

    return workflow;
  }

  private createExecutor(): WorkflowActionExecutor {
    return new WorkflowActionExecutor({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
  }

  private logWorkflowEvent(input: {
    workflow: WorkflowDefinitionRecord;
    actorType: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: unknown;
    after: unknown;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workflow.workspaceId,
      actorType: input.actorType,
      action: input.action,
      targetType: "workflow",
      targetId: input.workflow.id,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: input.after === null ? null : JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }
}

function validateNonEmptyString(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
}

function normalizeNullableString(
  value: string | null | undefined
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
