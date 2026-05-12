import {
  ContainerRepository,
  ItemRepository,
  ListRepository,
  TaskRepository,
  type ContainerRecord,
  type DatabaseConnection,
  type ItemRecord,
  type ListItemRecord,
  type TaskRecord
} from "@local-work-os/db";
import {
  isDateExpressionCandidate,
  resolveDateExpression
} from "@local-work-os/core";
import type {
  WorkflowAction,
  WorkflowActionCondition
} from "./WorkflowSchema";

type WorkflowResultLike = {
  index: number;
  actionType: string;
  status: string;
  summary: string;
  targetType?: string;
  targetId?: string | null;
};

export type WorkflowVariableResolutionContext = {
  workspaceId: string;
  triggerItemId?: string;
  triggerTargetType?: string;
  triggerTargetId?: string;
  previousActionResults?: readonly WorkflowResultLike[];
};

export type WorkflowVariableInterpolation = {
  token: string;
  path: string;
  value: string | null;
};

export type WorkflowStringResolution = {
  value: string;
  interpolations: WorkflowVariableInterpolation[];
  missing: string[];
};

export type WorkflowActionResolution = {
  action: WorkflowAction;
  interpolations: WorkflowVariableInterpolation[];
  missing: string[];
};

export type WorkflowConditionEvaluation = {
  matches: boolean;
  summary: string;
  interpolations: WorkflowVariableInterpolation[];
  missing: string[];
};

