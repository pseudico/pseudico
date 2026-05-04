import { AlertTriangle, CalendarDays, ListTodo, type LucideIcon } from "lucide-react";
import {
  TodayTaskCard,
  type TodayTaskCardViewModel
} from "./TodayTaskCard";

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
  onOpenSource,
  onToggleComplete,
  onPlanTask,
  onUnplanTask,
  onReorderTask
}: TodayLaneProps): React.JSX.Element {
  const LaneIcon = laneIcons[kind];
  const plannedTaskIds = tasks
    .filter((task) => task.plannedLane === kind)
    .map((task) => task.itemId);

  return (
    <section className="today-lane" data-today-lane={kind}>
      <header className="today-lane-header">
        <div>
          <LaneIcon size={18} aria-hidden="true" />
          <h3>{title}</h3>
        </div>
        <span>{tasks.length}</span>
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
            />
          );
        })}
      </div>
    </section>
  );
}
