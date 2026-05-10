import { describe, expect, it } from "vitest";
import {
  formatDateRangeInputValue,
  parseDateRangeInput
} from "../src";

describe("date range parser", () => {
  it("parses a single all-day date as a due-only range", () => {
    const parsed = parseDateRangeInput("2026-05-01", {
      referenceDate: new Date("2026-01-01T00:00:00.000Z"),
      timezone: "UTC"
    });

    expect(parsed).toMatchObject({
      startAt: null,
      dueAt: new Date(2026, 4, 1, 0, 0, 0, 0).toISOString(),
      allDay: true,
      timezone: "UTC"
    });
  });

  it("parses a timed month-name date range", () => {
    const parsed = parseDateRangeInput("May 1 9am - May 3 5pm", {
      referenceDate: new Date("2026-01-01T00:00:00.000Z"),
      timezone: "UTC"
    });

    expect(parsed.startAt).toBe(new Date(2026, 4, 1, 9, 0, 0, 0).toISOString());
    expect(parsed.dueAt).toBe(new Date(2026, 4, 3, 17, 0, 0, 0).toISOString());
    expect(parsed.allDay).toBe(false);
    expect(parsed.label).toContain("09:00");
    expect(parsed.label).toContain("17:00");
  });

  it("inherits the start date for time-only range ends", () => {
    const parsed = parseDateRangeInput("2026-05-01 09:00 - 17:00", {
      timezone: "UTC"
    });

    expect(parsed.startAt).toBe(new Date(2026, 4, 1, 9, 0, 0, 0).toISOString());
    expect(parsed.dueAt).toBe(new Date(2026, 4, 1, 17, 0, 0, 0).toISOString());
    expect(parsed.allDay).toBe(false);
  });

  it("formats persisted all-day and timed ranges back into one input value", () => {
    expect(
      formatDateRangeInputValue({
        startAt: "2026-05-01T00:00:00.000Z",
        dueAt: "2026-05-03T00:00:00.000Z",
        allDay: true
      })
    ).toContain(" - ");

    expect(
      formatDateRangeInputValue({
        startAt: new Date(2026, 4, 1, 9, 0, 0, 0).toISOString(),
        dueAt: new Date(2026, 4, 3, 17, 0, 0, 0).toISOString(),
        allDay: false
      })
    ).toContain("09:00");
  });
});


