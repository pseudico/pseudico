import { FormEvent, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";

export type QuickAddTargetOption = {
  id: string;
  name: string;
  type: "inbox" | "project";
  description?: string | null;
};

export type QuickAddFormValues = {
  title: string;
  dueDate: string;
  targetContainerId: string;
};

export type QuickAddFormProps = {
  disabled?: boolean;
  error?: string | null;
  selectedTargetId: string;
  success?: string | null;
  targets: readonly QuickAddTargetOption[];
  onSubmit: (values: QuickAddFormValues) => Promise<boolean | void> | boolean | void;
  onTargetChange: (targetContainerId: string) => void;
};

export function QuickAddForm({
  disabled = false,
  error = null,
  selectedTargetId,
  success = null,
  targets,
  onSubmit,
  onTargetChange
}: QuickAddFormProps): React.JSX.Element {
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

    if (selectedTargetId.length === 0) {
      setFormError("Choose where to save the task.");
      return;
    }

    setFormError(null);
    const submitted = await onSubmit({
      title: trimmedTitle,
      dueDate,
      targetContainerId: selectedTargetId
    });

    if (submitted === false) {
      return;
    }

    setTitle("");
    setDueDate("");
  }

  const disabledForm = disabled || targets.length === 0;

  return (
    <form
      className="quick-add-form"
      aria-label="Quick add task"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <label>
        <span>Task</span>
        <input
          autoFocus
          disabled={disabledForm}
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
            disabled={disabledForm}
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.currentTarget.value)}
          />
        </span>
      </label>

      <label>
        <span>Save to</span>
        <select
          disabled={disabledForm}
          value={selectedTargetId}
          onChange={(event) => onTargetChange(event.currentTarget.value)}
        >
          {targets.map((target) => (
            <option key={target.id} value={target.id}>
              {target.name}
            </option>
          ))}
        </select>
      </label>

      <button
        className="primary-button"
        disabled={disabledForm || selectedTargetId.length === 0}
        type="submit"
      >
        <Plus size={17} aria-hidden="true" />
        Add task
      </button>

      {formError === null && error === null && success === null ? null : (
        <p
          className={`form-message ${
            formError !== null || error !== null
              ? "form-message-error"
              : "form-message-ok"
          }`}
        >
          {formError ?? error ?? success}
        </p>
      )}
    </form>
  );
}
