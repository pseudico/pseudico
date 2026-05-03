import { FormEvent, useState } from "react";
import { ListPlus, Plus } from "lucide-react";

export type CreateListFormValues = {
  title: string;
};

export type CreateListFormProps = {
  contextLabel: string;
  disabled?: boolean;
  error?: string | null;
  onSubmit: (
    values: CreateListFormValues
  ) => Promise<boolean | void> | boolean | void;
};

export function CreateListForm({
  contextLabel,
  disabled = false,
  error = null,
  onSubmit
}: CreateListFormProps): React.JSX.Element {
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      setFormError("List title is required.");
      return;
    }

    setFormError(null);
    const submitted = await onSubmit({ title: trimmedTitle });

    if (submitted === false) {
      return;
    }

    setTitle("");
  }

  return (
    <form
      className="create-list-form"
      aria-label={`Add checklist to ${contextLabel}`}
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      <label>
        <span>Checklist</span>
        <span className="list-title-input">
          <ListPlus size={16} aria-hidden="true" />
          <input
            disabled={disabled}
            placeholder="New checklist"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
          />
        </span>
      </label>

      <button className="primary-button" disabled={disabled} type="submit">
        <Plus size={17} aria-hidden="true" />
        Add list
      </button>

      {formError === null && error === null ? null : (
        <p className="form-message form-message-error">
          {formError ?? error}
        </p>
      )}
    </form>
  );
}
