import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListTodo,
  RotateCcw,
  X
} from "lucide-react";
import { ReorderControls } from "./ReorderControls";

export type TodayTaskCardViewModel = {
  itemId: string;
  title: string;
  body?: string | null;
  taskStatus: string;
  itemStatus: string;
  dueAt: string | null;
  priority?: number | null;
  containerId: string;
  plannedLane?: "today" | "tomorrow" | "backlog" | null;
  plannedSortOrder?: number | null;
  addedManually?: boolean;
  containerLabel?: string | null;
  sourceLabel?: string | null;
};

export type TodayTaskCardProps = {
  task: TodayTaskCardViewModel;
  lane?: "today" | "tomorrow" | "backlog";
  busy?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onOpenSource?: (task: TodayTaskCardViewModel) => void;
  onToggleComplete?: (task: TodayTaskCardViewModel) => Promise<void> | void;
  onPlanTask?: (
    task: TodayTaskCardViewModel,
    lane: "today" | "tomorrow"
  ) => Promise<void> | void;
  onUnplanTask?: (task: TodayTaskCardViewModel) => Promise<void> | void;
  onReorderTask?: (
    task: TodayTaskCardViewModel,
    direction: "up" | "down"
  ) => Promise<void> | void;
};

export function TodayTaskCard({
  task,
  lane = "today",
  busy = false,
  canMoveUp = false,
  canMoveDown = false,
  onOpenSource,
  onToggleComplete,
  onPlanTask,
  onUnplanTask,
  onReorderTask
}: TodayTaskCardProps): React.JSX.Element {
  const completed = task.taskStatus === "done" || task.itemStatus === "completed";
  const dueLabel = formatDueLabel(task.dueAt);
  const plannedHere = task.plannedLane === lane;

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

      <div className="today-task-card-actions">
        <div className="today-task-plan-actions">
          <button
            className="secondary-button compact-button"
            disabled={busy || task.plannedLane === "today"}
            type="button"
            onClick={() => {
              void onPlanTask?.(task, "today");
            }}
          >
            <CalendarDays size={16} aria-hidden="true" />
            Today
          </button>
          <button
            className="secondary-button compact-button"
            disabled={busy || task.plannedLane === "tomorrow"}
            type="button"
            onClick={() => {
              void onPlanTask?.(task, "tomorrow");
            }}
          >
            <ListTodo size={16} aria-hidden="true" />
            Tomorrow
          </button>
          <button
            className="secondary-button compact-button"
            disabled={busy || !plannedHere}
            type="button"
            onClick={() => {
              void onUnplanTask?.(task);
            }}
          >
            <X size={16} aria-hidden="true" />
            Remove
          </button>
        </div>
        <ReorderControls
          busy={busy}
          canMoveDown={plannedHere && canMoveDown}
          canMoveUp={plannedHere && canMoveUp}
          label={`Reorder ${task.title}`}
          onMoveDown={() => onReorderTask?.(task, "down")}
          onMoveUp={() => onReorderTask?.(task, "up")}
        />
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
      </div>
    </article>
  );
}

function formatDueLabel(value: string | null): string {
  if (value === null) {
    return "No due date";
  }

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
