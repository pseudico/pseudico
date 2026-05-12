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
      summary: summarizeWorkflowAction(action),
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
          summary: summarizeWorkflowAction(action),
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
          summary: summarizeWorkflowAction(action),
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
          summary: summarizeWorkflowAction(action),
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
          summary: summarizeWorkflowAction(action),
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
