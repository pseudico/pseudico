import { Repeat2 } from "lucide-react";

export type RecurrencePickerFrequency = "daily" | "weekly";
export type RecurrencePickerValue = {
  frequency: RecurrencePickerFrequency;
  interval: number;
  weekdays?: number[] | null;
} | null;

export type RecurrencePickerProps = {
  value?: RecurrencePickerValue;
  disabled?: boolean;
  onSetRecurrence?: (value: Exclude<RecurrencePickerValue, null>) => Promise<void> | void;
  onClearRecurrence?: () => Promise<void> | void;
};

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" }
] as const;

export function RecurrencePicker({
  value = null,
  disabled = false,
  onSetRecurrence,
  onClearRecurrence
}: RecurrencePickerProps): React.JSX.Element {
  const frequency = value?.frequency ?? "daily";
  const interval = value?.interval ?? 1;
  const selectedWeekdays = value?.weekdays ?? [];

  function emit(next: Exclude<RecurrencePickerValue, null>): void {
    void onSetRecurrence?.(next);
  }

  return (
    <div className="recurrence-picker" data-recurrence-frequency={value?.frequency ?? "none"}>
      <label className="recurrence-picker-field">
        <span>
          <Repeat2 size={15} aria-hidden="true" />
          Repeat
        </span>
        <select
          disabled={disabled}
          value={frequency}
          onChange={(event) => {
            const nextFrequency = event.currentTarget.value as RecurrencePickerFrequency;
            emit({
              frequency: nextFrequency,
              interval,
              weekdays: nextFrequency === "weekly" ? selectedWeekdays : null
            });
          }}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </label>

      <label className="recurrence-picker-field">
        <span>Every</span>
        <input
          disabled={disabled}
          min={1}
          type="number"
          value={interval}
          onChange={(event) => {
            const nextInterval = Number(event.currentTarget.value);

            if (!Number.isInteger(nextInterval) || nextInterval < 1) {
              return;
            }

            emit({
              frequency,
              interval: nextInterval,
              weekdays: frequency === "weekly" ? selectedWeekdays : null
            });
          }}
        />
        <span>{frequency === "daily" ? "day(s)" : "week(s)"}</span>
      </label>

      {frequency === "weekly" ? (
        <fieldset className="recurrence-picker-weekdays" disabled={disabled}>
          <legend>On weekdays</legend>
          {WEEKDAYS.map((weekday) => {
            const checked = selectedWeekdays.includes(weekday.value);
            return (
              <label key={weekday.value}>
                <input
                  checked={checked}
                  type="checkbox"
                  onChange={() => {
                    const weekdays = checked
                      ? selectedWeekdays.filter((day) => day !== weekday.value)
                      : [...selectedWeekdays, weekday.value].sort((a, b) => a - b);
                    emit({ frequency, interval, weekdays });
                  }}
                />
                {weekday.label}
              </label>
            );
          })}
        </fieldset>
      ) : null}

      <button
        className="secondary-button compact-button"
        disabled={disabled || value === null}
        type="button"
        onClick={() => {
          void onClearRecurrence?.();
        }}
      >
        Clear repeat
      </button>
    </div>
  );
}
