import { Bell, BellOff } from "lucide-react";

export type ReminderPickerValue =
  | { mode: "relative"; leadMinutes: number }
  | { mode: "absolute"; triggerAt: string }
  | null;

export type ReminderPickerProps = {
  value?: ReminderPickerValue;
  disabled?: boolean;
  onSetReminder?: (value: Exclude<ReminderPickerValue, null>) => Promise<void> | void;
  onClearReminder?: () => Promise<void> | void;
};

const RELATIVE_PRESETS = [
  { label: "At due time", leadMinutes: 0 },
  { label: "15 min before", leadMinutes: 15 },
  { label: "1 hour before", leadMinutes: 60 },
  { label: "1 day before", leadMinutes: 1440 }
] as const;

export function ReminderPicker({
  value = null,
  disabled = false,
  onSetReminder,
  onClearReminder
}: ReminderPickerProps): React.JSX.Element {
  const absoluteValue = value?.mode === "absolute" ? toDateTimeLocalValue(value.triggerAt) : "";

  return (
    <div className="reminder-picker" data-reminder-mode={value?.mode ?? "none"}>
      <label className="reminder-picker-field">
        <span>
          <Bell size={15} aria-hidden="true" />
          Reminder
        </span>
        <select
          disabled={disabled}
          value={value?.mode === "relative" ? String(value.leadMinutes) : ""}
          onChange={(event) => {
            const selected = event.currentTarget.value;

            if (selected.length === 0) {
              return;
            }

            void onSetReminder?.({
              mode: "relative",
              leadMinutes: Number(selected)
            });
          }}
        >
          <option value="">Choose preset</option>
          {RELATIVE_PRESETS.map((preset) => (
            <option key={preset.leadMinutes} value={preset.leadMinutes}>
              {preset.label}
            </option>
          ))}
        </select>
      </label>

      <label className="reminder-picker-field">
        <span>Custom</span>
        <input
          disabled={disabled}
          type="datetime-local"
          value={absoluteValue}
          onChange={(event) => {
            if (event.currentTarget.value.length === 0) {
              return;
            }

            void onSetReminder?.({
              mode: "absolute",
              triggerAt: new Date(event.currentTarget.value).toISOString()
            });
          }}
        />
      </label>

      <button
        className="secondary-button compact-button"
        disabled={disabled || value === null}
        type="button"
        onClick={() => {
          void onClearReminder?.();
        }}
      >
        <BellOff size={15} aria-hidden="true" />
        Clear
      </button>
    </div>
  );
}

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}
