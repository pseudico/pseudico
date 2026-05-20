import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import {
  formatDateRangeInputValue,
  parseDateRangeInput,
  type ParsedDateRange
} from "@local-work-os/core";

export type DateRangeInputProps = {
  label?: string;
  startAt?: string | null | undefined;
  dueAt?: string | null | undefined;
  allDay?: boolean | null | undefined;
  disabled?: boolean;
  onChange?: (
    range: ParsedDateRange,
    rawValue: string
  ) => Promise<boolean | void> | boolean | void;
};

export function DateRangeInput({
  label = "Date",
  startAt = null,
  dueAt = null,
  allDay = true,
  disabled = false,
  onChange
}: DateRangeInputProps): React.JSX.Element {
  const [value, setValue] = useState(() =>
    formatDateRangeInputValue({ startAt, dueAt, allDay })
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(formatDateRangeInputValue({ startAt, dueAt, allDay }));
  }, [allDay, dueAt, startAt]);

  async function submit(nextValue: string): Promise<void> {
    try {
      const parsed = parseDateRangeInput(nextValue);
      setError(null);
      await onChange?.(parsed, nextValue);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Date range is invalid.");
    }
  }

  return (
    <label className="date-range-input">
      <span>
        <CalendarDays size={15} aria-hidden="true" />
        {label}
      </span>
      <input
        aria-invalid={error === null ? undefined : true}
        disabled={disabled}
        value={value}
        onBlur={() => {
          void submit(value);
        }}
        onChange={(event) => setValue(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void submit(value);
          }
        }}
      />
      {error === null ? null : <span className="form-message form-message-error">{error}</span>}
    </label>
  );
}

