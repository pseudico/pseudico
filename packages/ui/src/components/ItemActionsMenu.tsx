import {
  Archive,
  Eye,
  FolderInput,
  MoreHorizontal,
  Pencil,
  Trash2,
  type LucideIcon
} from "lucide-react";

export const ITEM_ACTIONS = [
  "edit",
  "move",
  "archive",
  "delete",
  "inspect"
] as const;

export type ItemActionId = (typeof ITEM_ACTIONS)[number];

export type ItemActionHandler = (action: ItemActionId, itemId: string) => void;

type ItemActionConfig = {
  id: ItemActionId;
  label: string;
  icon: LucideIcon;
};

const itemActionConfigs: readonly ItemActionConfig[] = [
  { id: "edit", label: "Edit", icon: Pencil },
  { id: "move", label: "Move", icon: FolderInput },
  { id: "archive", label: "Archive", icon: Archive },
  { id: "delete", label: "Delete", icon: Trash2 },
  { id: "inspect", label: "Inspect", icon: Eye }
];

export type ItemActionsMenuProps = {
  itemId: string;
  itemTitle: string;
  disabledActions?: readonly ItemActionId[];
  onAction?: ItemActionHandler;
};

export function ItemActionsMenu({
  itemId,
  itemTitle,
  disabledActions = [],
  onAction
}: ItemActionsMenuProps): React.JSX.Element {
  const menuLabel = `Actions for ${itemTitle}`;

  return (
    <details className="item-actions-menu">
      <summary className="item-actions-trigger" aria-label={menuLabel}>
        <MoreHorizontal size={18} aria-hidden="true" />
        <span className="sr-only">{menuLabel}</span>
      </summary>
      <div className="item-actions-list" role="menu" aria-label={menuLabel}>
        {itemActionConfigs.map((action) => {
          const Icon = action.icon;
          const disabled = disabledActions.includes(action.id);

          return (
            <button
              className="item-action-button"
              disabled={disabled}
              key={action.id}
              role="menuitem"
              type="button"
              onClick={() => onAction?.(action.id, itemId)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>
    </details>
  );
}
