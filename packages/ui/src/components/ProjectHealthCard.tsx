import { formatAustralianDate } from "../dateFormat";
import { AlertTriangle, CalendarClock, CheckCircle2, Clock3, ListTodo } from "lucide-react";
import type { RecentActivityViewModel } from "./RecentActivityList";

export type ProjectHealthTaskViewModel = {
  itemId: string;
  title: string;
  dueAt: string | null;
  taskStatus: string;
  priority: number | null;
};

export type ProjectHealthBadgeViewModel = {
  kind: "overdue" | "upcoming" | "waiting" | "stale" | "no_recent_activity" | "complete";
  label: string;
  tone: "risk" | "warning" | "info" | "success" | "neutral";
};

export type ProjectHealthViewModel = {
  projectId: string;
  name: string;
  status: string;
  color: string | null;
  openTaskCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
  upcomingTaskCount: number;
  waitingTaskCount: number;
  totalTaskCount: number;
  completionRatio: number;
  staleAfterDays: number;
  lastActivityAt: string | null;
  isStale: boolean;
  hasRecentActivity: boolean;
  nextDueTask: ProjectHealthTaskViewModel | null;
  nextTask: ProjectHealthTaskViewModel | null;
  healthBadges: readonly ProjectHealthBadgeViewModel[];
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
        <Metric label="Completed" value={`${Math.round(health.completionRatio * 100)}%`} tone="done" />
        <Metric label="Overdue" value={health.overdueTaskCount} tone="risk" />
        <Metric label="Waiting" value={health.waitingTaskCount} tone="warning" />
      </dl>

      <ProjectHealthBadges badges={health.healthBadges} />

      <div className="project-health-detail-grid">
        <div>
          <div className="panel-heading">
            <CalendarClock size={16} aria-hidden="true" />
            <h4>Next task</h4>
          </div>
          {health.nextTask === null ? (
            <p className="muted-text">No open task.</p>
          ) : (
            <p>
              <strong>{health.nextTask.title}</strong>
              <span>{formatDateLabel(health.nextTask.dueAt)}</span>
            </p>
          )}
        </div>
        <div>
          <div className="panel-heading">
            <Clock3 size={16} aria-hidden="true" />
            <h4>Activity</h4>
          </div>
          {latestActivity === null ? (
            <p className="muted-text">No recent activity. Stale threshold: {health.staleAfterDays} days.</p>
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
  value: number | string;
  tone: "normal" | "done" | "risk" | "warning";
}): React.JSX.Element {
  const Icon = tone === "risk" || tone === "warning" ? AlertTriangle : tone === "done" ? CheckCircle2 : ListTodo;

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

export function ProjectHealthBadges({
  badges
}: {
  badges: readonly ProjectHealthBadgeViewModel[];
}): React.JSX.Element | null {
  if (badges.length === 0) {
    return null;
  }

  return (
    <ul className="project-health-badges" aria-label="Project health badges">
      {badges.map((badge) => (
        <li key={`${badge.kind}:${badge.label}`} data-health-badge-tone={badge.tone}>
          {badge.label}
        </li>
      ))}
    </ul>
  );
}

function formatDateLabel(value: string | null): string {
  if (value === null || value.length === 0) {
    return "No due date";
  }

  return formatAustralianDate(value);
}
