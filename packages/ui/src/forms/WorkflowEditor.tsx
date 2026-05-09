import { Eye, Play, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

export type WorkflowEditorAction =
  | {
      type: "add_tag";
      targetType: "item";
      targetId: string;
      tagName: string;
    }
  | {
      type: "set_category";
      targetType: "item" | "container";
      targetId: string;
      categoryId: string | null;
    }
  | {
      type: "move_item";
      itemId: string;
      targetContainerId: string;
      targetContainerTabId?: string | null;
    }
  | {
      type: "create_task";
      containerId: string;
      title: string;
      body?: string | null;
      categoryId?: string | null;
      dueAt?: string | null;
    };

export type WorkflowEditorValues = {
  name: string;
  description: string;
  actions: WorkflowEditorAction[];
};

export type WorkflowEditorPreviewAction = {
  index: number;
  summary: string;
  status: "ready" | "blocked";
  reason: string | null;
};

export type WorkflowEditorProps = {
  disabled?: boolean;
  initialValues?: Partial<WorkflowEditorValues>;
  previewActions?: WorkflowEditorPreviewAction[];
  saving?: boolean;
  validationMessage?: string | null;
  onPreview: (values: WorkflowEditorValues) => void;
  onSave: (values: WorkflowEditorValues) => void;
  onRun?: (values: WorkflowEditorValues) => void;
};

const ACTION_TYPES: { value: WorkflowEditorAction["type"]; label: string }[] = [
  { value: "add_tag", label: "Add tag" },
  { value: "set_category", label: "Set category" },
  { value: "move_item", label: "Move item" },
  { value: "create_task", label: "Create task" }
];

export function WorkflowEditor({
  disabled = false,
  initialValues,
  previewActions = [],
  saving = false,
  validationMessage,
  onPreview,
  onSave,
  onRun
}: WorkflowEditorProps): React.JSX.Element {
  const [values, setValues] = useState<WorkflowEditorValues>(() => ({
    name: initialValues?.name ?? "",
    description: initialValues?.description ?? "",
    actions:
      initialValues?.actions !== undefined && initialValues.actions.length > 0
        ? initialValues.actions
        : [createEmptyAction("add_tag")]
  }));
  const validation = useMemo(() => validateValues(values), [values]);
  const canSubmit = validation === null && !disabled && !saving;

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (canSubmit) {
      onSave(values);
    }
  }

  return (
    <form className="workflow-editor" onSubmit={submit}>
      <div className="smart-list-editor-heading">
        <div>
          <p className="top-eyebrow">Manual workflow</p>
          <h3>Preview before running</h3>
        </div>
        <span>{values.actions.length} action{values.actions.length === 1 ? "" : "s"}</span>
      </div>

      <label className="field-label">
        <span>Name</span>
        <input
          type="text"
          value={values.name}
          disabled={disabled}
          placeholder="Tag and file client follow-up"
          onChange={(event) => setValues({ ...values, name: event.target.value })}
        />
      </label>

      <label className="field-label">
        <span>Description</span>
        <textarea
          value={values.description}
          disabled={disabled}
          placeholder="Optional note about when to run this local workflow"
          onChange={(event) =>
            setValues({ ...values, description: event.target.value })
          }
        />
      </label>

      <fieldset className="smart-list-fieldset">
        <legend>Actions</legend>
        {values.actions.map((action, index) => (
          <WorkflowActionFields
            key={index}
            action={action}
            disabled={disabled}
            index={index}
            onChange={(next) => replaceAction(values, setValues, index, next)}
            onRemove={() => removeAction(values, setValues, index)}
          />
        ))}
        <button
          type="button"
          className="button-secondary"
          disabled={disabled}
          onClick={() =>
            setValues({
              ...values,
              actions: [...values.actions, createEmptyAction("add_tag")]
            })
          }
        >
          <Plus size={16} aria-hidden="true" />
          Add action
        </button>
      </fieldset>

      {previewActions.length > 0 ? (
        <div className="smart-list-preview" role="status">
          <strong>Preview</strong>
          <ul>
            {previewActions.map((preview) => (
              <li key={preview.index}>
                {preview.status === "ready" ? "Ready" : "Blocked"}:{" "}
                {preview.summary}
                {preview.reason === null ? "" : ` (${preview.reason})`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {validationMessage !== undefined && validationMessage !== null ? (
        <p className="form-error">{validationMessage}</p>
      ) : null}
      {validation !== null ? <p className="form-error">{validation}</p> : null}

      <div className="form-actions">
        <button
          type="button"
          className="button-secondary"
          disabled={disabled || saving}
          onClick={() => onPreview(values)}
        >
          <Eye size={16} aria-hidden="true" />
          Preview
        </button>
        {onRun === undefined ? null : (
          <button
            type="button"
            className="button-secondary"
            disabled={!canSubmit}
            onClick={() => onRun(values)}
          >
            <Play size={16} aria-hidden="true" />
            Run
          </button>
        )}
        <button type="submit" className="button-primary" disabled={!canSubmit}>
          Save workflow
        </button>
      </div>
    </form>
  );
}

function WorkflowActionFields({
  action,
  disabled,
  index,
  onChange,
  onRemove
}: {
  action: WorkflowEditorAction;
  disabled: boolean;
  index: number;
  onChange: (action: WorkflowEditorAction) => void;
  onRemove: () => void;
}): React.JSX.Element {
  return (
    <div className="workflow-action-row">
      <label className="field-label">
        <span>Action {index + 1}</span>
        <select
          value={action.type}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              createEmptyAction(event.target.value as WorkflowEditorAction["type"])
            )
          }
        >
          {ACTION_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <ActionSpecificFields
        action={action}
        disabled={disabled}
        onChange={onChange}
      />
      <button
        type="button"
        className="button-secondary"
        disabled={disabled}
        aria-label={`Remove action ${index + 1}`}
        onClick={onRemove}
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function ActionSpecificFields({
  action,
  disabled,
  onChange
}: {
  action: WorkflowEditorAction;
  disabled: boolean;
  onChange: (action: WorkflowEditorAction) => void;
}): React.JSX.Element {
  switch (action.type) {
    case "add_tag":
      return (
        <>
          <TextField
            label="Item ID"
            value={action.targetId}
            disabled={disabled}
            onChange={(targetId) => onChange({ ...action, targetId })}
          />
          <TextField
            label="Tag"
            value={action.tagName}
            disabled={disabled}
            onChange={(tagName) => onChange({ ...action, tagName })}
          />
        </>
      );
    case "set_category":
      return (
        <>
          <label className="field-label">
            <span>Target</span>
            <select
              value={action.targetType}
              disabled={disabled}
              onChange={(event) =>
                onChange({
                  ...action,
                  targetType: event.target.value as "item" | "container"
                })
              }
            >
              <option value="item">Item</option>
              <option value="container">Container</option>
            </select>
          </label>
          <TextField
            label="Target ID"
            value={action.targetId}
            disabled={disabled}
            onChange={(targetId) => onChange({ ...action, targetId })}
          />
          <TextField
            label="Category ID"
            value={action.categoryId ?? ""}
            disabled={disabled}
            placeholder="Leave blank to clear"
            onChange={(categoryId) =>
              onChange({ ...action, categoryId: categoryId.trim() || null })
            }
          />
        </>
      );
    case "move_item":
      return (
        <>
          <TextField
            label="Item ID"
            value={action.itemId}
            disabled={disabled}
            onChange={(itemId) => onChange({ ...action, itemId })}
          />
          <TextField
            label="Target container ID"
            value={action.targetContainerId}
            disabled={disabled}
            onChange={(targetContainerId) =>
              onChange({ ...action, targetContainerId })
            }
          />
        </>
      );
    case "create_task":
      return (
        <>
          <TextField
            label="Container ID"
            value={action.containerId}
            disabled={disabled}
            onChange={(containerId) => onChange({ ...action, containerId })}
          />
          <TextField
            label="Title"
            value={action.title}
            disabled={disabled}
            onChange={(title) => onChange({ ...action, title })}
          />
        </>
      );
  }
}

function TextField({
  disabled,
  label,
  onChange,
  placeholder,
  value
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}): React.JSX.Element {
  return (
    <label className="field-label">
      <span>{label}</span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function createEmptyAction(
  type: WorkflowEditorAction["type"]
): WorkflowEditorAction {
  switch (type) {
    case "add_tag":
      return { type, targetType: "item", targetId: "", tagName: "" };
    case "set_category":
      return { type, targetType: "item", targetId: "", categoryId: null };
    case "move_item":
      return { type, itemId: "", targetContainerId: "" };
    case "create_task":
      return { type, containerId: "", title: "" };
  }
}

function replaceAction(
  values: WorkflowEditorValues,
  setValues: (values: WorkflowEditorValues) => void,
  index: number,
  action: WorkflowEditorAction
): void {
  setValues({
    ...values,
    actions: values.actions.map((existing, existingIndex) =>
      existingIndex === index ? action : existing
    )
  });
}

function removeAction(
  values: WorkflowEditorValues,
  setValues: (values: WorkflowEditorValues) => void,
  index: number
): void {
  if (values.actions.length === 1) {
    return;
  }

  setValues({
    ...values,
    actions: values.actions.filter((_, existingIndex) => existingIndex !== index)
  });
}

function validateValues(values: WorkflowEditorValues): string | null {
  if (values.name.trim().length === 0) {
    return "Workflow name is required.";
  }

  if (values.actions.length === 0) {
    return "At least one manual action is required.";
  }

  for (const action of values.actions) {
    if (Object.values(action).some((value) => value === "")) {
      return "Fill in all required action fields before saving.";
    }
  }

  return null;
}
