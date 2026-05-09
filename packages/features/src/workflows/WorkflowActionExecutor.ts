import {
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  type DatabaseConnection
} from "@local-work-os/db";
import type { ActivityActorType } from "@local-work-os/core";
import { CategoryService } from "../metadata/CategoryService";
import { ItemService } from "../items/ItemService";
import { TagService } from "../metadata/TagService";
import { TaskService } from "../tasks/TaskService";

export type WorkflowAction =
  | {
      type: "add_tag";
      targetType: "item";
      targetId: string;
      tagName: string;
    }
  | {
      type: "set_category";
      targetType: "item" | "container";
      targetId: string;
      categoryId: string | null;
    }
  | {
      type: "move_item";
      itemId: string;
      targetContainerId: string;
      targetContainerTabId?: string | null;
    }
  | {
      type: "create_task";
      containerId: string;
      title: string;
      body?: string | null;
      categoryId?: string | null;
      containerTabId?: string | null;
      dueAt?: string | null;
      startAt?: string | null;
      priority?: number | null;
    };

export type WorkflowActionPreview = {
  index: number;
  actionType: WorkflowAction["type"];
  summary: string;
  status: "ready" | "blocked";
  targetType: string;
  targetId: string | null;
  reason: string | null;
};

export type WorkflowActionExecutionContext = {
  workspaceId: string;
  actorType?: ActivityActorType;
};

export type WorkflowActionExecutionResult = {
  index: number;
  actionType: WorkflowAction["type"];
  status: "completed";
  summary: string;
  targetType: string;
  targetId: string;
};

export type WorkflowServiceIdFactory = (prefix: string) => string;

export class WorkflowActionExecutor {
  private readonly connection: DatabaseConnection;
  private readonly idFactory: WorkflowServiceIdFactory;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory: WorkflowServiceIdFactory;
    now: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory;
    this.now = input.now;
  }

  previewWorkflowAction(
    action: WorkflowAction,
    context: WorkflowActionExecutionContext,
    index: number
  ): WorkflowActionPreview {
    const validation = this.validateReferences(action, context.workspaceId);

    return {
      index,
      actionType: action.type,
      summary: summarizeAction(action),
      status: validation === null ? "ready" : "blocked",
      targetType: getActionTarget(action).targetType,
      targetId: getActionTarget(action).targetId,
      reason: validation
    };
  }

  async executeWorkflowAction(
    action: WorkflowAction,
    context: WorkflowActionExecutionContext,
    index = 0
  ): Promise<WorkflowActionExecutionResult> {
    const validation = this.validateReferences(action, context.workspaceId);

    if (validation !== null) {
      throw new Error(validation);
    }

    switch (action.type) {
      case "add_tag": {
        await new TagService({
          connection: this.connection,
          idFactory: this.idFactory,
          now: this.now
        }).addTagToTarget({
          workspaceId: context.workspaceId,
          targetType: action.targetType,
          targetId: action.targetId,
          name: action.tagName,
          source: "manual",
          ...(context.actorType === undefined
            ? {}
            : { actorType: context.actorType })
        });

        return {
          index,
          actionType: action.type,
          status: "completed",
          summary: summarizeAction(action),
          targetType: action.targetType,
          targetId: action.targetId
        };
      }
      case "set_category": {
        const service = new CategoryService({
          connection: this.connection,
          idFactory: this.idFactory,
          now: this.now
        });

        if (action.targetType === "item") {
          await service.assignCategoryToItem({
            workspaceId: context.workspaceId,
            itemId: action.targetId,
            categoryId: action.categoryId,
            ...(context.actorType === undefined
              ? {}
              : { actorType: context.actorType })
          });
        } else {
          await service.assignCategoryToContainer({
            workspaceId: context.workspaceId,
            containerId: action.targetId,
            categoryId: action.categoryId,
            ...(context.actorType === undefined
              ? {}
              : { actorType: context.actorType })
          });
        }

        return {
          index,
          actionType: action.type,
          status: "completed",
          summary: summarizeAction(action),
          targetType: action.targetType,
          targetId: action.targetId
        };
      }
      case "move_item": {
        const result = await new ItemService({
          connection: this.connection,
          idFactory: this.idFactory,
          now: this.now
        }).moveItem({
          itemId: action.itemId,
          targetContainerId: action.targetContainerId,
          targetContainerTabId: action.targetContainerTabId ?? null,
          ...(context.actorType === undefined
            ? {}
            : { actorType: context.actorType })
        });

        return {
          index,
          actionType: action.type,
          status: "completed",
          summary: summarizeAction(action),
          targetType: "item",
          targetId: result.item.id
        };
      }
      case "create_task": {
        const result = await new TaskService({
          connection: this.connection,
          idFactory: this.idFactory,
          now: this.now
        }).createTask({
          workspaceId: context.workspaceId,
          containerId: action.containerId,
          title: action.title,
          body: action.body ?? null,
          categoryId: action.categoryId ?? null,
          containerTabId: action.containerTabId ?? null,
          dueAt: action.dueAt ?? null,
          startAt: action.startAt ?? null,
          priority: action.priority ?? null,
          ...(context.actorType === undefined
            ? {}
            : { actorType: context.actorType })
        });

        return {
          index,
          actionType: action.type,
          status: "completed",
          summary: summarizeAction(action),
          targetType: "item",
          targetId: result.item.id
        };
      }
    }
  }

  private validateReferences(
    action: WorkflowAction,
    workspaceId: string
  ): string | null {
    switch (action.type) {
      case "add_tag": {
        if (new ItemRepository(this.connection).getById(action.targetId) === null) {
          return `Workflow action ${action.type} target item was not found: ${action.targetId}.`;
        }
        return null;
      }
      case "set_category": {
        if (
          action.categoryId !== null &&
          new CategoryRepository(this.connection).getById(action.categoryId) === null
        ) {
          return `Workflow category was not found: ${action.categoryId}.`;
        }

        if (action.targetType === "item") {
          const item = new ItemRepository(this.connection).getById(action.targetId);
          if (item === null || item.workspaceId !== workspaceId) {
            return `Workflow target item was not found: ${action.targetId}.`;
          }
        } else {
          const container = new ContainerRepository(this.connection).getById(
            action.targetId
          );
          if (container === null || container.workspaceId !== workspaceId) {
            return `Workflow target container was not found: ${action.targetId}.`;
          }
        }

        return null;
      }
      case "move_item": {
        const item = new ItemRepository(this.connection).getById(action.itemId);
        if (item === null || item.workspaceId !== workspaceId) {
          return `Workflow item to move was not found: ${action.itemId}.`;
        }

        const container = new ContainerRepository(this.connection).getById(
          action.targetContainerId
        );
        if (container === null || container.workspaceId !== workspaceId) {
          return `Workflow target container was not found: ${action.targetContainerId}.`;
        }

        return null;
      }
      case "create_task": {
        const container = new ContainerRepository(this.connection).getById(
          action.containerId
        );
        if (container === null || container.workspaceId !== workspaceId) {
          return `Workflow task container was not found: ${action.containerId}.`;
        }

        if (
          action.categoryId !== undefined &&
          action.categoryId !== null &&
          new CategoryRepository(this.connection).getById(action.categoryId) === null
        ) {
          return `Workflow task category was not found: ${action.categoryId}.`;
        }

        return null;
      }
    }
  }
}