const VARIABLE_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export class WorkflowVariableResolver {
  private readonly connection: DatabaseConnection;
  private readonly now: () => Date;

  constructor(input: {
    connection: DatabaseConnection;
    now: () => Date;
  }) {
    this.connection = input.connection;
    this.now = input.now;
  }

  resolveAction(
    action: WorkflowAction,
    context: WorkflowVariableResolutionContext
  ): WorkflowActionResolution {
    const interpolations: WorkflowVariableInterpolation[] = [];
    const missing: string[] = [];
    const resolve = (value: string): string => {
      const result = this.resolveString(value, context);
      interpolations.push(...result.interpolations);
      missing.push(...result.missing);
      return result.value;
    };
    const resolveNullable = (value: string | null | undefined): string | null | undefined => {
      if (value === undefined || value === null) {
        return value;
      }
      return resolve(value);
    };

    switch (action.type) {
      case "add_tag":
        return {
          action: {
            ...action,
            targetId: resolve(action.targetId),
            tagName: resolve(action.tagName)
          },
          interpolations,
          missing
        };
      case "set_category":
        return {
          action: {
            ...action,
            targetId: resolve(action.targetId),
            categoryId: resolveNullable(action.categoryId) ?? null
          },
          interpolations,
          missing
        };
      case "move_item":
        return {
          action: withOptionalString(
            {
              ...action,
              itemId: resolve(action.itemId),
              targetContainerId: resolve(action.targetContainerId)
            },
            "targetContainerTabId",
            resolveNullable(action.targetContainerTabId)
          ),
          interpolations,
          missing
        };
      case "create_task":
        return {
          action: withOptionalStrings(
            {
              ...action,
              containerId: resolve(action.containerId),
              title: resolve(action.title)
            },
            {
              body: resolveNullable(action.body),
              categoryId: resolveNullable(action.categoryId),
              containerTabId: resolveNullable(action.containerTabId),
              dueAt: resolveNullable(action.dueAt),
              startAt: resolveNullable(action.startAt)
            }
          ),
          interpolations,
          missing
        };
      case "update_task":
        return {
          action: withOptionalStrings(
            {
              ...action,
              itemId: resolve(action.itemId)
            },
            {
              title: resolveNullable(action.title),
              body: resolveNullable(action.body),
              categoryId: resolveNullable(action.categoryId),
              containerTabId: resolveNullable(action.containerTabId),
              dueAt: resolveNullable(action.dueAt),
              startAt: resolveNullable(action.startAt),
              status: resolveNullable(action.status)
            }
          ),
          interpolations,
          missing
        };
      case "create_list":
        return {
          action: withOptionalStrings(
            {
              ...action,
              containerId: resolve(action.containerId),
              title: resolve(action.title)
            },
            {
              body: resolveNullable(action.body),
              categoryId: resolveNullable(action.categoryId),
              containerTabId: resolveNullable(action.containerTabId),
              displayMode: resolveNullable(action.displayMode),
              progressMode: resolveNullable(action.progressMode)
            }
          ),
          interpolations,
          missing
        };
      case "update_list":
        return {
          action: withOptionalStrings(
            {
              ...action,
              listId: resolve(action.listId)
            },
            {
              title: resolveNullable(action.title),
              body: resolveNullable(action.body),
              categoryId: resolveNullable(action.categoryId),
              containerTabId: resolveNullable(action.containerTabId),
              displayMode: resolveNullable(action.displayMode),
              progressMode: resolveNullable(action.progressMode)
            }
          ),
          interpolations,
          missing
        };
      case "add_list_item":
        return {
          action: withOptionalStrings(
            {
              ...action,
              listId: resolve(action.listId),
              title: resolve(action.title)
            },
            {
              body: resolveNullable(action.body),
              status: resolveNullable(action.status),
              listItemParentId: resolveNullable(action.listItemParentId),
              startAt: resolveNullable(action.startAt),
              dueAt: resolveNullable(action.dueAt)
            }
          ),
          interpolations,
          missing
        };
      case "update_list_item":
        return {
          action: withOptionalStrings(
            {
              ...action,
              listItemId: resolve(action.listItemId)
            },
            {
              title: resolveNullable(action.title),
              body: resolveNullable(action.body),
              status: resolveNullable(action.status),
              listItemParentId: resolveNullable(action.listItemParentId),
              startAt: resolveNullable(action.startAt),
              dueAt: resolveNullable(action.dueAt)
            }
          ),
          interpolations,
          missing
        };
      case "create_note":
        return {
          action: withOptionalStrings(
            {
              ...action,
              containerId: resolve(action.containerId),
              title: resolve(action.title),
              content: resolve(action.content)
            },
            {
              categoryId: resolveNullable(action.categoryId),
              containerTabId: resolveNullable(action.containerTabId),
              format: resolveNullable(action.format)
            }
          ),
          interpolations,
          missing
        };
      case "update_note":
        return {
          action: withOptionalStrings(
            {
              ...action,
              noteId: resolve(action.noteId)
            },
            {
              title: resolveNullable(action.title),
              content: resolveNullable(action.content),
              categoryId: resolveNullable(action.categoryId),
              containerTabId: resolveNullable(action.containerTabId)
            }
          ),
          interpolations,
          missing
        };
      case "create_container_from_template":
        return {
          action: withOptionalStrings(
            {
              ...action,
              templateId: resolve(action.templateId)
            },
            {
              name: resolveNullable(action.name),
              baseDate: resolveNullable(action.baseDate)
            }
          ),
          interpolations,
          missing
        };
    }
  }

  evaluateCondition(
    condition: WorkflowActionCondition,
    context: WorkflowVariableResolutionContext
  ): WorkflowConditionEvaluation {
    const left = this.resolveString(condition.left, context);
    const right =
      condition.right === undefined
        ? {
            value: "",
            interpolations: [] as WorkflowVariableInterpolation[],
            missing: [] as string[]
          }
        : this.resolveString(condition.right, context);
    const interpolations = [...left.interpolations, ...right.interpolations];
    const missing = [...left.missing, ...right.missing];

    if (missing.length > 0) {
      return {
        matches: false,
        summary: `Condition could not resolve ${missing.join(", ")}.`,
        interpolations,
        missing
      };
    }

    const leftValue = left.value;
    const rightValue = right.value;
    const matches =
      condition.op === "exists"
        ? leftValue.trim().length > 0
        : condition.op === "not_exists"
          ? leftValue.trim().length === 0
          : condition.op === "eq"
            ? leftValue === rightValue
            : condition.op === "not_eq"
              ? leftValue !== rightValue
              : leftValue.includes(rightValue);

    return {
      matches,
      summary: `Condition ${matches ? "matched" : "did not match"}: ${leftValue} ${condition.op} ${rightValue}.`,
      interpolations,
      missing
    };
  }

  resolveString(
    template: string,
    context: WorkflowVariableResolutionContext
  ): WorkflowStringResolution {
    const interpolations: WorkflowVariableInterpolation[] = [];
    const missing: string[] = [];
    const value = template.replace(VARIABLE_PATTERN, (token, path: string) => {
      const variableValue = this.resolveVariable(path, context);
      interpolations.push({
        token,
        path,
        value: variableValue
      });
      if (variableValue === null) {
        missing.push(path);
        return token;
      }
      return variableValue;
    });

    return {
      value,
      interpolations,
      missing: [...new Set(missing)]
    };
  }

  private resolveVariable(
    path: string,
    context: WorkflowVariableResolutionContext
  ): string | null {
    if (isDateExpressionCandidate(path)) {
      return this.resolveDateExpressionVariable(path, context);
    }
    if (path === "today") {
      return formatLocalDate(this.now());
    }
    if (path === "now") {
      return this.now().toISOString();
    }
    if (path === "trigger.itemId") {
      return context.triggerItemId ?? null;
    }
    if (path === "trigger.targetId") {
      return context.triggerTargetId ?? null;
    }
    if (path === "trigger.targetType") {
      return context.triggerTargetType ?? null;
    }
    if (path.startsWith("item.")) {
      const property = path.slice("item.".length);
      if (this.getContextListItem(context) !== null) {
        return readListItemValue(this.getContextListItem(context), property);
      }
      return readItemValue(
        this.getContextItem(context),
        this.getContextTask(context),
        property
      );
    }
    if (path.startsWith("listItem.")) {
      return readListItemValue(this.getContextListItem(context), path.slice("listItem.".length));
    }
    if (path.startsWith("container.")) {
      return readContainerValue(this.getContextContainer(context), path.slice("container.".length));
    }
    if (path.startsWith("previous.")) {
      const result = context.previousActionResults?.at(-1);
      return readActionResultValue(result, path.slice("previous.".length));
    }
    if (path.startsWith("actions.")) {
      const [, indexText, ...propertyParts] = path.split(".");
      const index = Number(indexText);
      if (!Number.isInteger(index) || index < 0 || propertyParts.length === 0) {
        return null;
      }
      return readActionResultValue(
        context.previousActionResults?.[index],
        propertyParts.join(".")
      );
    }

    return null;
  }

  private resolveDateExpressionVariable(
    expression: string,
    context: WorkflowVariableResolutionContext
  ): string | null {
    try {
      return resolveDateExpression(expression, {
        referenceDate: this.now(),
        resolveBaseDate: (basePath) => this.resolveDateBaseVariable(basePath, context)
      }).value;
    } catch {
      return null;
    }
  }

  private resolveDateBaseVariable(
    path: string,
    context: WorkflowVariableResolutionContext
  ): string | null {
    if (path === "today") {
      return formatLocalDate(this.now());
    }
    if (path === "now") {
      return this.now().toISOString();
    }
    if (path.startsWith("item.")) {
      const property = path.slice("item.".length);
      const listItem = this.getContextListItem(context);
      if (listItem !== null) {
        return readListItemValue(listItem, property);
      }
      return readItemValue(
        this.getContextItem(context),
        this.getContextTask(context),
        property
      );
    }
    if (path.startsWith("listItem.")) {
      return readListItemValue(this.getContextListItem(context), path.slice("listItem.".length));
    }

    return null;
  }

  private getContextItem(context: WorkflowVariableResolutionContext): ItemRecord | null {
    const itemId =
      context.triggerItemId ??
      (context.triggerTargetType === "item" ? context.triggerTargetId : undefined);
    if (itemId === undefined) {
      return null;
    }

    const item = new ItemRepository(this.connection).getById(itemId);
    if (item === null || item.workspaceId !== context.workspaceId) {
      return null;
    }

    return item;
  }

  private getContextContainer(context: WorkflowVariableResolutionContext): ContainerRecord | null {
    const containerId =
      context.triggerTargetType === "container"
        ? context.triggerTargetId
        : this.getContextItem(context)?.containerId;
    if (containerId === undefined) {
      return null;
    }

    const container = new ContainerRepository(this.connection).getById(containerId);
    if (container === null || container.workspaceId !== context.workspaceId) {
      return null;
    }

    return container;
  }

  private getContextTask(context: WorkflowVariableResolutionContext): TaskRecord | null {
    const item = this.getContextItem(context);
    if (item === null || item.type !== "task") {
      return null;
    }

    const task = new TaskRepository(this.connection).getDetailsByItemId(item.id);
    if (task === null || task.workspaceId !== context.workspaceId) {
      return null;
    }

    return task;
  }

  private getContextListItem(context: WorkflowVariableResolutionContext): ListItemRecord | null {
    if (context.triggerTargetType !== "list_item" || context.triggerTargetId === undefined) {
      return null;
    }

    const listItem = new ListRepository(this.connection).getListItemById(context.triggerTargetId);
    if (listItem === null || listItem.workspaceId !== context.workspaceId) {
      return null;
    }

    return listItem;
  }
}

