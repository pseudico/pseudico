import { type FormEvent, useState } from "react";

export type LinkEditorValues = {
  url: string;
  title: string;
  description: string;
};

export type LinkEditorProps = {
  disabled?: boolean;
  error?: string | null;
  initialValues?: Partial<LinkEditorValues>;
  onCancel?: () => void;
  onSubmit: (values: LinkEditorValues) => boolean | Promise<boolean>;
  resetOnSubmit?: boolean;
  submitLabel?: string;
};

export function LinkEditor({
  disabled = false,
  error = null,
  initialValues,
  onCancel,
  onSubmit,
  resetOnSubmit = false,
  submitLabel = "Save link"
}: LinkEditorProps): React.JSX.Element {
  const [url, setUrl] = useState(initialValues?.url ?? "");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [description, setDescription] = useState(
    initialValues?.description ?? ""
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (url.trim().length === 0) {
      setValidationError("Link URL is required.");
      return;
    }

    setValidationError(null);
    const saved = await onSubmit({
      url: url.trim(),
      title: title.trim(),
      description: description.trim()
    });

    if (saved && resetOnSubmit) {
      setUrl("");
      setTitle("");
      setDescription("");
    }
  }

  return (
    <form className="link-editor" onSubmit={(event) => void handleSubmit(event)}>
      <label>
        <span>URL</span>
        <input
          disabled={disabled}
          inputMode="url"
          placeholder="https://example.com"
          type="text"
          value={url}
          onChange={(event) => setUrl(event.currentTarget.value)}
        />
      </label>
      <label>
        <span>Title</span>
        <input
          disabled={disabled}
          type="text"
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
        />
      </label>
      <label>
        <span>Description</span>
        <textarea
          disabled={disabled}
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.currentTarget.value)}
        />
      </label>
      {validationError === null && error === null ? null : (
        <p className="form-message form-message-error">
          {validationError ?? error}
        </p>
      )}
      <div className="form-actions">
        <button className="primary-button" disabled={disabled} type="submit">
          {submitLabel}
        </button>
        {onCancel === undefined ? null : (
          <button
            className="secondary-button"
            disabled={disabled}
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
