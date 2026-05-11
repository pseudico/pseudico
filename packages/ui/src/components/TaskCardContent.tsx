import { CheckCircle2, RotateCcw } from "lucide-react";
import type { ParsedDateRange } from "@local-work-os/core";
import type { UniversalItemViewModel } from "./ItemCard";
import { DateRangeInput } from "./DateRangeInput";
import { SnoozeMenu, type SnoozePreset } from "./SnoozeMenu";

export type TaskCardViewModel = UniversalItemViewModel & {
  taskStatus?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  priority?: number | null;
  allDay?: boolean | null;
  timezone?: string | null;
};

export type TaskCardStatus = "open" | "waiting" | "someday" | "deferred" | "done" | "cancelled";

export type TaskCardContentProps = {
  item: TaskCardViewModel;
  disabled?: boolean;
  onDateRangeChange?: (
    item: TaskCardViewModel,
    range: ParsedDateRange
  ) => Promise<void> | void;
  onDueDateChange?: (item: TaskCardViewModel, dueDate: string) => Promise<void> | void;
  onSnoozeTask?: (
    item: TaskCardViewModel,
    preset: SnoozePreset
  ) => Promise<void> | void;
  onRescheduleTask?: (
    item: TaskCardViewModel,
    dueAt: string | null
  ) => Promise<void> | void;
  onPriorityChange?: (
    item: TaskCardViewModel,
    priority: number | null
  ) => Promise<void> | void;
  onStatusChange?: (
    item: TaskCardViewModel,
    status: TaskCardStatus
  ) => Promise<void> | void;
  onToggleComplete?: (item: TaskCardViewModel) => Promise<void> | void;
};

export function TaskCardContent({
  item,
  disabled = false,
  onDateRangeChange,
  onDueDateChange,
  onSnoozeTask,
  onRescheduleTask,
  onPriorityChange,
  onStatusChange,
  onToggleComplete
}: TaskCardContentProps): React.JSX.Element {
  const taskStatus = normalizeTaskStatus(item.taskStatus ?? item.status);
  const completed = taskStatus === "done" || item.status === "completed";

  return (
    <div className="task-card-content" data-task-status={taskStatus}>
      {item.body === undefined || item.body === null || item.body.length === 0 ? null : (
        <p>{item.body}</p>
      )}

      <TaskDetailsRow
        dueAt={item.dueAt}
        priority={item.priority}
        status={taskStatus}
        timezone={item.timezone}
      />

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

        <DateRangeInput
          allDay={item.allDay}
          disabled={disabled}
          dueAt={item.dueAt}
          label="Date"
          startAt={item.startAt}
          onChange={(range) => {
            if (onDateRangeChange !== undefined) {
              void onDateRangeChange(item, range);
              return;
            }

            void onDueDateChange?.(item, range.dueAt ?? "");
          }}
        />
        <SnoozeMenu
          busy={disabled}
          onReschedule={(dueAt) => onRescheduleTask?.(item, dueAt)}
          onSnoozePreset={(preset) => onSnoozeTask?.(item, preset)}
        />
        <label className="task-card-select-field">
          <span>Priority</span>
          <select
            disabled={disabled || onPriorityChange === undefined}
            value={item.priority ?? ""}
            onChange={(event) => {
              const value = event.currentTarget.value;
              void onPriorityChange?.(
                item,
                value.length === 0 ? null : Number(value)
              );
            }}
          >
            <option value="">None</option>
            {[0, 1, 2, 3, 4, 5].map((priority) => (
              <option key={priority} value={priority}>
                P{priority}
              </option>
            ))}
          </select>
        </label>
        <label className="task-card-select-field">
          <span>Status</span>
          <select
            disabled={disabled || onStatusChange === undefined}
            value={taskStatus}
            onChange={(event) => {
              void onStatusChange?.(
                item,
                event.currentTarget.value as TaskCardStatus
              );
            }}
          >
            <option value="open">Open</option>
            <option value="waiting">Waiting</option>
            <option value="someday">Someday</option>
            <option value="deferred">Deferred</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>
    </div>
  );
}

export function TaskDetailsRow({
  dueAt,
  priority,
  status,
  timezone
}: {
  dueAt?: string | null | undefined;
  priority?: number | null | undefined;
  status: TaskCardStatus;
  timezone?: string | null | undefined;
}): React.JSX.Element {
  return (
    <div className="task-details-row" aria-label="Task details">
      <span className={`task-status-pill task-status-pill-${status}`}>
        {formatTaskStatus(status)}
      </span>
      <span className={`task-priority-pill task-priority-pill-${priority ?? "none"}`}>
        {priority === undefined || priority === null ? "No priority" : `P${priority}`}
      </span>
      {dueAt === undefined || dueAt === null ? (
        <span>No due date</span>
      ) : (
        <span>Due {dueAt.slice(0, 10)}</span>
      )}
      {timezone === undefined || timezone === null ? null : <span>{timezone}</span>}
    </div>
  );
}

function normalizeTaskStatus(status: string | null | undefined): TaskCardStatus {
  return status === "waiting" ||
    status === "done" ||
    status === "someday" ||
    status === "deferred" ||
    status === "cancelled" ||
    status === "open"
    ? status
    : "open";
}

function formatTaskStatus(status: TaskCardStatus): string {
  if (status === "done") {
    return "Done";
  }

  if (status === "waiting") {
    return "Waiting";
  }

  if (status === "someday") {
    return "Someday";
  }

  if (status === "deferred") {
    return "Deferred";
  }

  if (status === "cancelled") {
    return "Cancelled";
  }

  return "Open";
}
