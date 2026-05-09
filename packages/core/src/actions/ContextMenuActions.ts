import {
  ActionRegistry,
  resolveAction,
  type ActionDescriptor,
  type ResolvedAction
} from "./ActionRegistry";

export const CONTEXT_MENU_TARGET_TYPES = [
  "container",
  "item",
  "listItem",
  "tag",
  "category",
  "file",
  "savedView"
] as const;

export const CONTEXT_MENU_ACTION_IDS = [
  "open",
  "edit",
  "move",
  "tag",
  "category",
  "pin",
  "archive",
  "duplicate",
  "reveal",
  "copyLink",
  "inspect",
  "delete"
] as const;

export type ContextMenuTargetType = (typeof CONTEXT_MENU_TARGET_TYPES)[number];
export type ContextMenuActionId = (typeof CONTEXT_MENU_ACTION_IDS)[number];

export type ContextMenuTarget = {
  id: string;
  type: ContextMenuTargetType;
  label: string;
  kind?: string | null;
  capabilities?: Partial<Record<ContextMenuActionId, boolean>>;
};

export type ContextMenuActionContext = {
  target: ContextMenuTarget;
};

export type ContextMenuActionDescriptor = Omit<
  ActionDescriptor<ContextMenuActionContext>,
  "id" | "execute"
> & {
  id: ContextMenuActionId;
  targetTypes: readonly ContextMenuTargetType[];
  danger?: boolean;
  execute?: ActionDescriptor<ContextMenuActionContext>["execute"];
};

export type ResolvedContextMenuAction =
  ResolvedAction<ContextMenuActionContext> & {
    id: ContextMenuActionId;
    danger: boolean;
  };

export type ResolveContextMenuActionsOptions = {
  target: ContextMenuTarget;
  actions?: readonly ContextMenuActionDescriptor[];
  hideDisabled?: boolean;
};

export const defaultContextMenuActions: readonly ContextMenuActionDescriptor[] = [
  contextAction({
    id: "open",
    title: "Open",
    group: "Open",
    targetTypes: ["container", "item", "listItem", "file", "savedView"],
    keywords: ["view", "go"]
  }),
  contextAction({
    id: "edit",
    title: "Edit",
    group: "Manage",
    targetTypes: ["container", "item", "listItem", "tag", "category", "file", "savedView"],
    keywords: ["rename", "update"]
  }),
  contextAction({
    id: "move",
    title: "Move",
    group: "Organize",
    targetTypes: ["container", "item", "listItem", "file", "savedView"],
    keywords: ["project", "container"]
  }),
  contextAction({
    id: "tag",
    title: "Tags",
    group: "Organize",
    targetTypes: ["container", "item", "listItem", "file"],
    keywords: ["metadata"]
  }),
  contextAction({
    id: "category",
    title: "Category",
    group: "Organize",
    targetTypes: ["container", "item", "listItem", "file"],
    keywords: ["metadata"]
  }),
  contextAction({
    id: "pin",
    title: "Pin or favorite",
    group: "Organize",
    targetTypes: ["container", "item", "file", "savedView"],
    keywords: ["favorite", "star"]
  }),
  contextAction({
    id: "archive",
    title: "Archive",
    group: "Manage",
    targetTypes: ["container", "item", "listItem", "file", "savedView"],
    keywords: ["hide"]
  }),
  contextAction({
    id: "duplicate",
    title: "Duplicate",
    group: "Manage",
    targetTypes: ["container", "item", "listItem", "file", "savedView"],
    keywords: ["copy"]
  }),
  contextAction({
    id: "reveal",
    title: "Reveal in folder",
    group: "Open",
    targetTypes: ["file"],
    keywords: ["file", "folder", "show"]
  }),
  contextAction({
    id: "copyLink",
    title: "Copy local link",
    group: "Share",
    targetTypes: ["container", "item", "listItem", "tag", "category", "file", "savedView"],
    keywords: ["url", "reference"]
  }),
  contextAction({
    id: "inspect",
    title: "Inspect",
    group: "Open",
    targetTypes: ["container", "item", "listItem", "file", "savedView"],
    keywords: ["details", "activity"]
  }),
  contextAction({
    id: "delete",
    title: "Delete",
    group: "Danger",
    targetTypes: ["container", "item", "listItem", "tag", "category", "file", "savedView"],
    danger: true,
    keywords: ["remove", "trash"]
  })
];

export function createContextMenuActionRegistry(
  actions: readonly ContextMenuActionDescriptor[] = defaultContextMenuActions
): ActionRegistry<ContextMenuActionContext> {
  const registry = new ActionRegistry<ContextMenuActionContext>();

  for (const action of actions) {
    registry.register(toActionDescriptor(action));
  }

  return registry;
}

export function resolveContextMenuActions({
  target,
  actions = defaultContextMenuActions,
  hideDisabled = true
}: ResolveContextMenuActionsOptions): ResolvedContextMenuAction[] {
  return actions
    .filter((action) => action.targetTypes.includes(target.type))
    .map((action) => {
      const resolved = resolveAction(
        toActionDescriptor(action),
        { target },
        1
      );

      return {
        ...resolved,
        id: action.id,
        danger: action.danger ?? false
      };
    })
    .filter((action) => !hideDisabled || action.disabledReason === null);
}

function contextAction(
  action: ContextMenuActionDescriptor
): ContextMenuActionDescriptor {
  return action;
}

function toActionDescriptor(
  action: ContextMenuActionDescriptor
): ActionDescriptor<ContextMenuActionContext> {
  return {
    ...action,
    id: action.id,
    disabled: (context) => {
      if (!action.targetTypes.includes(context.target.type)) {
        return "Unavailable for this target.";
      }

      if (context.target.capabilities?.[action.id] === false) {
        return "Unavailable for this target.";
      }

      const value =
        typeof action.disabled === "function"
          ? action.disabled(context)
          : action.disabled;

      return value ?? false;
    },
    execute: action.execute ?? (() => undefined)
  };
}
