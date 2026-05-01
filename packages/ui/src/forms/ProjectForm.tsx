import { useState, type FormEvent } from "react";

export type ProjectFormValues = {
  name: string;
  description: string;
  color: string;
  isFavorite: boolean;
};

export type ProjectFormErrors = {
  name?: string;
};

type ProjectFormProps = {
  id?: string;
  initialValues?: Partial<ProjectFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: ProjectFormValues) => void | Promise<void>;
};

const projectColors = [
  { label: "Green", value: "#245c55" },
  { label: "Blue", value: "#2c6b8f" },
  { label: "Gold", value: "#c08a2c" },
  { label: "Red", value: "#b55a3a" }
] as const;
const defaultProjectColor = "#245c55";

export function validateProjectFormValues(
  values: Pick<ProjectFormValues, "name">
): ProjectFormErrors {
  if (values.name.trim().length === 0) {
    return {
      name: "Project name is required."
    };
  }

  return {};
}

export function ProjectForm({
  id,
  initialValues,
  submitting = false,
  submitLabel = "Create project",
  onSubmit
}: ProjectFormProps): React.JSX.Element {
  const [values, setValues] = useState<ProjectFormValues>({
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    color: initialValues?.color ?? defaultProjectColor,
    isFavorite: initialValues?.isFavorite ?? false
  });
  const [errors, setErrors] = useState<ProjectFormErrors>({});

  function updateValue<Key extends keyof ProjectFormValues>(
    key: Key,
    value: ProjectFormValues[Key]
  ): void {
    setValues((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const nextErrors = validateProjectFormValues(values);
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
        <span>Project name</span>
        <input
          aria-invalid={errors.name === undefined ? undefined : true}
          autoFocus
          disabled={submitting}
          placeholder="Client launch, office move, tax prep"
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
          placeholder="What belongs in this project?"
          rows={3}
          value={values.description}
          onChange={(event) => updateValue("description", event.target.value)}
        />
      </label>

      <fieldset className="project-color-field">
        <legend>Color</legend>
        <div className="project-color-options">
          {projectColors.map((color) => (
            <label key={color.value}>
              <input
                checked={values.color === color.value}
                disabled={submitting}
                name="project-color"
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
