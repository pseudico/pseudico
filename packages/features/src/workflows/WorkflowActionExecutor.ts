import {
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  TemplateRepository,
  type DatabaseConnection
} from "@local-work-os/db";
import type { ActivityActorType } from "@local-work-os/core";
import { CategoryService } from "../metadata/CategoryService";
import { ItemService } from "../items/ItemService";
import { TagService } from "../metadata/TagService";
import { TaskService } from "../tasks/TaskService";
import { ContainerTemplateService, validateContainerTemplateJson } from "../templates/TemplateService";

import {
  summarizeWorkflowAction,
  type WorkflowAction
} from "./WorkflowSchema";
import {
  WorkflowVariableResolver,
  type WorkflowVariableInterpolation
} from "./WorkflowVariableResolver";

export type WorkflowActionPreview = {
  index: number;
  actionType: WorkflowAction["type"];
  summary: string;
  status: "ready" | "blocked" | "skipped";
  targetType: string;
  targetId: string | null;
  reason: string | null;
  interpolations: WorkflowVariableInterpolation[];
};

export type WorkflowActionExecutionContext = {
  workspaceId: string;
  actorType?: ActivityActorType;
  triggerItemId?: string;
  triggerTargetType?: string;
  triggerTargetId?: string;
  previousActionResults?: readonly WorkflowActionExecutionResult[];
};

