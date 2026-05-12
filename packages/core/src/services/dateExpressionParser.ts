export type DateExpressionBoundary =
  | "startOfWeek"
  | "endOfWeek"
  | "startOfMonth"
  | "endOfMonth";

export type DateExpressionOffsetUnit = "d" | "w" | "m" | "y";

export type DateExpressionOperation =
  | {
      type: "offset";
      amount: number;
      unit: DateExpressionOffsetUnit;
    }
  | {
      type: "boundary";
      boundary: DateExpressionBoundary;
    };

export type ParsedDateExpression = {
  expression: string;
  basePath: string;
  operations: DateExpressionOperation[];
};

export type ResolvedDateExpression = ParsedDateExpression & {
  value: string;
};

export type DateExpressionResolverOptions = {
  referenceDate?: Date;
  resolveBaseDate?: (basePath: string) => string | null;
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
};

type DateState = {
  year: number;
  monthIndex: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  dateOnly: boolean;
};

const BASE_PATH_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]*$/;
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const UTC_MIDNIGHT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T00:00:00\.000Z$/;
const BOUNDARY_PATTERN = /^(?:\.|\|)(startOfWeek|endOfWeek|startOfMonth|endOfMonth)/;
const OFFSET_PATTERN = /^([+-])(\d+)([dwmy])/;
const OPERATION_START_PATTERN = /([+-]\d*[dwmy]?|[.|](?:startOfWeek|endOfWeek|startOfMonth|endOfMonth))/;

export function isDateExpressionCandidate(expression: string): boolean {
  return OPERATION_START_PATTERN.test(expression.trim());
}

export function parseDateExpression(expression: string): ParsedDateExpression {
  const trimmed = expression.trim();

  if (trimmed.length === 0) {
    throw new Error("Date expression must be a non-empty string.");
  }

  const operationStart = trimmed.search(OPERATION_START_PATTERN);
  const basePath = operationStart === -1 ? trimmed : trimmed.slice(0, operationStart);
  let remaining = operationStart === -1 ? "" : trimmed.slice(operationStart);

  if (!BASE_PATH_PATTERN.test(basePath)) {
    throw new Error(`Date expression base is invalid: ${basePath}.`);
  }

  const operations: DateExpressionOperation[] = [];

  while (remaining.length > 0) {
    const offsetMatch = OFFSET_PATTERN.exec(remaining);
    if (offsetMatch !== null) {
      operations.push({
        type: "offset",
        amount: Number(offsetMatch[2]) * (offsetMatch[1] === "-" ? -1 : 1),
        unit: offsetMatch[3] as DateExpressionOffsetUnit
      });
      remaining = remaining.slice(offsetMatch[0].length);
      continue;
    }

    const boundaryMatch = BOUNDARY_PATTERN.exec(remaining);
    if (boundaryMatch !== null) {
      operations.push({
        type: "boundary",
        boundary: boundaryMatch[1] as DateExpressionBoundary
      });
      remaining = remaining.slice(boundaryMatch[0].length);
      continue;
    }

    throw new Error(`Date expression operation is invalid near: ${remaining}.`);
  }

  if (operations.length === 0) {
    throw new Error("Date expression must include a date manipulation operation.");
  }

  return {
    expression: trimmed,
    basePath,
    operations
  };
}

export function resolveDateExpression(
  expression: string,
  options: DateExpressionResolverOptions = {}
): ResolvedDateExpression {
  const parsed = parseDateExpression(expression);
  const baseValue = resolveBaseValue(parsed.basePath, options);

  if (baseValue === null) {
    throw new Error(`Date expression base could not be resolved: ${parsed.basePath}.`);
  }

  let state = parseDateValue(baseValue, parsed.basePath);
  for (const operation of parsed.operations) {
    state =
      operation.type === "offset"
        ? applyOffset(state, operation)
        : applyBoundary(state, operation.boundary, options.weekStartsOn ?? 1);
  }

  return {
    ...parsed,
    value: formatDateState(state)
  };
}

function resolveBaseValue(
  basePath: string,
  options: DateExpressionResolverOptions
): string | null {
  if (basePath === "today") {
    return formatDateOnlyParts(toDateState(options.referenceDate ?? new Date(), true));
  }

  if (basePath === "now") {
    return (options.referenceDate ?? new Date()).toISOString();
  }

  return options.resolveBaseDate?.(basePath) ?? null;
}