function readItemValue(
  item: ItemRecord | null,
  task: TaskRecord | null,
  property: string
): string | null {
  if (item === null) {
    return null;
  }

  switch (property) {
    case "id":
      return item.id;
    case "title":
      return item.title;
    case "body":
      return item.body;
    case "type":
      return item.type;
    case "containerId":
      return item.containerId;
    case "containerTabId":
      return item.containerTabId;
    case "categoryId":
      return item.categoryId;
    case "status":
      return item.status;
    case "createdAt":
      return item.createdAt;
    case "updatedAt":
      return item.updatedAt;
    case "taskStatus":
      return task?.taskStatus ?? null;
    case "priority":
      return task?.priority === null || task?.priority === undefined ? null : String(task.priority);
    case "startAt":
      return task?.startAt ?? null;
    case "dueAt":
      return task?.dueAt ?? null;
    default:
      return null;
  }
}

function readListItemValue(listItem: ListItemRecord | null, property: string): string | null {
  if (listItem === null) {
    return null;
  }

  switch (property) {
    case "id":
      return listItem.id;
    case "title":
      return listItem.title;
    case "body":
      return listItem.body;
    case "status":
      return listItem.status;
    case "listId":
      return listItem.listId;
    case "listItemParentId":
      return listItem.listItemParentId;
    case "startAt":
      return listItem.startAt;
    case "dueAt":
      return listItem.dueAt;
    case "completedAt":
      return listItem.completedAt;
    case "createdAt":
      return listItem.createdAt;
    case "updatedAt":
      return listItem.updatedAt;
    default:
      return null;
  }
}

