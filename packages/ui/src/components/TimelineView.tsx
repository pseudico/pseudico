import { CalendarDays } from "lucide-react";
import {
  createTimelineDateScale,
  mapTimelineRangeToScale,
  type TimelineDateScale,
  type TimelineScaleRange,
  type TimelineZoomLevel
} from "@local-work-os/core";
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
  startAt?: string | null;
  dueAt?: string | null;
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
  range?: TimelineScaleRange;
  zoom?: TimelineZoomLevel;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenTask?: (item: TimelineViewItem) => void;
};

export function TimelineView({
  groups,
  range,
  zoom = "week",
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

  const scale =
    range === undefined
      ? null
      : createTimelineDateScale({
          range,
          zoom
        });

  return (
    <div className="timeline-view">
      {scale === null ? null : <TimelineScaleHeader scale={scale} />}
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
                  style={getTimelineItemStyle(item, scale)}
                  type="button"
                  onClick={() => onOpenTask?.(item)}
                >
                  {scale === null ? null : (
                    <span
                      aria-hidden="true"
                      className={
                        isDueOnly(item)
                          ? "timeline-range-marker"
                          : "timeline-range-bar"
                      }
                    />
                  )}
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

function TimelineScaleHeader({
  scale
}: {
  scale: TimelineDateScale;
}): React.JSX.Element {
  return (
    <div className="timeline-scale" aria-hidden="true">
      {scale.ticks.map((tick) => (
        <span
          className="timeline-scale-tick"
          key={tick.key}
          style={{ left: `${tick.offsetPercent}%` }}
        >
          {tick.label}
        </span>
      ))}
    </div>
  );
}

function getTimelineItemStyle(
  item: TimelineViewItem,
  scale: TimelineDateScale | null
): React.CSSProperties | undefined {
  if (scale === null) {
    return undefined;
  }

  const placement = mapTimelineRangeToScale({
    range: scale.range,
    startAt: item.timelineStartAt,
    endAt: item.timelineEndAt
  });
  const accent = item.categoryColor ?? "var(--accent)";

  return {
    "--timeline-range-left": `${placement.offsetPercent}%`,
    "--timeline-range-width": `${placement.widthPercent}%`,
    "--timeline-range-color": accent,
    "--timeline-range-radius-left": placement.startsBeforeRange ? "4px" : "999px",
    "--timeline-range-radius-right": placement.endsAfterRange ? "4px" : "999px"
  } as React.CSSProperties;
}

function formatTimelineRange(item: TimelineViewItem): string {
  const start = formatDateTime(item.timelineStartAt);
  const end = formatDateTime(item.timelineEndAt);

  return start === end ? start : `${start} – ${end}`;
}

function isDueOnly(item: TimelineViewItem): boolean {
  return item.timelineStartAt === item.timelineEndAt || item.startAt === null;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
