import { CheckCircle2, RotateCcw } from "lucide-react";
import type { ParsedDateRange } from "@local-work-os/core";
import type { UniversalItemViewModel } from "./ItemCard";
import { DateRangeInput } from "./DateRangeInput";

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
  onDateRangeChange?: (
    item: TaskCardViewModel,
    range: ParsedDateRange
  ) => Promise<void> | void;
  onDueDateChange?: (item: TaskCardViewModel, dueDate: string) => Promise<void> | void;
  onToggleComplete?: (item: TaskCardViewModel) => Promise<void> | void;
};

export function TaskCardContent({
  item,
  disabled = false,
  onDateRangeChange,
  onDueDateChange,
  onToggleComplete
}: TaskCardContentProps): React.JSX.Element {
  const completed = item.taskStatus === "done" || item.status === "completed";

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
      </div>
    </div>
  );
}
