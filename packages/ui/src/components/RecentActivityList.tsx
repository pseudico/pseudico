import { Clock3 } from "lucide-react";

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
};

export function RecentActivityList({
  activity,
  title = "Recent activity",
  emptyMessage = "No activity recorded yet."
}: RecentActivityListProps): React.JSX.Element {
  return (
    <section className="recent-activity-list" aria-label={title}>
      <div className="panel-heading">
        <Clock3 size={16} aria-hidden="true" />
        <h4>{title}</h4>
      </div>
      {activity.length === 0 ? (
        <p className="muted-text">{emptyMessage}</p>
      ) : (
        <ol>
          {activity.map((entry) => (
            <li key={entry.id}>
              <strong>{entry.actionLabel ?? formatActionLabel(entry.action)}</strong>
              <span>{entry.description ?? entry.summary ?? "No summary"}</span>
              {entry.targetLabel === undefined ? null : (
                <small>{entry.targetLabel}</small>
              )}
              <time dateTime={entry.createdAt}>{entry.createdAt}</time>
            </li>
          ))}
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
