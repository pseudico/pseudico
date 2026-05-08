import { useState } from "react";

export type CreateFromTemplateDialogValues = {
  name: string;
  baseDate: string;
};

export type CreateFromTemplateDialogProps = {
  open: boolean;
  templateName: string;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateFromTemplateDialogValues) => void | Promise<void>;
};

export function CreateFromTemplateDialog({
  open,
  templateName,
  submitting = false,
  onClose,
  onSubmit
}: CreateFromTemplateDialogProps): React.JSX.Element {
  const [name, setName] = useState("");
  const [baseDate, setBaseDate] = useState(() => new Date().toISOString().slice(0, 10));

  return (
    <dialog className="project-dialog" open={open}>
      <form
        className="stacked-form"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit({ name, baseDate });
        }}
      >
        <div className="project-dialog-header">
          <div>
            <p className="top-eyebrow">Create from template</p>
            <h3>{templateName}</h3>
          </div>
          <button
            type="button"
            className="secondary-button compact-button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Leave blank to use the template name"
          />
        </label>
        <label>
          Base date
          <input
            type="date"
            value={baseDate}
            onChange={(event) => setBaseDate(event.target.value)}
          />
        </label>
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "Creating..." : "Create"}
        </button>
      </form>
    </dialog>
  );
}
