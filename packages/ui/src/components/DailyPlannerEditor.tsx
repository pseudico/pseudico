import {
  buildQuickAddTaskSubmission,
  type QuickAddFormValues
} from "../forms/QuickAddForm";
import type { NaturalDateParserOptions } from "@local-work-os/core";
import { useMemo, useRef, useState } from "react";

export type DailyPlannerLane = "today" | "tomorrow";

export type DailyPlannerDraft = {
  lane: DailyPlannerLane;
  title: string;
};

export type DailyPlannerSubmission = QuickAddFormValues & {
  lane: DailyPlannerLane;
};

export type DailyPlannerEditorProps = {
  disabled?: boolean;
  error?: string | null;
  naturalDateOptions?: NaturalDateParserOptions;
  targetContainerId: string;
  targetContainerName?: string;
  todayDueAt: string;
  tomorrowDueAt: string;
  onSubmit: (
    submission: DailyPlannerSubmission
  ) => Promise<boolean | void> | boolean | void;
};

export type DailyPlannerKey =
  | "ArrowUp"
  | "ArrowDown"
  | "Enter"
  | "Escape";

export function DailyPlannerEditor({
  disabled = false,
  error = null,
  naturalDateOptions,
  targetContainerId,
  targetContainerName = "Inbox",
  todayDueAt,
  tomorrowDueAt,
  onSubmit
}: DailyPlannerEditorProps): React.JSX.Element {
  const [drafts, setDrafts] = useState<Record<DailyPlannerLane, string>>({
    today: "",
    tomorrow: ""
  });
  const [activeLane, setActiveLane] = useState<DailyPlannerLane>("today");
  const [formError, setFormError] = useState<string | null>(null);
  const todayInputRef = useRef<HTMLInputElement | null>(null);
  const tomorrowInputRef = useRef<HTMLInputElement | null>(null);
  const activeDraft = drafts[activeLane];
  const activePreview = useMemo(
    () =>
      buildDailyPlannerSubmission(toDailyPlannerSubmissionInput({
        lane: activeLane,
        title: activeDraft,
        targetContainerId,
        todayDueAt,
        tomorrowDueAt,
        naturalDateOptions
      })),
    [
      activeDraft,
      activeLane,
      naturalDateOptions,
      targetContainerId,
      todayDueAt,
      tomorrowDueAt
    ]
  );

  async function submitLane(lane: DailyPlannerLane): Promise<void> {
    const submission = buildDailyPlannerSubmission(toDailyPlannerSubmissionInput({
      lane,
      title: drafts[lane],
      targetContainerId,
      todayDueAt,
      tomorrowDueAt,
      naturalDateOptions
    }));

    if (!submission.ok) {
      setFormError(submission.error);
      return;
    }

    setFormError(null);
    const submitted = await onSubmit(submission.values);

    if (submitted === false) {
      return;
    }

    setDrafts((current) => ({ ...current, [lane]: "" }));
  }

  function focusLane(lane: DailyPlannerLane): void {
    setActiveLane(lane);
    (lane === "today" ? todayInputRef : tomorrowInputRef).current?.focus();
  }

  function handleKeyDown(
    lane: DailyPlannerLane,
    event: React.KeyboardEvent<HTMLInputElement>
  ): void {
    const command = getDailyPlannerKeyCommand({
      key: event.key,
      lane,
      title: drafts[lane]
    });

    if (command === "none") {
      return;
    }

    event.preventDefault();

    if (command === "submit") {
      void submitLane(lane);
      return;
    }

    if (command === "clear") {
      setDrafts((current) => ({ ...current, [lane]: "" }));
      setFormError(null);
      return;
    }

    focusLane(command);
  }

  const disabledEditor = disabled || targetContainerId.trim().length === 0;

  return (
    <section className="daily-planner-editor" aria-labelledby="daily-planner-editor-title">
      <div className="daily-planner-editor-heading">
        <div>
          <p className="top-eyebrow">Rapid day planner</p>
          <h3 id="daily-planner-editor-title">Keyboard planner</h3>
          <p>
            Type tasks directly into Today or Tomorrow. Enter saves and plans the
            task; Arrow Up/Down switches lanes; Escape clears the current draft.
          </p>
        </div>
        <span>Saving to {targetContainerName}</span>
      </div>

      <div className="daily-planner-editor-grid">
        <DailyPlannerLaneInput
          inputRef={todayInputRef}
          label="Today task"
          lane="today"
          disabled={disabledEditor}
          value={drafts.today}
          onChange={(title) => setDrafts((current) => ({ ...current, today: title }))}
          onFocus={() => setActiveLane("today")}
          onKeyDown={handleKeyDown}
        />
        <DailyPlannerLaneInput
          inputRef={tomorrowInputRef}
          label="Tomorrow task"
          lane="tomorrow"
          disabled={disabledEditor}
          value={drafts.tomorrow}
          onChange={(title) => setDrafts((current) => ({ ...current, tomorrow: title }))}
          onFocus={() => setActiveLane("tomorrow")}
          onKeyDown={handleKeyDown}
        />
      </div>

      {activePreview.ok && activePreview.values.dueAt != null ? (
        <p className="muted-text" aria-live="polite">
          Active draft due date: {(activePreview.values.dueAt ?? "").slice(0, 10)}
        </p>
      ) : null}
      {formError === null && error === null ? null : (
        <p className="form-message form-message-error">{formError ?? error}</p>
      )}
    </section>
  );
}

