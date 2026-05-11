import { Eye, Save } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

export type SmartListEditorItemType =
  | "task"
  | "list"
  | "note"
  | "file"
  | "link"
  | "heading"
  | "location"
  | "comment";

export type SmartListEditorContainerType = "inbox" | "project" | "contact";
export type SmartListEditorTaskStatus =
  | "open"
  | "done"
  | "waiting"
  | "someday"
  | "deferred"
  | "cancelled";
export type SmartListEditorGroupBy =
  | "none"
  | "targetType"
  | "type"
  | "container"
  | "category"
  | "status"
  | "dueDate";
export type SmartListEditorSortField =
  | "title"
  | "type"
  | "container"
  | "category"
  | "status"
  | "dueAt"
  | "createdAt"
  | "updatedAt";

export type SmartListEditorDueFilter =
  | "any"
  | "overdue"
  | "today"
  | "tomorrow"
  | "next7Days"
  | "next30Days"
  | "noDueDate"
  | "hasDueDate"
  | "customRange";

export type SmartListEditorMetadataOption = {
  id: string;
  label: string;
  value: string;
  count?: number;
};

export type SmartListEditorValues = {
  name: string;
  description: string;
  match: "all" | "any";
  includeItems: boolean;
  includeContainers: boolean;
  itemTypes: SmartListEditorItemType[];
  containerTypes: SmartListEditorContainerType[];
  containerIds: string[];
  tagSlugs: string[];
  categoryIds: string[];
  categoryMode: "any" | "is" | "isEmpty" | "isNotEmpty";
  taskStatuses: SmartListEditorTaskStatus[];
  taskPriorities: number[];
  statuses: string[];
  text: string;
  attachmentFilter: "any" | "has" | "none";
  pinnedFilter: "any" | "pinned" | "unpinned";
  archivedFilter: "active" | "archived" | "any";
  groupBy: SmartListEditorGroupBy;
  sortField: SmartListEditorSortField;
  sortDirection: "asc" | "desc";
  dueFilter: SmartListEditorDueFilter;
  customDueFrom: string;
  customDueTo: string;
};

export type SmartListEditorProps = {
  categoryOptions?: SmartListEditorMetadataOption[];
  disabled?: boolean;
  previewCount?: number | null;
  projectOptions?: SmartListEditorMetadataOption[];
  saving?: boolean;
  tagOptions?: SmartListEditorMetadataOption[];
  validationMessage?: string | null;
  onPreview: (values: SmartListEditorValues) => void;
  onSave: (values: SmartListEditorValues) => void;
};

const ITEM_TYPES: { value: SmartListEditorItemType; label: string }[] = [
  { value: "task", label: "Tasks" },
  { value: "list", label: "Lists" },
  { value: "note", label: "Notes" },
  { value: "file", label: "Files" },
  { value: "link", label: "Links" },
  { value: "heading", label: "Headings" },
  { value: "location", label: "Locations" },
  { value: "comment", label: "Comments" }
];

const CONTAINER_TYPES: {
  value: SmartListEditorContainerType;
  label: string;
}[] = [
  { value: "inbox", label: "Inbox" },
  { value: "project", label: "Projects" },
  { value: "contact", label: "Contacts" }
];

const TASK_STATUSES: { value: SmartListEditorTaskStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "waiting", label: "Waiting" },
  { value: "someday", label: "Someday" },
  { value: "deferred", label: "Deferred" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" }
];

const TASK_PRIORITIES: { value: number; label: string }[] = [
  { value: 0, label: "P0" },
  { value: 1, label: "P1" },
  { value: 2, label: "P2" },
  { value: 3, label: "P3" },
  { value: 4, label: "P4" },
  { value: 5, label: "P5" }
];

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "completed", label: "Completed" },
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" }
];

