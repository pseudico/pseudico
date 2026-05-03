import { ArrowUpRight, Check, Circle } from "lucide-react";
import { TagBadge } from "./TagBadge";
import { getItemTypeLabel, ItemTypeIcon } from "./ItemTypeIcon";

export type GroupedResultViewModel = {
  targetType: "container" | "item";
  targetId: string;
  kind: string;
  title: string;
  containerTitle: string;
  categoryName?: string | null;
  taskStatus?: string | null;
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
  onCompleteTask?: (itemId: string) => void;
  onOpenResult?: (path: string) => void;
};

export function GroupedResultsList({
  groups,
  onCompleteTask,
  onOpenResult
}: GroupedResultsListProps): React.JSX.Element {
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
            {group.results.map((result) => (
              <article
                key={`${result.targetType}:${result.targetId}`}
                className="grouped-result-item"
              >
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
                    {result.dueAt === undefined || result.dueAt === null ? null : (
                      <span>{result.dueAt.slice(0, 10)}</span>
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
          </div>
        </section>
      ))}
    </div>
  );
}

function formatKind(kind: string): string {
  if (kind === "project" || kind === "contact" || kind === "inbox") {
    return kind.charAt(0).toUpperCase() + kind.slice(1);
  }

  return getItemTypeLabel(kind);
}
