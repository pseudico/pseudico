import { Search, Tag, Star } from "lucide-react";
import {
  useState,
  type Dispatch,
  type FormEvent,
  type SetStateAction
} from "react";

export type CreateCollectionMode = "tag" | "keyword";

export type CreateCollectionFormValues = {
  mode: CreateCollectionMode;
  value: string;
  name: string;
};

export type CreateCollectionFormProps = {
  disabled?: boolean;
  onSubmit: (values: CreateCollectionFormValues) => void;
};

export function CreateCollectionForm({
  disabled = false,
  onSubmit
}: CreateCollectionFormProps): React.JSX.Element {
  const [mode, setMode] = useCollectionMode("tag");
  const [value, setValue] = useCollectionField("");
  const [name, setName] = useCollectionField("");

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmedValue = value.trim();

    if (trimmedValue.length === 0 || disabled) {
      return;
    }

    onSubmit({
      mode,
      value: trimmedValue,
      name: name.trim()
    });
    setValue("");
    setName("");
  }

  return (
    <form className="collection-create-form" onSubmit={submit}>
      <div className="collection-mode-control" role="tablist" aria-label="Collection type">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "tag"}
          className="segmented-button"
          onClick={() => setMode("tag")}
        >
          <Tag size={16} aria-hidden="true" />
          <span>Tag</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "keyword"}
          className="segmented-button"
          onClick={() => setMode("keyword")}
        >
          <Search size={16} aria-hidden="true" />
          <span>Keyword</span>
        </button>
      </div>

      <label className="field-label">
        <span>{mode === "tag" ? "Tag slug" : "Keyword"}</span>
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder={mode === "tag" ? "phone-call" : "supplier brief"}
          onChange={(event) => setValue(event.target.value)}
        />
      </label>

      <label className="field-label">
        <span>Name</span>
        <input
          type="text"
          value={name}
          disabled={disabled}
          placeholder={mode === "tag" ? "Phone calls" : "Supplier brief"}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <button
        type="submit"
        className="primary-button collection-create-button"
        disabled={disabled || value.trim().length === 0}
      >
        <Star size={16} aria-hidden="true" />
        <span>Create</span>
      </button>
    </form>
  );
}

function useCollectionMode(
  initialValue: CreateCollectionMode
): [CreateCollectionMode, Dispatch<SetStateAction<CreateCollectionMode>>] {
  return useState(initialValue);
}

function useCollectionField(
  initialValue: string
): [string, Dispatch<SetStateAction<string>>] {
  return useState(initialValue);
}
