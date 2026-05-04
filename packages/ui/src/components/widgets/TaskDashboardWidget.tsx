import { ArrowRight, CalendarDays, CircleAlert } from "lucide-react";
import {
  DashboardWidget,
  type DashboardWidgetKind
} from "../DashboardWidget";

export type DashboardTaskWidgetItem = {
  itemId: string;
  title: string;
  containerId: string;
  dueAt: string | null;
  taskStatus: string;
  priority: number | null;
};

export type TaskDashboardWidgetProps = {
  title: string;
  description: string;
  kind: Extract<DashboardWidgetKind, "today" | "overdue" | "upcoming">;
  tasks: readonly DashboardTaskWidgetItem[];
  loading?: boolean;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  onOpenTask?: (task: DashboardTaskWidgetItem) => void;
};

export function TaskDashboardWidget({
  title,
  description,
  kind,
  tasks,
  loading = false,
  error = null,
  emptyTitle,
  emptyDescription,
  onOpenTask
}: TaskDashboardWidgetProps): React.JSX.Element {
  return (
    <DashboardWidget
      count={tasks.length}
      description={description}
      error={error}
      kind={kind}
      loading={loading}
      title={title}
      {...(emptyDescription === undefined ? {} : { emptyDescription })}
      {...(emptyTitle === undefined ? {} : { emptyTitle })}
    >
      {loading || error !== null || tasks.length === 0 ? null : (
        <ol className="dashboard-widget-list">
          {tasks.map((task) => (
            <li key={task.itemId}>
              <button
                type="button"
                className="dashboard-widget-row"
                onClick={() => onOpenTask?.(task)}
              >
                <span className="dashboard-widget-row-main">
                  <strong>{task.title}</strong>
                  <span>
                    <CalendarDays size={14} aria-hidden="true" />
                    {task.dueAt ?? "No due date"}
                  </span>
                </span>
                <span className="dashboard-widget-row-meta">
                  {task.priority === null ? null : (
                    <span>
                      <CircleAlert size={14} aria-hidden="true" />
                      P{task.priority}
                    </span>
                  )}
                  <span>{task.taskStatus}</span>
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