export function isWorkflowAction(value: unknown): value is WorkflowAction {
  if (!isRecord(value) || typeof value.type !== "string") {
    return false;
  }

  switch (value.type) {
    case "add_tag":
      return (
        value.targetType === "item" &&
        isNonEmptyString(value.targetId) &&
        isNonEmptyString(value.tagName)
      );
    case "set_category":
      return (
        (value.targetType === "item" || value.targetType === "container") &&
        isNonEmptyString(value.targetId) &&
        (value.categoryId === null || isNonEmptyString(value.categoryId))
      );
    case "move_item":
      return (
        isNonEmptyString(value.itemId) &&
        isNonEmptyString(value.targetContainerId) &&
        (value.targetContainerTabId === undefined ||
          value.targetContainerTabId === null ||
          isNonEmptyString(value.targetContainerTabId))
      );
    case "create_task":
      return isNonEmptyString(value.containerId) && isNonEmptyString(value.title);
    default:
      return false;
  }
}

export function parseWorkflowActions(actionsJson: string): WorkflowAction[] {
  const parsed = JSON.parse(actionsJson) as unknown;

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Workflow actions must be a non-empty array.");
  }

  if (!parsed.every(isWorkflowAction)) {
    throw new Error("Workflow actions contain unsupported or invalid actions.");
  }

  return parsed;
}

export function stringifyWorkflowActions(actions: readonly WorkflowAction[]): string {
  if (actions.length === 0) {
    throw new Error("Workflow actions must include at least one action.");
  }

  if (!actions.every(isWorkflowAction)) {
    throw new Error("Workflow actions contain unsupported or invalid actions.");
  }

  return JSON.stringify(actions);
}

function summarizeAction(action: WorkflowAction): string {
  switch (action.type) {
    case "add_tag":
      return `Add tag "${action.tagName}" to item ${action.targetId}.`;
    case "set_category":
      return action.categoryId === null
        ? `Clear category from ${action.targetType} ${action.targetId}.`
        : `Set category ${action.categoryId} on ${action.targetType} ${action.targetId}.`;
    case "move_item":
      return `Move item ${action.itemId} to container ${action.targetContainerId}.`;
    case "create_task":
      return `Create task "${action.title}" in container ${action.containerId}.`;
  }
}

function getActionTarget(action: WorkflowAction): {
  targetType: string;
  targetId: string | null;
} {
  switch (action.type) {
    case "add_tag":
    case "set_category":
      return { targetType: action.targetType, targetId: action.targetId };
    case "move_item":
      return { targetType: "item", targetId: action.itemId };
    case "create_task":
      return { targetType: "item", targetId: null };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
