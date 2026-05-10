export type ContactTimelineFilterValue =
  | "all"
  | "activity"
  | "content"
  | "follow_up"
  | "relationship";

export type ContactTimelineEntryViewModel = {
  id: string;
  kind: string;
  sourceType: "activity" | "item" | "relationship";
  title: string;
  description: string | null;
  occurredAt: string;
  status: string | null;
  dueAt: string | null;
  overdue: boolean;
  actorLabel: string | null;
  relatedTargetName: string | null;
};

export type ContactTimelineProps = {
  entries: ContactTimelineEntryViewModel[];
  filter: ContactTimelineFilterValue;
  loading?: boolean;
  error?: string | null;
  onFilterChange?: (filter: ContactTimelineFilterValue) => void;
};

const filters: Array<{ value: ContactTimelineFilterValue; label: string }> = [
  { value: "all", label: "All" },
  { value: "content", label: "Content" },
  { value: "follow_up", label: "Follow-ups" },
  { value: "relationship", label: "Relationships" },
  { value: "activity", label: "Activity" }
];

export function ContactTimeline({
  entries,
  error = null,
  filter,
  loading = false,
  onFilterChange
}: ContactTimelineProps): React.JSX.Element {
  return (
    <section className="contact-timeline-panel" aria-label="Contact interaction timeline">
      <div className="panel-heading-actions">
        <div className="panel-heading">
          <span aria-hidden="true">?</span>
          <h3>Interaction timeline</h3>
        </div>
        <div className="segmented-controls" role="group" aria-label="Timeline filters">
          {filters.map((option) => (
            <button
              key={option.value}
              className={option.value === filter ? "is-active" : undefined}
              type="button"
              aria-pressed={option.value === filter}
              onClick={() => onFilterChange?.(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      {loading ? (
        <p className="muted-text">Loading contact timeline...</p>
      ) : entries.length === 0 ? (
        <p className="muted-text">No timeline entries match this filter yet.</p>
      ) : (
        <ol className="contact-timeline-list">
          {entries.map((entry) => (
            <li key={entry.id} className={entry.overdue ? "is-overdue" : undefined}>
              <div className="timeline-marker" aria-hidden="true" />
              <div className="timeline-entry-card">
                <p className="timeline-entry-meta">
                  <span>{formatKindLabel(entry.kind)}</span>
                  <time dateTime={entry.occurredAt}>{formatDateLabel(entry.occurredAt)}</time>
                  {entry.actorLabel === null ? null : <span>{entry.actorLabel}</span>}
                </p>
                <h4>{entry.title}</h4>
                {entry.description === null ? null : <p>{entry.description}</p>}
                {entry.dueAt === null ? null : (
                  <p className="timeline-entry-due">
                    Due {formatDateLabel(entry.dueAt)}{entry.overdue ? " - overdue" : ""}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatKindLabel(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function formatDateLabel(value: string): string {
  return value.slice(0, 10);
}
