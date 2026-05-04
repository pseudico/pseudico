import { ArrowRight, Clock3 } from "lucide-react";
import { DashboardWidget } from "../DashboardWidget";

export type DashboardActivityWidgetItem = {
  activityId: string;
  action: string;
  description: string;
  createdAt: string;
  targetType: string;
  targetId: string;
};

export type RecentActivityWidgetProps = {
  activity: readonly DashboardActivityWidgetItem[];
  loading?: boolean;
  error?: string | null;
  onOpenActivityTarget?: (activity: DashboardActivityWidgetItem) => void;
};

export function RecentActivityWidget({
  activity,
  loading = false,
  error = null,
  onOpenActivityTarget
}: RecentActivityWidgetProps): React.JSX.Element {
  return (
    <DashboardWidget
      count={activity.length}
      description="Recent local changes recorded in the activity log."
      emptyDescription="Activity appears here after local workspace changes."
      emptyTitle="No recent activity"
      error={error}
      kind="recent_activity"
      loading={loading}
      title="Recent Activity"
    >
      {loading || error !== null || activity.length === 0 ? null : (
        <ol className="dashboard-widget-list">
          {activity.map((entry) => (
            <li key={entry.activityId}>
              <button
                type="button"
                className="dashboard-widget-row"
                onClick={() => onOpenActivityTarget?.(entry)}
              >
                <span className="dashboard-widget-row-main">
                  <strong>{formatActionLabel(entry.action)}</strong>
                  <span>{entry.description}</span>
                  <span>
                    <Clock3 size={14} aria-hidden="true" />
                    {entry.createdAt}
                  </span>
                </span>
                <span className="dashboard-widget-row-meta">
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </DashboardWidget>
  );
}

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
