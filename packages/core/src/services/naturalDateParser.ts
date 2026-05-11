
import {
  formatDateRangeLabel,
  getLocalTimeZone,
  type ParsedDateRange
} from "./dateRangeParser";

export type NaturalDateTokenKind = "date" | "time" | "range";

export type NaturalDateToken = {
  kind: NaturalDateTokenKind;
  text: string;
  startIndex: number;
  endIndex: number;
};

export type NaturalDateParserOptions = {
  referenceDate?: Date;
  timezone?: string;
};

export type NaturalDateParseResult = ParsedDateRange & {
  originalText: string;
  title: string;
  dateText: string | null;
  tokens: NaturalDateToken[];
};

type DateAnchor = {
  date: Date;
  text: string;
  startIndex: number;
  endIndex: number;
  explicit: boolean;
};

type TimeAnchor = {
  hour: number;
  minute: number;
  text: string;
  startIndex: number;
  endIndex: number;
};

type NaturalDateMatch = {
  allDay: boolean;
  dateText: string;
  endIndex: number;
  startAt: string | null;
  startIndex: number;
  dueAt: string;
  tokens: NaturalDateToken[];
};

const WEEKDAY_INDEX = new Map([
  ["sun", 0], ["sunday", 0],
  ["mon", 1], ["monday", 1],
  ["tue", 2], ["tues", 2], ["tuesday", 2],
  ["wed", 3], ["wednesday", 3],
  ["thu", 4], ["thur", 4], ["thurs", 4], ["thursday", 4],
  ["fri", 5], ["friday", 5],
  ["sat", 6], ["saturday", 6]
]);

