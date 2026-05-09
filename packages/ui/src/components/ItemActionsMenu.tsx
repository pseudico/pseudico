import { MoreHorizontal } from "lucide-react";
import {
  resolveContextMenuActions,
  type ContextMenuActionId,
  type ContextMenuTarget
} from "@local-work-os/core";
import { ContextMenu, type ContextMenuActionViewModel } from "./ContextMenu";

export const ITEM_ACTIONS = [
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
] as const satisfies readonly ContextMenuActionId[];

export type ItemActionId = (typeof ITEM_ACTIONS)[number];

export type ItemActionHandler = (action: ItemActionId, itemId: string) => void;

export type ItemActionsMenuProps = {
  itemId: string;
  itemTitle: string;
  itemType?: string | null;
  disabledActions?: readonly ItemActionId[];
  hiddenActions?: readonly ItemActionId[];
  onAction?: ItemActionHandler;
};

export function ItemActionsMenu({
  itemId,
  itemTitle,
  itemType = null,
  disabledActions = [],
  hiddenActions = [],
  onAction
}: ItemActionsMenuProps): React.JSX.Element {
  const target = toItemContextMenuTarget(itemId, itemTitle, itemType, disabledActions);
  const menuLabel = `Actions for ${itemTitle}`;
  const actions = resolveContextMenuActions({
    target,
    hideDisabled: false
  })
    .filter((action) => !hiddenActions.includes(action.id))
    .map<ContextMenuActionViewModel>((action) => ({
      id: action.id,
      title: action.title,
      group: action.group,
      disabledReason: action.disabledReason,
      danger: action.danger
    }));

  return (
    <ContextMenu
      actions={actions}
      label={menuLabel}
      target={target}
      trigger={
        <>
          <MoreHorizontal size={18} aria-hidden="true" />
          <span className="sr-only">{menuLabel}</span>
        </>
      }
      onAction={(actionId) => onAction?.(actionId, itemId)}
    />
  );
}

function toItemContextMenuTarget(
  itemId: string,
  itemTitle: string,
  itemType: string | null,
  disabledActions: readonly ItemActionId[]
): ContextMenuTarget {
  return {
    id: itemId,
    type: itemType === "file" ? "file" : "item",
    label: itemTitle,
    kind: itemType,
    capabilities: Object.fromEntries(
      disabledActions.map((action) => [action, false])
    )
  };
}

