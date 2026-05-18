import {
  parseQuickTaskNaturalDate,
  type NaturalDateParserOptions
} from "@local-work-os/core";
import { FormEvent, useMemo, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";

export type QuickAddTargetOption = {
  id: string;
  name: string;
  type: "inbox" | "project" | "contact";
  description?: string | null;
};

export type QuickAddFormValues = {
  allDay?: boolean;
  dueAt?: string | null;
  title: string;
  dueDate: string;
  startAt?: string | null;
  targetContainerId: string;
  timezone?: string | null;
};

export type QuickAddFormProps = {
  disabled?: boolean;
  error?: string | null;
  naturalDateOptions?: NaturalDateParserOptions;
  selectedTargetId: string;
  success?: string | null;
  targets: readonly QuickAddTargetOption[];
  onSubmit: (values: QuickAddFormValues) => Promise<boolean | void> | boolean | void;
  onTargetChange: (targetContainerId: string) => void;
};

export type BuildQuickAddTaskSubmissionInput = {
  dueDate: string;
  naturalDateOptions?: NaturalDateParserOptions;
  removeParsedDateText?: boolean;
  targetContainerId: string;
  title: string;
};

export type BuildQuickAddTaskSubmissionResult =
  | {
      ok: true;
      values: QuickAddFormValues;
    }
  | {
      ok: false;
      error: string;
    };

export function buildQuickAddTaskSubmission(
  input: BuildQuickAddTaskSubmissionInput
): BuildQuickAddTaskSubmissionResult {
  const trimmedTitle = input.title.trim();

  if (trimmedTitle.length === 0) {
    return { ok: false, error: "Task title is required." };
  }

  if (input.targetContainerId.length === 0) {
    return { ok: false, error: "Choose where to save the task." };
  }

  const parsedDate = parseQuickTaskNaturalDate(
    input.title,
    input.naturalDateOptions
  );
  const useParsedDate = input.dueDate.length === 0 && parsedDate.dueAt !== null;
  const submittedTitle =
    useParsedDate && input.removeParsedDateText !== false
      ? parsedDate.title
      : trimmedTitle;

  if (submittedTitle.length === 0) {
    return {
      ok: false,
      error: "Task title is required after removing the parsed date."
    };
  }

  return {
    ok: true,
    values: {
      title: submittedTitle,
      dueDate: input.dueDate,
      dueAt: useParsedDate
        ? parsedDate.dueAt
        : input.dueDate.length === 0
          ? null
          : input.dueDate,
      startAt: useParsedDate ? parsedDate.startAt : null,
      allDay: useParsedDate ? parsedDate.allDay : true,
      timezone: useParsedDate ? parsedDate.timezone : null,
      targetContainerId: input.targetContainerId
    }
  };
}

export function QuickAddForm({
  disabled = false,
  error = null,
  naturalDateOptions,
  selectedTargetId,
  success = null,
  targets,
  onSubmit,
  onTargetChange
}: QuickAddFormProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [removeParsedDateText, setRemoveParsedDateText] = useState(true);
  const parsedDate = useMemo(
    () => parseQuickTaskNaturalDate(title, naturalDateOptions),
    [naturalDateOptions, title]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const submission = buildQuickAddTaskSubmission({
      title,
      dueDate,
      targetContainerId: selectedTargetId,
      removeParsedDateText,
      ...(naturalDateOptions === undefined ? {} : { naturalDateOptions })
    });

    if (!submission.ok) {
      setFormError(submission.error);
      return;
    }

    setFormError(null);
    const submitted = await onSubmit(submission.values);

    if (submitted === false) {
      return;
    }

    setTitle("");
    setDueDate("");
    setRemoveParsedDateText(true);
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
      <label className="quick-add-task-capture">
        <span>Task</span>
        <textarea
          autoFocus
          disabled={disabledForm}
          placeholder="Capture the full task, note to self, destination, date, and any @tags. Example: Call Priya tomorrow about revised launch-readiness evidence @client"
          rows={4}
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

      {parsedDate.dueAt === null ? null : (
        <div className="quick-add-date-preview" aria-live="polite">
          <span className="quick-add-date-chip">
            Parsed date: {parsedDate.label}
          </span>
          <span className="muted-text">
            {dueDate.length === 0
              ? "This date will be applied when the task is added."
              : "Manual due date overrides the parsed date."}
          </span>
          <label className="inline-checkbox">
            <input
              checked={removeParsedDateText}
              disabled={disabledForm}
              type="checkbox"
              onChange={(event) =>
                setRemoveParsedDateText(event.currentTarget.checked)
              }
            />
            <span>Remove parsed date text from task title</span>
          </label>
        </div>
      )}

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
