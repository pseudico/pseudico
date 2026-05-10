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


  it("supports keyboard-only search navigation from the global search shortcut", () => {
    const navigations: string[] = [];
    const shortcut = resolveGlobalAppShortcut({ key: "f", ctrlKey: true });

    expect(shortcut?.id).toBe("navigation.search.focus");
    expect(
      runGlobalAppShortcut(shortcut!, {
        currentPathname: "/today",
        navigate: (path: string) => navigations.push(path),
        openCommandPalette: () => undefined,
        openQuickAdd: () => undefined,
        workspaceOpen: true
      })
    ).toBe(true);
    expect(navigations).toEqual(["/search"]);
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
