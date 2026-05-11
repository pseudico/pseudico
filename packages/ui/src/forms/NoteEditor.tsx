import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Check, FileText, X } from "lucide-react";
import { MarkdownEditor } from "./MarkdownEditor";

export type NoteEditorValues = {
  title: string;
  content: string;
};

export type NoteEditorSaveMeta = {
  expectedVersion?: string;
  source: "manual" | "autosave";
};

export type NoteEditorSaveResult = {
  savedValues?: NoteEditorValues;
  savedVersion?: string;
  status?: "saved" | "conflict";
};

export type NoteDraftRecord = NoteEditorValues & {
  baseVersion?: string;
  savedAt: string;
};

export type NoteDraftStorage = {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

export type NoteEditorAutosaveOptions = {
  debounceMs?: number;
  expectedVersion?: string;
  onSave: (
    values: NoteEditorValues,
    meta: NoteEditorSaveMeta
  ) => Promise<NoteEditorSaveResult | boolean | void> | NoteEditorSaveResult | boolean | void;
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
  autosave?: NoteEditorAutosaveOptions;
  draftKey?: string;
  draftStorage?: NoteDraftStorage;
  onCancel?: () => void;
  onSubmit: (
    values: NoteEditorValues,
    meta: NoteEditorSaveMeta
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
  autosave,
  draftKey,
  draftStorage,
  onCancel,
  onSubmit,
  resetOnSubmit = false,
  submitLabel = "Save note",
  wikilinkSuggestions = []
}: NoteEditorProps): React.JSX.Element {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [title, setTitle] = useState(initialValues.title ?? "");
  const [content, setContent] = useState(initialValues.content ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [recoverableDraft, setRecoverableDraft] = useState<NoteDraftRecord | null>(null);
  const storage = useMemo(
    () => draftStorage ?? getDefaultDraftStorage(),
    [draftStorage]
  );
  const lastSavedValuesRef = useRef<NoteEditorValues>({
    title: initialValues.title ?? "",
    content: initialValues.content ?? ""
  });
  const lastSavedVersionRef = useRef<string | undefined>(autosave?.expectedVersion);
  const activeWikilink = findActiveWikilinkQuery(content);
  const matchingWikilinks = getMatchingWikilinkSuggestions(
    wikilinkSuggestions,
    activeWikilink?.query ?? ""
  );

  useEffect(() => {
    const nextValues = {
      title: initialValues.title ?? "",
      content: initialValues.content ?? ""
    };
    const draft = draftKey === undefined || storage === null
      ? null
      : readNoteDraft(storage, draftKey);

    setTitle(nextValues.title);
    setContent(nextValues.content);
    setFormError(null);
    setAutosaveStatus("idle");
    lastSavedValuesRef.current = nextValues;
    lastSavedVersionRef.current = autosave?.expectedVersion;
    setRecoverableDraft(
      draft !== null && shouldRecoverNoteDraft(draft, nextValues) ? draft : null
    );
  }, [autosave?.expectedVersion, draftKey, initialValues.title, initialValues.content, storage]);

  useEffect(() => {
    if (draftKey === undefined || storage === null) {
      return;
    }

    const current = { title, content };

    if (isNoteEditorDirty(current, lastSavedValuesRef.current)) {
      writeNoteDraft(storage, draftKey, {
        ...current,
        ...(lastSavedVersionRef.current === undefined
          ? {}
          : { baseVersion: lastSavedVersionRef.current }),
        savedAt: new Date().toISOString()
      });
      return;
    }

    storage.removeItem(draftKey);
  }, [content, draftKey, storage, title]);

  useEffect(() => {
    if (autosave === undefined || disabled || recoverableDraft !== null) {
      return;
    }

    const current = {
      title: title.trim(),
      content
    };

    if (!shouldAutosaveNoteEditor(current, lastSavedValuesRef.current)) {
      return;
    }

    setAutosaveStatus("dirty");
    const timeoutId = window.setTimeout(() => {
      void runAutosave(current);
    }, autosave.debounceMs ?? 1200);

    return () => window.clearTimeout(timeoutId);
  }, [autosave, content, disabled, recoverableDraft, title]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      setFormError("Note title is required.");
      return;
    }

    setFormError(null);
    const values = {
      title: trimmedTitle,
      content
    };
    const submitted = await onSubmit(values, createSaveMeta(
      "manual",
      lastSavedVersionRef.current
    ));

    if (submitted === false) {
      return;
    }

    markSaved(values, submitted);

    if (resetOnSubmit) {
      lastSavedValuesRef.current = emptyValues;
      lastSavedVersionRef.current = autosave?.expectedVersion;
      setTitle("");
      setContent("");
    }
  }

  async function runAutosave(values: NoteEditorValues): Promise<void> {
    if (autosave === undefined) {
      return;
    }

    setAutosaveStatus("saving");
    const result = await autosave.onSave(values, createSaveMeta(
      "autosave",
      lastSavedVersionRef.current
    ));

    if (result === false) {
      setAutosaveStatus("error");
      return;
    }

    if (isNoteEditorSaveResult(result) && result.status === "conflict") {
      setAutosaveStatus("conflict");
      return;
    }

    markSaved(values, result);
    setAutosaveStatus("saved");
  }

  function markSaved(
    values: NoteEditorValues,
    result: NoteEditorSaveResult | boolean | void
  ): void {
    if (isNoteEditorSaveResult(result)) {
      lastSavedValuesRef.current = result.savedValues ?? values;
      lastSavedVersionRef.current = result.savedVersion ?? lastSavedVersionRef.current;
    } else {
      lastSavedValuesRef.current = values;
    }

    if (draftKey !== undefined && storage !== null) {
      storage.removeItem(draftKey);
    }
  }

  return (
    <form
      className="note-editor"
      aria-label={`Edit Markdown note for ${contextLabel}`}
      ref={formRef}
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

      <MarkdownEditor
        disabled={disabled}
        label="Markdown"
        value={content}
        onChange={setContent}
        onSaveShortcut={() => formRef.current?.requestSubmit()}
      />

      {recoverableDraft === null ? null : (
        <div className="note-draft-recovery" role="status">
          <strong>Recovered unsaved draft</strong>
          <span>Saved locally {formatDraftSavedAt(recoverableDraft.savedAt)}.</span>
          <button
            className="secondary-button compact-button"
            disabled={disabled}
            type="button"
            onClick={() => {
              setTitle(recoverableDraft.title);
              setContent(recoverableDraft.content);
              setRecoverableDraft(null);
              setAutosaveStatus("dirty");
            }}
          >
            Restore draft
          </button>
          <button
            className="secondary-button compact-button"
            disabled={disabled}
            type="button"
            onClick={() => {
              if (draftKey !== undefined && storage !== null) {
                storage.removeItem(draftKey);
              }
              setRecoverableDraft(null);
            }}
          >
            Discard
          </button>
        </div>
      )}

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

      <p className={`note-autosave-status note-autosave-status-${autosaveStatus}`}>
        {getAutosaveStatusLabel(autosaveStatus)}
      </p>

      {formError === null && error === null ? null : (
        <p className="form-message form-message-error">
          {formError ?? error}
        </p>
      )}
    </form>
  );
}

type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "conflict";

export function isNoteEditorDirty(
  current: NoteEditorValues,
  baseline: NoteEditorValues
): boolean {
  return current.title.trim() !== baseline.title.trim() ||
    current.content !== baseline.content;
}

export function shouldAutosaveNoteEditor(
  current: NoteEditorValues,
  lastSaved: NoteEditorValues
): boolean {
  return current.title.trim().length > 0 &&
    isNoteEditorDirty(current, lastSaved);
}

export function shouldRecoverNoteDraft(
  draft: NoteDraftRecord,
  baseline: NoteEditorValues
): boolean {
  return isNoteEditorDirty(draft, baseline);
}

export function serializeNoteDraft(draft: NoteDraftRecord): string {
  return JSON.stringify(draft);
}

export function parseNoteDraft(value: string): NoteDraftRecord | null {
  try {
    const parsed: unknown = JSON.parse(value);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "title" in parsed &&
      "content" in parsed &&
      "savedAt" in parsed &&
      typeof parsed.title === "string" &&
      typeof parsed.content === "string" &&
      typeof parsed.savedAt === "string" &&
      (!("baseVersion" in parsed) || typeof parsed.baseVersion === "string")
    ) {
      return parsed as NoteDraftRecord;
    }
  } catch {
    return null;
  }

  return null;
}

