import { CalendarClock, CalendarPlus } from "lucide-react";
import { useState } from "react";

export type SnoozePreset = "tomorrow" | "next_week";

export type SnoozeMenuProps = {
  busy?: boolean;
  onSnoozePreset?: (preset: SnoozePreset) => Promise<void> | void;
  onReschedule?: (dueAt: string) => Promise<void> | void;
};

export function SnoozeMenu({
  busy = false,
  onSnoozePreset,
  onReschedule
}: SnoozeMenuProps): React.JSX.Element {
  const [customDate, setCustomDate] = useState("");

  return (
    <div className="snooze-menu">
      <button
        className="secondary-button compact-button"
        disabled={busy}
        type="button"
        onClick={() => {
          void onSnoozePreset?.("tomorrow");
        }}
      >
        <CalendarClock size={16} aria-hidden="true" />
        Tomorrow
      </button>
      <button
        className="secondary-button compact-button"
        disabled={busy}
        type="button"
        onClick={() => {
          void onSnoozePreset?.("next_week");
        }}
      >
        <CalendarPlus size={16} aria-hidden="true" />
        Next week
      </button>
      <label className="snooze-menu-custom">
        <input
          aria-label="Custom due date"
          disabled={busy}
          type="date"
          value={customDate}
          onChange={(event) => setCustomDate(event.currentTarget.value)}
        />
        <button
          className="secondary-button compact-button"
          disabled={busy || customDate.length === 0}
          type="button"
          onClick={() => {
            void onReschedule?.(customDate);
          }}
        >
          Apply
        </button>
      </label>
    </div>
  );
}
