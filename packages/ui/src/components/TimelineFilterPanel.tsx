export type TimelineFilterPanelValues = {
  tagSlugs: string;
  categoryIds: string;
  projectIds: string;
  contactIds: string;
  statuses: string[];
  hideCompleted: boolean;
  savedViewName: string;
};

export type TimelineFilterPanelProps = {
  values: TimelineFilterPanelValues;
  saving?: boolean;
  onChange: (values: TimelineFilterPanelValues) => void;
  onSaveView?: () => void;
};

const STATUS_OPTIONS = ["open", "waiting", "done", "someday", "deferred", "cancelled"] as const;

export function TimelineFilterPanel({
  values,
  saving = false,
  onChange,
  onSaveView
}: TimelineFilterPanelProps): React.JSX.Element {
  const chips = createFilterChips(values);

  return (
    <div className="timeline-advanced-filters" aria-label="Timeline filters">
      <label>
        <span>Tags</span>
        <input
          placeholder="client, urgent"
          value={values.tagSlugs}
          onChange={(event) => onChange({ ...values, tagSlugs: event.currentTarget.value })}
        />
      </label>
      <label>
        <span>Categories</span>
        <input
          placeholder="category IDs"
          value={values.categoryIds}
          onChange={(event) => onChange({ ...values, categoryIds: event.currentTarget.value })}
        />
      </label>
      <label>
        <span>Projects</span>
        <input
          placeholder="project IDs"
          value={values.projectIds}
          onChange={(event) => onChange({ ...values, projectIds: event.currentTarget.value })}
        />
      </label>
      <label>
        <span>Contacts</span>
        <input
          placeholder="contact IDs"
          value={values.contactIds}
          onChange={(event) => onChange({ ...values, contactIds: event.currentTarget.value })}
        />
      </label>
      <fieldset className="timeline-status-filter">
        <legend>Status</legend>
        {STATUS_OPTIONS.map((status) => (
          <label key={status}>
            <input
              checked={values.statuses.includes(status)}
              type="checkbox"
              onChange={(event) =>
                onChange({
                  ...values,
                  statuses: event.currentTarget.checked
                    ? [...values.statuses, status]
                    : values.statuses.filter((value) => value !== status)
                })
              }
            />
            <span>{status}</span>
          </label>
        ))}
      </fieldset>
      <label className="timeline-checkbox">
        <input
          checked={values.hideCompleted}
          type="checkbox"
          onChange={(event) => onChange({ ...values, hideCompleted: event.currentTarget.checked })}
        />
        <span>Hide completed</span>
      </label>
      <label>
        <span>Saved view name</span>
        <input
          placeholder="Timeline: client workload"
          value={values.savedViewName}
          onChange={(event) => onChange({ ...values, savedViewName: event.currentTarget.value })}
        />
      </label>
      <button
        className="secondary-button compact-button"
        disabled={saving || values.savedViewName.trim().length === 0}
        type="button"
        onClick={onSaveView}
      >
        {saving ? "Saving..." : "Save filter as view"}
      </button>
      {chips.length === 0 ? (
        <p className="timeline-filter-empty">No advanced filters applied.</p>
      ) : (
        <div className="timeline-filter-chips" aria-label="Applied timeline filters">
          {chips.map((chip) => (
            <span className="timeline-filter-chip" key={chip}>{chip}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function createFilterChips(values: TimelineFilterPanelValues): string[] {
  return [
    ...splitFilter(values.tagSlugs).map((tag) => `@${tag}`),
    ...splitFilter(values.categoryIds).map((category) => `Category ${category}`),
    ...splitFilter(values.projectIds).map((project) => `Project ${project}`),
    ...splitFilter(values.contactIds).map((contact) => `Contact ${contact}`),
    ...values.statuses.map((status) => `Status ${status}`),
    ...(values.hideCompleted ? ["Completed hidden"] : [])
  ];
}

function splitFilter(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
