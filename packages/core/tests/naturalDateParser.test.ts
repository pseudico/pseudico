import { describe, expect, it } from "vitest";
import { NaturalDateParser, parseQuickTaskNaturalDate } from "../src";

const referenceDate = new Date(2026, 4, 10, 8, 30, 0, 0); // Sunday, May 10 2026 local time.

function localIso(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0
): string {
  return new Date(year, monthIndex, day, hour, minute, 0, 0).toISOString();
}

describe("natural date parser", () => {
  it.each([
    ["Call Sam today", "Call Sam", localIso(2026, 4, 10), true],
    ["Call Sam tomorrow", "Call Sam", localIso(2026, 4, 11), true],
    ["Call Sam Monday", "Call Sam", localIso(2026, 4, 11), true],
    ["Call Sam next Monday", "Call Sam", localIso(2026, 4, 11), true],
    ["Call Sam +3d", "Call Sam", localIso(2026, 4, 13), true],
    ["Call Sam +2w", "Call Sam", localIso(2026, 4, 24), true],
    ["Call Sam +1m", "Call Sam", localIso(2026, 5, 10), true],
    ["Call Sam in 3 days", "Call Sam", localIso(2026, 4, 13), true],
    ["Call Sam 2026-05-22", "Call Sam", localIso(2026, 4, 22), true],
    ["Call Sam May 12", "Call Sam", localIso(2026, 4, 12), true]
  ])(
    "parses fixture %s",
    (caption, expectedTitle, expectedDueAt, expectedAllDay) => {
      const parsed = parseQuickTaskNaturalDate(caption, {
        referenceDate,
        timezone: "Australia/Sydney"
      });

      expect(parsed.title).toBe(expectedTitle);
      expect(parsed.dueAt).toBe(expectedDueAt);
      expect(parsed.startAt).toBeNull();
      expect(parsed.allDay).toBe(expectedAllDay);
      expect(parsed.timezone).toBe("Australia/Sydney");
    }
  );

  it("parses a time-only quick task as due today", () => {
    const parsed = parseQuickTaskNaturalDate("Call Sam 5pm", { referenceDate });

    expect(parsed.title).toBe("Call Sam");
    expect(parsed.startAt).toBeNull();
    expect(parsed.dueAt).toBe(localIso(2026, 4, 10, 17));
    expect(parsed.allDay).toBe(false);
    expect(parsed.tokens.map((token) => token.kind)).toEqual(["time"]);
  });

  it("parses a date and time quick task", () => {
    const parsed = parseQuickTaskNaturalDate("Call Sam tomorrow 5pm @phone-call", {
      referenceDate
    });

    expect(parsed.title).toBe("Call Sam @phone-call");
    expect(parsed.dateText).toBe("tomorrow 5pm");
    expect(parsed.dueAt).toBe(localIso(2026, 4, 11, 17));
    expect(parsed.allDay).toBe(false);
    expect(parsed.label).toContain("17:00");
  });

  it("parses a weekday time range into start and due fields", () => {
    const parsed = parseQuickTaskNaturalDate("Workshop Monday 9am-5pm", {
      referenceDate
    });

    expect(parsed.title).toBe("Workshop");
    expect(parsed.startAt).toBe(localIso(2026, 4, 11, 9));
    expect(parsed.dueAt).toBe(localIso(2026, 4, 11, 17));
    expect(parsed.allDay).toBe(false);
    expect(parsed.tokens.map((token) => token.kind)).toEqual([
      "date",
      "time",
      "range"
    ]);
  });

  it("leaves captions unchanged when no natural date is present", () => {
    const parsed = new NaturalDateParser().parseQuickTaskCaption(
      "Call Sam about budget @phone-call",
      { referenceDate }
    );

    expect(parsed.title).toBe("Call Sam about budget @phone-call");
    expect(parsed.dueAt).toBeNull();
    expect(parsed.dateText).toBeNull();
    expect(parsed.tokens).toEqual([]);
  });

  it("handles local dates across daylight-saving transitions", () => {
    const parsed = parseQuickTaskNaturalDate("Review clocks tomorrow 9am", {
      referenceDate: new Date(2026, 3, 4, 12, 0, 0, 0),
      timezone: "Australia/Sydney"
    });

    expect(parsed.title).toBe("Review clocks");
    expect(parsed.dueAt).toBe(new Date(2026, 3, 5, 9, 0, 0, 0).toISOString());
    expect(parsed.allDay).toBe(false);
  });
});
