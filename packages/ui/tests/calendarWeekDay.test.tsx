import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarDayView, CalendarWeekView, type CalendarScheduleDay } from "../src";

describe("Calendar week/day views", () => {
  it("renders all-day and timed work with drag affordances", () => {
    const html = renderToStaticMarkup(
      <CalendarWeekView
        days={days}
        onCreateTask={() => undefined}
        onOpenItem={() => undefined}
        onRescheduleItem={() => undefined}
      />
    );

    expect(html).toContain("Week calendar");
    expect(html).toContain("All-day planning");
    expect(html).toContain("Timed review");
    expect(html).toContain("all-day");
    expect(html).toContain("10:00");
    expect(html).toContain("draggable=\"true\"");
    expect(html).toContain("All-day drop zone for 2026-05-12");
  });

  it("renders focused day layout", () => {
    const html = renderToStaticMarkup(
      <CalendarDayView
        day={days[0]!}
        onCreateTask={() => undefined}
        onOpenItem={() => undefined}
        onRescheduleItem={() => undefined}
      />
    );

    expect(html).toContain("2026-05-12 calendar");
    expect(html).toContain("Create all-day task for 2026-05-12");
    expect(html).toContain("08:00");
  });
});

const days: CalendarScheduleDay[] = [
  {
    date: "2026-05-12",
    dayOfMonth: 12,
    weekday: 2,
    isToday: true,
    items: [
      {
        id: "task_1",
        kind: "task",
        title: "All-day planning",
        containerName: "Launch Plan",
        categoryName: "Operations",
        status: "open",
        priority: 2,
        startAt: null,
        dueAt: "2026-05-12T00:00:00.000Z",
        allDay: true
      },
      {
        id: "task_2",
        kind: "task",
        title: "Timed review",
        containerName: "Launch Plan",
        categoryName: null,
        status: "open",
        priority: null,
        startAt: "2026-05-12T10:00:00.000Z",
        dueAt: "2026-05-12T10:30:00.000Z",
        allDay: false
      }
    ]
  }
];
