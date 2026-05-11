import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildQuickAddTaskSubmission, QuickAddForm } from "../src";

const referenceDate = new Date(2026, 4, 10, 8, 30, 0, 0);

describe("QuickAddForm", () => {
  it("renders task, due date, target selector, and submit controls", () => {
    const html = renderToStaticMarkup(
      <QuickAddForm
        selectedTargetId="container_project_1"
        targets={[
          {
            id: "container_inbox",
            name: "Inbox",
            type: "inbox"
          },
          {
            id: "container_project_1",
            name: "Launch Plan",
            type: "project"
          }
        ]}
        onSubmit={() => undefined}
        onTargetChange={() => undefined}
      />
    );

    expect(html).toContain("Quick add task");
    expect(html).toContain("New task");
    expect(html).toContain("type=\"date\"");
    expect(html).toContain("Inbox");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("selected=\"\"");
    expect(html).toContain("Add task");
  });

  it("builds quick-task values from parsed natural dates", () => {
    const result = buildQuickAddTaskSubmission({
      title: "Call Sam tomorrow 5pm @phone-call",
      dueDate: "",
      targetContainerId: "container_inbox",
      naturalDateOptions: {
        referenceDate,
        timezone: "Australia/Sydney"
      }
    });

    expect(result).toMatchObject({
      ok: true,
      values: {
        title: "Call Sam @phone-call",
        targetContainerId: "container_inbox",
        dueDate: "",
        startAt: null,
        dueAt: new Date(2026, 4, 11, 17, 0, 0, 0).toISOString(),
        allDay: false,
        timezone: "Australia/Sydney"
      }
    });
  });

  it("keeps parsed date text when requested and lets manual due dates win", () => {
    const result = buildQuickAddTaskSubmission({
      title: "Call Sam tomorrow 5pm",
      dueDate: "2026-05-15",
      targetContainerId: "container_inbox",
      removeParsedDateText: false,
      naturalDateOptions: { referenceDate }
    });

    expect(result).toMatchObject({
      ok: true,
      values: {
        title: "Call Sam tomorrow 5pm",
        dueAt: "2026-05-15",
        startAt: null,
        allDay: true,
        timezone: null
      }
    });
  });
});
