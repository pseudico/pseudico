import { useState } from "react";
import { Pencil } from "lucide-react";
import type { UniversalItemViewModel } from "./ItemCard";
import {
  NoteEditor,
  type NoteEditorValues
} from "../forms/NoteEditor";

export type NoteCardViewModel = UniversalItemViewModel & {
  type: "note";
  content: string;
  preview?: string | null;
  format?: "markdown";
};

export type NoteCardContentProps = {
  item: NoteCardViewModel;
  disabled?: boolean;
  error?: string | null;
  onSave?: (
    item: NoteCardViewModel,
    values: NoteEditorValues
  ) => Promise<boolean | void> | boolean | void;
};

export function NoteCardContent({
  item,
  disabled = false,
  error = null,
  onSave
}: NoteCardContentProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <NoteEditor
        contextLabel={item.title}
        disabled={disabled}
        error={error}
        initialValues={{
          title: item.title,
          content: item.content
        }}
        submitLabel="Save changes"
        onCancel={() => setEditing(false)}
        onSubmit={async (values) => {
          const saved = await onSave?.(item, values);

          if (saved === false) {
            return false;
          }

          setEditing(false);
          return true;
        }}
      />
    );
  }

  return (
    <div className="note-card-content">
      {item.preview === undefined || item.preview === null ? null : (
        <p className="note-card-preview">{item.preview}</p>
      )}

      <MarkdownPreview content={item.content} />

      {onSave === undefined ? null : (
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          type="button"
          onClick={() => setEditing(true)}
        >
          <Pencil size={16} aria-hidden="true" />
          Edit note
        </button>
      )}
    </div>
  );
}

function MarkdownPreview({
  content
}: {
  content: string;
}): React.JSX.Element {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return <p className="muted-text">Empty note</p>;
  }

  return (
    <div className="note-markdown-preview">
      {lines.slice(0, 8).map((line, index) => {
        const parsed = parseMarkdownLine(line);

        return (
          <p className={parsed.className} key={`${index}:${line}`}>
            {parsed.prefix === null ? null : (
              <span aria-hidden="true">{parsed.prefix}</span>
            )}
            {parsed.text}
          </p>
        );
      })}
      {lines.length > 8 ? (
        <p className="note-card-truncated">More content in this note</p>
      ) : null}
    </div>
  );
}

function parseMarkdownLine(line: string): {
  className: string;
  prefix: string | null;
  text: string;
} {
  const trimmed = line.trim();
  const heading = trimmed.match(/^#{1,6}\s+(?<text>.+)$/);

  if (heading?.groups?.text !== undefined) {
    return {
      className: "note-preview-heading",
      prefix: null,
      text: stripInlineMarkdown(heading.groups.text)
    };
  }

  const checkbox = trimmed.match(/^[-*+]\s+\[(?<checked>[ xX])\]\s+(?<text>.+)$/);

  if (checkbox?.groups?.text !== undefined) {
    const checked = checkbox.groups.checked ?? " ";

    return {
      className: "note-preview-list-row",
      prefix: checked.trim().length === 0 ? "[ ]" : "[x]",
      text: stripInlineMarkdown(checkbox.groups.text)
    };
  }

  const bullet = trimmed.match(/^[-*+]\s+(?<text>.+)$/);

  if (bullet?.groups?.text !== undefined) {
    return {
      className: "note-preview-list-row",
      prefix: "-",
      text: stripInlineMarkdown(bullet.groups.text)
    };
  }

  const quote = trimmed.match(/^>\s?(?<text>.+)$/);

  if (quote?.groups?.text !== undefined) {
    return {
      className: "note-preview-quote",
      prefix: null,
      text: stripInlineMarkdown(quote.groups.text)
    };
  }

  return {
    className: "note-preview-paragraph",
    prefix: null,
    text: stripInlineMarkdown(trimmed)
  };
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}
