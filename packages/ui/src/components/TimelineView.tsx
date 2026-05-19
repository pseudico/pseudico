import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";
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
  tags?: { id: string; name: string; slug: string }[];
};

export type TimelineWorkloadBucket = {
  date: string;
  itemCount: number;
  completedCount: number;
};

export type TimelineWorkloadSummary = {
  itemCount: number;
  activeCount: number;
  completedCount: number;
  density: TimelineWorkloadBucket[];
};

export type TimelineViewGroup = {
  key: string;
  label: string;
  color: string | null;
  itemCount: number;
  completedCount: number;
  workload?: TimelineWorkloadSummary;
  items: TimelineViewItem[];
};

export type TimelineViewProps = {
  groups: TimelineViewGroup[];
  range?: TimelineScaleRange;
  zoom?: TimelineZoomLevel;
  loading?: boolean;
  workload?: TimelineWorkloadSummary;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenTask?: (item: TimelineViewItem) => void;
};

export function TimelineView({
  groups,
  range,
  zoom = "week",
  loading = false,
  workload,
  emptyTitle = "No timeline work",
  emptyDescription = "Dated tasks in the selected range will appear here.",
  onOpenTask
}: TimelineViewProps): React.JSX.Element {
  const firstItem = groups[0]?.items[0] ?? null;
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    firstItem?.itemId ?? null
  );
  const selectedItem = useMemo(
    () =>
      groups
        .flatMap((group) => group.items)
        .find((item) => item.itemId === selectedItemId) ??
      firstItem ??
      null,
    [firstItem, groups, selectedItemId]
  );

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
    <div
      className="timeline-view"
      data-space-budget-surface="timeline-planning"
      style={
        scale === null
          ? undefined
          : ({
              "--timeline-scale-columns": String(scale.ticks.length)
            } as React.CSSProperties)
      }
    >
      {workload === undefined ? null : <TimelineWorkloadSummaryView workload={workload} />}
      <div className="timeline-planning-layout">
        <div className="timeline-planning-main">
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
                    <button
                      aria-pressed={selectedItem?.itemId === item.itemId}
                      className="timeline-row-label"
                      type="button"
                      onClick={() => setSelectedItemId(item.itemId)}
                      onDoubleClick={() => onOpenTask?.(item)}
                    >
                      <span className="timeline-item-title">{item.title}</span>
                      <span className="timeline-item-meta">
                        {item.containerName}
                        {item.categoryName === null ? "" : ` · ${item.categoryName}`}
                        {item.priority === null ? "" : ` · P${item.priority}`}
                        {item.taskStatus === "done" ? " · done" : ""}
                      </span>
                      <span className="timeline-item-date">
                        <CalendarDays size={16} aria-hidden="true" />
                        {formatTimelineRange(item)}
                      </span>
                    </button>
                    <button
                      className="timeline-item-card"
                      style={getTimelineItemStyle(item, scale)}
                      type="button"
                      onClick={() => {
                        setSelectedItemId(item.itemId);
                        onOpenTask?.(item);
                      }}
                    >
                      {scale === null ? (
                        <span className="timeline-range-fallback">
                          {formatTimelineRange(item)}
                        </span>
                      ) : (
                        <span
                          className={
                            isDueOnly(item)
                              ? "timeline-range-marker"
                              : "timeline-range-bar"
                          }
                        >
                          <span className="timeline-range-label">
                            {formatTimelineRangeLabel(item)}
                          </span>
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
        {selectedItem === null ? null : (
          <aside className="timeline-selected-panel" aria-label="Selected timeline item">
            <span className="top-eyebrow">Selected work</span>
            <h3>{selectedItem.title}</h3>
            <p>{selectedItem.body?.trim() || "No note body for this dated work item."}</p>
            <dl>
              <div>
                <dt>When</dt>
                <dd>{formatTimelineRange(selectedItem)}</dd>
              </div>
              <div>
                <dt>Container</dt>
                <dd>{selectedItem.containerName}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  {selectedItem.taskStatus}
                  {selectedItem.categoryName === null
                    ? ""
                    : ` · ${selectedItem.categoryName}`}
                </dd>
              </div>
            </dl>
            {onOpenTask === undefined ? null : (
              <button
                className="secondary-button compact-button"
                type="button"
                onClick={() => onOpenTask(selectedItem)}
              >
                Open source item
              </button>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function TimelineWorkloadSummaryView({
  workload
}: {
  workload: TimelineWorkloadSummary;
}): React.JSX.Element {
  return (
    <section className="timeline-workload-summary" aria-label="Timeline workload summary">
      <strong>{workload.itemCount} scheduled</strong>
      <span>{workload.activeCount} active</span>
      <span>{workload.completedCount} completed</span>
      <div className="timeline-density" aria-label="Workload density">
        {workload.density.length === 0 ? (
          <span>No dated workload</span>
        ) : (
          workload.density.map((bucket) => (
            <span className="timeline-density-day" key={bucket.date}>
              {bucket.date}: {bucket.itemCount}
            </span>
          ))
        )}
      </div>
    </section>
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

function formatTimelineRangeLabel(item: TimelineViewItem): string {
  const status = item.taskStatus === "done" ? "Done" : item.taskStatus;
  return `${shortDate(item.timelineStartAt)} · ${status}`;
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

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short"
  }).format(new Date(value));
}
