import { ListFilter, Tags } from "lucide-react";
import { CategoryBadge, type CategoryBadgeViewModel } from "./CategoryBadge";

export type MetadataTagFilterOption = {
  id: string;
  name: string;
  slug: string;
  targetCount: number;
};

export type MetadataCategoryFilterOption = Omit<CategoryBadgeViewModel, "id"> & {
  id: string;
  targetCount: number;
};

export type MetadataFilterPanelProps = {
  categories: readonly MetadataCategoryFilterOption[];
  selectedCategoryId: string | null;
  selectedTagSlugs: readonly string[];
  tags: readonly MetadataTagFilterOption[];
  disabled?: boolean;
  onClear: () => void;
  onSelectCategory: (categoryId: string | null) => void;
  onToggleTag: (tagSlug: string) => void;
};

export function MetadataFilterPanel({
  categories,
  disabled = false,
  selectedCategoryId,
  selectedTagSlugs,
  tags,
  onClear,
  onSelectCategory,
  onToggleTag
}: MetadataFilterPanelProps): React.JSX.Element {
  const selectedTags = new Set(selectedTagSlugs);

  return (
    <aside className="metadata-filter-panel" aria-label="Metadata filters">
      <div className="panel-heading">
        <ListFilter size={17} aria-hidden="true" />
        <h3>Filters</h3>
      </div>

      <section className="metadata-filter-group" aria-labelledby="metadata-tags">
        <div className="metadata-filter-title">
          <Tags size={16} aria-hidden="true" />
          <h4 id="metadata-tags">Tags</h4>
        </div>
        <div className="metadata-chip-list">
          {tags.length === 0 ? (
            <p className="muted-text">No tags</p>
          ) : (
            tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                className="metadata-chip"
                aria-pressed={selectedTags.has(tag.slug)}
                disabled={disabled}
                onClick={() => onToggleTag(tag.slug)}
              >
                <span>@{tag.name}</span>
                <span>{tag.targetCount}</span>
              </button>
            ))
          )}
        </div>
      </section>

      <section
        className="metadata-filter-group"
        aria-labelledby="metadata-categories"
      >
        <div className="metadata-filter-title">
          <ListFilter size={16} aria-hidden="true" />
          <h4 id="metadata-categories">Categories</h4>
        </div>
        <div className="metadata-category-list">
          <button
            type="button"
            className="metadata-category-option"
            aria-pressed={selectedCategoryId === null}
            disabled={disabled}
            onClick={() => onSelectCategory(null)}
          >
            <CategoryBadge category={null} fallbackLabel="Any category" />
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className="metadata-category-option"
              aria-pressed={selectedCategoryId === category.id}
              disabled={disabled}
              onClick={() => onSelectCategory(category.id)}
            >
              <CategoryBadge category={category} />
              <span>{category.targetCount}</span>
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        className="secondary-button compact-button"
        disabled={disabled || (selectedTags.size === 0 && selectedCategoryId === null)}
        onClick={onClear}
      >
        Clear
      </button>
    </aside>
  );
}
