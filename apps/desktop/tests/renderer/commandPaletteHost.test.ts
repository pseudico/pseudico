import { describe, expect, it } from "vitest";
import {
  createAppActionRegistry,
  getQuickAddContext,
  isPaletteShortcut,
  type AppActionContext
} from "../../src/renderer/components/CommandPaletteHost";

describe("desktop command palette actions", () => {
  it("registers route actions and executes Today/Search navigation", async () => {
    const navigations: string[] = [];
    const registry = createAppActionRegistry({
      navigate: (path) => navigations.push(path),
      openQuickAdd: () => undefined
    });
    const context: AppActionContext = {
      currentPathname: "/workspace",
      workspaceOpen: true
    };

    await registry.get("nav.today")?.execute(context);
    await registry.get("nav.search")?.execute(context);

    expect(navigations).toEqual(["/today", "/search"]);
    expect(
      registry.search({
        context,
        query: "today"
      })[0]?.id
    ).toBe("nav.today");
  });

  it("disables workspace actions until a local workspace is open", () => {
    const registry = createAppActionRegistry({
      navigate: () => undefined,
      openQuickAdd: () => undefined
    });

    const disabledQuickAdd = registry.search({
      context: { currentPathname: "/workspace", workspaceOpen: false },
      query: "quick"
    })[0];
    const workspaceHome = registry.search({
      context: { currentPathname: "/workspace", workspaceOpen: false },
      query: "workspace"
    })[0];

    expect(disabledQuickAdd?.disabledReason).toBe(
      "Open a local workspace first."
    );
    expect(workspaceHome?.id).toBe("nav.workspace");
    expect(workspaceHome?.disabledReason).toBeNull();
  });

  it("maps command shortcut and current project context", async () => {
    const quickAddContexts: unknown[] = [];
    const registry = createAppActionRegistry({
      navigate: () => undefined,
      openQuickAdd: (context) => quickAddContexts.push(context)
    });

    expect(isPaletteShortcut({ key: "k", ctrlKey: true, metaKey: false })).toBe(
      true
    );
    expect(isPaletteShortcut({ key: "j", ctrlKey: true, metaKey: false })).toBe(
      false
    );
    expect(getQuickAddContext("/projects/project_1")).toEqual({
      projectId: "project_1",
      containerId: "project_1",
      containerType: "project"
    });
    expect(getQuickAddContext("/contacts/contact_1")).toEqual({
      contactId: "contact_1",
      containerId: "contact_1",
      containerType: "contact"
    });

    await registry.get("quick-add.task")?.execute({
      currentPathname: "/projects/project_1",
      workspaceOpen: true
    });

    expect(quickAddContexts).toEqual([
      {
        projectId: "project_1",
        containerId: "project_1",
        containerType: "project"
      }
    ]);
  });
});
