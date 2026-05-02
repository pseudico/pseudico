import type { ReactNode } from "react";
import {
  UniversalItemCard,
  type UniversalItemCardProps,
  type UniversalItemViewModel
} from "./ItemCard";

export type ItemFeedProps = Pick<
  UniversalItemCardProps,
  "disabledActions" | "onAction" | "renderContent"
> & {
  items: readonly UniversalItemViewModel[];
  ariaLabel?: string;
  emptyDescription?: string;
  emptyTitle?: string;
  error?: string | null;
  loading?: boolean;
  renderEmptyAction?: () => ReactNode;
};

export function ItemFeed({
  items,
  ariaLabel = "Items",
  disabledActions,
  emptyDescription = "Create the first item to start building this feed.",
  emptyTitle = "No items yet",
  error = null,
  loading = false,
  onAction,
  renderContent,
  renderEmptyAction
}: ItemFeedProps): React.JSX.Element {
  if (loading) {
    return (
      <section className="item-feed" aria-busy="true" aria-label={ariaLabel}>
        <p className="muted-text">Loading items...</p>
      </section>
    );
  }

  if (error !== null) {
    return (
      <section className="item-feed" aria-label={ariaLabel}>
        <p className="form-message form-message-error">{error}</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="item-feed" aria-label={ariaLabel}>
        <div className="item-feed-empty-state">
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
          {renderEmptyAction?.()}
        </div>
      </section>
    );
  }

  return (
    <section className="item-feed" aria-label={ariaLabel}>
      <div className="item-feed-list">
        {items.map((item) => (
          <UniversalItemCard
            item={item}
            key={item.id}
            {...(disabledActions === undefined ? {} : { disabledActions })}
            {...(onAction === undefined ? {} : { onAction })}
            {...(renderContent === undefined ? {} : { renderContent })}
          />
        ))}
      </div>
    </section>
  );
}
