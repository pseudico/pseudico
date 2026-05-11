import { KeyboardEvent, useRef, useState } from "react";
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link,
  List,
  Quote,
  SplitSquareHorizontal
} from "lucide-react";

export type MarkdownEditorMode = "edit" | "preview" | "split";

export type MarkdownToolbarCommandId =
  | "heading"
  | "bold"
  | "italic"
  | "bullet"
  | "link"
  | "code"
  | "quote";

export type MarkdownEditorKeyCommand =
  | "bold"
  | "italic"
  | "link"
  | "code"
  | "save"
  | "none";

export type MarkdownEditorSelection = {
  selectionEnd: number;
  selectionStart: number;
  value: string;
};

export type MarkdownToolbarCommandResult = MarkdownEditorSelection;

export type MarkdownEditorProps = {
  disabled?: boolean;
  label?: string;
  mode?: MarkdownEditorMode;
  onChange: (value: string) => void;
  onModeChange?: (mode: MarkdownEditorMode) => void;
  onSaveShortcut?: () => void;
  placeholder?: string;
  previewLabel?: string;
  rows?: number;
  value: string;
};

type MarkdownToolbarCommand = {
  id: MarkdownToolbarCommandId;
  label: string;
  shortcut?: string;
  icon: React.JSX.Element;
};

export const markdownToolbarCommands: readonly MarkdownToolbarCommand[] = [
  {
    id: "heading",
    label: "Heading",
    shortcut: "Ctrl+Alt+2",
    icon: <Heading2 size={15} aria-hidden="true" />
  },
  {
    id: "bold",
    label: "Bold",
    shortcut: "Ctrl+B",
    icon: <Bold size={15} aria-hidden="true" />
  },
  {
    id: "italic",
    label: "Italic",
    shortcut: "Ctrl+I",
    icon: <Italic size={15} aria-hidden="true" />
  },
  {
    id: "bullet",
    label: "Bulleted list",
    icon: <List size={15} aria-hidden="true" />
  },
  {
    id: "link",
    label: "Link",
    shortcut: "Ctrl+K",
    icon: <Link size={15} aria-hidden="true" />
  },
  {
    id: "code",
    label: "Code",
    shortcut: "Ctrl+E",
    icon: <Code size={15} aria-hidden="true" />
  },
  {
    id: "quote",
    label: "Quote",
    icon: <Quote size={15} aria-hidden="true" />
  }
];

const markdownEditorModes: readonly {
  id: MarkdownEditorMode;
  label: string;
}[] = [
  { id: "edit", label: "Edit" },
  { id: "preview", label: "Preview" },
  { id: "split", label: "Split" }
];

