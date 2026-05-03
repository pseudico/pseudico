import { ClipboardList, Plus } from "lucide-react";
import type { ClipboardEvent, FormEvent } from "react";
import { useState } from "react";

export type ChecklistEditorItem = {
  id: string;
  title: string;
  status: string;
  depth?: number;
};

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
};

export function ChecklistEditor({
  items,
  disabled = false,
  emptyText = "No checklist items yet.",
  error = null,
  onAddItem,
  onBulkAddItems,
  onToggleItem
}: ChecklistEditorProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

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

    setTitle("");
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

  return (
    <div className="checklist-editor">
      {items.length === 0 ? (
        <p className="muted-text">{emptyText}</p>
      ) : (
        <ul className="checklist-items">
          {items.map((item) => {
            const completed = item.status === "done";

            return (
              <li
                className="checklist-item"
                data-checklist-item-status={item.status}
                key={item.id}
                style={{ paddingInlineStart: `${(item.depth ?? 0) * 18}px` }}
              >
                <label>
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
              </li>
            );
          })}
        </ul>
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
          onChange={(event) => setTitle(event.currentTarget.value)}
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
