import { FormEvent, useEffect, useState } from "react";
import { Check, FileText, X } from "lucide-react";

export type NoteEditorValues = {
  title: string;
  content: string;
};

export type NoteWikilinkSuggestion = {
  id: string;
  title: string;
  kind: "project" | "contact" | "item";
};

export type NoteEditorProps = {
  contextLabel: string;
  disabled?: boolean;
  error?: string | null;
  initialValues?: Partial<NoteEditorValues>;
  onCancel?: () => void;
  onSubmit: (
    values: NoteEditorValues
  ) => Promise<boolean | void> | boolean | void;
  resetOnSubmit?: boolean;
  wikilinkSuggestions?: readonly NoteWikilinkSuggestion[];
  submitLabel?: string;
};

const emptyValues: NoteEditorValues = {
  title: "",
  content: ""
};

export function NoteEditor({
  contextLabel,
  disabled = false,
  error = null,
  initialValues = emptyValues,
  onCancel,
  onSubmit,
  resetOnSubmit = false,
  submitLabel = "Save note",
  wikilinkSuggestions = []
}: NoteEditorProps): React.JSX.Element {
  const [title, setTitle] = useState(initialValues.title ?? "");
  const [content, setContent] = useState(initialValues.content ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const activeWikilink = findActiveWikilinkQuery(content);
  const matchingWikilinks = getMatchingWikilinkSuggestions(
    wikilinkSuggestions,
    activeWikilink?.query ?? ""
  );

  useEffect(() => {
    setTitle(initialValues.title ?? "");
    setContent(initialValues.content ?? "");
    setFormError(null);
  }, [initialValues.title, initialValues.content]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      setFormError("Note title is required.");
      return;
    }

    setFormError(null);
    const submitted = await onSubmit({
      title: trimmedTitle,
      content
    });

    if (submitted === false) {
      return;
    }

    if (resetOnSubmit) {
      setTitle("");
      setContent("");
    }
  }

  return (
    <form
      className="note-editor"
      aria-label={`Edit Markdown note for ${contextLabel}`}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <label>
        <span>Note title</span>
        <span className="note-title-input">
          <FileText size={16} aria-hidden="true" />
          <input
            disabled={disabled}
            placeholder="New note"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
        </span>
      </label>

      <label>
        <span>Markdown</span>
        <textarea
          disabled={disabled}
          placeholder="# Meeting notes"
          rows={8}
          value={content}
          onChange={(event) => setContent(event.currentTarget.value)}
        />
      </label>

      {activeWikilink === null || matchingWikilinks.length === 0 ? null : (
        <div className="wikilink-suggestions" aria-label="Wikilink suggestions">
          <span>Link to local object</span>
          <div>
            {matchingWikilinks.map((suggestion) => (
              <button
                className="wikilink-suggestion-button"
                disabled={disabled}
                key={`${suggestion.kind}:${suggestion.id}`}
                type="button"
                onClick={() =>
                  setContent((current) =>
                    applyWikilinkSuggestion(current, activeWikilink, suggestion.title)
                  )
                }
              >
                {suggestion.title}
                <small>{suggestion.kind}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="note-editor-actions">
        <button className="primary-button" disabled={disabled} type="submit">
          <Check size={17} aria-hidden="true" />
          {submitLabel}
        </button>
        {onCancel === undefined ? null : (
          <button
            className="secondary-button"
            disabled={disabled}
            type="button"
            onClick={onCancel}
          >
            <X size={17} aria-hidden="true" />
            Cancel
          </button>
        )}
      </div>

      {formError === null && error === null ? null : (
        <p className="form-message form-message-error">
          {formError ?? error}
        </p>
      )}
    </form>
  );
}

type ActiveWikilinkQuery = {
  start: number;
  end: number;
  query: string;
};

function findActiveWikilinkQuery(content: string): ActiveWikilinkQuery | null {
  const openIndex = content.lastIndexOf("[[");

  if (openIndex === -1) {
    return null;
  }

  const closeIndex = content.indexOf("]]", openIndex + 2);

  if (closeIndex !== -1) {
    return null;
  }

  const query = content.slice(openIndex + 2);

  if (query.includes("\n") || query.includes("[")) {
    return null;
  }

  return {
    start: openIndex,
    end: content.length,
    query
  };
}

function getMatchingWikilinkSuggestions(
  suggestions: readonly NoteWikilinkSuggestion[],
  query: string
): NoteWikilinkSuggestion[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const seen = new Set<string>();

  return suggestions
    .filter((suggestion) => {
      const key = `${suggestion.kind}:${suggestion.id}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return (
        normalizedQuery.length === 0 ||
        suggestion.title.toLocaleLowerCase().includes(normalizedQuery)
      );
    })
    .slice(0, 6);
}

function applyWikilinkSuggestion(
  content: string,
  active: ActiveWikilinkQuery,
  title: string
): string {
  return `${content.slice(0, active.start)}[[${title}]]${content.slice(active.end)}`;
}
