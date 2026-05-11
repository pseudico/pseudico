import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ClipboardList,
  Plus,
  Trash2,
  X
} from "lucide-react";
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { useEffect, useReducer, useRef, useState } from "react";
import {
  LOCAL_WORK_OS_DRAG_MIME_TYPE,
  createListEditorState,
  encodeDragPayload,
  parseDragPayload,
  reduceListEditorState,
  resolveListEditorKeyboardCommand,
  resolveContextMenuActions
} from "@local-work-os/core";
import type { ParsedDateRange } from "@local-work-os/core";
import { ContextMenu } from "./ContextMenu";
import { DateRangeInput } from "./DateRangeInput";

export type ChecklistEditorItem = {
  id: string;
  title: string;
  status: string;
  depth?: number;
  startAt?: string | null;
  dueAt?: string | null;
};

export type ChecklistBulkAction =
  | "complete"
  | "delete"
  | "move_up"
  | "move_down"
  | "indent"
  | "outdent";

export type ChecklistEditorProps = {
  items: readonly ChecklistEditorItem[];
  disabled?: boolean;
  emptyText?: string;
  error?: string | null;
  onAddItem: (title: string) => Promise<boolean | void> | boolean | void;
  onBulkAddItems: (text: string) => Promise<boolean | void> | boolean | void;
  onToggleItem: (
    item: ChecklistEditorItem
  ) => Promise<boolean | void> | boolean | void;
  onReorderItem?: (
    draggedItemId: string,
    targetItemId: string
  ) => Promise<boolean | void> | boolean | void;
  onIndentItem?: (
    item: ChecklistEditorItem
  ) => Promise<boolean | void> | boolean | void;
  onOutdentItem?: (
    item: ChecklistEditorItem
  ) => Promise<boolean | void> | boolean | void;
  onMoveItem?: (
    item: ChecklistEditorItem,
    direction: "up" | "down"
  ) => Promise<boolean | void> | boolean | void;
  onBulkActionItems?: (
    items: readonly ChecklistEditorItem[],
    action: ChecklistBulkAction
  ) => Promise<boolean | void> | boolean | void;
  onDateRangeChange?: (
    item: ChecklistEditorItem,
    range: ParsedDateRange
  ) => Promise<boolean | void> | boolean | void;
  listId?: string;
};

