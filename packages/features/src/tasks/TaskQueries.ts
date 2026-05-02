import type { TaskDateRange } from "@local-work-os/core";

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type TaskRangeInput = {
  start: string | Date;
  end: string | Date;
};

export function createTaskDayRange(date: string | Date): TaskDateRange {
  const parsed = parseTaskDateInput(date, "date");
  const start = new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  );
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 1);

  return {
    startInclusive: start.toISOString(),
    endExclusive: end.toISOString()
  };
}

export function createTaskDateRange(input: TaskRangeInput): TaskDateRange {
  const start = parseTaskDateInput(input.start, "start");
  const end = parseTaskDateInput(input.end, "end");

  if (start.getTime() >= end.getTime()) {
    throw new Error("range end must be after range start.");
  }

  return {
    startInclusive: start.toISOString(),
    endExclusive: end.toISOString()
  };
}

export function normalizeTaskDateTime(
  value: string | null | undefined,
  fieldName: string
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return null;
  }

  if (DATE_ONLY_PATTERN.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }

  return parseTaskDateInput(trimmed, fieldName).toISOString();
}

export function isTaskDateOnly(value: string | null | undefined): boolean {
  return typeof value === "string" && DATE_ONLY_PATTERN.test(value.trim());
}

export function assertTaskDateOrder(
  startAt: string | null,
  dueAt: string | null
): void {
  if (startAt === null || dueAt === null) {
    return;
  }

  if (new Date(startAt).getTime() > new Date(dueAt).getTime()) {
    throw new Error("startAt must be before or equal to dueAt.");
  }
}

function parseTaskDateInput(value: string | Date, fieldName: string): Date {
  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(
          DATE_ONLY_PATTERN.test(value.trim())
            ? `${value.trim()}T00:00:00.000Z`
            : value.trim()
        );

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date or ISO timestamp.`);
  }

  return date;
}
