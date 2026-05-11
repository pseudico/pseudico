import { useState, type ReactNode } from "react";
import { parseExternalLinks, parseWikilinks, type ExternalLinkToken } from "@local-work-os/core";
import { Pencil } from "lucide-react";
import type { UniversalItemViewModel } from "./ItemCard";
import {
  NoteEditor,
  type NoteEditorSaveMeta,
  type NoteEditorSaveResult,
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
  noteUpdatedAt?: string;
  wikilinks?: readonly WikilinkViewModel[];
};

export type NoteCardContentProps = {
  item: NoteCardViewModel;
  disabled?: boolean;
  error?: string | null;
  onSave?: (
    item: NoteCardViewModel,
    values: NoteEditorValues,
    meta: NoteEditorSaveMeta
  ) => Promise<NoteEditorSaveResult | boolean | void> | NoteEditorSaveResult | boolean | void;
  onAutosave?: (
    item: NoteCardViewModel,
    values: NoteEditorValues,
    meta: NoteEditorSaveMeta
  ) => Promise<NoteEditorSaveResult | boolean | void> | NoteEditorSaveResult | boolean | void;
  onWikilinkOpen?: ((target: WikilinkTargetViewModel) => void) | undefined;
  onExternalLinkOpen?: ((url: string) => void | Promise<void>) | undefined;
  onExternalLinkCopy?: ((url: string) => void | Promise<void>) | undefined;
  onExternalLinkCreate?: ((url: string) => void | Promise<void>) | undefined;
  wikilinkSuggestions?: readonly NoteWikilinkSuggestion[];
};