const MONTH_INDEX = new Map([
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

const DATE_WORD_PATTERN = /\b(?:(next)\s+)?(today|tomorrow|sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\b/gi;
const MONTH_DATE_PATTERN = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/gi;
const ISO_DATE_PATTERN = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
const RELATIVE_PATTERN = /(?:\b(?:in)\s+)?([+]?)\s*(\d{1,3})\s*(d|day|days|w|week|weeks|m|month|months)\b/gi;
const TIME_PATTERN = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\b([01]?\d|2[0-3]):([0-5]\d)\b/gi;
const RANGE_SEPARATOR_PATTERN = /^\s*(?:-|\u2013|\u2014|to)\s*/i;

export class NaturalDateParser {
  parseQuickTaskCaption(
    input: string,
    options: NaturalDateParserOptions = {}
  ): NaturalDateParseResult {
    return parseQuickTaskNaturalDate(input, options);
  }
}

export function parseQuickTaskNaturalDate(
  input: string,
  options: NaturalDateParserOptions = {}
): NaturalDateParseResult {
  const originalText = input;
  const timezone = options.timezone ?? getLocalTimeZone();
  const referenceDate = normalizeReferenceDate(options.referenceDate ?? new Date());
  const match = findBestNaturalDateMatch(input, referenceDate);

  if (match === null) {
    return {
      originalText,
      title: normalizeTitleWhitespace(input),
      dateText: null,
      tokens: [],
      startAt: null,
      dueAt: null,
      allDay: true,
      timezone,
      label: "No date"
    };
  }

  return {
    originalText,
    title: removeRangeFromTitle(input, match.startIndex, match.endIndex),
    dateText: match.dateText,
    tokens: match.tokens,
    startAt: match.startAt,
    dueAt: match.dueAt,
    allDay: match.allDay,
    timezone,
    label: formatDateRangeLabel({
      startAt: match.startAt,
      dueAt: match.dueAt,
      allDay: match.allDay
    })
  };
}

export function createNaturalDateParser(): NaturalDateParser {
  return new NaturalDateParser();
}

function findBestNaturalDateMatch(
  input: string,
  referenceDate: Date
): NaturalDateMatch | null {
  const dateAnchors = collectDateAnchors(input, referenceDate);
  const timeAnchors = collectTimeAnchors(input);
  const matches: NaturalDateMatch[] = [];

  for (const dateAnchor of dateAnchors) {
    const trailingTimes = timeAnchors
      .filter((time) => isWhitespaceOnly(input, dateAnchor.endIndex, time.startIndex))
      .sort((left, right) => left.startIndex - right.startIndex);

    const firstTime = trailingTimes[0] ?? null;
    const rangeEndTime = firstTime === null ? null : findRangeEndTime(input, firstTime, timeAnchors);

    if (firstTime !== null && rangeEndTime !== null) {
      const start = atLocalTime(dateAnchor.date, firstTime.hour, firstTime.minute);
      const due = atLocalTime(dateAnchor.date, rangeEndTime.hour, rangeEndTime.minute);
      if (due.getTime() >= start.getTime()) {
        matches.push({
          startAt: start.toISOString(),
          dueAt: due.toISOString(),
          allDay: false,
          startIndex: dateAnchor.startIndex,
          endIndex: rangeEndTime.endIndex,
          dateText: input.slice(dateAnchor.startIndex, rangeEndTime.endIndex).trim(),
          tokens: [
            tokenFromDate(dateAnchor),
            tokenFromTime(firstTime),
            tokenFromTime(rangeEndTime, "range")
          ]
        });
      }
      continue;
    }

    if (firstTime !== null) {
      const due = atLocalTime(dateAnchor.date, firstTime.hour, firstTime.minute);
      matches.push({
        startAt: null,
        dueAt: due.toISOString(),
        allDay: false,
        startIndex: dateAnchor.startIndex,
        endIndex: firstTime.endIndex,
        dateText: input.slice(dateAnchor.startIndex, firstTime.endIndex).trim(),
        tokens: [tokenFromDate(dateAnchor), tokenFromTime(firstTime)]
      });
      continue;
    }

    matches.push({
      startAt: null,
      dueAt: atLocalTime(dateAnchor.date, 0, 0).toISOString(),
      allDay: true,
      startIndex: dateAnchor.startIndex,
      endIndex: dateAnchor.endIndex,
      dateText: dateAnchor.text.trim(),
      tokens: [tokenFromDate(dateAnchor)]
    });
  }

  for (const firstTime of timeAnchors) {
    const rangeEndTime = findRangeEndTime(input, firstTime, timeAnchors);
    if (rangeEndTime !== null) {
      const start = atLocalTime(referenceDate, firstTime.hour, firstTime.minute);
      const due = atLocalTime(referenceDate, rangeEndTime.hour, rangeEndTime.minute);
      if (due.getTime() >= start.getTime()) {
        matches.push({
          startAt: start.toISOString(),
          dueAt: due.toISOString(),
          allDay: false,
          startIndex: firstTime.startIndex,
          endIndex: rangeEndTime.endIndex,
          dateText: input.slice(firstTime.startIndex, rangeEndTime.endIndex).trim(),
          tokens: [tokenFromTime(firstTime), tokenFromTime(rangeEndTime, "range")]
        });
      }
      continue;
    }

    matches.push({
      startAt: null,
      dueAt: atLocalTime(referenceDate, firstTime.hour, firstTime.minute).toISOString(),
      allDay: false,
      startIndex: firstTime.startIndex,
      endIndex: firstTime.endIndex,
      dateText: firstTime.text.trim(),
      tokens: [tokenFromTime(firstTime)]
    });
  }

  if (matches.length === 0) {
    return null;
  }

  return matches.sort(compareNaturalDateMatches)[0] ?? null;
}

function collectDateAnchors(input: string, referenceDate: Date): DateAnchor[] {
  const anchors: DateAnchor[] = [];

  for (const match of input.matchAll(ISO_DATE_PATTERN)) {
    const text = match[0];
    const startIndex = match.index ?? 0;
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = createValidatedLocalDate(year, monthIndex, day);
    if (date !== null) {
      anchors.push({ date, text, startIndex, endIndex: startIndex + text.length, explicit: true });
    }
  }

  for (const match of input.matchAll(RELATIVE_PATTERN)) {
    const text = match[0];
    const startIndex = match.index ?? 0;
    const amount = Number(match[2]);
    const unit = (match[3] ?? "").toLowerCase();
    const date = addRelativeAmount(referenceDate, amount, unit);
    anchors.push({ date, text, startIndex, endIndex: startIndex + text.length, explicit: true });
  }

  for (const match of input.matchAll(DATE_WORD_PATTERN)) {
    const text = match[0];
    const startIndex = match.index ?? 0;
    const next = match[1] !== undefined;
    const word = (match[2] ?? "").toLowerCase();
    const date = resolveWordDate({ referenceDate, word, next });

    if (date !== null) {
      anchors.push({ date, text, startIndex, endIndex: startIndex + text.length, explicit: true });
    }
  }

  for (const match of input.matchAll(MONTH_DATE_PATTERN)) {
    const text = match[0];
    const startIndex = match.index ?? 0;
    const word = (match[1] ?? "").toLowerCase();
    const dayText = match[2];
    const yearText = match[3];
    const date = resolveWordDate({
      referenceDate,
      word,
      next: false,
      ...(dayText === undefined ? {} : { dayText }),
      ...(yearText === undefined ? {} : { yearText })
    });

    if (date !== null) {
      anchors.push({ date, text, startIndex, endIndex: startIndex + text.length, explicit: true });
    }
  }

  return dedupeAnchors(anchors).sort((left, right) => left.startIndex - right.startIndex);
}

function collectTimeAnchors(input: string): TimeAnchor[] {
  const anchors: TimeAnchor[] = [];

  for (const match of input.matchAll(TIME_PATTERN)) {
    const text = match[0];
    const startIndex = match.index ?? 0;
    const parsed = parseTimeMatch(match);
    if (parsed !== null) {
      anchors.push({
        ...parsed,
        text,
        startIndex,
        endIndex: startIndex + text.length
      });
    }
  }

  return anchors.sort((left, right) => left.startIndex - right.startIndex);
}

function resolveWordDate(input: {
  referenceDate: Date;
  word: string;
  next: boolean;
  dayText?: string;
  yearText?: string;
}): Date | null {
  if (input.word === "today") {
    return cloneLocalDate(input.referenceDate);
  }

  if (input.word === "tomorrow") {
    return addDays(input.referenceDate, 1);
  }

  const weekday = WEEKDAY_INDEX.get(input.word);
  if (weekday !== undefined && input.dayText === undefined) {
    return nextWeekday(input.referenceDate, weekday);
  }

  const monthIndex = MONTH_INDEX.get(input.word);
  if (monthIndex !== undefined && input.dayText !== undefined) {
    const day = Number(input.dayText);
    const explicitYear = input.yearText === undefined ? null : Number(input.yearText);
    let year = explicitYear ?? input.referenceDate.getFullYear();
    let date = createValidatedLocalDate(year, monthIndex, day);

    if (date === null) {
      return null;
    }

    if (explicitYear === null && date.getTime() < startOfLocalDay(input.referenceDate).getTime()) {
      year += 1;
      date = createValidatedLocalDate(year, monthIndex, day);
    }

    return date;
  }

  return null;
}

function parseTimeMatch(match: RegExpMatchArray): { hour: number; minute: number } | null {
  if (match[1] !== undefined) {
    let hour = Number(match[1]);
    const minute = match[2] === undefined ? 0 : Number(match[2]);
    const meridiem = match[3]?.toLowerCase();

    if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
      return null;
    }

    if (meridiem === "pm" && hour < 12) {
      hour += 12;
    }

    if (meridiem === "am" && hour === 12) {
      hour = 0;
    }

    return { hour, minute };
  }

  if (match[4] !== undefined && match[5] !== undefined) {
    return { hour: Number(match[4]), minute: Number(match[5]) };
  }

  return null;
}

function findRangeEndTime(
  input: string,
  startTime: TimeAnchor,
  timeAnchors: TimeAnchor[]
): TimeAnchor | null {
  const afterStart = input.slice(startTime.endIndex);
  const separatorMatch = RANGE_SEPARATOR_PATTERN.exec(afterStart);
  if (separatorMatch === null) {
    return null;
  }

  const expectedStart = startTime.endIndex + separatorMatch[0].length;
  return timeAnchors.find((time) => time.startIndex === expectedStart) ?? null;
}

function compareNaturalDateMatches(left: NaturalDateMatch, right: NaturalDateMatch): number {
  const leftHasDate = left.tokens.some((token) => token.kind === "date");
  const rightHasDate = right.tokens.some((token) => token.kind === "date");
  const leftHasRange = left.startAt !== null;
  const rightHasRange = right.startAt !== null;

  if (leftHasDate !== rightHasDate) {
    return leftHasDate ? -1 : 1;
  }

  if (leftHasRange !== rightHasRange) {
    return leftHasRange ? -1 : 1;
  }

  const lengthDelta = right.dateText.length - left.dateText.length;
  if (lengthDelta !== 0) {
    return lengthDelta;
  }

  return left.startIndex - right.startIndex;
}

function removeRangeFromTitle(input: string, startIndex: number, endIndex: number): string {
  return normalizeTitleWhitespace(`${input.slice(0, startIndex)} ${input.slice(endIndex)}`);
}

function normalizeTitleWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").trim();
}

function tokenFromDate(anchor: DateAnchor): NaturalDateToken {
  return {
    kind: "date",
    text: anchor.text.trim(),
    startIndex: anchor.startIndex,
    endIndex: anchor.endIndex
  };
}

function tokenFromTime(anchor: TimeAnchor, kind: NaturalDateTokenKind = "time"): NaturalDateToken {
  return {
    kind,
    text: anchor.text.trim(),
    startIndex: anchor.startIndex,
    endIndex: anchor.endIndex
  };
}

function isWhitespaceOnly(input: string, startIndex: number, endIndex: number): boolean {
  return startIndex <= endIndex && /^\s*$/.test(input.slice(startIndex, endIndex));
}

function normalizeReferenceDate(date: Date): Date {
  if (Number.isNaN(date.getTime())) {
    throw new Error("referenceDate must be a valid date.");
  }

  return date;
}

function atLocalTime(date: Date, hour: number, minute: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);
}

