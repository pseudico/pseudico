import { type FormEvent, useState } from "react";

export type FileMetadataEditorValues = {
  title: string;
  description: string;
};

export type FileMetadataEditorProps = {
  disabled?: boolean;
  error?: string | null;
  initialValues: FileMetadataEditorValues;
  onCancel: () => void;
  onSubmit: (values: FileMetadataEditorValues) => boolean | Promise<boolean>;
};

export function FileMetadataEditor({
  disabled = false,
  error = null,
  initialValues,
  onCancel,
  onSubmit
}: FileMetadataEditorProps): React.JSX.Element {
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (title.trim().length === 0) {
      setValidationError("File title is required.");
      return;
    }

    setValidationError(null);
    await onSubmit({
      title: title.trim(),
      description: description.trim()
    });
  }

  return (
    <form className="file-metadata-editor" onSubmit={(event) => void handleSubmit(event)}>
      <label>
        <span>File title</span>
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
          Save file
        </button>
        <button
          className="secondary-button"
          disabled={disabled}
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