export type WorkflowActionExecutionResult = {
  index: number;
  actionType: WorkflowAction["type"];
  status: "completed" | "skipped";
  summary: string;
  targetType: string;
  targetId: string | null;
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
    const condition = this.evaluateActionCondition(action, context);
    if (condition?.status === "blocked" || condition?.status === "skipped") {
      return {
        index,
        actionType: action.type,
        summary: condition.summary,
        status: condition.status,
        targetType: getActionTarget(action).targetType,
        targetId: getActionTarget(action).targetId,
        reason: condition.reason,
        interpolations: condition.interpolations
      };
    }

    const resolution = this.resolveAction(action, context);
    const resolvedAction = resolution.action;
    if (resolution.missing.length > 0) {
      const reason = `Workflow variables could not be resolved: ${resolution.missing.join(", ")}.`;
      return {
        index,
        actionType: resolvedAction.type,
        summary: reason,
        status: "blocked",
        targetType: getActionTarget(resolvedAction).targetType,
        targetId: getActionTarget(resolvedAction).targetId,
        reason,
        interpolations: resolution.interpolations
      };
    }
    const validation = this.validateReferences(resolvedAction, context.workspaceId, {
      allowPreviewVariables: true
    });

    return {
      index,
      actionType: resolvedAction.type,
      summary: summarizeWorkflowAction(resolvedAction),
      status: validation === null ? "ready" : "blocked",
      targetType: getActionTarget(resolvedAction).targetType,
      targetId: getActionTarget(resolvedAction).targetId,
      reason: validation,
      interpolations: resolution.interpolations
    };
  }

  async executeWorkflowAction(
    action: WorkflowAction,
    context: WorkflowActionExecutionContext,
    index = 0
  ): Promise<WorkflowActionExecutionResult> {
    const condition = this.evaluateActionCondition(action, context);
    if (condition?.status === "skipped") {
      return {
        index,
        actionType: action.type,
        status: "skipped",
        summary: condition.summary,
        targetType: getActionTarget(action).targetType,
        targetId: getActionTarget(action).targetId
      };
    }
    if (condition?.status === "blocked") {
      throw new Error(condition.reason ?? condition.summary);
    }

    const resolution = this.resolveAction(action, context);
    if (resolution.missing.length > 0) {
      throw new Error(`Workflow variables could not be resolved: ${resolution.missing.join(", ")}.`);
    }

    const actionToRun = resolution.action;
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
      case "create_container_from_template": {
        const result = await new ContainerTemplateService({
          connection: this.connection,
          idFactory: this.idFactory,
          now: this.now
        }).createContainerFromTemplate({
          workspaceId: context.workspaceId,
          templateId: actionToRun.templateId,
          ...(actionToRun.name === undefined || actionToRun.name === null
            ? {}
            : { name: actionToRun.name }),
          ...(actionToRun.baseDate === undefined || actionToRun.baseDate === null
            ? {}
            : { baseDate: actionToRun.baseDate }),
          ...(context.actorType === undefined
            ? {}
            : { actorType: context.actorType })
        });
        const container = "project" in result.container
          ? result.container.project
          : result.container.contact;

        return {
          index,
          actionType: actionToRun.type,
          status: "completed",
          summary: summarizeWorkflowAction(actionToRun),
          targetType: "container",
          targetId: container.id
        };
      }
    }
  }

  private resolveAction(
    action: WorkflowAction,
    context: WorkflowActionExecutionContext
  ) {
    return new WorkflowVariableResolver({
      connection: this.connection,
      now: this.now
    }).resolveAction(resolveTriggerItemAction(action, context), context);
  }

  private evaluateActionCondition(
    action: WorkflowAction,
    context: WorkflowActionExecutionContext
  ): {
    status: "blocked" | "skipped";
    summary: string;
    reason: string | null;
    interpolations: WorkflowVariableInterpolation[];
  } | null {
    if (action.condition === undefined) {
      return null;
    }

    const evaluation = new WorkflowVariableResolver({
      connection: this.connection,
      now: this.now
    }).evaluateCondition(action.condition, context);

    if (evaluation.missing.length > 0) {
      return {
        status: "blocked",
        summary: evaluation.summary,
        reason: evaluation.summary,
        interpolations: evaluation.interpolations
      };
    }

    if (!evaluation.matches) {
      return {
        status: "skipped",
        summary: evaluation.summary,
        reason: evaluation.summary,
        interpolations: evaluation.interpolations
      };
    }

    return null;
  }

  private validateReferences(
    action: WorkflowAction,
    workspaceId: string,
    options: { allowPreviewVariables?: boolean } = {}
  ): string | null {
    switch (action.type) {
      case "add_tag": {
        if (isPreviewVariable(action.targetId, options)) {
          return null;
        }
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
          if (isPreviewVariable(action.targetId, options)) {
            return null;
          }
          const item = new ItemRepository(this.connection).getById(action.targetId);
          if (item === null || item.workspaceId !== workspaceId) {
            return `Workflow target item was not found: ${action.targetId}.`;
          }
        } else {
          if (isPreviewVariable(action.targetId, options)) {
            return null;
          }
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
        if (!isPreviewVariable(action.itemId, options)) {
          const item = new ItemRepository(this.connection).getById(action.itemId);
          if (item === null || item.workspaceId !== workspaceId) {
            return `Workflow item to move was not found: ${action.itemId}.`;
          }
        }

        if (!isPreviewVariable(action.targetContainerId, options)) {
          const container = new ContainerRepository(this.connection).getById(
            action.targetContainerId
          );
          if (container === null || container.workspaceId !== workspaceId) {
            return `Workflow target container was not found: ${action.targetContainerId}.`;
          }
        }

        return null;
      }
      case "create_task": {
        if (!isPreviewVariable(action.containerId, options)) {
          const container = new ContainerRepository(this.connection).getById(
            action.containerId
          );
          if (container === null || container.workspaceId !== workspaceId) {
            return `Workflow task container was not found: ${action.containerId}.`;
          }
        }

        if (
          action.categoryId !== undefined &&
          action.categoryId !== null &&
          new CategoryRepository(this.connection).getById(action.categoryId) === null
        ) {
          return `Workflow task category was not found: ${action.categoryId}.`;
        }

        const dateValidation = validateCreateTaskDates(action);
        if (dateValidation !== null) {
          return dateValidation;
        }

        return null;
      }
      case "create_container_from_template": {
        const template = new TemplateRepository(this.connection).getById(action.templateId);
        if (
          template === null ||
          template.workspaceId !== workspaceId ||
          (template.kind !== "project" && template.kind !== "contact")
        ) {
          return `Workflow container template was not found: ${action.templateId}.`;
        }

        try {
          validateContainerTemplateJson(JSON.parse(template.templateJson));
        } catch {
          return `Workflow container template JSON could not be parsed: ${action.templateId}.`;
        }

        const baseDateValidation = validateCreateContainerFromTemplateBaseDate(action.baseDate);
        if (baseDateValidation !== null) {
          return baseDateValidation;
        }

        return null;
      }
    }
  }
}