function readContainerValue(container: ContainerRecord | null, property: string): string | null {
  if (container === null) {
    return null;
  }

  switch (property) {
    case "id":
      return container.id;
    case "name":
      return container.name;
    case "slug":
      return container.slug;
    case "type":
      return container.type;
    case "description":
      return container.description;
    case "status":
      return container.status;
    case "categoryId":
      return container.categoryId;
    case "createdAt":
      return container.createdAt;
    case "updatedAt":
      return container.updatedAt;
    default:
      return null;
  }
}

function readActionResultValue(
  result: WorkflowResultLike | undefined,
  property: string
): string | null {
  if (result === undefined) {
    return null;
  }

  switch (property) {
    case "index":
      return String(result.index);
    case "actionType":
      return result.actionType;
    case "status":
      return result.status;
    case "summary":
      return result.summary;
    case "targetType":
      return result.targetType ?? null;
    case "targetId":
      return result.targetId ?? null;
    default:
      return null;
  }
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function withOptionalString<T extends object, K extends string>(
  value: T,
  key: K,
  optionalValue: string | null | undefined
): T & Partial<Record<K, string | null>> {
  if (optionalValue === undefined) {
    return value;
  }

  return {
    ...value,
    [key]: optionalValue
  } as T & Partial<Record<K, string | null>>;
}

function withOptionalStrings<T extends object>(
  value: T,
  optionalValues: Partial<Record<string, string | null | undefined>>
): T {
  return Object.entries(optionalValues).reduce((current, [key, optionalValue]) => {
    if (optionalValue === undefined) {
      return current;
    }

    return {
      ...current,
      [key]: optionalValue
    };
  }, value);
}
