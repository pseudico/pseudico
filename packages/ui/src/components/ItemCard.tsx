import type { ReactNode } from "react";
import { isItemType } from "@local-work-os/core";
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
  onAction?: ItemActionHandler;
  renderContent?: (item: UniversalItemViewModel) => ReactNode;
};

export function UniversalItemCard({
  item,
  disabledActions,
  onAction,
  renderContent
}: UniversalItemCardProps): React.JSX.Element {
  const knownType = isItemType(item.type);
  const typeLabel = getItemTypeLabel(item.type);
  const metadata = buildItemMetadata(item);

  return (
    <article
      className="universal-item-card"
      data-item-id={item.id}
      data-item-type={knownType ? item.type : "unknown"}
    >
      <header className="universal-item-card-header">
        <span className="item-type-badge">
          <ItemTypeIcon itemType={item.type} />
          <span>{typeLabel}</span>
        </span>
        <ItemActionsMenu
          itemId={item.id}
          itemTitle={item.title}
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
