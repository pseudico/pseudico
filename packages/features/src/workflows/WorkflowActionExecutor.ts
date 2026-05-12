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

import {
  summarizeWorkflowAction,
  type WorkflowAction
} from "./WorkflowSchema";

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
  triggerItemId?: string;
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
    const resolvedAction = resolveTriggerItemAction(action, context);
    const validation = this.validateReferences(resolvedAction, context.workspaceId);

    return {
      index,
      actionType: resolvedAction.type,
      summary: summarizeWorkflowAction(resolvedAction),
      status: validation === null ? "ready" : "blocked",
      targetType: getActionTarget(resolvedAction).targetType,
      targetId: getActionTarget(resolvedAction).targetId,
      reason: validation
    };
  }

  async executeWorkflowAction(
    action: WorkflowAction,
    context: WorkflowActionExecutionContext,
    index = 0
  ): Promise<WorkflowActionExecutionResult> {
    const actionToRun = resolveTriggerItemAction(action, context);
    const validation = this.validateReferences(actionToRun, context.workspaceId);

    if (validation !== null) {
      throw new Error(validation);
    }

    switch (actionToRun.type) {
      case "add_tag": {
        await new TagService({
          connection: this.connection,
          idFactory: this.idFactory,
          now: this.now
        }).addTagToTarget({
          workspaceId: context.workspaceId,
          targetType: actionToRun.targetType,
          targetId: actionToRun.targetId,
          name: actionToRun.tagName,
          source: "manual",
          ...(context.actorType === undefined
            ? {}
            : { actorType: context.actorType })
        });

        return {
          index,
          actionType: actionToRun.type,
          status: "completed",
          summary: summarizeWorkflowAction(actionToRun),
          targetType: actionToRun.targetType,
          targetId: actionToRun.targetId
        };
      }
      case "set_category": {
        const service = new CategoryService({
          connection: this.connection,
          idFactory: this.idFactory,
          now: this.now
        });

        if (actionToRun.targetType === "item") {
          await service.assignCategoryToItem({
            workspaceId: context.workspaceId,
            itemId: actionToRun.targetId,
            categoryId: actionToRun.categoryId,
            ...(context.actorType === undefined
              ? {}
              : { actorType: context.actorType })
          });
        } else {
          await service.assignCategoryToContainer({
            workspaceId: context.workspaceId,
            containerId: actionToRun.targetId,
            categoryId: actionToRun.categoryId,
            ...(context.actorType === undefined
              ? {}
              : { actorType: context.actorType })
          });
        }

        return {
          index,
          actionType: actionToRun.type,
          status: "completed",
          summary: summarizeWorkflowAction(actionToRun),
          targetType: actionToRun.targetType,
          targetId: actionToRun.targetId
        };
      }
      case "move_item": {
        const result = await new ItemService({
          connection: this.connection,
          idFactory: this.idFactory,
          now: this.now
        }).moveItem({
          itemId: actionToRun.itemId,
          targetContainerId: actionToRun.targetContainerId,
          targetContainerTabId: actionToRun.targetContainerTabId ?? null,
          ...(context.actorType === undefined
            ? {}
            : { actorType: context.actorType })
        });

        return {
          index,
          actionType: actionToRun.type,
          status: "completed",
          summary: summarizeWorkflowAction(actionToRun),
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
          containerId: actionToRun.containerId,
          title: actionToRun.title,
          body: actionToRun.body ?? null,
          categoryId: actionToRun.categoryId ?? null,
          containerTabId: actionToRun.containerTabId ?? null,
          dueAt: actionToRun.dueAt ?? null,
          startAt: actionToRun.startAt ?? null,
          priority: actionToRun.priority ?? null,
          ...(context.actorType === undefined
            ? {}
            : { actorType: context.actorType })
        });

        return {
          index,
          actionType: actionToRun.type,
          status: "completed",
          summary: summarizeWorkflowAction(actionToRun),
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

export const WORKFLOW_TRIGGER_ITEM_ID_TOKEN = "$trigger.itemId";

function resolveTriggerItemAction(
  action: WorkflowAction,
  context: WorkflowActionExecutionContext
): WorkflowAction {
  if (context.triggerItemId === undefined) {
    return action;
  }

  switch (action.type) {
    case "add_tag":
    case "set_category":
      return action.targetType === "item" && action.targetId === WORKFLOW_TRIGGER_ITEM_ID_TOKEN
        ? { ...action, targetId: context.triggerItemId }
        : action;
    case "move_item":
      return action.itemId === WORKFLOW_TRIGGER_ITEM_ID_TOKEN
        ? { ...action, itemId: context.triggerItemId }
        : action;
    case "create_task":
      return action;
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