function getDefaultDraftStorage(): NoteDraftStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readNoteDraft(
  storage: NoteDraftStorage,
  key: string
): NoteDraftRecord | null {
  const value = storage.getItem(key);
  return value === null ? null : parseNoteDraft(value);
}

function writeNoteDraft(
  storage: NoteDraftStorage,
  key: string,
  draft: NoteDraftRecord
): void {
  storage.setItem(key, serializeNoteDraft(draft));
}

function isNoteEditorSaveResult(
  result: NoteEditorSaveResult | boolean | void
): result is NoteEditorSaveResult {
  return typeof result === "object" && result !== null;
}

function getAutosaveStatusLabel(status: AutosaveStatus): string {
  switch (status) {
    case "dirty":
      return "Unsaved changes stored locally.";
    case "saving":
      return "Autosaving...";
    case "saved":
      return "Autosaved locally.";
    case "error":
      return "Autosave failed. Your draft remains stored locally.";
    case "conflict":
      return "Autosave paused because this note changed elsewhere.";
    case "idle":
      return "Autosave ready.";
  }
}

function createSaveMeta(
  source: NoteEditorSaveMeta["source"],
  expectedVersion: string | undefined
): NoteEditorSaveMeta {
  return expectedVersion === undefined
    ? { source }
    : { expectedVersion, source };
}

function formatDraftSavedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "recently";
  }

  return date.toLocaleString();
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
