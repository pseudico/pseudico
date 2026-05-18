import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildDailyPlannerSubmission,
  DailyPlannerEditor,
  getDailyPlannerKeyCommand
} from "../src";

const referenceDate = new Date(2026, 4, 10, 8, 30, 0, 0);

describe("DailyPlannerEditor", () => {
  it("renders keyboard-first Today and Tomorrow draft lanes", () => {
    const html = renderToStaticMarkup(
      <DailyPlannerEditor
        targetContainerId="container_inbox"
        targetContainerName="Inbox"
        todayDueAt="2026-05-10T00:00:00.000Z"
        tomorrowDueAt="2026-05-11T00:00:00.000Z"
        onSubmit={() => undefined}
      />
    );

    expect(html).toContain("Keyboard planner");
    expect(html).toContain("Today task");
    expect(html).toContain("Tomorrow task");
    expect(html).toContain("real multiline field");
    expect(html).toContain("Destination:");
    expect(html).toContain("Ctrl/Cmd+Enter");
    expect(html).toContain("Saving to Inbox");
  });

  it("builds lane submissions with default lane dates", () => {
    const result = buildDailyPlannerSubmission({
      lane: "tomorrow",
      title: "Write status note\nwith owner handoff context",
      targetContainerId: "container_inbox",
      todayDueAt: "2026-05-10T00:00:00.000Z",
      tomorrowDueAt: "2026-05-11T00:00:00.000Z"
    });

    expect(result).toMatchObject({
      ok: true,
      values: {
        lane: "tomorrow",
        title: "Write status note with owner handoff context",
        targetContainerId: "container_inbox",
        dueAt: "2026-05-11T00:00:00.000Z",
        allDay: true
      }
    });
  });

  it("reuses quick-add natural date parsing for draft tasks", () => {
    const result = buildDailyPlannerSubmission({
      lane: "today",
      title: "Call Sam tomorrow 5pm",
      targetContainerId: "container_inbox",
      todayDueAt: "2026-05-10T00:00:00.000Z",
      tomorrowDueAt: "2026-05-11T00:00:00.000Z",
      naturalDateOptions: {
        referenceDate,
        timezone: "Australia/Sydney"
      }
    });

    expect(result).toMatchObject({
      ok: true,
      values: {
        lane: "today",
        title: "Call Sam",
        dueAt: new Date(2026, 4, 11, 17, 0, 0, 0).toISOString(),
        allDay: false,
        timezone: "Australia/Sydney"
      }
    });
  });

  it("maps arrow, enter, and escape keyboard commands", () => {
    expect(getDailyPlannerKeyCommand({
      key: "ArrowDown",
      lane: "today",
      title: ""
    })).toBe("tomorrow");
    expect(getDailyPlannerKeyCommand({
      key: "ArrowUp",
      lane: "tomorrow",
      title: ""
    })).toBe("today");
    expect(getDailyPlannerKeyCommand({
      key: "Enter",
      ctrlKey: true,
      lane: "today",
      title: "Draft"
    })).toBe("submit");
    expect(getDailyPlannerKeyCommand({
      key: "Enter",
      lane: "today",
      title: "Draft"
    })).toBe("none");
    expect(getDailyPlannerKeyCommand({
      key: "Enter",
      shiftKey: true,
      lane: "today",
      title: "Draft"
    })).toBe("none");
    expect(getDailyPlannerKeyCommand({
      key: "Escape",
      lane: "today",
      title: "Draft"
    })).toBe("clear");
  });
});
