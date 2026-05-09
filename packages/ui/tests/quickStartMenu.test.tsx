import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QuickStartMenu } from "../src";

describe("QuickStartMenu", () => {
  it("renders grouped context actions with disabled states", () => {
    const html = renderToStaticMarkup(
      <QuickStartMenu
        selectedActionId="task"
        actions={[
          {
            id: "task",
            title: "New task",
            description: "Create a task here.",
            group: "Capture",
            disabledReason: null
          },
          {
            id: "project",
            title: "New project",
            description: "Create a project.",
            group: "Containers",
            disabledReason: "Open a local workspace first."
          }
        ]}
        onSelectAction={() => undefined}
      />
    );

    expect(html).toContain("Quick start actions");
    expect(html).toContain("New task");
    expect(html).toContain("Create a task here.");
    expect(html).toContain("New project");
    expect(html).toContain("Open a local workspace first.");
    expect(html).toContain("disabled");
    expect(html).toContain("aria-pressed=\"true\"");
  });
});