export const WORKFLOW_TRIGGER_ITEM_ID_TOKEN = "$trigger.itemId";
export const WORKFLOW_TRIGGER_TARGET_ID_TOKEN = "$trigger.targetId";
export const WORKFLOW_PREVIEW_OUTPUT_PREFIX = "$preview.";

function resolveTriggerItemAction(
  action: WorkflowAction,
  context: WorkflowActionExecutionContext
): WorkflowAction {
  if (
    context.triggerItemId === undefined &&
    context.triggerTargetId === undefined
  ) {
    return action;
  }

  switch (action.type) {
    case "add_tag":
    case "set_category": {
      if (
        action.targetType === "item" &&
        action.targetId === WORKFLOW_TRIGGER_ITEM_ID_TOKEN &&
        context.triggerItemId !== undefined
      ) {
        return { ...action, targetId: context.triggerItemId };
      }

      if (
        action.targetId === WORKFLOW_TRIGGER_TARGET_ID_TOKEN &&
        context.triggerTargetId !== undefined &&
        context.triggerTargetType === action.targetType
      ) {
        return { ...action, targetId: context.triggerTargetId };
      }

      return action;
    }
    case "move_item":
      if (
        action.itemId === WORKFLOW_TRIGGER_ITEM_ID_TOKEN &&
        context.triggerItemId !== undefined
      ) {
        return { ...action, itemId: context.triggerItemId };
      }

      if (
        action.itemId === WORKFLOW_TRIGGER_TARGET_ID_TOKEN &&
        context.triggerTargetType === "item" &&
        context.triggerTargetId !== undefined
      ) {
        return { ...action, itemId: context.triggerTargetId };
      }

      return action;
    case "create_task":
    case "create_container_from_template":
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
    case "create_container_from_template":
      return { targetType: "container", targetId: null };
  }
}

function isPreviewVariable(
  value: string,
  options: { allowPreviewVariables?: boolean }
): boolean {
  return options.allowPreviewVariables === true && value.startsWith(WORKFLOW_PREVIEW_OUTPUT_PREFIX);
}

function validateCreateContainerFromTemplateBaseDate(
  value: string | null | undefined
): string | null {
  if (value === undefined || value === null || value.trim().length === 0) {
    return null;
  }

  const parsed = parseWorkflowDate(value, "baseDate");
  return typeof parsed === "string" ? parsed : null;
}

function validateCreateTaskDates(action: Extract<WorkflowAction, { type: "create_task" }>): string | null {
  const startAt = parseWorkflowDate(action.startAt, "startAt");
  if (typeof startAt === "string") {
    return startAt;
  }

  const dueAt = parseWorkflowDate(action.dueAt, "dueAt");
  if (typeof dueAt === "string") {
    return dueAt;
  }

  if (startAt !== null && dueAt !== null && startAt.getTime() > dueAt.getTime()) {
    return "Workflow task startAt must be before or equal to dueAt.";
  }

  return null;
}

function parseWorkflowDate(
  value: string | null | undefined,
  fieldName: "startAt" | "dueAt" | "baseDate"
): Date | string | null {
  if (value === undefined || value === null || value.trim().length === 0) {
    return null;
  }

  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
    ? `${value.trim()}T00:00:00.000Z`
    : value.trim();
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return fieldName === "baseDate"
      ? "Workflow template baseDate must resolve to a valid date or ISO timestamp."
      : `Workflow task ${fieldName} must resolve to a valid date or ISO timestamp.`;
  }

  return date;
}