export function buildDailyPlannerSubmission(input: {
  lane: DailyPlannerLane;
  naturalDateOptions?: NaturalDateParserOptions;
  targetContainerId: string;
  title: string;
  todayDueAt: string;
  tomorrowDueAt: string;
}):
  | { ok: true; values: DailyPlannerSubmission }
  | { ok: false; error: string } {
  const laneDueAt = input.lane === "today" ? input.todayDueAt : input.tomorrowDueAt;
  const result = buildQuickAddTaskSubmission({
    title: input.title,
    dueDate: "",
    targetContainerId: input.targetContainerId,
    ...(input.naturalDateOptions === undefined
      ? {}
      : { naturalDateOptions: input.naturalDateOptions })
  });

  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    values: {
      title: result.values.title,
      dueDate: result.values.dueDate,
      dueAt: result.values.dueAt ?? laneDueAt,
      startAt: result.values.startAt ?? null,
      targetContainerId: result.values.targetContainerId,
      allDay: result.values.dueAt === null ? true : (result.values.allDay ?? true),
      timezone: result.values.dueAt === null ? null : (result.values.timezone ?? null),
      lane: input.lane
    }
  };
}

function toDailyPlannerSubmissionInput(input: {
  lane: DailyPlannerLane;
  naturalDateOptions?: NaturalDateParserOptions | undefined;
  targetContainerId: string;
  title: string;
  todayDueAt: string;
  tomorrowDueAt: string;
}): {
  lane: DailyPlannerLane;
  naturalDateOptions?: NaturalDateParserOptions;
  targetContainerId: string;
  title: string;
  todayDueAt: string;
  tomorrowDueAt: string;
} {
  return {
    lane: input.lane,
    title: input.title,
    targetContainerId: input.targetContainerId,
    todayDueAt: input.todayDueAt,
    tomorrowDueAt: input.tomorrowDueAt,
    ...(input.naturalDateOptions === undefined
      ? {}
      : { naturalDateOptions: input.naturalDateOptions })
  };
}

export function getDailyPlannerKeyCommand(input: {
  key: string;
  lane: DailyPlannerLane;
  title: string;
}): DailyPlannerLane | "clear" | "none" | "submit" {
  if (input.key === "ArrowDown") {
    return input.lane === "today" ? "tomorrow" : "today";
  }

  if (input.key === "ArrowUp") {
    return input.lane === "tomorrow" ? "today" : "tomorrow";
  }

  if (input.key === "Enter") {
    return "submit";
  }

  if (input.key === "Escape" && input.title.trim().length > 0) {
    return "clear";
  }

  return "none";
}

function DailyPlannerLaneInput({
  disabled,
  inputRef,
  label,
  lane,
  value,
  onChange,
  onFocus,
  onKeyDown
}: {
  disabled: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  label: string;
  lane: DailyPlannerLane;
  value: string;
  onChange: (title: string) => void;
  onFocus: () => void;
  onKeyDown: (
    lane: DailyPlannerLane,
    event: React.KeyboardEvent<HTMLInputElement>
  ) => void;
}): React.JSX.Element {
  return (
    <label className="daily-planner-lane-input">
      <span>{label}</span>
      <input
        ref={inputRef}
        disabled={disabled}
        placeholder={`Add a ${lane} task`}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onFocus={onFocus}
        onKeyDown={(event) => onKeyDown(lane, event)}
      />
    </label>
  );
}
