import { formatAustralianDate } from "../dateFormat";
import { ArrowUpRight, Check, Circle } from "lucide-react";
import { useState } from "react";
import { TagBadge } from "./TagBadge";
import { getItemTypeLabel, ItemTypeIcon } from "./ItemTypeIcon";
import { SnoozeMenu, type SnoozePreset } from "./SnoozeMenu";
import { useVirtualizedFeed } from "./useVirtualizedFeed";

export type GroupedResultViewModel = {
  targetType: "container" | "item";
  targetId: string;
  kind: string;
  title: string;
  containerTitle: string;
  categoryName?: string | null;
  taskStatus?: string | null;
  taskPriority?: number | null;
  dueAt?: string | null;
  tags: readonly string[];
  destinationPath: string;
};

export type GroupedResultGroupViewModel = {
  key: string;
  label: string;
  results: readonly GroupedResultViewModel[];
};

export type GroupedResultsListProps = {
  groups: readonly GroupedResultGroupViewModel[];
  selectedResultIds?: readonly string[];
  onCompleteTask?: (itemId: string) => void;
  onOpenResult?: (path: string) => void;
  onSnoozeTask?: (
    result: GroupedResultViewModel,
    preset: SnoozePreset
  ) => Promise<void> | void;
  onRescheduleTask?: (
    result: GroupedResultViewModel,
    dueAt: string | null
  ) => Promise<void> | void;
  onSelectionChange?: (resultId: string, selected: boolean) => void;
  virtualization?: {
    enabled?: boolean;
    estimatedItemHeight?: number;
    viewportHeight?: number;
    minItems?: number;
  };
};