export function MarkdownEditor({
  disabled = false,
  label = "Markdown",
  mode,
  onChange,
  onModeChange,
  onSaveShortcut,
  placeholder = "# Meeting notes",
  previewLabel = "Markdown preview",
  rows = 8,
  value
}: MarkdownEditorProps): React.JSX.Element {
  const [internalMode, setInternalMode] = useState<MarkdownEditorMode>(
    mode ?? "edit"
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeMode = mode ?? internalMode;

  function setMode(nextMode: MarkdownEditorMode): void {
    if (mode === undefined) {
      setInternalMode(nextMode);
    }

    onModeChange?.(nextMode);
  }

  function applyCommand(command: MarkdownToolbarCommandId): void {
    const textarea = textareaRef.current;
    const selection: MarkdownEditorSelection = {
      value,
      selectionStart: textarea?.selectionStart ?? value.length,
      selectionEnd: textarea?.selectionEnd ?? value.length
    };
    const result = applyMarkdownToolbarCommand(selection, command);

    onChange(result.value);

    window.setTimeout(() => {
      textarea?.focus();
      textarea?.setSelectionRange(result.selectionStart, result.selectionEnd);
    }, 0);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    const keyCommand = getMarkdownEditorKeyCommand({
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      key: event.key,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    });

    if (keyCommand === "none") {
      return;
    }

    event.preventDefault();

    if (keyCommand === "save") {
      onSaveShortcut?.();
      return;
    }

    applyCommand(keyCommand);
  }

  return (
    <div className="markdown-editor" data-markdown-mode={activeMode}>
      <div className="markdown-editor-toolbar" aria-label="Markdown formatting toolbar">
        <div className="markdown-editor-command-group" role="group" aria-label="Formatting commands">
          {markdownToolbarCommands.map((command) => (
            <button
              className="markdown-toolbar-button"
              disabled={disabled || activeMode === "preview"}
              key={command.id}
              title={command.shortcut === undefined ? command.label : `${command.label} (${command.shortcut})`}
              type="button"
              onClick={() => applyCommand(command.id)}
            >
              {command.icon}
              <span>{command.label}</span>
            </button>
          ))}
        </div>
        <div className="markdown-editor-mode-group" role="group" aria-label="Markdown editor mode">
          <SplitSquareHorizontal size={15} aria-hidden="true" />
          {markdownEditorModes.map((editorMode) => (
            <button
              aria-pressed={activeMode === editorMode.id}
              className="markdown-mode-button"
              disabled={disabled}
              key={editorMode.id}
              type="button"
              onClick={() => setMode(editorMode.id)}
            >
              {editorMode.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`markdown-editor-surface markdown-editor-surface-${activeMode}`}>
        {activeMode === "preview" ? null : (
          <label className="markdown-editor-input">
            <span>{label}</span>
            <textarea
              disabled={disabled}
              placeholder={placeholder}
              ref={textareaRef}
              rows={rows}
              value={value}
              onChange={(event) => onChange(event.currentTarget.value)}
              onKeyDown={handleKeyDown}
            />
          </label>
        )}

        {activeMode === "edit" ? null : (
          <div
            aria-label={previewLabel}
            className="markdown-editor-preview"
            role="region"
          >
            <SafeMarkdownPreview content={value} />
          </div>
        )}
      </div>
      <p className="markdown-editor-help">
        Ctrl/Cmd+Enter saves. Ctrl/Cmd+B, I, K, and E apply formatting.
      </p>
    </div>
  );
}

export function getMarkdownEditorKeyCommand(input: {
  altKey?: boolean;
  ctrlKey?: boolean;
  key: string;
  metaKey?: boolean;
  shiftKey?: boolean;
}): MarkdownEditorKeyCommand {
  const primaryModifier = input.ctrlKey === true || input.metaKey === true;

  if (!primaryModifier || input.altKey === true) {
    return "none";
  }

  if (input.key === "Enter") {
    return "save";
  }

  const key = input.key.toLocaleLowerCase();

  if (key === "b") {
    return "bold";
  }

  if (key === "i") {
    return "italic";
  }

  if (key === "k") {
    return "link";
  }

  if (key === "e") {
    return "code";
  }

  return "none";
}

export function applyMarkdownToolbarCommand(
  selection: MarkdownEditorSelection,
  command: MarkdownToolbarCommandId
): MarkdownToolbarCommandResult {
  switch (command) {
    case "heading":
      return toggleCurrentLinePrefix(selection, "## ");
    case "bullet":
      return toggleCurrentLinePrefix(selection, "- ");
    case "quote":
      return toggleCurrentLinePrefix(selection, "> ");
    case "bold":
      return wrapSelection(selection, "**", "**", "bold text");
    case "italic":
      return wrapSelection(selection, "_", "_", "italic text");
    case "code":
      return wrapSelection(selection, "`", "`", "code");
    case "link":
      return wrapSelection(selection, "[", "](https://example.com)", "link text");
  }
}

export function SafeMarkdownPreview({
  content
}: {
  content: string;
}): React.JSX.Element {
  const blocks = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (blocks.length === 0) {
    return <p className="muted-text">Nothing to preview yet.</p>;
  }

  return (
    <div className="safe-markdown-preview">
      {blocks.map((line, index) => {
        const parsed = parseSafeMarkdownLine(line);
        const key = `${index}:${line}`;

        if (parsed.kind === "heading") {
          return (
            <p className="safe-markdown-heading" key={key}>
              {parsed.text}
            </p>
          );
        }

        if (parsed.kind === "list") {
          return (
            <p className="safe-markdown-list-row" key={key}>
              <span aria-hidden="true">-</span>
              {parsed.text}
            </p>
          );
        }

        if (parsed.kind === "quote") {
          return (
            <blockquote className="safe-markdown-quote" key={key}>
              {parsed.text}
            </blockquote>
          );
        }

        if (parsed.kind === "code") {
          return (
            <pre className="safe-markdown-code-block" key={key}>
              <code>{parsed.text}</code>
            </pre>
          );
        }

        return (
          <p className="safe-markdown-paragraph" key={key}>
            {parsed.text}
          </p>
        );
      })}
    </div>
  );
}

function wrapSelection(
  selection: MarkdownEditorSelection,
  before: string,
  after: string,
  fallback: string
): MarkdownToolbarCommandResult {
  const selected = selection.value.slice(
    selection.selectionStart,
    selection.selectionEnd
  );
  const replacement = `${before}${selected.length === 0 ? fallback : selected}${after}`;
  const value = `${selection.value.slice(0, selection.selectionStart)}${replacement}${selection.value.slice(selection.selectionEnd)}`;
  const start = selection.selectionStart + before.length;
  const end = start + (selected.length === 0 ? fallback.length : selected.length);

  return {
    value,
    selectionStart: start,
    selectionEnd: end
  };
}

function toggleCurrentLinePrefix(
  selection: MarkdownEditorSelection,
  prefix: string
): MarkdownToolbarCommandResult {
  const lineStart = selection.value.lastIndexOf("\n", selection.selectionStart - 1) + 1;
  const lineEndMatch = selection.value.indexOf("\n", selection.selectionEnd);
  const lineEnd = lineEndMatch === -1 ? selection.value.length : lineEndMatch;
  const line = selection.value.slice(lineStart, lineEnd);
  const hasPrefix = line.startsWith(prefix);
  const nextLine = hasPrefix ? line.slice(prefix.length) : `${prefix}${line}`;
  const value = `${selection.value.slice(0, lineStart)}${nextLine}${selection.value.slice(lineEnd)}`;
  const offset = hasPrefix ? -prefix.length : prefix.length;

  return {
    value,
    selectionStart: Math.max(lineStart, selection.selectionStart + offset),
    selectionEnd: Math.max(lineStart, selection.selectionEnd + offset)
  };
}

function parseSafeMarkdownLine(line: string):
  | { kind: "code"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "list"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; text: string } {
  const trimmed = line.trim();
  const heading = trimmed.match(/^#{1,6}\s+(?<text>.+)$/);

  if (heading?.groups?.text !== undefined) {
    return {
      kind: "heading",
      text: stripMarkdownSyntax(heading.groups.text)
    };
  }

  const bullet = trimmed.match(/^[-*+]\s+(?<text>.+)$/);

  if (bullet?.groups?.text !== undefined) {
    return {
      kind: "list",
      text: stripMarkdownSyntax(bullet.groups.text)
    };
  }

  const quote = trimmed.match(/^>\s?(?<text>.+)$/);

  if (quote?.groups?.text !== undefined) {
    return {
      kind: "quote",
      text: stripMarkdownSyntax(quote.groups.text)
    };
  }

  const fencedCode = trimmed.match(/^```(?<text>.*)$/);

  if (fencedCode?.groups?.text !== undefined) {
    return {
      kind: "code",
      text: fencedCode.groups.text
    };
  }

  return {
    kind: "paragraph",
    text: stripMarkdownSyntax(trimmed)
  };
}

function stripMarkdownSyntax(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .trim();
}
