import { describe, expect, it } from "vitest";
import {
  resolveGlobalAppShortcut,
  runGlobalAppShortcut
} from "../../src/renderer/shortcuts/appShortcuts";

describe("global app shortcuts", () => {
  it("opens Quick Start on task capture from the quick-task shortcut", () => {
    const opened: unknown[] = [];
    const shortcut = resolveGlobalAppShortcut({ key: "n", ctrlKey: true });

    expect(shortcut?.id).toBe("capture.quickTask");
    expect(
      runGlobalAppShortcut(shortcut!, {
        currentPathname: "/projects/project_1",
        navigate: () => undefined,
        openCommandPalette: () => undefined,
        openQuickAdd: (context) => opened.push(context),
        workspaceOpen: true
      })
    ).toBe(true);
    expect(opened).toEqual([
      {
        projectId: "project_1",
        containerId: "project_1",
        containerType: "project",
        initialActionId: "task"
      }
    ]);
  });

  it("ignores global capture shortcuts while typing in form fields", () => {
    expect(
      resolveGlobalAppShortcut({
        key: "n",
        ctrlKey: true,
        target: { tagName: "input" }
      })
    ).toBeNull();
  });
});
