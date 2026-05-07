import { useState, type FormEvent } from "react";

export type ContactFormValues = {
  name: string;
  description: string;
  color: string;
  isFavorite: boolean;
};

export type ContactFormErrors = {
  name?: string;
};

export type ContactFormProps = {
  id?: string;
  initialValues?: Partial<ContactFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: ContactFormValues) => void | Promise<void>;
};

const contactColors = [
  { label: "Green", value: "#245c55" },
  { label: "Blue", value: "#2c6b8f" },
  { label: "Gold", value: "#c08a2c" },
  { label: "Red", value: "#b55a3a" }
] as const;
const defaultContactColor = "#2c6b8f";

export function validateContactFormValues(
  values: Pick<ContactFormValues, "name">
): ContactFormErrors {
  if (values.name.trim().length === 0) {
    return {
      name: "Contact name is required."
    };
  }

  return {};
}

export function ContactForm({
  id,
  initialValues,
  submitting = false,
  submitLabel = "Create contact",
  onSubmit
}: ContactFormProps): React.JSX.Element {
  const [values, setValues] = useState<ContactFormValues>({
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    color: initialValues?.color ?? defaultContactColor,
    isFavorite: initialValues?.isFavorite ?? false
  });
  const [errors, setErrors] = useState<ContactFormErrors>({});

  function updateValue<Key extends keyof ContactFormValues>(
    key: Key,
    value: ContactFormValues[Key]
  ): void {
    setValues((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const nextErrors = validateContactFormValues(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    void onSubmit({
      ...values,
      name: values.name.trim(),
      description: values.description.trim()
    });
  }

  return (
    <form className="project-form" id={id} onSubmit={handleSubmit}>
      <label>
        <span>Contact name</span>
        <input
          aria-invalid={errors.name === undefined ? undefined : true}
          autoFocus
          disabled={submitting}
          placeholder="Alex Chen, Northwind Studio, Acme Legal"
          value={values.name}
          onChange={(event) => updateValue("name", event.target.value)}
        />
      </label>
      {errors.name === undefined ? null : (
        <p className="form-message form-message-error">{errors.name}</p>
      )}

      <label>
        <span>Description</span>
        <textarea
          disabled={submitting}
          placeholder="Client, vendor, stakeholder, or relationship context"
          rows={3}
          value={values.description}
          onChange={(event) => updateValue("description", event.target.value)}
        />
      </label>

      <fieldset className="project-color-field">
        <legend>Color</legend>
        <div className="project-color-options">
          {contactColors.map((color) => (
            <label key={color.value}>
              <input
                checked={values.color === color.value}
                disabled={submitting}
                name="contact-color"
                type="radio"
                value={color.value}
                onChange={() => updateValue("color", color.value)}
              />
              <span
                className="project-color-swatch"
                style={{ backgroundColor: color.value }}
                aria-hidden="true"
              />
              <span>{color.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="project-checkbox">
        <input
          checked={values.isFavorite}
          disabled={submitting}
          type="checkbox"
          onChange={(event) => updateValue("isFavorite", event.target.checked)}
        />
        <span>Pin in workspace navigation</span>
      </label>

      <button className="primary-button" disabled={submitting} type="submit">
        {submitLabel}
      </button>
    </form>
  );
}
