export type TimelineZoomLevel = "week" | "month" | "quarter";

export type TimelineScaleRange = {
  startInclusive: string;
  endExclusive: string;
};

export type TimelineScaleTick = {
  key: string;
  label: string;
  date: string;
  offsetPercent: number;
};

export type TimelineRangePlacement = {
  startsBeforeRange: boolean;
  endsAfterRange: boolean;
  offsetPercent: number;
  widthPercent: number;
  markerOnly: boolean;
};

export type TimelineDateScale = {
  zoom: TimelineZoomLevel;
  range: TimelineScaleRange;
  ticks: TimelineScaleTick[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function createTimelineZoomRange(input: {
  anchorDate: string | Date;
  zoom: TimelineZoomLevel;
}): TimelineScaleRange {
  const anchor = parseDate(input.anchorDate);
  const start = startOfUtcDay(anchor);
  const end = new Date(start);

  if (input.zoom === "week") {
    end.setUTCDate(start.getUTCDate() + 7);
  } else if (input.zoom === "month") {
    end.setUTCMonth(start.getUTCMonth() + 1);
  } else {
    end.setUTCMonth(start.getUTCMonth() + 3);
  }

  return {
    startInclusive: start.toISOString(),
    endExclusive: end.toISOString()
  };
}

export function createTimelineDateScale(input: {
  range: TimelineScaleRange;
  zoom: TimelineZoomLevel;
}): TimelineDateScale {
  const start = parseDate(input.range.startInclusive);
  const end = parseDate(input.range.endExclusive);
  const totalMs = end.getTime() - start.getTime();

  if (totalMs <= 0) {
    throw new Error("timeline scale end must be after start.");
  }

  const stepDays = input.zoom === "week" ? 1 : input.zoom === "month" ? 7 : 30;
  const ticks: TimelineScaleTick[] = [];
  const cursor = startOfUtcDay(start);

  while (cursor.getTime() < end.getTime()) {
    ticks.push({
      key: cursor.toISOString(),
      label: formatTickLabel(cursor, input.zoom),
      date: cursor.toISOString(),
      offsetPercent: clampPercent(((cursor.getTime() - start.getTime()) / totalMs) * 100)
    });
    cursor.setUTCDate(cursor.getUTCDate() + stepDays);
  }

  return {
    zoom: input.zoom,
    range: input.range,
    ticks
  };
}

export function mapTimelineRangeToScale(input: {
  range: TimelineScaleRange;
  startAt: string;
  endAt: string;
}): TimelineRangePlacement {
  const rangeStart = parseDate(input.range.startInclusive);
  const rangeEnd = parseDate(input.range.endExclusive);
  const itemStart = parseDate(input.startAt);
  const itemEnd = parseDate(input.endAt);
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();

  if (totalMs <= 0) {
    throw new Error("timeline scale end must be after start.");
  }

  const normalizedEnd = itemEnd.getTime() < itemStart.getTime() ? itemStart : itemEnd;
  const clippedStartMs = Math.max(itemStart.getTime(), rangeStart.getTime());
  const clippedEndMs = Math.min(normalizedEnd.getTime(), rangeEnd.getTime());
  const markerOnly = itemStart.getTime() === normalizedEnd.getTime();
  const widthMs = Math.max(markerOnly ? MS_PER_DAY / 3 : MS_PER_DAY / 2, clippedEndMs - clippedStartMs);

  return {
    startsBeforeRange: itemStart.getTime() < rangeStart.getTime(),
    endsAfterRange: normalizedEnd.getTime() > rangeEnd.getTime(),
    offsetPercent: clampPercent(((clippedStartMs - rangeStart.getTime()) / totalMs) * 100),
    widthPercent: clampPercent((widthMs / totalMs) * 100),
    markerOnly
  };
}

function parseDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("timeline date must be valid.");
  }

  return date;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatTickLabel(date: Date, zoom: TimelineZoomLevel): string {
  if (zoom === "quarter") {
    return date.toLocaleDateString(undefined, { month: "short", timeZone: "UTC" });
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  });
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Number(value.toFixed(4))));
}
