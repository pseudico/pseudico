import type { ReactNode } from "react";

export type LoadMoreListProps<TItem> = {
  items: readonly TItem[];
  renderItem: (item: TItem) => ReactNode;
  getKey: (item: TItem) => string;
  ariaLabel: string;
  hasMore?: boolean;
  loading?: boolean;
  loadMoreLabel?: string;
  onLoadMore?: () => void;
};

export function LoadMoreList<TItem>({
  items,
  renderItem,
  getKey,
  ariaLabel,
  hasMore = false,
  loading = false,
  loadMoreLabel = "Load more",
  onLoadMore
}: LoadMoreListProps<TItem>): React.JSX.Element {
  return (
    <div className="load-more-list" aria-label={ariaLabel} aria-busy={loading}>
      {items.map((item) => (
        <div className="load-more-list-item" key={getKey(item)}>
          {renderItem(item)}
        </div>
      ))}

      {hasMore ? (
        <button
          className="secondary-button load-more-button"
          disabled={loading || onLoadMore === undefined}
          type="button"
          onClick={onLoadMore}
        >
          {loading ? "Loading..." : loadMoreLabel}
        </button>
      ) : null}
    </div>
  );
}