const GROUP_BY_OPTIONS: { value: SmartListEditorGroupBy; label: string }[] = [
  { value: "container", label: "Container" },
  { value: "type", label: "Type" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" },
  { value: "dueDate", label: "Due date" },
  { value: "targetType", label: "Target" },
  { value: "none", label: "No grouping" }
];

const SORT_FIELD_OPTIONS: { value: SmartListEditorSortField; label: string }[] = [
  { value: "dueAt", label: "Due date" },
  { value: "updatedAt", label: "Updated" },
  { value: "createdAt", label: "Created" },
  { value: "title", label: "Title" },
  { value: "type", label: "Type" },
  { value: "container", label: "Container" },
  { value: "category", label: "Category" },
  { value: "status", label: "Status" }
];

const DUE_FILTERS: { value: SmartListEditorDueFilter; label: string }[] = [
  { value: "any", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "today", label: "Due today" },
  { value: "tomorrow", label: "Due tomorrow" },
  { value: "next7Days", label: "Next 7 days" },
  { value: "next30Days", label: "Next 30 days" },
  { value: "hasDueDate", label: "Has due date" },
  { value: "noDueDate", label: "No due date" },
  { value: "customRange", label: "Custom range" }
];

export function SmartListEditor({
  categoryOptions = [],
  disabled = false,
  previewCount = null,
  projectOptions = [],
  saving = false,
  tagOptions = [],
  validationMessage,
  onPreview,
  onSave
}: SmartListEditorProps): React.JSX.Element {
  const [values, setValues] = useState<SmartListEditorValues>(() => ({
    name: "",
    description: "",
    match: "all",
    includeItems: true,
    includeContainers: false,
    itemTypes: [],
    containerTypes: [],
    containerIds: [],
    tagSlugs: [],
    categoryIds: [],
    categoryMode: "any",
    taskStatuses: [],
    taskPriorities: [],
    statuses: [],
    text: "",
    attachmentFilter: "any",
    pinnedFilter: "any",
    archivedFilter: "active",
    groupBy: "container",
    sortField: "dueAt",
    sortDirection: "asc",
    dueFilter: "any",
    customDueFrom: "",
    customDueTo: ""
  }));
  const canSave = values.name.trim().length > 0 && !disabled && !saving;
  const criteriaCount = useMemo(() => countCriteria(values), [values]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (!canSave) {
      return;
    }

    onSave(values);
  }

  return (
    <form className="smart-list-editor" onSubmit={submit}>
      <div className="smart-list-editor-heading">
        <div>
          <p className="top-eyebrow">Smart list</p>
          <h3>Advanced criteria</h3>
        </div>
        <span>{criteriaCount} filter{criteriaCount === 1 ? "" : "s"}</span>
      </div>

      <label className="field-label">
        <span>Name</span>
        <input
          type="text"
          value={values.name}
          disabled={disabled}
          placeholder="Waiting project tasks"
          onChange={(event) => setValues({ ...values, name: event.target.value })}
        />
      </label>

      <label className="field-label">
        <span>Description</span>
        <textarea
          value={values.description}
          disabled={disabled}
          placeholder="Optional note about when to use this smart list"
          onChange={(event) =>
            setValues({ ...values, description: event.target.value })
          }
        />
      </label>

      <label className="field-label">
        <span>Match</span>
        <select
          value={values.match}
          disabled={disabled}
          onChange={(event) =>
            setValues({ ...values, match: event.target.value as "all" | "any" })
          }
        >
          <option value="all">All selected criteria</option>
          <option value="any">Any selected criteria</option>
        </select>
      </label>

      <fieldset className="smart-list-fieldset">
        <legend>Targets</legend>
        <Checkbox
          checked={values.includeItems}
          disabled={disabled}
          label="Items"
          onChange={(checked) => setValues({ ...values, includeItems: checked })}
        />
        <Checkbox
          checked={values.includeContainers}
          disabled={disabled}
          label="Containers"
          onChange={(checked) =>
            setValues({ ...values, includeContainers: checked })
          }
        />
      </fieldset>

      <CheckboxGroup
        disabled={disabled}
        label="Item type"
        options={ITEM_TYPES}
        values={values.itemTypes}
        onChange={(itemTypes) => setValues({ ...values, itemTypes })}
      />
      <CheckboxGroup
        disabled={disabled}
        label="Container type"
        options={CONTAINER_TYPES}
        values={values.containerTypes}
        onChange={(containerTypes) => setValues({ ...values, containerTypes })}
      />
      <MetadataMultiSelect
        disabled={disabled}
        label="Specific containers"
        options={projectOptions}
        values={values.containerIds}
        onChange={(containerIds) => setValues({ ...values, containerIds })}
      />

      <CheckboxGroup
        disabled={disabled}
        label="Task status"
        options={TASK_STATUSES}
        values={values.taskStatuses}
        onChange={(taskStatuses) => setValues({ ...values, taskStatuses })}
      />
      <MetadataMultiSelect
        disabled={disabled}
        label="Generic status"
        options={STATUS_FILTERS.map((status) => ({ id: status.value, value: status.value, label: status.label }))}
        values={values.statuses}
        onChange={(statuses) => setValues({ ...values, statuses })}
      />

      <NumberCheckboxGroup
        disabled={disabled}
        label="Task priority"
        options={TASK_PRIORITIES}
        values={values.taskPriorities}
        onChange={(taskPriorities) => setValues({ ...values, taskPriorities })}
      />

      <label className="field-label">
        <span>Due relative filter</span>
        <select
          value={values.dueFilter}
          disabled={disabled}
          onChange={(event) =>
            setValues({
              ...values,
              dueFilter: event.target.value as SmartListEditorDueFilter
            })
          }
        >
          {DUE_FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </label>

      {values.dueFilter === "customRange" ? (
        <div className="smart-list-custom-range">
          <label className="field-label">
            <span>From</span>
            <input
              type="date"
              value={values.customDueFrom}
              disabled={disabled}
              onChange={(event) =>
                setValues({ ...values, customDueFrom: event.target.value })
              }
            />
          </label>
          <label className="field-label">
            <span>To</span>
            <input
              type="date"
              value={values.customDueTo}
              disabled={disabled}
              onChange={(event) =>
                setValues({ ...values, customDueTo: event.target.value })
              }
            />
          </label>
        </div>
      ) : null}

      <label className="field-label">
        <span>Text contains</span>
        <input
          type="search"
          value={values.text}
          disabled={disabled}
          placeholder="supplier, invoice, @client"
          onChange={(event) => setValues({ ...values, text: event.target.value })}
        />
      </label>

      <MetadataMultiSelect
        disabled={disabled}
        label="Tags"
        options={tagOptions}
        values={values.tagSlugs}
        onChange={(tagSlugs) => setValues({ ...values, tagSlugs })}
      />

      <label className="field-label">
        <span>Category mode</span>
        <select
          value={values.categoryMode}
          disabled={disabled}
          onChange={(event) =>
            setValues({
              ...values,
              categoryMode: event.target.value as SmartListEditorValues["categoryMode"]
            })
          }
        >
          <option value="any">Any category</option>
          <option value="is">Specific categories</option>
          <option value="isEmpty">Uncategorized</option>
          <option value="isNotEmpty">Categorized</option>
        </select>
      </label>

      {values.categoryMode === "is" ? (
        <MetadataMultiSelect
          disabled={disabled}
          label="Categories"
          options={categoryOptions}
          values={values.categoryIds}
          onChange={(categoryIds) => setValues({ ...values, categoryIds })}
        />
      ) : null}


      <div className="smart-list-custom-range">
        <label className="field-label">
          <span>Attachments</span>
          <select
            value={values.attachmentFilter}
            disabled={disabled}
            onChange={(event) =>
              setValues({
                ...values,
                attachmentFilter: event.target.value as SmartListEditorValues["attachmentFilter"]
              })
            }
          >
            <option value="any">Any attachment state</option>
            <option value="has">Has attachments</option>
            <option value="none">No attachments</option>
          </select>
        </label>
        <label className="field-label">
          <span>Pinned</span>
          <select
            value={values.pinnedFilter}
            disabled={disabled}
            onChange={(event) =>
              setValues({
                ...values,
                pinnedFilter: event.target.value as SmartListEditorValues["pinnedFilter"]
              })
            }
          >
            <option value="any">Any pinned state</option>
            <option value="pinned">Pinned only</option>
            <option value="unpinned">Unpinned only</option>
          </select>
        </label>
      </div>

      <div className="smart-list-custom-range">
        <label className="field-label">
          <span>Archived</span>
          <select
            value={values.archivedFilter}
            disabled={disabled}
            onChange={(event) =>
              setValues({
                ...values,
                archivedFilter: event.target.value as SmartListEditorValues["archivedFilter"]
              })
            }
          >
            <option value="active">Active only</option>
            <option value="archived">Archived only</option>
            <option value="any">Active and archived</option>
          </select>
        </label>
        <label className="field-label">
          <span>Group by</span>
          <select
            value={values.groupBy}
            disabled={disabled}
            onChange={(event) =>
              setValues({
                ...values,
                groupBy: event.target.value as SmartListEditorGroupBy
              })
            }
          >
            {GROUP_BY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="smart-list-custom-range">
        <label className="field-label">
          <span>Sort field</span>
          <select
            value={values.sortField}
            disabled={disabled}
            onChange={(event) =>
              setValues({
                ...values,
                sortField: event.target.value as SmartListEditorSortField
              })
            }
          >
            {SORT_FIELD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          <span>Sort direction</span>
          <select
            value={values.sortDirection}
            disabled={disabled}
            onChange={(event) =>
              setValues({
                ...values,
                sortDirection: event.target.value as "asc" | "desc"
              })
            }
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </label>
      </div>

      {validationMessage === null || validationMessage === undefined ? null : (
        <p className="form-message">{validationMessage}</p>
      )}
      {previewCount === null ? null : (
        <p className="form-message">
          Preview found {previewCount} result{previewCount === 1 ? "" : "s"}.
        </p>
      )}

      <div className="smart-list-editor-actions">
        <button
          className="secondary-button"
          disabled={disabled || saving}
          type="button"
          onClick={() => onPreview(values)}
        >
          <Eye size={16} aria-hidden="true" />
          <span>Preview</span>
        </button>
        <button
          className="primary-button"
          disabled={!canSave}
          type="submit"
        >
          <Save size={16} aria-hidden="true" />
          <span>{saving ? "Saving..." : "Save smart list"}</span>
        </button>
      </div>
    </form>
  );
}

function Checkbox({
  checked,
  disabled,
  label,
  onChange
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): React.JSX.Element {
  return (
    <label className="inline-checkbox">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function CheckboxGroup<TValue extends string>({
  disabled,
  label,
  options,
  values,
  onChange
}: {
  disabled?: boolean;
  label: string;
  options: { value: TValue; label: string }[];
  values: TValue[];
  onChange: (values: TValue[]) => void;
}): React.JSX.Element {
  return (
    <fieldset className="smart-list-fieldset">
      <legend>{label}</legend>
      {options.map((option) => (
        <Checkbox
          key={option.value}
          checked={values.includes(option.value)}
          {...(disabled === undefined ? {} : { disabled })}
          label={option.label}
          onChange={(checked) =>
            onChange(
              checked
                ? [...values, option.value]
                : values.filter((value) => value !== option.value)
            )
          }
        />
      ))}
    </fieldset>
  );
}

function NumberCheckboxGroup({
  disabled,
  label,
  options,
  values,
  onChange
}: {
  disabled?: boolean;
  label: string;
  options: { value: number; label: string }[];
  values: number[];
  onChange: (values: number[]) => void;
}): React.JSX.Element {
  return (
    <fieldset className="smart-list-fieldset">
      <legend>{label}</legend>
      {options.map((option) => (
        <Checkbox
          key={option.value}
          checked={values.includes(option.value)}
          {...(disabled === undefined ? {} : { disabled })}
          label={option.label}
          onChange={(checked) =>
            onChange(
              checked
                ? [...values, option.value]
                : values.filter((value) => value !== option.value)
            )
          }
        />
      ))}
    </fieldset>
  );
}

function MetadataMultiSelect({
  disabled,
  label,
  options,
  values,
  onChange
}: {
  disabled?: boolean;
  label: string;
  options: SmartListEditorMetadataOption[];
  values: string[];
  onChange: (values: string[]) => void;
}): React.JSX.Element {
  return (
    <label className="field-label">
      <span>{label}</span>
      <select
        multiple
        value={values}
        disabled={disabled || options.length === 0}
        onChange={(event) =>
          onChange(
            Array.from(event.target.selectedOptions).map((option) => option.value)
          )
        }
      >
        {options.map((option) => (
          <option key={option.id} value={option.value}>
            {option.label}
            {option.count === undefined ? "" : ` (${option.count})`}
          </option>
        ))}
      </select>
      {options.length === 0 ? <small>No {label.toLowerCase()} yet</small> : null}
    </label>
  );
}

function countCriteria(values: SmartListEditorValues): number {
  return [
    values.itemTypes.length,
    values.containerTypes.length,
    values.containerIds.length,
    values.tagSlugs.length,
    values.categoryMode === "any"
      ? 0
      : values.categoryMode === "is"
        ? values.categoryIds.length
        : 1,
    values.taskStatuses.length,
    values.taskPriorities.length,
    values.statuses.length,
    values.text.trim().length === 0 ? 0 : 1,
    values.attachmentFilter === "any" ? 0 : 1,
    values.pinnedFilter === "any" ? 0 : 1,
    values.archivedFilter === "active" ? 0 : 1,
    values.groupBy === "container" ? 0 : 1,
    values.sortField === "dueAt" && values.sortDirection === "asc" ? 0 : 1,
    values.dueFilter === "any" ? 0 : 1
  ].reduce((total, count) => total + count, 0);
}
