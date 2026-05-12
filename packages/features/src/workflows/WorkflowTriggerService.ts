import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ItemRepository,
  TagRepository,
  TransactionService,
  WorkflowRepository,
  type DatabaseConnection,
  type ItemRecord,
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
  parseWorkflowDefinitionSchema,
  type WorkflowAction,
  type WorkflowItemCreatedTriggerFilters
} from "./WorkflowSchema";

export type ItemCreatedWorkflowEvent = {
  workspaceId: string;
  itemId: string;
  actorType?: ActivityActorType;
  triggerDepth?: number;
};

export type ItemCreatedWorkflowRunResult = {
  workflow: WorkflowDefinitionRecord;
  run: WorkflowRunRecord;
  matched: boolean;
  actionResults: WorkflowActionExecutionResult[];
};

export class WorkflowTriggerService {
  readonly module = "workflow-triggers";

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
    this.transactionService = new TransactionService({ connection: input.connection });
  }

  async handleItemCreated(
    event: ItemCreatedWorkflowEvent
  ): Promise<ItemCreatedWorkflowRunResult[]> {
    validateNonEmptyString(event.workspaceId, "workspaceId");
    validateNonEmptyString(event.itemId, "itemId");

    if ((event.triggerDepth ?? 0) > 0) {
      return [];
    }

    const item = new ItemRepository(this.connection).getById(event.itemId);
    if (item === null || item.workspaceId !== event.workspaceId) {
      throw new Error(`Created item was not found: ${event.itemId}.`);
    }

    const workflows = new WorkflowRepository(this.connection).listDefinitions({
      workspaceId: event.workspaceId,
      status: "enabled",
      triggerType: "item_created"
    });
    const results: ItemCreatedWorkflowRunResult[] = [];

    for (const workflow of workflows) {
      const definition = parseWorkflowDefinitionSchema(workflow.actionsJson);
      if (definition.trigger.type !== "item_created") {
        continue;
      }
      if (!this.matchesItemCreatedFilters(item, definition.trigger.filters)) {
        continue;
      }

      results.push(
        await this.runTriggeredWorkflow({
          workflow,
          item,
          actions: definition.actions,
          actorType: event.actorType ?? "system"
        })
      );
    }

    return results;
  }

  private async runTriggeredWorkflow(input: {
    workflow: WorkflowDefinitionRecord;
    item: ItemRecord;
    actions: WorkflowAction[];
    actorType: ActivityActorType;
  }): Promise<ItemCreatedWorkflowRunResult> {
    const preview = this.previewTriggeredWorkflow(input);

    if (!preview.canRun) {
      return this.recordFailedRun({
        ...input,
        preview,
        actionResults: [],
        error: new Error("Workflow preview has blocked actions.")
      });
    }

    try {
      return await this.transactionService.runInTransaction(async () => {
        const repository = new WorkflowRepository(this.connection);
        const timestamp = createIsoTimestamp(this.now());
        const run = repository.createRun({
          id: this.idFactory("workflow_run"),
          workspaceId: input.workflow.workspaceId,
          workflowDefinitionId: input.workflow.id,
          triggerType: "item_created",
          status: "running",
          previewJson: JSON.stringify(preview),
          startedAt: timestamp
        });
        const executor = new WorkflowActionExecutor({
          connection: this.connection,
          idFactory: this.idFactory,
          now: this.now
        });
        const actionResults: WorkflowActionExecutionResult[] = [];

        for (const [index, action] of input.actions.entries()) {
          actionResults.push(
            await executor.executeWorkflowAction(
              action,
              {
                workspaceId: input.workflow.workspaceId,
                actorType: "system",
                triggerItemId: input.item.id
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
          workflow: input.workflow,
          action: ActivityAction.workflowRunCompleted,
          summary: `Ran item-created workflow "${input.workflow.name}" for ${input.item.type} "${input.item.title}".`,
          before: run,
          after: completedRun,
          timestamp: completedAt
        });

        return {
          workflow: input.workflow,
          run: completedRun,
          matched: true,
          actionResults
        };
      });
    } catch (error) {
      return this.recordFailedRun({
        ...input,
        preview,
        actionResults: [],
        error
      });
    }
  }

  private previewTriggeredWorkflow(input: {
    workflow: WorkflowDefinitionRecord;
    item: ItemRecord;
    actions: WorkflowAction[];
  }): {
    workspaceId: string;
    workflowId: string;
    triggerType: "item_created";
    triggerItemId: string;
    canRun: boolean;
    actionPreviews: WorkflowActionPreview[];
  } {
    const executor = new WorkflowActionExecutor({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });
    const actionPreviews = input.actions.map((action, index) =>
      executor.previewWorkflowAction(
        action,
        {
          workspaceId: input.workflow.workspaceId,
          actorType: "system",
          triggerItemId: input.item.id
        },
        index
      )
    );

    return {
      workspaceId: input.workflow.workspaceId,
      workflowId: input.workflow.id,
      triggerType: "item_created",
      triggerItemId: input.item.id,
      canRun: actionPreviews.every((preview) => preview.status === "ready"),
      actionPreviews
    };
  }

  private recordFailedRun(input: {
    workflow: WorkflowDefinitionRecord;
    item: ItemRecord;
    preview: unknown;
    actionResults: WorkflowActionExecutionResult[];
    error: unknown;
  }): ItemCreatedWorkflowRunResult {
    const timestamp = createIsoTimestamp(this.now());
    const message =
      input.error instanceof Error
        ? input.error.message
        : "Workflow run failed.";
    const run = new WorkflowRepository(this.connection).createRun({
      id: this.idFactory("workflow_run"),
      workspaceId: input.workflow.workspaceId,
      workflowDefinitionId: input.workflow.id,
      triggerType: "item_created",
      status: "failed",
      previewJson: JSON.stringify(input.preview),
      actionResultsJson: JSON.stringify(input.actionResults),
      errorMessage: message,
      startedAt: timestamp,
      completedAt: timestamp
    });

    this.logWorkflowEvent({
      workflow: input.workflow,
      action: ActivityAction.workflowRunFailed,
      summary: `Item-created workflow "${input.workflow.name}" failed for ${input.item.type} "${input.item.title}": ${message}`,
      before: null,
      after: run,
      timestamp
    });

    return {
      workflow: input.workflow,
      run,
      matched: true,
      actionResults: input.actionResults
    };
  }

  private matchesItemCreatedFilters(
    item: ItemRecord,
    filters: WorkflowItemCreatedTriggerFilters | undefined
  ): boolean {
    if (filters === undefined) {
      return true;
    }

    if (filters.itemTypes !== undefined && !filters.itemTypes.includes(item.type)) {
      return false;
    }

    if (
      filters.containerIds !== undefined &&
      !filters.containerIds.includes(item.containerId)
    ) {
      return false;
    }

    if (
      filters.categoryIds !== undefined &&
      (item.categoryId === null || !filters.categoryIds.includes(item.categoryId))
    ) {
      return false;
    }

    if (filters.textIncludes !== undefined) {
      const haystack = `${item.title}\n${item.body ?? ""}`.toLocaleLowerCase();
      if (!haystack.includes(filters.textIncludes.toLocaleLowerCase())) {
        return false;
      }
    }

    if (filters.tagSlugs !== undefined) {
      const itemTagSlugs = new Set(
        new TagRepository(this.connection)
          .listTagsForTarget({
            workspaceId: item.workspaceId,
            targetType: "item",
            targetId: item.id
          })
          .map((tag) => tag.slug)
      );
      if (!filters.tagSlugs.every((slug) => itemTagSlugs.has(slug))) {
        return false;
      }
    }

    return true;
  }

  private logWorkflowEvent(input: {
    workflow: WorkflowDefinitionRecord;
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
      actorType: "system",
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
