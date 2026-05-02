import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuickAddForm } from "../src";

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
});
