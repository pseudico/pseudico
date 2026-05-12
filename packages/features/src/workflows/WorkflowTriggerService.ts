import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type AttachmentRecord,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogRepository,
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
  WORKFLOW_PREVIEW_OUTPUT_PREFIX,
  WorkflowActionExecutor,
  type WorkflowActionExecutionResult,
  type WorkflowActionPreview,
  type WorkflowServiceIdFactory
} from "./WorkflowActionExecutor";
import {
  parseWorkflowDefinitionSchema,
  type WorkflowAction,
  type WorkflowFileImportedTriggerFilters,
  type WorkflowItemCreatedTriggerFilters,
  type WorkflowMetadataTriggerFilters,
  type WorkflowTrigger
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

export type TagWorkflowEvent = {
  workspaceId: string;
  targetType: "container" | "item" | "list_item";
  targetId: string;
  tagId: string;
  tagSlug: string;
  actorType?: ActivityActorType;
  triggerDepth?: number;
};

export type CategoryAssignedWorkflowEvent = {
  workspaceId: string;
  targetType: "container" | "item";
  targetId: string;
  categoryId: string | null;
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
export type MetadataWorkflowRunResult = TriggeredWorkflowRunResult;

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
          triggerTargetType: "item",
          triggerTargetId: item.id,
          triggerTargetLabel: `${item.type} "${item.title}"`,
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
          triggerTargetType: "item",
          triggerTargetId: item.id,
          triggerTargetLabel: `${item.type} "${item.title}"`,
          triggerType: "file_imported",
          triggerLabel: "file-imported",
          actions: definition.actions,
          actorType: event.actorType ?? "system"
        })
      );
    }

    return results;
  }

  async handleTagAdded(event: TagWorkflowEvent): Promise<MetadataWorkflowRunResult[]> {
    return await this.handleTagChanged("tag_added", "tag-added", event);
  }

  async handleTagRemoved(event: TagWorkflowEvent): Promise<MetadataWorkflowRunResult[]> {
    return await this.handleTagChanged("tag_removed", "tag-removed", event);
  }

  async handleCategoryAssigned(
    event: CategoryAssignedWorkflowEvent
  ): Promise<MetadataWorkflowRunResult[]> {
    validateNonEmptyString(event.workspaceId, "workspaceId");
    validateNonEmptyString(event.targetType, "targetType");
    validateNonEmptyString(event.targetId, "targetId");

    if ((event.triggerDepth ?? 0) > 0) {
      return [];
    }

    const item = this.getTriggerItem(event);
    const workflows = new WorkflowRepository(this.connection).listDefinitions({
      workspaceId: event.workspaceId,
      status: "enabled",
      triggerType: "category_assigned"
    });
    const results: MetadataWorkflowRunResult[] = [];

    for (const workflow of workflows) {
      const definition = parseWorkflowDefinitionSchema(workflow.actionsJson);
      if (definition.trigger.type !== "category_assigned") {
        continue;
      }
      if (
        !this.matchesMetadataFilters(
          event,
          definition.trigger.filters,
          { categoryId: event.categoryId }
        )
      ) {
        continue;
      }

      results.push(
        await this.runTriggeredWorkflow({
          workflow,
          ...(item === undefined ? {} : { item }),
          triggerTargetType: event.targetType,
          triggerTargetId: event.targetId,
          triggerTargetLabel: `${event.targetType} ${event.targetId}`,
          triggerType: "category_assigned",
          triggerLabel: "category-assigned",
          actions: definition.actions,
          actorType: event.actorType ?? "system"
        })
      );
    }

    return results;
  }

  private async handleTagChanged(
    triggerType: "tag_added" | "tag_removed",
    triggerLabel: "tag-added" | "tag-removed",
    event: TagWorkflowEvent
  ): Promise<MetadataWorkflowRunResult[]> {
    validateNonEmptyString(event.workspaceId, "workspaceId");
    validateNonEmptyString(event.targetType, "targetType");
    validateNonEmptyString(event.targetId, "targetId");
    validateNonEmptyString(event.tagId, "tagId");
    validateNonEmptyString(event.tagSlug, "tagSlug");

    if ((event.triggerDepth ?? 0) > 0) {
      return [];
    }

    const item = this.getTriggerItem(event);
    const workflows = new WorkflowRepository(this.connection).listDefinitions({
      workspaceId: event.workspaceId,
      status: "enabled",
      triggerType
    });
    const results: MetadataWorkflowRunResult[] = [];

    for (const workflow of workflows) {
      const definition = parseWorkflowDefinitionSchema(workflow.actionsJson);
      if (definition.trigger.type !== triggerType) {
        continue;
      }
      if (
        !this.matchesMetadataFilters(
          event,
          definition.trigger.filters,
          { tagId: event.tagId, tagSlug: event.tagSlug }
        )
      ) {
        continue;
      }

      results.push(
        await this.runTriggeredWorkflow({
          workflow,
          ...(item === undefined ? {} : { item }),
          triggerTargetType: event.targetType,
          triggerTargetId: event.targetId,
          triggerTargetLabel: `${event.targetType} ${event.targetId}`,
          triggerType,
          triggerLabel,
          actions: definition.actions,
          actorType: event.actorType ?? "system"
        })
      );
    }

    return results;
  }

  private async runTriggeredWorkflow(input: {
    workflow: WorkflowDefinitionRecord;
    item?: ItemRecord;
    attachment?: AttachmentRecord;
    triggerTargetType: string;
    triggerTargetId: string;
    triggerTargetLabel: string;
    triggerType: WorkflowTrigger["type"];
    triggerLabel:
      | "item-created"
      | "file-imported"
      | "tag-added"
      | "tag-removed"
      | "category-assigned";
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
          const beforeActivityIds = this.listWorkspaceActivityIds(input.workflow.workspaceId);
          const actionResult =
            await executor.executeWorkflowAction(
              action,
              {
                workspaceId: input.workflow.workspaceId,
                actorType: "system",
                ...(input.item === undefined ? {} : { triggerItemId: input.item.id }),
                triggerTargetType: input.triggerTargetType,
                triggerTargetId: input.triggerTargetId,
                previousActionResults: actionResults
              },
              index
            );
          actionResults.push({
            ...actionResult,
            activityIds: this.listNewWorkspaceActivityIds(
              input.workflow.workspaceId,
              beforeActivityIds
            )
          });
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
          summary: `Ran ${input.triggerLabel} workflow "${input.workflow.name}" for ${input.triggerTargetLabel}.`,
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
    item?: ItemRecord;
    attachment?: AttachmentRecord;
    triggerTargetType: string;
    triggerTargetId: string;
    triggerType: WorkflowTrigger["type"];
    actions: WorkflowAction[];
  }): {
    workspaceId: string;
    workflowId: string;
    triggerType: WorkflowTrigger["type"];
    triggerTargetType: string;
    triggerTargetId: string;
    triggerItemId?: string;
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
    const actionPreviews: WorkflowActionPreview[] = [];
    const previewResults: WorkflowActionExecutionResult[] = [];
    for (const [index, action] of input.actions.entries()) {
      const preview = executor.previewWorkflowAction(
        action,
        {
          workspaceId: input.workflow.workspaceId,
          actorType: "system",
          ...(input.item === undefined ? {} : { triggerItemId: input.item.id }),
          triggerTargetType: input.triggerTargetType,
          triggerTargetId: input.triggerTargetId,
          previousActionResults: previewResults
        },
        index
      );
      actionPreviews.push(preview);
      if (preview.status === "ready") {
        previewResults.push({
          index,
          actionType: preview.actionType,
          status: "completed",
          summary: preview.summary,
          targetType: preview.targetType,
          targetId:
            preview.targetId ??
            `${WORKFLOW_PREVIEW_OUTPUT_PREFIX}actions.${index}.targetId`
        });
      } else if (preview.status === "skipped") {
        previewResults.push({
          index,
          actionType: preview.actionType,
          status: "skipped",
          summary: preview.summary,
          targetType: preview.targetType,
          targetId: preview.targetId
        });
      }
    }

    return {
      workspaceId: input.workflow.workspaceId,
      workflowId: input.workflow.id,
      triggerType: input.triggerType,
      triggerTargetType: input.triggerTargetType,
      triggerTargetId: input.triggerTargetId,
      ...(input.item === undefined ? {} : { triggerItemId: input.item.id }),
      ...(input.attachment === undefined
        ? {}
        : {
            triggerAttachmentId: input.attachment.id,
            file: {
              originalName: input.attachment.originalName,
              mimeType: input.attachment.mimeType,
              sizeBytes: input.attachment.sizeBytes,
              extension: getFileExtension(input.attachment.originalName),
              containerId: input.item?.containerId ?? input.triggerTargetId
            }
          }),
      canRun: actionPreviews.every((preview) => preview.status !== "blocked"),
      actionPreviews
    };
  }

  private recordFailedRun(input: {
    workflow: WorkflowDefinitionRecord;
    item?: ItemRecord;
    preview: unknown;
    actionResults: WorkflowActionExecutionResult[];
    error: unknown;
    triggerTargetLabel: string;
    triggerType: WorkflowTrigger["type"];
    triggerLabel:
      | "item-created"
      | "file-imported"
      | "tag-added"
      | "tag-removed"
      | "category-assigned";
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
      summary: `${capitalize(input.triggerLabel)} workflow "${input.workflow.name}" failed for ${input.triggerTargetLabel}: ${message}`,
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

  private listWorkspaceActivityIds(workspaceId: string): Set<string> {
    return new Set(
      new ActivityLogRepository(this.connection)
        .listRecent(workspaceId, 250)
        .map((event) => event.id)
    );
  }

  private listNewWorkspaceActivityIds(
    workspaceId: string,
    beforeActivityIds: Set<string>
  ): string[] {
    return new ActivityLogRepository(this.connection)
      .listRecent(workspaceId, 250)
      .filter((event) => !beforeActivityIds.has(event.id))
      .sort((left, right) =>
        left.createdAt === right.createdAt
          ? left.id.localeCompare(right.id)
          : left.createdAt.localeCompare(right.createdAt)
      )
      .map((event) => event.id);
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

  private matchesMetadataFilters(
    event: {
      targetType: string;
      targetId: string;
    },
    filters: WorkflowMetadataTriggerFilters | undefined,
    metadata: {
      tagId?: string;
      tagSlug?: string;
      categoryId?: string | null;
    }
  ): boolean {
    if (filters === undefined) {
      return true;
    }

    if (
      filters.targetTypes !== undefined &&
      !filters.targetTypes.includes(event.targetType)
    ) {
      return false;
    }

    if (
      filters.targetIds !== undefined &&
      !filters.targetIds.includes(event.targetId)
    ) {
      return false;
    }

    if (
      filters.tagIds !== undefined &&
      (metadata.tagId === undefined || !filters.tagIds.includes(metadata.tagId))
    ) {
      return false;
    }

    if (
      filters.tagSlugs !== undefined &&
      (metadata.tagSlug === undefined || !filters.tagSlugs.includes(metadata.tagSlug))
    ) {
      return false;
    }

    if (
      filters.categoryIds !== undefined &&
      (metadata.categoryId === undefined ||
        metadata.categoryId === null ||
        !filters.categoryIds.includes(metadata.categoryId))
    ) {
      return false;
    }

    return true;
  }

  private getTriggerItem(event: {
    workspaceId: string;
    targetType: string;
    targetId: string;
  }): ItemRecord | undefined {
    if (event.targetType !== "item") {
      return undefined;
    }

    const item = new ItemRepository(this.connection).getById(event.targetId);
    if (item === null || item.workspaceId !== event.workspaceId) {
      throw new Error(`Workflow trigger item was not found: ${event.targetId}.`);
    }

    return item;
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
