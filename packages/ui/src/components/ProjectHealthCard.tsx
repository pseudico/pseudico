import { AlertTriangle, CalendarClock, CheckCircle2, ListTodo } from "lucide-react";
import type { RecentActivityViewModel } from "./RecentActivityList";

export type ProjectHealthTaskViewModel = {
  itemId: string;
  title: string;
  dueAt: string | null;
  taskStatus: string;
  priority: number | null;
};

export type ProjectHealthViewModel = {
  projectId: string;
  name: string;
  status: string;
  color: string | null;
  openTaskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  totalTaskCount: number;
  nextDueTask: ProjectHealthTaskViewModel | null;
  recentActivity: readonly RecentActivityViewModel[];
};

export type ProjectHealthCardProps = {
  health: ProjectHealthViewModel;
  onOpenProject?: (projectId: string) => void;
};

export function ProjectHealthCard({
  health,
  onOpenProject
}: ProjectHealthCardProps): React.JSX.Element {
  const latestActivity = health.recentActivity[0] ?? null;

  return (
    <section className="project-health-card" aria-label="Project health">
      <header className="project-health-card-header">
        <span
          className="project-health-color"
          style={{ backgroundColor: health.color ?? "#245c55" }}
          aria-hidden="true"
        />
        <div>
          <h3>{health.name}</h3>
          <p>{health.status}</p>
        </div>
      </header>

      <dl className="project-health-metrics">
        <Metric label="Open" value={health.openTaskCount} tone="normal" />
        <Metric label="Completed" value={health.completedTaskCount} tone="done" />
        <Metric label="Overdue" value={health.overdueTaskCount} tone="risk" />
      </dl>

      <div className="project-health-detail-grid">
        <div>
          <div className="panel-heading">
            <CalendarClock size={16} aria-hidden="true" />
            <h4>Next due</h4>
          </div>
          {health.nextDueTask === null ? (
            <p className="muted-text">No upcoming task.</p>
          ) : (
            <p>
              <strong>{health.nextDueTask.title}</strong>
              <span>{formatDateLabel(health.nextDueTask.dueAt)}</span>
            </p>
          )}
        </div>
        <div>
          <div className="panel-heading">
            <ListTodo size={16} aria-hidden="true" />
            <h4>Recent</h4>
          </div>
          {latestActivity === null ? (
            <p className="muted-text">No recent activity.</p>
          ) : (
            <p>
              <strong>{latestActivity.actionLabel ?? latestActivity.action}</strong>
              <span>{latestActivity.description ?? latestActivity.summary}</span>
            </p>
          )}
        </div>
      </div>

      {onOpenProject === undefined ? null : (
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={() => onOpenProject(health.projectId)}
        >
          Open project
        </button>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "normal" | "done" | "risk";
}): React.JSX.Element {
  const Icon = tone === "risk" ? AlertTriangle : tone === "done" ? CheckCircle2 : ListTodo;

  return (
    <div data-health-tone={tone}>
      <dt>
        <Icon size={15} aria-hidden="true" />
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatDateLabel(value: string | null): string {
  if (value === null || value.length === 0) {
    return "No due date";
  }

  return value.slice(0, 10);
}
