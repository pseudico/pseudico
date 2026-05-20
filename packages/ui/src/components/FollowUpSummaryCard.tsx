import { formatAustralianDate } from "../dateFormat";

export type FollowUpTaskViewModel = {
  itemId: string;
  title: string;
  status: string;
  dueAt: string | null;
  priority: number | null;
  overdue: boolean;
};

export type FollowUpSummaryViewModel = {
  openFollowUpCount: number;
  overdueTaskCount: number;
  nextDueTask: FollowUpTaskViewModel | null;
  openFollowUps: FollowUpTaskViewModel[];
};

export type FollowUpSummaryCardProps = {
  summary: FollowUpSummaryViewModel;
};

export function FollowUpSummaryCard({
  summary
}: FollowUpSummaryCardProps): React.JSX.Element {
  return (
    <section className="follow-up-summary-card" aria-label="Follow-up summary">
      <div className="panel-heading">
        <span aria-hidden="true">?</span>
        <h3>Follow-up summary</h3>
      </div>
      <dl className="follow-up-summary-grid">
        <div>
          <dt>Open follow-ups</dt>
          <dd>{summary.openFollowUpCount}</dd>
        </div>
        <div>
          <dt>Overdue tasks</dt>
          <dd>{summary.overdueTaskCount}</dd>
        </div>
        <div>
          <dt>Next due</dt>
          <dd>{summary.nextDueTask?.title ?? "No due follow-ups"}</dd>
        </div>
      </dl>
      {summary.openFollowUps.length === 0 ? (
        <p className="muted-text">No open follow-ups for this contact.</p>
      ) : (
        <ul className="follow-up-list">
          {summary.openFollowUps.map((task) => (
            <li key={task.itemId} className={task.overdue ? "is-overdue" : undefined}>
              <span>{task.title}</span>
              <small>
                {task.dueAt === null ? "No due date" : formatDateLabel(task.dueAt)}
                {task.overdue ? " - overdue" : ""}
              </small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatDateLabel(value: string): string {
  return formatAustralianDate(value);
}
