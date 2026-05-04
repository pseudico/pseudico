import { Edit3, ExternalLink } from "lucide-react";
import { useState } from "react";
import {
  LinkEditor,
  type LinkEditorValues
} from "../forms/LinkEditor";
import type { UniversalItemViewModel } from "./ItemCard";

export type LinkCardViewModel = UniversalItemViewModel & {
  id: string;
  type: "link";
  title: string;
  url: string;
  normalizedUrl: string;
  linkTitle?: string | null;
  description?: string | null;
  domain?: string | null;
};

export type LinkCardContentProps = {
  disabled?: boolean;
  error?: string | null;
  item: LinkCardViewModel;
  onOpen: (item: LinkCardViewModel) => void;
  onSave: (
    item: LinkCardViewModel,
    values: LinkEditorValues
  ) => boolean | Promise<boolean>;
};

export function LinkCardContent({
  disabled = false,
  error = null,
  item,
  onOpen,
  onSave
}: LinkCardContentProps): React.JSX.Element {
  const [editing, setEditing] = useState(false);

  async function handleSave(values: LinkEditorValues): Promise<boolean> {
    const saved = await onSave(item, values);

    if (saved) {
      setEditing(false);
    }

    return saved;
  }

  if (editing) {
    return (
      <LinkEditor
        disabled={disabled}
        error={error}
        initialValues={{
          url: item.normalizedUrl,
          title: item.title,
          description: item.description ?? item.body ?? ""
        }}
        onCancel={() => setEditing(false)}
        onSubmit={handleSave}
      />
    );
  }

  return (
    <div className="link-card-content">
      {item.description === null ||
      item.description === undefined ||
      item.description.trim().length === 0 ? null : (
        <p>{item.description}</p>
      )}
      <dl className="link-card-details">
        <div>
          <dt>Domain</dt>
          <dd>{item.domain ?? "Unknown"}</dd>
        </div>
        <div>
          <dt>URL</dt>
          <dd>{item.normalizedUrl}</dd>
        </div>
      </dl>
      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}
      <div className="link-card-actions">
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          title="Open link"
          type="button"
          onClick={() => onOpen(item)}
        >
          <ExternalLink size={16} aria-hidden="true" />
          Open
        </button>
        <button
          className="secondary-button compact-button"
          disabled={disabled}
          title="Edit link metadata"
          type="button"
          onClick={() => setEditing(true)}
        >
          <Edit3 size={16} aria-hidden="true" />
          Edit
        </button>
      </div>
    </div>
  );
}
