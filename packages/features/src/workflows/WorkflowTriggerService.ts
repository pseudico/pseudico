import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type AttachmentRecord,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  AttachmentRepository,
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
  type WorkflowFileImportedTriggerFilters,
  type WorkflowItemCreatedTriggerFilters
} from "./WorkflowSchema";

export type ItemCreatedWorkflowEvent = {
  workspaceId: string;
  itemId: string;
  actorType?: ActivityActorType;
  triggerDepth?: number;
};

export type FileImportedWorkflowEvent = {
  workspaceId: string;
  itemId: string;
  attachmentId: string;
  actorType?: ActivityActorType;
  triggerDepth?: number;
};

export type TriggeredWorkflowRunResult = {
  workflow: WorkflowDefinitionRecord;
  run: WorkflowRunRecord;
  matched: boolean;
  actionResults: WorkflowActionExecutionResult[];
};

export type ItemCreatedWorkflowRunResult = TriggeredWorkflowRunResult;
export type FileImportedWorkflowRunResult = TriggeredWorkflowRunResult;

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
          triggerType: "item_created",
          triggerLabel: "item-created",
          actions: definition.actions,
          actorType: event.actorType ?? "system"
        })
      );
    }

    return results;
  }

  async handleFileImported(
    event: FileImportedWorkflowEvent
  ): Promise<FileImportedWorkflowRunResult[]> {
    validateNonEmptyString(event.workspaceId, "workspaceId");
    validateNonEmptyString(event.itemId, "itemId");
    validateNonEmptyString(event.attachmentId, "attachmentId");

    if ((event.triggerDepth ?? 0) > 0) {
      return [];
    }

    const item = new ItemRepository(this.connection).getById(event.itemId);
    if (item === null || item.workspaceId !== event.workspaceId) {
      throw new Error(`Imported file item was not found: ${event.itemId}.`);
    }

    const attachment = new AttachmentRepository(this.connection).getById(
      event.attachmentId
    );
    if (
      attachment === null ||
      attachment.workspaceId !== event.workspaceId ||
      attachment.itemId !== event.itemId
    ) {
      throw new Error(`Imported attachment was not found: ${event.attachmentId}.`);
    }

    const workflows = new WorkflowRepository(this.connection).listDefinitions({
      workspaceId: event.workspaceId,
      status: "enabled",
      triggerType: "file_imported"
    });
    const results: FileImportedWorkflowRunResult[] = [];

    for (const workflow of workflows) {
      const definition = parseWorkflowDefinitionSchema(workflow.actionsJson);
      if (definition.trigger.type !== "file_imported") {
        continue;
      }
      if (!this.matchesFileImportedFilters(item, attachment, definition.trigger.filters)) {
        continue;
      }

      results.push(
        await this.runTriggeredWorkflow({
          workflow,
          item,
          attachment,
          triggerType: "file_imported",
          triggerLabel: "file-imported",
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
    attachment?: AttachmentRecord;
    triggerType: "item_created" | "file_imported";
    triggerLabel: "item-created" | "file-imported";
    actions: WorkflowAction[];
    actorType: ActivityActorType;
  }): Promise<TriggeredWorkflowRunResult> {
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
          triggerType: input.triggerType,
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
          summary: `Ran ${input.triggerLabel} workflow "${input.workflow.name}" for ${input.item.type} "${input.item.title}".`,
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
    attachment?: AttachmentRecord;
    triggerType: "item_created" | "file_imported";
    actions: WorkflowAction[];
  }): {
    workspaceId: string;
    workflowId: string;
    triggerType: "item_created" | "file_imported";
    triggerItemId: string;
    triggerAttachmentId?: string;
    file?: {
      originalName: string;
      mimeType: string | null;
      sizeBytes: number;
      extension: string | null;
      containerId: string;
    };
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
      triggerType: input.triggerType,
      triggerItemId: input.item.id,
      ...(input.attachment === undefined
        ? {}
        : {
            triggerAttachmentId: input.attachment.id,
            file: {
              originalName: input.attachment.originalName,
              mimeType: input.attachment.mimeType,
              sizeBytes: input.attachment.sizeBytes,
              extension: getFileExtension(input.attachment.originalName),
              containerId: input.item.containerId
            }
          }),
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
    triggerType: "item_created" | "file_imported";
    triggerLabel: "item-created" | "file-imported";
  }): TriggeredWorkflowRunResult {
    const timestamp = createIsoTimestamp(this.now());
    const message =
      input.error instanceof Error
        ? input.error.message
        : "Workflow run failed.";
    const run = new WorkflowRepository(this.connection).createRun({
      id: this.idFactory("workflow_run"),
      workspaceId: input.workflow.workspaceId,
      workflowDefinitionId: input.workflow.id,
      triggerType: input.triggerType,
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
      summary: `${capitalize(input.triggerLabel)} workflow "${input.workflow.name}" failed for ${input.item.type} "${input.item.title}": ${message}`,
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

  private matchesFileImportedFilters(
    item: ItemRecord,
    attachment: AttachmentRecord,
    filters: WorkflowFileImportedTriggerFilters | undefined
  ): boolean {
    if (filters === undefined) {
      return true;
    }

    if (
      filters.containerIds !== undefined &&
      !filters.containerIds.includes(item.containerId)
    ) {
      return false;
    }

    if (filters.extensions !== undefined) {
      const extension = getFileExtension(attachment.originalName);
      if (
        extension === null ||
        !filters.extensions
          .map((value) => normalizeExtension(value))
          .includes(extension)
      ) {
        return false;
      }
    }

    if (filters.mimeTypes !== undefined) {
      const mimeType = attachment.mimeType?.toLocaleLowerCase() ?? null;
      if (
        mimeType === null ||
        !filters.mimeTypes
          .map((value) => value.trim().toLocaleLowerCase())
          .includes(mimeType)
      ) {
        return false;
      }
    }

    if (filters.nameIncludes !== undefined) {
      const needle = filters.nameIncludes.trim().toLocaleLowerCase();
      if (!attachment.originalName.toLocaleLowerCase().includes(needle)) {
        return false;
      }
    }

    if (
      filters.minSizeBytes !== undefined &&
      attachment.sizeBytes < filters.minSizeBytes
    ) {
      return false;
    }

    if (
      filters.maxSizeBytes !== undefined &&
      attachment.sizeBytes > filters.maxSizeBytes
    ) {
      return false;
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

function getFileExtension(fileName: string): string | null {
  const trimmed = fileName.trim();
  const lastSeparator = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  const baseName = trimmed.slice(lastSeparator + 1);
  const dotIndex = baseName.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === baseName.length - 1) {
    return null;
  }

  return normalizeExtension(baseName.slice(dotIndex + 1));
}

function normalizeExtension(value: string): string {
  return value.trim().replace(/^\.+/, "").toLocaleLowerCase();
}

function capitalize(value: string): string {
  return `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}`;
}

function validateNonEmptyString(value: string, name: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
}
