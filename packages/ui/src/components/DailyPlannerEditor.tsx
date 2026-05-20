import {
  buildQuickAddTaskSubmission,
  type QuickAddFormValues
} from "../forms/QuickAddForm";
import type { NaturalDateParserOptions } from "@local-work-os/core";
import { formatAustralianDate } from "../dateFormat";
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
  | "Meta+Enter"
  | "Ctrl+Enter"
  | "Shift+Enter"
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
  const todayInputRef = useRef<HTMLTextAreaElement | null>(null);
  const tomorrowInputRef = useRef<HTMLTextAreaElement | null>(null);
  const activeDraft = drafts[activeLane];
  const activePreview = useMemo(
    () =>
      buildDailyPlannerSubmission(toDailyPlannerSubmissionInput({
        lane: activeLane,
        title: normalizePlannerDraft(activeDraft),
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
      title: normalizePlannerDraft(drafts[lane]),
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
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ): void {
    const command = getDailyPlannerKeyCommand({
      key: event.key,
      lane,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
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
            Capture a complete task in a real multiline field. Ctrl/Cmd+Enter
            saves and plans the task; Shift+Enter adds another line; Arrow
            Up/Down switches lanes; Escape clears the current draft.
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

      <div className="daily-planner-feedback" aria-live="polite">
        <span>Active lane: {formatPlannerLane(activeLane)}</span>
        <span>Destination: {targetContainerName}</span>
        <span>
          Due: {activePreview.ok && activePreview.values.dueAt != null
            ? formatAustralianDate(activePreview.values.dueAt)
            : activeLane === "today"
              ? formatAustralianDate(todayDueAt)
              : formatAustralianDate(tomorrowDueAt)}
        </span>
        <span>Submit: Ctrl/Cmd+Enter</span>
      </div>
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
      title: normalizePlannerDraft(result.values.title),
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
  ctrlKey?: boolean;
  key: string;
  lane: DailyPlannerLane;
  metaKey?: boolean;
  shiftKey?: boolean;
  title: string;
}): DailyPlannerLane | "clear" | "none" | "submit" {
  if (input.key === "ArrowDown") {
    return input.lane === "today" ? "tomorrow" : "today";
  }

  if (input.key === "ArrowUp") {
    return input.lane === "tomorrow" ? "today" : "tomorrow";
  }

  if (input.key === "Enter" && input.shiftKey === true) {
    return "none";
  }

  if (
    input.key === "Enter" &&
    (input.ctrlKey === true || input.metaKey === true)
  ) {
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
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  label: string;
  lane: DailyPlannerLane;
  value: string;
  onChange: (title: string) => void;
  onFocus: () => void;
  onKeyDown: (
    lane: DailyPlannerLane,
    event: React.KeyboardEvent<HTMLTextAreaElement>
  ) => void;
}): React.JSX.Element {
  return (
    <label className="daily-planner-lane-input">
      <span>{label}</span>
      <textarea
        ref={inputRef}
        disabled={disabled}
        rows={4}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        onFocus={onFocus}
        onKeyDown={(event) => onKeyDown(lane, event)}
      />
    </label>
  );
}


function normalizePlannerDraft(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function formatPlannerLane(lane: DailyPlannerLane): string {
  return lane === "today" ? "Today" : "Tomorrow";
}