export function NoteCardContent({
  item,
  disabled = false,
  error = null,
  onSave,
  onAutosave,
  onWikilinkOpen,
  onExternalLinkOpen,
  onExternalLinkCopy,
  onExternalLinkCreate,
  wikilinkSuggestions = []
}: NoteCardContentProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);

  if (editing) {
    const autosaveProps = onAutosave === undefined
      ? {}
      : {
          autosave: {
            ...(item.noteUpdatedAt === undefined
              ? {}
              : { expectedVersion: item.noteUpdatedAt }),
            onSave: (values: NoteEditorValues, meta: NoteEditorSaveMeta) =>
              onAutosave(item, values, meta)
          }
        };

    return (
      <NoteEditor
        contextLabel={item.title}
        disabled={disabled}
        error={error}
        initialValues={{
          title: item.title,
          content: item.content
        }}
        draftKey={`local-work-os:note-draft:${item.id}`}
        submitLabel="Save changes"
        wikilinkSuggestions={wikilinkSuggestions}
        {...autosaveProps}
        onCancel={() => setEditing(false)}
        onSubmit={async (values, meta) => {
          const saved = await onSave?.(item, values, meta);

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
        onExternalLinkOpen={onExternalLinkOpen}
        onExternalLinkCopy={onExternalLinkCopy}
        onExternalLinkCreate={onExternalLinkCreate}
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
  onWikilinkOpen,
  onExternalLinkOpen,
  onExternalLinkCopy,
  onExternalLinkCreate
}: {
  content: string;
  wikilinks: readonly WikilinkViewModel[];
  onWikilinkOpen?: ((target: WikilinkTargetViewModel) => void) | undefined;
  onExternalLinkOpen?: ((url: string) => void | Promise<void>) | undefined;
  onExternalLinkCopy?: ((url: string) => void | Promise<void>) | undefined;
  onExternalLinkCreate?: ((url: string) => void | Promise<void>) | undefined;
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
              onExternalLinkOpen={onExternalLinkOpen}
              onExternalLinkCopy={onExternalLinkCopy}
              onExternalLinkCreate={onExternalLinkCreate}
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
  onWikilinkOpen,
  onExternalLinkOpen,
  onExternalLinkCopy,
  onExternalLinkCreate
}: {
  text: string;
  wikilinks: readonly WikilinkViewModel[];
  onWikilinkOpen?: ((target: WikilinkTargetViewModel) => void) | undefined;
  onExternalLinkOpen?: ((url: string) => void | Promise<void>) | undefined;
  onExternalLinkCopy?: ((url: string) => void | Promise<void>) | undefined;
  onExternalLinkCreate?: ((url: string) => void | Promise<void>) | undefined;
}): React.JSX.Element {
  const nodes = renderInlineContent(text, {
    wikilinks,
    onWikilinkOpen,
    onExternalLinkOpen,
    onExternalLinkCopy,
    onExternalLinkCreate
  });

  return <>{nodes}</>;
}

function renderInlineContent(
  text: string,
  options: {
    wikilinks: readonly WikilinkViewModel[];
    onWikilinkOpen?: ((target: WikilinkTargetViewModel) => void) | undefined;
    onExternalLinkOpen?: ((url: string) => void | Promise<void>) | undefined;
    onExternalLinkCopy?: ((url: string) => void | Promise<void>) | undefined;
    onExternalLinkCreate?: ((url: string) => void | Promise<void>) | undefined;
  }
): ReactNode[] {
  const parsed = [
    ...parseWikilinks(text).map((link) => ({ type: "wikilink" as const, start: link.start, end: link.end, link })),
    ...parseExternalLinks(text).map((link) => ({ type: "external" as const, start: link.start, end: link.end, link }))
  ].sort((left, right) => left.start - right.start || right.end - left.end);

  if (parsed.length === 0) {
    return [text];
  }

  const byTitle = new Map(
    options.wikilinks.map((link) => [link.title.trim().toLocaleLowerCase(), link])
  );
  const nodes: ReactNode[] = [];
  let cursor = 0;

  parsed.forEach((token, index) => {
    if (token.start < cursor) {
      return;
    }

    if (token.start > cursor) {
      nodes.push(text.slice(cursor, token.start));
    }

    if (token.type === "wikilink") {
      const resolved = byTitle.get(token.link.title.trim().toLocaleLowerCase());
      nodes.push(
        <WikilinkToken
          key={`${token.start}:${token.link.raw}:${index}`}
          link={resolved ?? { title: token.link.title, status: "broken", target: null }}
          onOpen={options.onWikilinkOpen}
        />
      );
    } else {
      nodes.push(
        <ExternalLinkChip
          key={`${token.start}:${token.link.raw}:${index}`}
          link={token.link}
          onCopy={options.onExternalLinkCopy}
          onCreate={options.onExternalLinkCreate}
          onOpen={options.onExternalLinkOpen}
        />
      );
    }

    cursor = token.end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function ExternalLinkChip({
  link,
  onCopy,
  onCreate,
  onOpen
}: {
  link: ExternalLinkToken;
  onCopy?: ((url: string) => void | Promise<void>) | undefined;
  onCreate?: ((url: string) => void | Promise<void>) | undefined;
  onOpen?: ((url: string) => void | Promise<void>) | undefined;
}): React.JSX.Element {
  return (
    <span className="note-external-link-token">
      <button
        className="note-external-link"
        type="button"
        title={`Open external link: ${link.normalizedUrl}`}
        onClick={() => {
          void onOpen?.(link.normalizedUrl);
        }}
      >
        {link.label}
      </button>
      {onCopy === undefined ? null : (
        <button
          className="note-external-link-action"
          type="button"
          title={`Copy ${link.normalizedUrl}`}
          onClick={() => {
            void onCopy(link.normalizedUrl);
          }}
        >
          Copy link
        </button>
      )}
      {onCreate === undefined ? null : (
        <button
          className="note-external-link-action"
          type="button"
          title={`Save ${link.normalizedUrl} as a link item`}
          onClick={() => {
            void onCreate(link.normalizedUrl);
          }}
        >
          Save as link
        </button>
      )}
    </span>
  );
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
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}
