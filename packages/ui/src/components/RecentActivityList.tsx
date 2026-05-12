import { Clock3 } from "lucide-react";
import { useState } from "react";
import { useVirtualizedFeed } from "./useVirtualizedFeed";

export type RecentActivityViewModel = {
  id: string;
  action: string;
  actionLabel?: string;
  actorLabel?: string;
  targetLabel?: string;
  summary?: string | null;
  description?: string | null;
  createdAt: string;
};

export type RecentActivityListProps = {
  activity: readonly RecentActivityViewModel[];
  title?: string;
  emptyMessage?: string;
  virtualization?: {
    enabled?: boolean;
    estimatedItemHeight?: number;
    viewportHeight?: number;
    minItems?: number;
  };
};

export function RecentActivityList({
  activity,
  title = "Recent activity",
  emptyMessage = "No activity recorded yet.",
  virtualization
}: RecentActivityListProps): React.JSX.Element {
  const [scrollOffset, setScrollOffset] = useState(0);
  const virtualized = useVirtualizedFeed({
    items: activity,
    getKey: (entry) => entry.id,
    estimatedItemHeight: virtualization?.estimatedItemHeight ?? 84,
    viewportHeight: virtualization?.viewportHeight ?? 480,
    scrollOffset,
    minItems:
      virtualization?.enabled === false
        ? Number.MAX_SAFE_INTEGER
        : (virtualization?.minItems ?? 80)
  });

  return (
    <section className="recent-activity-list" aria-label={title}>
      <div className="panel-heading">
        <Clock3 size={16} aria-hidden="true" />
        <h4>{title}</h4>
      </div>
      {activity.length === 0 ? (
        <p className="muted-text">{emptyMessage}</p>
      ) : (
        <ol
          data-virtualized={virtualized.isVirtualized ? "true" : "false"}
          style={
            virtualized.isVirtualized
              ? { maxHeight: virtualization?.viewportHeight ?? 480, overflowY: "auto" }
              : undefined
          }
          onScroll={(event) => setScrollOffset(event.currentTarget.scrollTop)}
        >
          {virtualized.beforeHeight > 0 ? (
            <li aria-hidden="true" style={{ height: virtualized.beforeHeight }} />
          ) : null}
          {virtualized.virtualItems.map(({ item: entry }) => (
            <li key={entry.id}>
              <strong>{entry.actionLabel ?? formatActionLabel(entry.action)}</strong>
              <span>{entry.description ?? entry.summary ?? "No summary"}</span>
              {entry.targetLabel === undefined ? null : (
                <small>{entry.targetLabel}</small>
              )}
              <time dateTime={entry.createdAt}>{entry.createdAt}</time>
            </li>
          ))}
          {virtualized.afterHeight > 0 ? (
            <li aria-hidden="true" style={{ height: virtualized.afterHeight }} />
          ) : null}
        </ol>
      )}
    </section>
  );
}

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
