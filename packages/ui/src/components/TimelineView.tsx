import { CalendarDays } from "lucide-react";
import { EmptyState } from "./EmptyState";

export type TimelineViewItem = {
  kind?: "task" | "list_item";
  itemId: string;
  sourceItemId?: string | null;
  title: string;
  body: string | null;
  containerId: string;
  containerName: string;
  containerType: string;
  categoryName: string | null;
  categoryColor: string | null;
  taskStatus: string;
  priority: number | null;
  timelineStartAt: string;
  timelineEndAt: string;
  completedAt: string | null;
};

export type TimelineViewGroup = {
  key: string;
  label: string;
  color: string | null;
  itemCount: number;
  completedCount: number;
  items: TimelineViewItem[];
};

export type TimelineViewProps = {
  groups: TimelineViewGroup[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenTask?: (item: TimelineViewItem) => void;
};

export function TimelineView({
  groups,
  loading = false,
  emptyTitle = "No timeline work",
  emptyDescription = "Dated tasks in the selected range will appear here.",
  onOpenTask
}: TimelineViewProps): React.JSX.Element {
  if (loading) {
    return <p className="muted-text">Loading timeline...</p>;
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        description={emptyDescription}
        title={emptyTitle}
      />
    );
  }

  return (
    <div className="timeline-view">
      {groups.map((group) => (
        <section className="timeline-group" key={group.key}>
          <header className="timeline-group-header">
            <div>
              <span
                aria-hidden="true"
                className="timeline-group-dot"
                style={{ backgroundColor: group.color ?? "var(--accent)" }}
              />
              <h3>{group.label}</h3>
            </div>
            <span>
              {group.itemCount} task{group.itemCount === 1 ? "" : "s"}
              {group.completedCount > 0
                ? ` · ${group.completedCount} done`
                : ""}
            </span>
          </header>
          <ol className="timeline-list">
            {group.items.map((item) => (
              <li className="timeline-list-item" key={item.itemId}>
                <div className="timeline-item-date">
                  <CalendarDays size={16} aria-hidden="true" />
                  <span>{formatTimelineRange(item)}</span>
                </div>
                <button
                  className="timeline-item-card"
                  type="button"
                  onClick={() => onOpenTask?.(item)}
                >
                  <span className="timeline-item-title">{item.title}</span>
                  <span className="timeline-item-meta">
                    {item.containerName}
                    {item.categoryName === null ? "" : ` · ${item.categoryName}`}
                    {item.priority === null ? "" : ` · P${item.priority}`}
                    {item.taskStatus === "done" ? " · done" : ""}
                  </span>
                  {item.body === null || item.body.trim().length === 0 ? null : (
                    <span className="timeline-item-body">{item.body}</span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function formatTimelineRange(item: TimelineViewItem): string {
  const start = formatDateTime(item.timelineStartAt);
  const end = formatDateTime(item.timelineEndAt);

  return start === end ? start : `${start} – ${end}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
