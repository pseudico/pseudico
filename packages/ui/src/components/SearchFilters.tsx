export type SearchFilterKindOption<TKind extends string = string> = {
  label: string;
  value: TKind;
};

export type SearchFiltersValue<TKind extends string = string> = {
  kinds: TKind[];
  tags: string;
  category: string;
  status: string;
  dueFrom: string;
  dueTo: string;
  includeArchived: boolean;
};

export type SearchFiltersProps<TKind extends string = string> = {
  value: SearchFiltersValue<TKind>;
  kindOptions: readonly SearchFilterKindOption<TKind>[];
  onChange: (value: SearchFiltersValue<TKind>) => void;
  onApply: () => void;
  onReset: () => void;
};

export function SearchFilters<TKind extends string = string>({
  kindOptions,
  onApply,
  onChange,
  onReset,
  value
}: SearchFiltersProps<TKind>): React.JSX.Element {
  function update(patch: Partial<SearchFiltersValue<TKind>>): void {
    onChange({ ...value, ...patch });
  }

  function toggleKind(kind: TKind): void {
    update({
      kinds: value.kinds.includes(kind)
        ? value.kinds.filter((candidate) => candidate !== kind)
        : [...value.kinds, kind]
    });
  }

  return (
    <div
      className="search-filter-panel"
      data-space-budget-min-width="260px"
      data-space-budget-surface="search-filters"
      aria-label="Search filters"
    >
      <div className="panel-heading search-filter-heading">
        <h3>Filters</h3>
      </div>
      <div className="search-filter-list" aria-label="Type filters">
        {kindOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className="metadata-chip"
            aria-pressed={value.kinds.includes(option.value)}
            onClick={() => toggleKind(option.value)}
          >
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      <label>
        <span>Tags</span>
        <input
          value={value.tags}
          onChange={(event) => update({ tags: event.target.value })}
        />
      </label>
      <label>
        <span>Category</span>
        <input
          value={value.category}
          onChange={(event) => update({ category: event.target.value })}
        />
      </label>
      <label>
        <span>Status</span>
        <input
          value={value.status}
          onChange={(event) => update({ status: event.target.value })}
        />
      </label>
      <div className="form-grid-two">
        <label>
          <span>Due from</span>
          <input
            type="date"
            value={value.dueFrom}
            onChange={(event) => update({ dueFrom: event.target.value })}
          />
        </label>
        <label>
          <span>Due to</span>
          <input
            type="date"
            value={value.dueTo}
            onChange={(event) => update({ dueTo: event.target.value })}
          />
        </label>
      </div>
      <label className="checkbox-label">
        <input
          checked={value.includeArchived}
          type="checkbox"
          onChange={(event) => update({ includeArchived: event.target.checked })}
        />
        <span>Include archived results</span>
      </label>
      <div className="top-actions">
        <button className="primary-button compact-button" type="button" onClick={onApply}>
          Apply filters
        </button>
        <button className="secondary-button compact-button" type="button" onClick={onReset}>
          Reset
        </button>
      </div>
    </div>
  );
}
