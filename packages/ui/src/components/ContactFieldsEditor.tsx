import type { ContactFieldType } from "@local-work-os/core";
import { Plus, Save } from "lucide-react";
import { useState, type FormEvent } from "react";

export type ContactFieldViewModel = {
  id: string;
  label: string;
  value: string;
  type: ContactFieldType;
  sortOrder: number;
};

export type ContactFieldDraft = {
  label: string;
  value: string;
  type: ContactFieldType;
};

export type ContactFieldsEditorProps = {
  disabled?: boolean;
  error?: string | null;
  fields: readonly ContactFieldViewModel[];
  onAddField: (field: ContactFieldDraft) => Promise<boolean | void> | boolean | void;
  onUpdateField: (
    fieldId: string,
    field: ContactFieldDraft
  ) => Promise<boolean | void> | boolean | void;
};

const contactFieldTypes: ContactFieldType[] = [
  "text",
  "email",
  "phone",
  "website",
  "address",
  "date",
  "custom"
];

export function ContactFieldsEditor({
  disabled = false,
  error = null,
  fields,
  onAddField,
  onUpdateField
}: ContactFieldsEditorProps): React.JSX.Element {
  const [newField, setNewField] = useState<ContactFieldDraft>({
    label: "",
    value: "",
    type: "text"
  });
  const [fieldDrafts, setFieldDrafts] = useState<Record<string, ContactFieldDraft>>(
    () => Object.fromEntries(fields.map((field) => [field.id, toDraft(field)]))
  );
  const [formError, setFormError] = useState<string | null>(null);

  function getDraft(field: ContactFieldViewModel): ContactFieldDraft {
    return fieldDrafts[field.id] ?? toDraft(field);
  }

  function updateDraft(
    fieldId: string,
    patch: Partial<ContactFieldDraft>
  ): void {
    setFieldDrafts((current) => ({
      ...current,
      [fieldId]: {
        ...(current[fieldId] ?? toDraft(fields.find((field) => field.id === fieldId))),
        ...patch
      }
    }));
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const normalized = normalizeDraft(newField);
    const validationError = validateDraft(normalized);

    if (validationError !== null) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    const submitted = await onAddField(normalized);

    if (submitted === false) {
      return;
    }

    setNewField({
      label: "",
      value: "",
      type: "text"
    });
  }

  async function handleUpdate(
    event: FormEvent<HTMLFormElement>,
    field: ContactFieldViewModel
  ): Promise<void> {
    event.preventDefault();

    const normalized = normalizeDraft(getDraft(field));
    const validationError = validateDraft(normalized);

    if (validationError !== null) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    await onUpdateField(field.id, normalized);
  }

  return (
    <section className="contact-fields-editor" aria-label="Contact fields">
      <div className="panel-heading">
        <h3>Profile fields</h3>
      </div>

      {fields.length === 0 ? (
        <p className="muted-text">No profile fields yet.</p>
      ) : (
        <div className="contact-field-list">
          {fields.map((field) => {
            const draft = getDraft(field);

            return (
              <form
                className="contact-field-row"
                key={field.id}
                onSubmit={(event) => {
                  void handleUpdate(event, field);
                }}
              >
                <FieldInputs
                  disabled={disabled}
                  draft={draft}
                  idPrefix={field.id}
                  onChange={(patch) => updateDraft(field.id, patch)}
                />
                <button className="secondary-button compact-button" disabled={disabled} type="submit">
                  <Save size={16} aria-hidden="true" />
                  Save
                </button>
              </form>
            );
          })}
        </div>
      )}

      <form
        className="contact-field-row contact-field-new"
        onSubmit={(event) => {
          void handleAdd(event);
        }}
      >
        <FieldInputs
          disabled={disabled}
          draft={newField}
          idPrefix="new-contact-field"
          onChange={(patch) =>
            setNewField((current) => ({
              ...current,
              ...patch
            }))
          }
        />
        <button className="primary-button compact-button" disabled={disabled} type="submit">
          <Plus size={16} aria-hidden="true" />
          Add
        </button>
      </form>

      {formError === null && error === null ? null : (
        <p className="form-message form-message-error">{formError ?? error}</p>
      )}
    </section>
  );
}

function FieldInputs({
  disabled,
  draft,
  idPrefix,
  onChange
}: {
  disabled: boolean;
  draft: ContactFieldDraft;
  idPrefix: string;
  onChange: (patch: Partial<ContactFieldDraft>) => void;
}): React.JSX.Element {
  return (
    <>
      <label>
        <span>Label</span>
        <input
          disabled={disabled}
          id={`${idPrefix}-label`}
          value={draft.label}
          onChange={(event) => onChange({ label: event.target.value })}
        />
      </label>
      <label>
        <span>Value</span>
        <input
          disabled={disabled}
          id={`${idPrefix}-value`}
          value={draft.value}
          onChange={(event) => onChange({ value: event.target.value })}
        />
      </label>
      <label>
        <span>Type</span>
        <select
          disabled={disabled}
          id={`${idPrefix}-type`}
          value={draft.type}
          onChange={(event) =>
            onChange({ type: event.target.value as ContactFieldType })
          }
        >
          {contactFieldTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function toDraft(field: ContactFieldViewModel | undefined): ContactFieldDraft {
  return {
    label: field?.label ?? "",
    value: field?.value ?? "",
    type: field?.type ?? "text"
  };
}

function normalizeDraft(field: ContactFieldDraft): ContactFieldDraft {
  return {
    ...field,
    label: field.label.trim(),
    value: field.value.trim()
  };
}

function validateDraft(field: ContactFieldDraft): string | null {
  if (field.label.length === 0) {
    return "Field label is required.";
  }

  if (field.value.length === 0) {
    return "Field value is required.";
  }

  return null;
}
