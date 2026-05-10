export type ParsedDateRange = {
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
  timezone: string;
  label: string;
};

export type DateRangeParserOptions = {
  referenceDate?: Date;
  timezone?: string;
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?)?$/i;
const MONTH_DATE_PATTERN = /^([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?(?:\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?)?$/i;
const DATE_RANGE_SEPARATOR_PATTERN = /\s+(?:-|–|—|to)\s+/i;

const MONTHS = new Map([
  ["jan", 0], ["january", 0],
  ["feb", 1], ["february", 1],
  ["mar", 2], ["march", 2],
  ["apr", 3], ["april", 3],
  ["may", 4],
  ["jun", 5], ["june", 5],
  ["jul", 6], ["july", 6],
  ["aug", 7], ["august", 7],
  ["sep", 8], ["sept", 8], ["september", 8],
  ["oct", 9], ["october", 9],
  ["nov", 10], ["november", 10],
  ["dec", 11], ["december", 11]
]);

type DatePart = {
  year: number;
  monthIndex: number;
  day: number;
  hour: number;
  minute: number;
  hasTime: boolean;
};

export function parseDateRangeInput(
  input: string,
  options: DateRangeParserOptions = {}
): ParsedDateRange {
  const trimmed = input.trim();
  const timezone = options.timezone ?? getLocalTimeZone();

  if (trimmed.length === 0) {
    return {
      startAt: null,
      dueAt: null,
      allDay: true,
      timezone,
      label: "No date"
    };
  }

  const referenceDate = options.referenceDate ?? new Date();
  const [rawStart, rawEnd] = splitRangeInput(trimmed);
  const startPart = parseDatePart(rawStart, referenceDate, "date range start");
  const endPart =
    rawEnd === null
      ? null
      : parseDatePart(inheritMissingDateFields(rawEnd, startPart), referenceDate, "date range end");

  if (endPart === null) {
    return {
      startAt: null,
      dueAt: toLocalIsoString(startPart),
      allDay: !startPart.hasTime,
      timezone,
      label: formatDateRangeLabel({ startAt: null, dueAt: toLocalIsoString(startPart), allDay: !startPart.hasTime })
    };
  }

  const startAt = toLocalIsoString(startPart);
  const dueAt = toLocalIsoString(endPart);

  if (new Date(startAt).getTime() > new Date(dueAt).getTime()) {
    throw new Error("Date range end must be after or equal to the start.");
  }

  return {
    startAt,
    dueAt,
    allDay: !startPart.hasTime && !endPart.hasTime,
    timezone,
    label: formatDateRangeLabel({ startAt, dueAt, allDay: !startPart.hasTime && !endPart.hasTime })
  };
}

export function formatDateRangeInputValue(input: {
  startAt?: string | null;
  dueAt?: string | null;
  allDay?: boolean | null;
}): string {
  const allDay = input.allDay !== false;
  const start = formatDatePoint(input.startAt ?? null, allDay);
  const due = formatDatePoint(input.dueAt ?? null, allDay);

  if (start === null && due === null) {
    return "";
  }

  if (start === null) {
    return due ?? "";
  }

  if (due === null || due === start) {
    return start;
  }

  return `${start} - ${due}`;
}

export function formatDateRangeLabel(input: {
  startAt?: string | null;
  dueAt?: string | null;
  allDay?: boolean | null;
}): string {
  const value = formatDateRangeInputValue(input);
  return value.length === 0 ? "No date" : value;
}

export function getLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
}

function splitRangeInput(input: string): [string, string | null] {
  const parts = input.split(DATE_RANGE_SEPARATOR_PATTERN);

  if (parts.length === 1) {
    return [input, null];
  }

  if (parts.length !== 2 || parts[0] === undefined || parts[1] === undefined) {
    throw new Error("Date range must contain one start and one end.");
  }

  return [parts[0].trim(), parts[1].trim()];
}

function inheritMissingDateFields(rawEnd: string, startPart: DatePart): string {
  const trimmed = rawEnd.trim();

  if (/^\d{1,2}(?::\d{2})?\s*(?:am|pm)$/i.test(trimmed)) {
    return `${startPart.year}-${String(startPart.monthIndex + 1).padStart(2, "0")}-${String(startPart.day).padStart(2, "0")} ${trimmed}`;
  }

  if (/^\d{1,2}(?::\d{2})$/.test(trimmed)) {
    return `${startPart.year}-${String(startPart.monthIndex + 1).padStart(2, "0")}-${String(startPart.day).padStart(2, "0")} ${trimmed}`;
  }

  if (/^\d{1,2}(?:\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?$/i.test(trimmed)) {
    return `${startPart.year}-${String(startPart.monthIndex + 1).padStart(2, "0")}-${trimmed}`;
  }

  return trimmed;
}

function parseDatePart(raw: string, referenceDate: Date, fieldName: string): DatePart {
  const trimmed = raw.trim();
  const isoMatch = ISO_DATE_PATTERN.exec(trimmed);

  if (isoMatch !== null) {
    return normalizeDatePart({
      year: Number(isoMatch[1]),
      monthIndex: Number(isoMatch[2]) - 1,
      day: Number(isoMatch[3]),
      rawHour: isoMatch[4],
      rawMinute: isoMatch[5],
      meridiem: isoMatch[6]
    });
  }

  const monthMatch = MONTH_DATE_PATTERN.exec(trimmed);

  if (monthMatch !== null) {
    const monthIndex = MONTHS.get((monthMatch[1] ?? "").toLowerCase());

    if (monthIndex === undefined) {
      throw new Error(`${fieldName} has an unsupported month name.`);
    }

    return normalizeDatePart({
      year: monthMatch[3] === undefined ? referenceDate.getFullYear() : Number(monthMatch[3]),
      monthIndex,
      day: Number(monthMatch[2]),
      rawHour: monthMatch[4],
      rawMinute: monthMatch[5],
      meridiem: monthMatch[6]
    });
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      monthIndex: parsed.getMonth(),
      day: parsed.getDate(),
      hour: parsed.getHours(),
      minute: parsed.getMinutes(),
      hasTime: !/^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    };
  }

  throw new Error(`${fieldName} must be a valid date, time, or range.`);
}

function normalizeDatePart(input: {
  year: number;
  monthIndex: number;
  day: number;
  rawHour?: string | undefined;
  rawMinute?: string | undefined;
  meridiem?: string | undefined;
}): DatePart {
  const hasTime = input.rawHour !== undefined;
  let hour = hasTime ? Number(input.rawHour) : 0;
  const minute = input.rawMinute === undefined ? 0 : Number(input.rawMinute);
  const meridiem = input.meridiem?.toLowerCase();

  if (meridiem === "pm" && hour < 12) {
    hour += 12;
  }

  if (meridiem === "am" && hour === 12) {
    hour = 0;
  }

  const date = new Date(input.year, input.monthIndex, input.day, hour, minute, 0, 0);

  if (
    !Number.isInteger(input.year) ||
    !Number.isInteger(input.monthIndex) ||
    !Number.isInteger(input.day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    input.monthIndex < 0 ||
    input.monthIndex > 11 ||
    input.day < 1 ||
    input.day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== input.year ||
    date.getMonth() !== input.monthIndex ||
    date.getDate() !== input.day
  ) {
    throw new Error("Date range contains an invalid date or time.");
  }

  return {
    year: input.year,
    monthIndex: input.monthIndex,
    day: input.day,
    hour,
    minute,
    hasTime
  };
}

function toLocalIsoString(part: DatePart): string {
  return new Date(
    part.year,
    part.monthIndex,
    part.day,
    part.hour,
    part.minute,
    0,
    0
  ).toISOString();
}

function formatDatePoint(value: string | null, allDay: boolean): string | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const dateText = [
    date.getFullYear().toString().padStart(4, "0"),
    (date.getMonth() + 1).toString().padStart(2, "0"),
    date.getDate().toString().padStart(2, "0")
  ].join("-");

  if (allDay) {
    return dateText;
  }

  return `${dateText} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

