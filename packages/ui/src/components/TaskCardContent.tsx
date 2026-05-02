import { CalendarDays, CheckCircle2, RotateCcw } from "lucide-react";
import type { UniversalItemViewModel } from "./ItemCard";

export type TaskCardViewModel = UniversalItemViewModel & {
  taskStatus?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  priority?: number | null;
  allDay?: boolean | null;
  timezone?: string | null;
};

export type TaskCardContentProps = {
  item: TaskCardViewModel;
  disabled?: boolean;
  onDueDateChange?: (item: TaskCardViewModel, dueDate: string) => Promise<void> | void;
  onToggleComplete?: (item: TaskCardViewModel) => Promise<void> | void;
};

export function TaskCardContent({
  item,
  disabled = false,
  onDueDateChange,
  onToggleComplete
}: TaskCardContentProps): React.JSX.Element {
  const completed = item.taskStatus === "done" || item.status === "completed";
  const dueDate = toDateInputValue(item.dueAt);

  return (
    <div className="task-card-content" data-task-status={item.taskStatus ?? item.status}>
      {item.body === undefined || item.body === null || item.body.length === 0 ? null : (
        <p>{item.body}</p>
      )}

      <div className="task-card-controls">
        <button
          className={completed ? "secondary-button compact-button" : "primary-button compact-button"}
          disabled={disabled}
          type="button"
          onClick={() => {
            void onToggleComplete?.(item);
          }}
        >
          {completed ? (
            <RotateCcw size={16} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={16} aria-hidden="true" />
          )}
          {completed ? "Reopen" : "Complete"}
        </button>

        <label className="task-card-due-field">
          <span>
            <CalendarDays size={15} aria-hidden="true" />
            Due
          </span>
          <input
            disabled={disabled}
            type="date"
            value={dueDate}
            onChange={(event) => {
              void onDueDateChange?.(item, event.currentTarget.value);
            }}
          />
        </label>
      </div>
    </div>
  );
}

function toDateInputValue(value: string | null | undefined): string {
  if (value === undefined || value === null || value.trim().length === 0) {
    return "";
  }

  return value.slice(0, 10);
}
