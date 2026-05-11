import { describe, expect, it } from "vitest";
import {
  createListEditorState,
  reduceListEditorState,
  resolveListEditorKeyboardCommand
} from "../src";

const ITEMS = [{ id: "row_1" }, { id: "row_2" }, { id: "row_3" }];

describe("ListEditor state machine", () => {
  it("tracks keyboard selection and clears missing selections after refresh", () => {
    const selected = reduceListEditorState(createListEditorState(), {
      type: "moveSelection",
      direction: "next",
      items: ITEMS
    });
    const moved = reduceListEditorState(selected, {
      type: "moveSelection",
      direction: "next",
      items: ITEMS
    });
    const refreshed = reduceListEditorState(moved, {
      type: "itemsChanged",
      items: [{ id: "row_1" }]
    });

    expect(selected.selectedItemId).toBe("row_1");
    expect(moved.selectedItemId).toBe("row_2");
    expect(refreshed.selectedItemId).toBeNull();
  });

  it("uses Escape to clear dirty draft text before clearing row selection", () => {
    const dirty = reduceListEditorState(
      createListEditorState({ selectedItemId: "row_1" }),
      { type: "updateDraft", title: "New row" }
    );
    const draftCleared = reduceListEditorState(dirty, { type: "escape" });
    const selectionCleared = reduceListEditorState(draftCleared, {
      type: "escape"
    });

    expect(dirty).toMatchObject({ dirty: true, draftTitle: "New row" });
    expect(draftCleared).toMatchObject({
      dirty: false,
      draftTitle: "",
      selectedItemId: "row_1"
    });
    expect(selectionCleared.selectedItemId).toBeNull();
  });

  it("resolves scoped list keyboard commands", () => {
    expect(
      resolveListEditorKeyboardCommand(
        { key: "ArrowRight", ctrlKey: true },
        { target: "row", dirty: false, hasSelection: true }
      )
    ).toBe("indentSelected");
    expect(
      resolveListEditorKeyboardCommand(
        { key: "ArrowUp", metaKey: true },
        { target: "row", dirty: false, hasSelection: true }
      )
    ).toBe("moveSelectedUp");
    expect(
      resolveListEditorKeyboardCommand(
        { key: "Enter" },
        { target: "draft", dirty: true, hasSelection: false }
      )
    ).toBe("submitDraft");
    expect(
      resolveListEditorKeyboardCommand(
        { key: "Escape" },
        { target: "draft", dirty: true, hasSelection: false }
      )
    ).toBe("cancelDirtyDraft");
  });
});
