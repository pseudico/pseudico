import type { ReactNode } from "react";
import {
  isItemType,
  resolveContextMenuActions,
  type ContextMenuTarget
} from "@local-work-os/core";
import { ContextMenu, type ContextMenuActionViewModel } from "./ContextMenu";
import {
  ItemActionsMenu,
  type ItemActionHandler,
  type ItemActionId
} from "./ItemActionsMenu";
import { getItemTypeLabel, ItemTypeIcon } from "./ItemTypeIcon";
import { TagBadge, type TagBadgeViewModel } from "./TagBadge";

export type UniversalItemMetadata = {
  label: string;
  value: string;
};

export type UniversalItemViewModel = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  status?: string | null;
  categoryLabel?: string | null;
  sortOrder?: number;
  createdAt?: string;
  dueLabel?: string | null;
  updatedLabel?: string | null;
  pinned?: boolean;
  metadata?: readonly UniversalItemMetadata[];
  tags?: readonly TagBadgeViewModel[];
};

export type UniversalItemCardProps = {
  item: UniversalItemViewModel;
  disabledActions?: readonly ItemActionId[];
  selection?: {
    selected: boolean;
    disabled?: boolean;
    label?: string;
  };
  onAction?: ItemActionHandler;
  onSelectionChange?: (itemId: string, selected: boolean) => void;
  renderContent?: (item: UniversalItemViewModel) => ReactNode;
};

export function UniversalItemCard({
  item,
  disabledActions,
  selection,
  onAction,
  onSelectionChange,
  renderContent
}: UniversalItemCardProps): React.JSX.Element {
  const knownType = isItemType(item.type);
  const typeLabel = getItemTypeLabel(item.type);
  const metadata = buildItemMetadata(item);
  const contextTarget = toItemContextMenuTarget(item, disabledActions ?? []);
  const contextActions = resolveContextMenuActions({
    target: contextTarget,
    hideDisabled: false
  }).map<ContextMenuActionViewModel>((action) => ({
    id: action.id,
    title: action.title,
    group: action.group,
    disabledReason: action.disabledReason,
    danger: action.danger
  }));

  return (
    <ContextMenu
      actions={contextActions}
      label={`Context menu for ${item.title}`}
      target={contextTarget}
      onAction={(actionId) => onAction?.(actionId, item.id)}
    >
      <article
        className={`universal-item-card${selection?.selected === true ? " universal-item-card-selected" : ""}`}
        data-item-id={item.id}
        data-item-type={knownType ? item.type : "unknown"}
      >
        <header className="universal-item-card-header">
          <div className="universal-item-card-heading">
            {selection === undefined ? null : (
              <label className="selection-checkbox">
                <input
                  type="checkbox"
                  checked={selection.selected}
                  disabled={selection.disabled === true}
                  aria-label={selection.label ?? `Select ${item.title}`}
                  onChange={(event) =>
                    onSelectionChange?.(item.id, event.currentTarget.checked)
                  }
                />
              </label>
            )}
            <span className="item-type-badge">
              <ItemTypeIcon itemType={item.type} />
              <span>{typeLabel}</span>
            </span>
          </div>
          <ItemActionsMenu
            itemId={item.id}
            itemTitle={item.title}
            itemType={item.type}
            {...(disabledActions === undefined ? {} : { disabledActions })}
            {...(onAction === undefined ? {} : { onAction })}
          />
        </header>

        <div className="universal-item-card-main">
          <h4>{item.title}</h4>
          {renderContent === undefined ? (
            <DefaultItemContent item={item} knownType={knownType} />
          ) : (
            renderContent(item)
          )}
          <ItemTagBadges tags={item.tags} />
        </div>

        {metadata.length === 0 ? null : (
          <dl className="universal-item-metadata">
            {metadata.map((entry) => (
              <div key={`${entry.label}:${entry.value}`}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </article>
    </ContextMenu>
  );
}

function ItemTagBadges({
  tags
}: {
  tags: readonly TagBadgeViewModel[] | undefined;
}): React.JSX.Element | null {
  const visibleTags = tags?.filter((tag) => tag.slug.trim().length > 0) ?? [];

  if (visibleTags.length === 0) {
    return null;
  }

  return (
    <div className="item-tag-list" aria-label="Tags">
      {visibleTags.map((tag) => (
        <TagBadge key={tag.id ?? tag.slug} tag={tag} />
      ))}
    </div>
  );
}

function DefaultItemContent({
  item,
  knownType
}: {
  item: UniversalItemViewModel;
  knownType: boolean;
}): React.JSX.Element | null {
  if (item.body !== undefined && item.body !== null && item.body.length > 0) {
    return <p>{item.body}</p>;
  }

  if (!knownType) {
    return (
      <p className="unknown-item-placeholder">
        This item can stay in the feed while its display type is added.
      </p>
    );
  }

  return null;
}

function buildItemMetadata(
  item: UniversalItemViewModel
): UniversalItemMetadata[] {
  const metadata: UniversalItemMetadata[] = [];

  appendMetadata(metadata, "Status", item.status);
  appendMetadata(metadata, "Category", item.categoryLabel);
  appendMetadata(metadata, "Due", item.dueLabel);
  appendMetadata(metadata, "Updated", item.updatedLabel);

  if (item.pinned === true) {
    metadata.push({ label: "Pinned", value: "Yes" });
  }

  if (item.metadata !== undefined) {
    metadata.push(...item.metadata.filter((entry) => entry.value.trim() !== ""));
  }

  return metadata;
}

function appendMetadata(
  metadata: UniversalItemMetadata[],
  label: string,
  value: string | null | undefined
): void {
  if (value === undefined || value === null || value.trim().length === 0) {
    return;
  }

  metadata.push({ label, value });
}

function toItemContextMenuTarget(
  item: UniversalItemViewModel,
  disabledActions: readonly ItemActionId[]
): ContextMenuTarget {
  return {
    id: item.id,
    type: item.type === "file" ? "file" : "item",
    label: item.title,
    kind: item.type,
    capabilities: Object.fromEntries(
      disabledActions.map((action) => [action, false])
    )
  };
}