function parseDateValue(value: string, label: string): DateState {
  const trimmed = value.trim();
  const dateOnlyMatch = DATE_ONLY_PATTERN.exec(trimmed);
  if (dateOnlyMatch !== null) {
    return {
      year: Number(dateOnlyMatch[1]),
      monthIndex: Number(dateOnlyMatch[2]) - 1,
      day: Number(dateOnlyMatch[3]),
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
      dateOnly: true
    };
  }

  const utcMidnightMatch = UTC_MIDNIGHT_PATTERN.exec(trimmed);
  if (utcMidnightMatch !== null) {
    return {
      year: Number(utcMidnightMatch[1]),
      monthIndex: Number(utcMidnightMatch[2]) - 1,
      day: Number(utcMidnightMatch[3]),
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
      dateOnly: true
    };
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Date expression base must be a valid date: ${label}.`);
  }

  return toDateState(parsed, false);
}

function toDateState(date: Date, dateOnly: boolean): DateState {
  if (Number.isNaN(date.getTime())) {
    throw new Error("Date expression reference date must be valid.");
  }

  return {
    year: date.getFullYear(),
    monthIndex: date.getMonth(),
    day: date.getDate(),
    hour: dateOnly ? 0 : date.getHours(),
    minute: dateOnly ? 0 : date.getMinutes(),
    second: dateOnly ? 0 : date.getSeconds(),
    millisecond: dateOnly ? 0 : date.getMilliseconds(),
    dateOnly
  };
}

function applyOffset(
  state: DateState,
  operation: Extract<DateExpressionOperation, { type: "offset" }>
): DateState {
  switch (operation.unit) {
    case "d":
      return addDays(state, operation.amount);
    case "w":
      return addDays(state, operation.amount * 7);
    case "m":
      return addMonths(state, operation.amount);
    case "y":
      return addMonths(state, operation.amount * 12);
  }
}

function applyBoundary(
  state: DateState,
  boundary: DateExpressionBoundary,
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
): DateState {
  switch (boundary) {
    case "startOfWeek": {
      const dayOfWeek = dateFromState(state).getDay();
      const delta = (dayOfWeek - weekStartsOn + 7) % 7;
      return startOfDay(addDays(state, -delta));
    }
    case "endOfWeek": {
      const start = applyBoundary(state, "startOfWeek", weekStartsOn);
      return endOfDay(addDays(start, 6));
    }
    case "startOfMonth":
      return startOfDay({
        ...state,
        day: 1
      });
    case "endOfMonth":
      return endOfDay({
        ...state,
        day: lastDayOfMonth(state.year, state.monthIndex)
      });
  }
}

function addDays(state: DateState, amount: number): DateState {
  const date = new Date(
    state.year,
    state.monthIndex,
    state.day + amount,
    state.hour,
    state.minute,
    state.second,
    state.millisecond
  );
  return {
    ...toDateState(date, state.dateOnly),
    dateOnly: state.dateOnly
  };
}

function addMonths(state: DateState, amount: number): DateState {
  const targetMonthStart = new Date(state.year, state.monthIndex + amount, 1);
  const targetYear = targetMonthStart.getFullYear();
  const targetMonthIndex = targetMonthStart.getMonth();
  const targetDay = Math.min(state.day, lastDayOfMonth(targetYear, targetMonthIndex));

  return {
    ...state,
    year: targetYear,
    monthIndex: targetMonthIndex,
    day: targetDay
  };
}

function startOfDay(state: DateState): DateState {
  return {
    ...state,
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0
  };
}

function endOfDay(state: DateState): DateState {
  if (state.dateOnly) {
    return state;
  }

  return {
    ...state,
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999
  };
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function dateFromState(state: DateState): Date {
  return new Date(
    state.year,
    state.monthIndex,
    state.day,
    state.hour,
    state.minute,
    state.second,
    state.millisecond
  );
}

function formatDateState(state: DateState): string {
  if (state.dateOnly) {
    return formatDateOnlyParts(state);
  }

  return dateFromState(state).toISOString();
}

function formatDateOnlyParts(state: Pick<DateState, "year" | "monthIndex" | "day">): string {
  return [
    state.year.toString().padStart(4, "0"),
    (state.monthIndex + 1).toString().padStart(2, "0"),
    state.day.toString().padStart(2, "0")
  ].join("-");
}
