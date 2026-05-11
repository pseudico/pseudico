import { Bell, BellOff } from "lucide-react";

export type ReminderPickerValue =
  | { mode: "relative"; leadMinutes: number; anchor?: "due" | "start" }
  | { mode: "absolute"; triggerAt: string; anchor?: "due" | "start" }
  | null;

export type ReminderPickerProps = {
  value?: ReminderPickerValue;
  disabled?: boolean;
  notificationsEnabled?: boolean;
  onSetReminder?: (value: Exclude<ReminderPickerValue, null>) => Promise<void> | void;
  onClearReminder?: () => Promise<void> | void;
  onNotificationsEnabledChange?: (enabled: boolean) => Promise<void> | void;
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
  notificationsEnabled = true,
  onSetReminder,
  onClearReminder,
  onNotificationsEnabledChange
}: ReminderPickerProps): React.JSX.Element {
  const absoluteValue = value?.mode === "absolute" ? toDateTimeLocalValue(value.triggerAt) : "";
  const anchor = value?.anchor ?? "due";

  return (
    <div
      className="reminder-picker"
      data-notifications-enabled={notificationsEnabled ? "true" : "false"}
      data-reminder-anchor={anchor}
      data-reminder-mode={value?.mode ?? "none"}
    >
      <label className="reminder-picker-field">
        <span>Notifications</span>
        <select
          disabled={disabled}
          value={notificationsEnabled ? "enabled" : "disabled"}
          onChange={(event) => {
            void onNotificationsEnabledChange?.(event.currentTarget.value === "enabled");
          }}
        >
          <option value="enabled">Local notifications on</option>
          <option value="disabled">Local notifications off</option>
        </select>
      </label>

      <label className="reminder-picker-field">
        <span>Anchor</span>
        <select
          disabled={disabled}
          value={anchor}
          onChange={(event) => {
            const nextAnchor = event.currentTarget.value === "start" ? "start" : "due";
            if (value?.mode === "relative") {
              void onSetReminder?.({
                mode: "relative",
                leadMinutes: value.leadMinutes,
                anchor: nextAnchor
              });
            }
          }}
        >
          <option value="due">Before due date</option>
          <option value="start">Before start date</option>
        </select>
      </label>

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
              leadMinutes: Number(selected),
              anchor
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
              triggerAt: new Date(event.currentTarget.value).toISOString(),
              anchor
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
