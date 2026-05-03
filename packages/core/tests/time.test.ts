import { describe, expect, it } from "vitest";
import {
  createLocalDayRange,
  createLocalDayWindowRange,
  createRelativeLocalDayRange,
  formatLocalDate
} from "../src";

describe("local time helpers", () => {
  it("creates local-day ranges from date-only input", () => {
    expect(createLocalDayRange("2026-05-02")).toEqual({
      localDate: "2026-05-02",
      startInclusive: new Date(2026, 4, 2).toISOString(),
      endExclusive: new Date(2026, 4, 3).toISOString()
    });
  });

  it("creates relative local-day ranges without UTC-midnight assumptions", () => {
    expect(createRelativeLocalDayRange("2026-05-02", 1)).toEqual({
      localDate: "2026-05-03",
      startInclusive: new Date(2026, 4, 3).toISOString(),
      endExclusive: new Date(2026, 4, 4).toISOString()
    });
  });

  it("creates local-day windows from offset boundaries", () => {
    expect(createLocalDayWindowRange({
      date: "2026-05-15",
      startOffsetDays: -14,
      endOffsetDays: 0
    })).toEqual({
      startInclusive: new Date(2026, 4, 1).toISOString(),
      endExclusive: new Date(2026, 4, 15).toISOString()
    });
  });

  it("formats dates using local calendar fields", () => {
    expect(formatLocalDate(new Date(2026, 4, 2, 23, 30))).toBe("2026-05-02");
  });
});