export function GroupedResultsList({
  groups,
  selectedResultIds = [],
  onCompleteTask,
  onOpenResult,
  onSnoozeTask,
  onRescheduleTask,
  onSelectionChange,
  virtualization
}: GroupedResultsListProps): React.JSX.Element {
  const [scrollOffsets, setScrollOffsets] = useState<Record<string, number>>({});
  if (groups.length === 0 || groups.every((group) => group.results.length === 0)) {
    return (
      <div className="item-feed-empty-state">
        <h3>No results</h3>
        <p>Active workspace records that match this collection will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grouped-results-list">
      {groups.map((group) => (
        <section key={group.key} className="grouped-results-group">
          <header className="grouped-results-heading">
            <h3>{group.label}</h3>
            <span>{group.results.length}</span>
          </header>
          <div className="grouped-result-items">
            <GroupedResultRows
              groupKey={group.key}
              results={group.results}
              selectedResultIds={selectedResultIds}
              scrollOffset={scrollOffsets[group.key] ?? 0}
              virtualization={virtualization}
              onScrollOffsetChange={(offset) =>
                setScrollOffsets((current) => ({ ...current, [group.key]: offset }))
              }
              {...(onCompleteTask === undefined ? {} : { onCompleteTask })}
              {...(onOpenResult === undefined ? {} : { onOpenResult })}
              {...(onRescheduleTask === undefined ? {} : { onRescheduleTask })}
              {...(onSelectionChange === undefined ? {} : { onSelectionChange })}
              {...(onSnoozeTask === undefined ? {} : { onSnoozeTask })}
            />
          </div>
        </section>
      ))}
    </div>
  );
}

function GroupedResultRows({
  groupKey,
  results,
  selectedResultIds,
  scrollOffset,
  virtualization,
  onScrollOffsetChange,
  onCompleteTask,
  onOpenResult,
  onSnoozeTask,
  onRescheduleTask,
  onSelectionChange
}: {
  groupKey: string;
  results: readonly GroupedResultViewModel[];
  selectedResultIds: readonly string[];
  scrollOffset: number;
  virtualization: GroupedResultsListProps["virtualization"];
  onScrollOffsetChange: (offset: number) => void;
} & Pick<
  GroupedResultsListProps,
  | "onCompleteTask"
  | "onOpenResult"
  | "onSnoozeTask"
  | "onRescheduleTask"
  | "onSelectionChange"
>): React.JSX.Element {
  const virtualized = useVirtualizedFeed({
    items: results,
    getKey: (result) => `${result.targetType}:${result.targetId}`,
    estimatedItemHeight: virtualization?.estimatedItemHeight ?? 96,
    viewportHeight: virtualization?.viewportHeight ?? 640,
    scrollOffset,
    minItems:
      virtualization?.enabled === false
        ? Number.MAX_SAFE_INTEGER
        : (virtualization?.minItems ?? 80)
  });

  return (
    <div
      data-group-key={groupKey}
      data-virtualized={virtualized.isVirtualized ? "true" : "false"}
      style={
        virtualized.isVirtualized
          ? { maxHeight: virtualization?.viewportHeight ?? 640, overflowY: "auto" }
          : undefined
      }
      onScroll={(event) => onScrollOffsetChange(event.currentTarget.scrollTop)}
    >
      {virtualized.beforeHeight > 0 ? (
        <div aria-hidden="true" style={{ height: virtualized.beforeHeight }} />
      ) : null}
      {virtualized.virtualItems.map(({ item: result }) => (
              <article
                key={`${result.targetType}:${result.targetId}`}
                className={`grouped-result-item${selectedResultIds.includes(result.targetId) ? " grouped-result-item-selected" : ""}`}
              >
                {onSelectionChange === undefined || result.targetType !== "item" ? null : (
                  <label className="selection-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedResultIds.includes(result.targetId)}
                      aria-label={`Select ${result.title}`}
                      onChange={(event) =>
                        onSelectionChange(result.targetId, event.currentTarget.checked)
                      }
                    />
                  </label>
                )}
                <div className="grouped-result-main">
                  <div className="grouped-result-title">
                    <span className="item-type-badge">
                      <ItemTypeIcon itemType={result.kind} />
                      <span>{formatKind(result.kind)}</span>
                    </span>
                    <strong>{result.title}</strong>
                  </div>
                  <div className="grouped-result-meta">
                    <span>{result.containerTitle}</span>
                    {result.categoryName === undefined || result.categoryName === null ? null : (
                      <span>{result.categoryName}</span>
                    )}
                    {result.taskStatus === undefined || result.taskStatus === null ? null : (
                      <span>{result.taskStatus}</span>
                    )}
                    {result.taskPriority === undefined || result.taskPriority === null ? null : (
                      <span>P{result.taskPriority}</span>
                    )}
                    {result.dueAt === undefined || result.dueAt === null ? null : (
                      <span>{formatAustralianDate(result.dueAt)}</span>
                    )}
                  </div>
                  {result.tags.length === 0 ? null : (
                    <div className="item-tag-list" aria-label="Tags">
                      {result.tags.map((tag) => (
                        <TagBadge
                          key={tag}
                          tag={{
                            name: tag,
                            slug: tag,
                            source: "manual"
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="grouped-result-actions">
                  {result.kind === "task" ? (
                    <button
                      type="button"
                      className="icon-button"
                      title={result.taskStatus === "done" ? "Completed" : "Complete task"}
                      aria-label={
                        result.taskStatus === "done" ? "Completed" : "Complete task"
                      }
                      disabled={result.taskStatus === "done" || onCompleteTask === undefined}
                      onClick={() => onCompleteTask?.(result.targetId)}
                    >
                      {result.taskStatus === "done" ? (
                        <Check size={17} aria-hidden="true" />
                      ) : (
                        <Circle size={17} aria-hidden="true" />
                      )}
                    </button>
                  ) : null}
                  {result.kind === "task" ? (
                    <SnoozeMenu
                      onReschedule={(dueAt) => onRescheduleTask?.(result, dueAt)}
                      onSnoozePreset={(preset) => onSnoozeTask?.(result, preset)}
                    />
                  ) : null}
                  <button
                    type="button"
                    className="icon-button"
                    title="Open"
                    aria-label="Open"
                    disabled={onOpenResult === undefined}
                    onClick={() => onOpenResult?.(result.destinationPath)}
                  >
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </button>
                </div>
              </article>
      ))}
      {virtualized.afterHeight > 0 ? (
        <div aria-hidden="true" style={{ height: virtualized.afterHeight }} />
      ) : null}
    </div>
  );
}

function formatKind(kind: string): string {
  if (kind === "project" || kind === "contact" || kind === "inbox") {
    return kind.charAt(0).toUpperCase() + kind.slice(1);
  }

  return getItemTypeLabel(kind);
}
