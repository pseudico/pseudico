import { describe, expect, it } from "vitest";
import {
  createTimelineDateScale,
  createTimelineZoomRange,
  mapTimelineRangeToScale
} from "../src";

describe("timeline date scale utilities", () => {
  it("creates week, month, and quarter zoom ranges from an anchor day", () => {
    expect(createTimelineZoomRange({ anchorDate: "2026-05-15", zoom: "week" })).toEqual({
      startInclusive: "2026-05-15T00:00:00.000Z",
      endExclusive: "2026-05-22T00:00:00.000Z"
    });
    expect(createTimelineZoomRange({ anchorDate: "2026-05-15", zoom: "month" })).toEqual({
      startInclusive: "2026-05-15T00:00:00.000Z",
      endExclusive: "2026-06-15T00:00:00.000Z"
    });
    expect(createTimelineZoomRange({ anchorDate: "2026-05-15", zoom: "quarter" })).toEqual({
      startInclusive: "2026-05-15T00:00:00.000Z",
      endExclusive: "2026-08-15T00:00:00.000Z"
    });
  });

  it("builds scale ticks and maps dated ranges to percentage placements", () => {
    const range = {
      startInclusive: "2026-05-15T00:00:00.000Z",
      endExclusive: "2026-05-22T00:00:00.000Z"
    };

    expect(createTimelineDateScale({ range, zoom: "week" }).ticks).toHaveLength(7);
    expect(
      mapTimelineRangeToScale({
        range,
        startAt: "2026-05-16T00:00:00.000Z",
        endAt: "2026-05-18T00:00:00.000Z"
      })
    ).toMatchObject({
      startsBeforeRange: false,
      endsAfterRange: false,
      offsetPercent: 14.2857,
      widthPercent: 28.5714,
      markerOnly: false
    });
  });

  it("clips bars to the visible range and marks due-only items", () => {
    const range = {
      startInclusive: "2026-05-15T00:00:00.000Z",
      endExclusive: "2026-05-22T00:00:00.000Z"
    };

    expect(
      mapTimelineRangeToScale({
        range,
        startAt: "2026-05-14T00:00:00.000Z",
        endAt: "2026-05-24T00:00:00.000Z"
      })
    ).toMatchObject({
      startsBeforeRange: true,
      endsAfterRange: true,
      offsetPercent: 0,
      widthPercent: 100
    });
    expect(
      mapTimelineRangeToScale({
        range,
        startAt: "2026-05-20T12:00:00.000Z",
        endAt: "2026-05-20T12:00:00.000Z"
      }).markerOnly
    ).toBe(true);
  });
});