export function ChecklistEditor({
  items,
  disabled = false,
  emptyText = "No checklist items yet.",
  error = null,
  onAddItem,
  onBulkAddItems,
  onDateRangeChange,
  onIndentItem,
  onMoveItem,
  onOutdentItem,
  onReorderItem,
  onBulkActionItems,
  listId,
  onToggleItem
}: ChecklistEditorProps): React.JSX.Element {
  const [editorState, dispatchEditorState] = useReducer(
    reduceListEditorState,
    createListEditorState()
  );
  const [bulkText, setBulkText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    () => new Set()
  );
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const title = editorState.draftTitle;

  useEffect(() => {
    dispatchEditorState({ type: "itemsChanged", items });
    setSelectedItemIds((current) => {
      const visibleIds = new Set(items.map((item) => item.id));
      const next = new Set([...current].filter((itemId) => visibleIds.has(itemId)));

      return next.size === current.size ? current : next;
    });
  }, [items]);

  async function handleAddItem(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      setFormError("Checklist item title is required.");
      return;
    }

    setFormError(null);
    const submitted = await onAddItem(trimmedTitle);

    if (submitted === false) {
      return;
    }

    dispatchEditorState({ type: "submitDraft" });
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    const command = resolveListEditorKeyboardCommand(event, {
      target: "draft",
      dirty: editorState.dirty,
      hasSelection: editorState.selectedItemId !== null
    });

    if (command === "cancelDirtyDraft" || command === "clearSelection") {
      event.preventDefault();
      setFormError(null);
      dispatchEditorState({ type: "escape" });
    }
  }

  function handleRowKeyDown(
    event: KeyboardEvent<HTMLLIElement>,
    item: ChecklistEditorItem
  ): void {
    const command = resolveListEditorKeyboardCommand(event, {
      target: "row",
      dirty: editorState.dirty,
      hasSelection: editorState.selectedItemId !== null
    });

    if (command === null) {
      return;
    }

    event.preventDefault();

    if (command === "selectPrevious" || command === "selectNext") {
      const direction = command === "selectPrevious" ? "previous" : "next";
      const selectedItemId = moveAndFocusSelection(direction);
      dispatchEditorState({
        type: "selectItem",
        itemId: selectedItemId
      });
      return;
    }

    if (command === "indentSelected" && onIndentItem !== undefined) {
      void onIndentItem(item);
      return;
    }

    if (command === "outdentSelected" && onOutdentItem !== undefined) {
      void onOutdentItem(item);
      return;
    }

    if (command === "moveSelectedUp" && onMoveItem !== undefined) {
      void onMoveItem(item, "up");
      return;
    }

    if (command === "moveSelectedDown" && onMoveItem !== undefined) {
      void onMoveItem(item, "down");
      return;
    }

    if (command === "cancelDirtyDraft" || command === "clearSelection") {
      dispatchEditorState({ type: "escape" });
    }
  }

  function moveAndFocusSelection(direction: "previous" | "next"): string | null {
    const currentIndex = items.findIndex(
      (item) => item.id === editorState.selectedItemId
    );
    const nextIndex =
      currentIndex === -1
        ? direction === "previous"
          ? items.length - 1
          : 0
        : direction === "previous"
          ? Math.max(0, currentIndex - 1)
          : Math.min(items.length - 1, currentIndex + 1);
    const nextItemId = items[nextIndex]?.id ?? null;

    if (nextItemId !== null) {
      rowRefs.current.get(nextItemId)?.focus();
    }

    return nextItemId;
  }

  async function handleBulkSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();
    await submitBulkText(bulkText, true);
  }

  async function handleInlinePaste(
    event: ClipboardEvent<HTMLInputElement>
  ): Promise<void> {
    const pastedText = event.clipboardData.getData("text");

    if (!pastedText.includes("\n")) {
      return;
    }

    event.preventDefault();
    await submitBulkText(pastedText, false);
  }

  async function submitBulkText(
    text: string,
    clearBulkText: boolean
  ): Promise<void> {
    const trimmedText = text.trim();

    if (trimmedText.length === 0) {
      setFormError("Paste at least one checklist item.");
      return;
    }

    setFormError(null);
    const submitted = await onBulkAddItems(trimmedText);

    if (submitted === false) {
      return;
    }

    if (clearBulkText) {
      setBulkText("");
    }
  }

  function toggleBulkSelection(itemId: string, selected: boolean): void {
    setSelectedItemIds((current) => {
      const next = new Set(current);

      if (selected) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }

      return next;
    });
  }

  async function handleBulkAction(action: ChecklistBulkAction): Promise<void> {
    if (onBulkActionItems === undefined || selectedItemIds.size === 0) {
      return;
    }

    const selectedItems = items.filter((item) => selectedItemIds.has(item.id));
    const submitted = await onBulkActionItems(selectedItems, action);

    if (submitted === false) {
      return;
    }

    if (action === "delete") {
      setSelectedItemIds(new Set());
    }
  }

  return (
    <div className="checklist-editor">
      {items.length === 0 ? (
        <p className="muted-text">{emptyText}</p>
      ) : (
        <>
          <p className="muted-text checklist-keyboard-hint">
            Keyboard: Enter adds a row. Focus a row, then use Ctrl/Cmd+Left or
            Right to outdent/indent and Ctrl/Cmd+Up or Down to move it.
          </p>
          {onBulkActionItems === undefined || selectedItemIds.size === 0 ? null : (
            <div
              className="checklist-selection-toolbar"
              role="toolbar"
              aria-label="Selected checklist actions"
            >
              <strong>{selectedItemIds.size} selected</strong>
              <button
                className="secondary-button compact-button"
                disabled={disabled}
                type="button"
                onClick={() => void handleBulkAction("complete")}
              >
                <CheckCircle2 size={15} aria-hidden="true" />
                Complete
              </button>
              <button
                className="secondary-button compact-button"
                disabled={disabled}
                type="button"
                onClick={() => void handleBulkAction("move_up")}
              >
                <ArrowUp size={15} aria-hidden="true" />
                Up
              </button>
              <button
                className="secondary-button compact-button"
                disabled={disabled}
                type="button"
                onClick={() => void handleBulkAction("move_down")}
              >
                <ArrowDown size={15} aria-hidden="true" />
                Down
              </button>
              <button
                className="secondary-button compact-button"
                disabled={disabled}
                type="button"
                onClick={() => void handleBulkAction("indent")}
              >
                <ArrowRight size={15} aria-hidden="true" />
                Indent
              </button>
              <button
                className="secondary-button compact-button"
                disabled={disabled}
                type="button"
                onClick={() => void handleBulkAction("outdent")}
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Outdent
              </button>
              <button
                className="danger-button compact-button"
                disabled={disabled}
                type="button"
                onClick={() => void handleBulkAction("delete")}
              >
                <Trash2 size={15} aria-hidden="true" />
                Delete
              </button>
              <button
                className="icon-button"
                disabled={disabled}
                type="button"
                aria-label="Clear checklist selection"
                onClick={() => setSelectedItemIds(new Set())}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          <ul className="checklist-items">
            {items.map((item) => {
            const completed = item.status === "done";
            const target = {
              id: item.id,
              type: "listItem" as const,
              label: item.title,
              kind: "checklist-row",
              capabilities: {
                edit: false,
                move: false,
                tag: false,
                category: false,
                pin: false,
                archive: false,
                duplicate: false,
                copyLink: false,
                inspect: false,
                delete: false
              }
            };
            const actions = resolveContextMenuActions({
              target,
              hideDisabled: false
            }).map((action) => ({
              id: action.id,
              title: action.title,
              group: action.group,
              disabledReason: action.disabledReason,
              danger: action.danger
            }));

              return (
                <li
                className="checklist-item"
                data-checklist-item-status={item.status}
                draggable={onReorderItem !== undefined}
                key={item.id}
                ref={(element) => {
                  if (element === null) {
                    rowRefs.current.delete(item.id);
                    return;
                  }

                  rowRefs.current.set(item.id, element);
                }}
                aria-label={`Checklist row: ${item.title}`}
                aria-selected={editorState.selectedItemId === item.id}
                tabIndex={disabled ? -1 : 0}
                style={{ paddingInlineStart: `${(item.depth ?? 0) * 18}px` }}
                onDragOver={(event) => {
                  if (onReorderItem !== undefined) {
                    event.preventDefault();
                  }
                }}
                onDragStart={(event) => {
                  if (onReorderItem === undefined || listId === undefined) {
                    return;
                  }

                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData(
                    LOCAL_WORK_OS_DRAG_MIME_TYPE,
                    encodeDragPayload({
                      type: "list_item",
                      listId,
                      listItemId: item.id
                    })
                  );
                  event.dataTransfer.setData("text/plain", item.id);
                }}
                onDrop={(event) => {
                  if (onReorderItem === undefined) {
                    return;
                  }

                  const payload = parseDragPayload(
                    event.dataTransfer.getData(LOCAL_WORK_OS_DRAG_MIME_TYPE)
                  );

                  if (
                    payload?.type !== "list_item" ||
                    payload.listItemId === item.id ||
                    (listId !== undefined && payload.listId !== listId)
                  ) {
                    return;
                  }

                  event.preventDefault();
                  void onReorderItem(payload.listItemId, item.id);
                }}
                onFocus={() =>
                  dispatchEditorState({ type: "selectItem", itemId: item.id })
                }
                onKeyDown={(event) => handleRowKeyDown(event, item)}
                >
                  <ContextMenu
                  actions={actions}
                  label={`Context menu for ${item.title}`}
                  target={target}
                >
                  <label>
                    {onBulkActionItems === undefined ? null : (
                      <input
                        aria-label={`Select ${item.title}`}
                        checked={selectedItemIds.has(item.id)}
                        disabled={disabled}
                        type="checkbox"
                        onChange={(event) =>
                          toggleBulkSelection(item.id, event.currentTarget.checked)
                        }
                      />
                    )}
                    <input
                      checked={completed}
                      disabled={disabled}
                      type="checkbox"
                      onChange={() => {
                        void onToggleItem(item);
                      }}
                    />
                    <span>{item.title}</span>
                  </label>
                  {onDateRangeChange === undefined ? null : (
                    <DateRangeInput
                      disabled={disabled}
                      dueAt={item.dueAt}
                      label="Date"
                      startAt={item.startAt}
                      onChange={(range) => onDateRangeChange(item, range)}
                    />
                  )}
                  </ContextMenu>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <form
        className="checklist-inline-add"
        aria-label="Add checklist item"
        onSubmit={(event) => {
          void handleAddItem(event);
        }}
      >
        <input
          disabled={disabled}
          placeholder="Add checklist item"
          value={title}
          onChange={(event) =>
            dispatchEditorState({
              type: "updateDraft",
              title: event.currentTarget.value
            })
          }
          onKeyDown={handleDraftKeyDown}
          onPaste={(event) => {
            void handleInlinePaste(event);
          }}
        />
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          type="submit"
        >
          <Plus size={16} aria-hidden="true" />
          Add
        </button>
      </form>

      <form
        className="checklist-bulk-add"
        aria-label="Paste checklist items"
        onSubmit={(event) => {
          void handleBulkSubmit(event);
        }}
      >
        <label>
          <span>
            <ClipboardList size={15} aria-hidden="true" />
            Bulk paste
          </span>
          <textarea
            disabled={disabled}
            placeholder="- Draft outline&#10;[x] Confirm brief&#10;2. Send update"
            rows={3}
            value={bulkText}
            onChange={(event) => setBulkText(event.currentTarget.value)}
          />
        </label>
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          type="submit"
        >
          Add pasted
        </button>
      </form>

      {formError === null && error === null ? null : (
        <p className="form-message form-message-error">
          {formError ?? error}
        </p>
      )}
    </div>
  );
}
