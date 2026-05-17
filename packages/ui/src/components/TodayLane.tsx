import { AlertTriangle, CalendarDays, ListTodo, type LucideIcon } from "lucide-react";
import {
  TodayTaskCard,
  type TodayTaskCardViewModel
} from "./TodayTaskCard";
import type { SnoozePreset } from "./SnoozeMenu";

export type TodayLaneKind = "today" | "tomorrow" | "backlog";

export type TodayLaneProps = {
  title: string;
  description: string;
  kind: TodayLaneKind;
  tasks: TodayTaskCardViewModel[];
  busyTaskId?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  loading?: boolean;
  error?: string | null;
  totalTaskCount?: number;
  returnedTaskCount?: number;
  taskLimit?: number | null;
  hasMore?: boolean;
  onShowMore?: () => Promise<void> | void;
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
  onSnoozeTask?: (
    task: TodayTaskCardViewModel,
    preset: SnoozePreset
  ) => Promise<void> | void;
  onRescheduleTask?: (
    task: TodayTaskCardViewModel,
    dueAt: string | null
  ) => Promise<void> | void;
};

const laneIcons = {
  today: CalendarDays,
  tomorrow: ListTodo,
  backlog: AlertTriangle
} satisfies Record<TodayLaneKind, LucideIcon>;

export function TodayLane({
  title,
  description,
  kind,
  tasks,
  busyTaskId = null,
  emptyTitle = "No tasks",
  emptyDescription = "Tasks matching this lane will appear here.",
  loading = false,
  error = null,
  totalTaskCount = tasks.length,
  returnedTaskCount = tasks.length,
  taskLimit = null,
  hasMore = false,
  onShowMore,
  onOpenSource,
  onToggleComplete,
  onPlanTask,
  onUnplanTask,
  onReorderTask,
  onSnoozeTask,
  onRescheduleTask
}: TodayLaneProps): React.JSX.Element {
  const LaneIcon = laneIcons[kind];
  const plannedTaskIds = tasks
    .filter((task) => task.plannedLane === kind)
    .map((task) => task.itemId);
  const countLabel = hasMore ? `${returnedTaskCount}/${totalTaskCount}` : `${totalTaskCount}`;
  const reachedMaximumVisibleTasks = taskLimit !== null && taskLimit >= 500;

  return (
    <section className="today-lane" data-today-lane={kind}>
      <header className="today-lane-header">
        <div>
          <LaneIcon size={18} aria-hidden="true" />
          <h3>{title}</h3>
        </div>
        <span>{countLabel}</span>
      </header>
      <p>{description}</p>

      {loading ? <p className="muted-text">Loading tasks...</p> : null}
      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      {!loading && error === null && tasks.length === 0 ? (
        <div className="today-lane-empty">
          <strong>{emptyTitle}</strong>
          <span>{emptyDescription}</span>
        </div>
      ) : null}

      {!loading && error === null && hasMore ? (
        <div className="today-lane-limit" role="status">
          <strong>Showing the first {returnedTaskCount} of {totalTaskCount} tasks.</strong>
          <span>
            {reachedMaximumVisibleTasks
              ? "Earliest work is shown first so urgent due and overdue items stay visible. Use Search or narrow the backlog window for the rest of this lane."
              : "Earliest work is shown first so urgent due and overdue items stay visible. Use Search for a specific task or load more if you need the full lane."}
          </span>
          <button
            className="secondary-button compact-button"
            disabled={reachedMaximumVisibleTasks}
            type="button"
            onClick={() => {
              void onShowMore?.();
            }}
          >
            Show 50 more
          </button>
        </div>
      ) : null}

      <div className="today-task-list">
        {tasks.map((task) => {
          const plannedIndex = plannedTaskIds.indexOf(task.itemId);

          return (
            <TodayTaskCard
              busy={busyTaskId === task.itemId}
              canMoveDown={
                plannedIndex >= 0 && plannedIndex < plannedTaskIds.length - 1
              }
              canMoveUp={plannedIndex > 0}
              key={task.itemId}
              lane={kind}
              task={task}
              {...(onOpenSource === undefined ? {} : { onOpenSource })}
              {...(onToggleComplete === undefined ? {} : { onToggleComplete })}
              {...(onPlanTask === undefined ? {} : { onPlanTask })}
              {...(onUnplanTask === undefined ? {} : { onUnplanTask })}
              {...(onReorderTask === undefined ? {} : { onReorderTask })}
              {...(onSnoozeTask === undefined ? {} : { onSnoozeTask })}
              {...(onRescheduleTask === undefined ? {} : { onRescheduleTask })}
            />
          );
        })}
      </div>
    </section>
  );
}