function cloneLocalDate(date: Date): Date {
  return atLocalTime(date, 0, 0);
}

function startOfLocalDay(date: Date): Date {
  return atLocalTime(date, 0, 0);
}

function addDays(date: Date, days: number): Date {
  const next = cloneLocalDate(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addRelativeAmount(date: Date, amount: number, unit: string): Date {
  const next = cloneLocalDate(date);

  if (unit.startsWith("d")) {
    next.setDate(next.getDate() + amount);
    return next;
  }

  if (unit.startsWith("w")) {
    next.setDate(next.getDate() + amount * 7);
    return next;
  }

  next.setMonth(next.getMonth() + amount);
  return next;
}

function nextWeekday(date: Date, weekday: number): Date {
  const current = date.getDay();
  const daysAhead = (weekday - current + 7) % 7 || 7;
  return addDays(date, daysAhead);
}

function createValidatedLocalDate(year: number, monthIndex: number, day: number): Date | null {
  const date = new Date(year, monthIndex, day, 0, 0, 0, 0);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(monthIndex) ||
    !Number.isInteger(day) ||
    monthIndex < 0 ||
    monthIndex > 11 ||
    day < 1 ||
    day > 31 ||
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== monthIndex ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function dedupeAnchors(anchors: DateAnchor[]): DateAnchor[] {
  const sorted = [...anchors].sort((left, right) => {
    if (left.startIndex !== right.startIndex) {
      return left.startIndex - right.startIndex;
    }

    return right.endIndex - left.endIndex;
  });
  const deduped: DateAnchor[] = [];

  for (const anchor of sorted) {
    const overlaps = deduped.some(
      (existing) => anchor.startIndex < existing.endIndex && existing.startIndex < anchor.endIndex
    );

    if (!overlaps) {
      deduped.push(anchor);
    }
  }

  return deduped;
}
