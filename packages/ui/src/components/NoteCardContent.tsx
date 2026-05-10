import { useState, type ReactNode } from "react";
import { parseWikilinks } from "@local-work-os/core";
import { Pencil } from "lucide-react";
import type { UniversalItemViewModel } from "./ItemCard";
import {
  NoteEditor,
  type NoteEditorValues,
  type NoteWikilinkSuggestion
} from "../forms/NoteEditor";

export type WikilinkTargetViewModel = {
  type: "container" | "item" | "list_item";
  id: string;
  kind: "project" | "contact" | "item";
  title: string;
  containerId?: string;
  containerType?: string;
};

export type WikilinkViewModel = {
  title: string;
  status: "resolved" | "broken" | "ambiguous";
  target: WikilinkTargetViewModel | null;
  candidates?: readonly WikilinkTargetViewModel[];
};

export type NoteCardViewModel = UniversalItemViewModel & {
  type: "note";
  content: string;
  preview?: string | null;
  format?: "markdown";
  wikilinks?: readonly WikilinkViewModel[];
};

export type NoteCardContentProps = {
  item: NoteCardViewModel;
  disabled?: boolean;
  error?: string | null;
  onSave?: (
    item: NoteCardViewModel,
    values: NoteEditorValues
  ) => Promise<boolean | void> | boolean | void;
  onWikilinkOpen?: ((target: WikilinkTargetViewModel) => void) | undefined;
  wikilinkSuggestions?: readonly NoteWikilinkSuggestion[];
};

export function NoteCardContent({
  item,
  disabled = false,
  error = null,
  onSave,
  onWikilinkOpen,
  wikilinkSuggestions = []
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
        wikilinkSuggestions={wikilinkSuggestions}
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

      <MarkdownPreview
        content={item.content}
        wikilinks={item.wikilinks ?? []}
        onWikilinkOpen={onWikilinkOpen}
      />

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
  content,
  wikilinks,
  onWikilinkOpen
}: {
  content: string;
  wikilinks: readonly WikilinkViewModel[];
  onWikilinkOpen?: ((target: WikilinkTargetViewModel) => void) | undefined;
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
            <InlineWikilinkText
              text={parsed.text}
              wikilinks={wikilinks}
              onWikilinkOpen={onWikilinkOpen}
            />
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


function InlineWikilinkText({
  text,
  wikilinks,
  onWikilinkOpen
}: {
  text: string;
  wikilinks: readonly WikilinkViewModel[];
  onWikilinkOpen?: ((target: WikilinkTargetViewModel) => void) | undefined;
}): React.JSX.Element {
  const nodes = renderInlineWikilinks(text, wikilinks, onWikilinkOpen);

  return <>{nodes}</>;
}

function renderInlineWikilinks(
  text: string,
  wikilinks: readonly WikilinkViewModel[],
  onWikilinkOpen?: (target: WikilinkTargetViewModel) => void
): ReactNode[] {
  const parsed = parseWikilinks(text);

  if (parsed.length === 0) {
    return [text];
  }

  const byTitle = new Map(
    wikilinks.map((link) => [link.title.trim().toLocaleLowerCase(), link])
  );
  const nodes: ReactNode[] = [];
  let cursor = 0;

  parsed.forEach((link, index) => {
    if (link.start > cursor) {
      nodes.push(text.slice(cursor, link.start));
    }

    const resolved = byTitle.get(link.title.trim().toLocaleLowerCase());
    nodes.push(
      <WikilinkToken
        key={`${link.start}:${link.raw}:${index}`}
        link={resolved ?? { title: link.title, status: "broken", target: null }}
        onOpen={onWikilinkOpen}
      />
    );
    cursor = link.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function WikilinkToken({
  link,
  onOpen
}: {
  link: WikilinkViewModel;
  onOpen?: ((target: WikilinkTargetViewModel) => void) | undefined;
}): React.JSX.Element {
  if (link.status === "resolved" && link.target !== null) {
    const target = link.target;

    return (
      <button
        className="note-wikilink note-wikilink-resolved"
        type="button"
        title={`Open ${target.kind}: ${target.title}`}
        onClick={() => onOpen?.(target)}
      >
        [[{link.title}]]
      </button>
    );
  }

  const label = link.status === "ambiguous"
    ? `Ambiguous wikilink: ${link.title}`
    : `Broken wikilink: ${link.title}`;

  return (
    <span
      className={`note-wikilink note-wikilink-${link.status}`}
      title={label}
    >
      [[{link.title}]]
    </span>
  );
}

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}
