import { describe, expect, it } from "vitest";
import {
  createContextMenuActionRegistry,
  resolveContextMenuActions,
  type ContextMenuTarget
} from "../src";

describe("context menu action resolution", () => {
  const taskTarget: ContextMenuTarget = {
    id: "item_1",
    type: "item",
    label: "Call accountant",
    kind: "task",
    capabilities: {
      duplicate: false,
      reveal: false
    }
  };

  it("filters actions by target type and hides disabled actions by default", () => {
    const actions = resolveContextMenuActions({ target: taskTarget });

    expect(actions.map((action) => action.id)).toContain("open");
    expect(actions.map((action) => action.id)).toContain("move");
    expect(actions.map((action) => action.id)).not.toContain("duplicate");
    expect(actions.map((action) => action.id)).not.toContain("reveal");
  });

  it("can keep disabled actions visible for UI menus", () => {
    const actions = resolveContextMenuActions({
      target: taskTarget,
      hideDisabled: false
    });
    const duplicate = actions.find((action) => action.id === "duplicate");

    expect(duplicate?.disabledReason).toBe("Unavailable for this target.");
  });

  it("connects default context actions to the shared action registry", () => {
    const registry = createContextMenuActionRegistry();
    const resolved = registry
      .list({ target: taskTarget })
      .filter((action) => action.disabledReason === null);

    expect(resolved.map((action) => action.id)).toContain("open");
    expect(resolved.map((action) => action.id)).toContain("copyLink");
    expect(resolved.map((action) => action.id)).not.toContain("reveal");
  });

  it("resolves file-only reveal actions for file targets", () => {
    const actions = resolveContextMenuActions({
      target: {
        id: "file_1",
        type: "file",
        label: "Brief.pdf",
        kind: "file"
      }
    });

    expect(actions.map((action) => action.id)).toContain("open");
    expect(actions.map((action) => action.id)).toContain("reveal");
  });
});

