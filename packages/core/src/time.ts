import type { TaskDateRange } from "./entities/Task";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type Clock = () => Date;

export type LocalDateInput = string | Date;

export type LocalDayRange = TaskDateRange & {
  localDate: string;
};

export function createIsoTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

export function createLocalDayRange(input: LocalDateInput): LocalDayRange {
  const parts = parseLocalDateParts(input, "date");
  return createLocalDayRangeFromParts(parts.year, parts.monthIndex, parts.day);
}

export function createRelativeLocalDayRange(
  input: LocalDateInput,
  offsetDays: number
): LocalDayRange {
  assertInteger(offsetDays, "offsetDays");

  const parts = parseLocalDateParts(input, "date");
  return createLocalDayRangeFromParts(
    parts.year,
    parts.monthIndex,
    parts.day + offsetDays
  );
}

export function createLocalDayWindowRange(input: {
  date: LocalDateInput;
  startOffsetDays: number;
  endOffsetDays: number;
}): TaskDateRange {
  assertInteger(input.startOffsetDays, "startOffsetDays");
  assertInteger(input.endOffsetDays, "endOffsetDays");

  if (input.startOffsetDays >= input.endOffsetDays) {
    throw new Error("startOffsetDays must be before endOffsetDays.");
  }

  return {
    startInclusive: createRelativeLocalDayRange(
      input.date,
      input.startOffsetDays
    ).startInclusive,
    endExclusive: createRelativeLocalDayRange(
      input.date,
      input.endOffsetDays
    ).startInclusive
  };
}

export function formatLocalDate(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error("date must be valid.");
  }

  return [
    date.getFullYear().toString().padStart(4, "0"),
    (date.getMonth() + 1).toString().padStart(2, "0"),
    date.getDate().toString().padStart(2, "0")
  ].join("-");
}

function createLocalDayRangeFromParts(
  year: number,
  monthIndex: number,
  day: number
): LocalDayRange {
  const start = new Date(year, monthIndex, day, 0, 0, 0, 0);
  const end = new Date(year, monthIndex, day + 1, 0, 0, 0, 0);

  return {
    localDate: formatLocalDate(start),
    startInclusive: start.toISOString(),
    endExclusive: end.toISOString()
  };
}

function parseLocalDateParts(
  input: LocalDateInput,
  fieldName: string
): { year: number; monthIndex: number; day: number } {
  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) {
      throw new Error(`${fieldName} must be valid.`);
    }

    return {
      year: input.getFullYear(),
      monthIndex: input.getMonth(),
      day: input.getDate()
    };
  }

  const trimmed = input.trim();

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    const year = Number(trimmed.slice(0, 4));
    const month = Number(trimmed.slice(5, 7));
    const day = Number(trimmed.slice(8, 10));
    return { year, monthIndex: month - 1, day };
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date or ISO timestamp.`);
  }

  return {
    year: parsed.getFullYear(),
    monthIndex: parsed.getMonth(),
    day: parsed.getDate()
  };
}

function assertInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${fieldName} must be an integer.`);
  }
}
