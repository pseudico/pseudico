import { FormEvent, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";

export type TaskQuickAddValues = {
  title: string;
  dueDate: string;
};

export type TaskQuickAddProps = {
  contextLabel: string;
  disabled?: boolean;
  error?: string | null;
  onSubmit: (values: TaskQuickAddValues) => Promise<boolean | void> | boolean | void;
};

export function TaskQuickAdd({
  contextLabel,
  disabled = false,
  error = null,
  onSubmit
}: TaskQuickAddProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      setFormError("Task title is required.");
      return;
    }

    setFormError(null);
    const submitted = await onSubmit({
      title: trimmedTitle,
      dueDate
    });

    if (submitted === false) {
      return;
    }

    setTitle("");
    setDueDate("");
  }

  return (
    <form
      className="task-quick-add"
      aria-label={`Add task to ${contextLabel}`}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <label>
        <span>Task</span>
        <input
          disabled={disabled}
          placeholder="New task"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
      </label>

      <label>
        <span>Due</span>
        <span className="task-date-input">
          <CalendarPlus size={16} aria-hidden="true" />
          <input
            disabled={disabled}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.currentTarget.value)}
          />
        </span>
      </label>

      <button className="primary-button" disabled={disabled} type="submit">
        <Plus size={17} aria-hidden="true" />
        Add task
      </button>

      {formError === null && error === null ? null : (
        <p className="form-message form-message-error">
          {formError ?? error}
        </p>
      )}
    </form>
  );
}
