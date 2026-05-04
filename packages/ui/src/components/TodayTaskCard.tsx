import { ArrowRight, CheckCircle2, Clock3, RotateCcw } from "lucide-react";

export type TodayTaskCardViewModel = {
  itemId: string;
  title: string;
  body?: string | null;
  taskStatus: string;
  itemStatus: string;
  dueAt: string;
  priority?: number | null;
  containerId: string;
  containerLabel?: string | null;
  sourceLabel?: string | null;
};

export type TodayTaskCardProps = {
  task: TodayTaskCardViewModel;
  busy?: boolean;
  onOpenSource?: (task: TodayTaskCardViewModel) => void;
  onToggleComplete?: (task: TodayTaskCardViewModel) => Promise<void> | void;
};

export function TodayTaskCard({
  task,
  busy = false,
  onOpenSource,
  onToggleComplete
}: TodayTaskCardProps): React.JSX.Element {
  const completed = task.taskStatus === "done" || task.itemStatus === "completed";
  const dueLabel = formatDueLabel(task.dueAt);

  return (
    <article className="today-task-card" data-task-status={task.taskStatus}>
      <div className="today-task-card-main">
        <button
          className="today-task-title-button"
          type="button"
          onClick={() => onOpenSource?.(task)}
        >
          <span>{task.title}</span>
          <ArrowRight size={15} aria-hidden="true" />
        </button>
        {task.body === undefined || task.body === null || task.body.length === 0 ? null : (
          <p>{task.body}</p>
        )}
      </div>

      <div className="today-task-card-meta">
        <span>
          <Clock3 size={14} aria-hidden="true" />
          {dueLabel}
        </span>
        {task.priority === undefined || task.priority === null ? null : (
          <span>Priority {task.priority}</span>
        )}
        {task.sourceLabel === undefined || task.sourceLabel === null ? null : (
          <span>{task.sourceLabel}</span>
        )}
      </div>

      <button
        className={completed ? "secondary-button compact-button" : "primary-button compact-button"}
        disabled={busy}
        type="button"
        onClick={() => {
          void onToggleComplete?.(task);
        }}
      >
        {completed ? (
          <RotateCcw size={16} aria-hidden="true" />
        ) : (
          <CheckCircle2 size={16} aria-hidden="true" />
        )}
        {completed ? "Reopen" : "Complete"}
      </button>
    </article>
  );
}

function formatDueLabel(value: string): string {
  if (value.endsWith("T00:00:00.000Z")) {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}
