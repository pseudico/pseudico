export type ListEditorItemSnapshot = {
  id: string;
};

export type ListEditorState = {
  selectedItemId: string | null;
  draftTitle: string;
  dirty: boolean;
};

export type ListEditorStateEvent =
  | {
      type: "itemsChanged";
      items: readonly ListEditorItemSnapshot[];
    }
  | {
      type: "selectItem";
      itemId: string | null;
    }
  | {
      type: "moveSelection";
      direction: "previous" | "next";
      items: readonly ListEditorItemSnapshot[];
    }
  | {
      type: "updateDraft";
      title: string;
    }
  | {
      type: "submitDraft";
      createdItemId?: string | null;
    }
  | {
      type: "escape";
    };

export type ListEditorKeyboardTarget = "draft" | "row" | "other";

export type ListEditorKeyboardEventLike = {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
};

export type ListEditorKeyboardCommand =
  | "submitDraft"
  | "cancelDirtyDraft"
  | "clearSelection"
  | "selectPrevious"
  | "selectNext"
  | "indentSelected"
  | "outdentSelected"
  | "moveSelectedUp"
  | "moveSelectedDown";

export function createListEditorState(
  input: Partial<ListEditorState> = {}
): ListEditorState {
  const draftTitle = input.draftTitle ?? "";

  return {
    selectedItemId: input.selectedItemId ?? null,
    draftTitle,
    dirty: input.dirty ?? draftTitle.trim().length > 0
  };
}

export function reduceListEditorState(
  state: ListEditorState,
  event: ListEditorStateEvent
): ListEditorState {
  switch (event.type) {
    case "itemsChanged":
      return event.items.some((item) => item.id === state.selectedItemId)
        ? state
        : { ...state, selectedItemId: null };
    case "selectItem":
      return { ...state, selectedItemId: event.itemId };
    case "moveSelection":
      return {
        ...state,
        selectedItemId: moveListEditorSelection({
          currentItemId: state.selectedItemId,
          direction: event.direction,
          items: event.items
        })
      };
    case "updateDraft":
      return {
        ...state,
        draftTitle: event.title,
        dirty: event.title.trim().length > 0
      };
    case "submitDraft":
      return {
        selectedItemId: event.createdItemId ?? state.selectedItemId,
        draftTitle: "",
        dirty: false
      };
    case "escape":
      return state.dirty
        ? { ...state, draftTitle: "", dirty: false }
        : { ...state, selectedItemId: null };
  }
}

export function moveListEditorSelection(input: {
  currentItemId: string | null;
  direction: "previous" | "next";
  items: readonly ListEditorItemSnapshot[];
}): string | null {
  if (input.items.length === 0) {
    return null;
  }

  const currentIndex = input.currentItemId === null
    ? -1
    : input.items.findIndex((item) => item.id === input.currentItemId);

  if (currentIndex === -1) {
    return input.direction === "previous"
      ? input.items[input.items.length - 1]?.id ?? null
      : input.items[0]?.id ?? null;
  }

  const nextIndex = input.direction === "previous"
    ? Math.max(0, currentIndex - 1)
    : Math.min(input.items.length - 1, currentIndex + 1);

  return input.items[nextIndex]?.id ?? null;
}

export function resolveListEditorKeyboardCommand(
  event: ListEditorKeyboardEventLike,
  context: {
    target: ListEditorKeyboardTarget;
    dirty: boolean;
    hasSelection: boolean;
  }
): ListEditorKeyboardCommand | null {
  const primary = event.ctrlKey === true || event.metaKey === true;

  if (event.key === "Escape") {
    return context.dirty ? "cancelDirtyDraft" : "clearSelection";
  }

  if (context.target === "draft" && event.key === "Enter" && !primary) {
    return "submitDraft";
  }

  if (context.target !== "row") {
    return null;
  }

  if (primary && event.key === "ArrowRight") {
    return "indentSelected";
  }

  if (primary && event.key === "ArrowLeft") {
    return "outdentSelected";
  }

  if (primary && event.key === "ArrowUp") {
    return "moveSelectedUp";
  }

  if (primary && event.key === "ArrowDown") {
    return "moveSelectedDown";
  }

  if (!primary && !event.altKey && !event.shiftKey && event.key === "ArrowUp") {
    return "selectPrevious";
  }

  if (!primary && !event.altKey && !event.shiftKey && event.key === "ArrowDown") {
    return "selectNext";
  }

  return null;
}
