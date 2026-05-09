import { ListFilter, Tags } from "lucide-react";
import {
  resolveContextMenuActions,
  type ContextMenuActionId,
  type ContextMenuTarget
} from "@local-work-os/core";
import { CategoryBadge, type CategoryBadgeViewModel } from "./CategoryBadge";
import { ContextMenu, type ContextMenuActionViewModel } from "./ContextMenu";

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
  onContextAction?: (
    actionId: ContextMenuActionId,
    target: ContextMenuTarget
  ) => void;
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
  onContextAction,
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
              <ContextMenu
                actions={metadataActions("tag", tag.id, tag.name)}
                key={tag.id}
                label={`Context menu for @${tag.name}`}
                target={metadataTarget("tag", tag.id, tag.name, tag.slug)}
                {...(onContextAction === undefined ? {} : { onAction: onContextAction })}
              >
                <button
                  type="button"
                  className="metadata-chip"
                  aria-pressed={selectedTags.has(tag.slug)}
                  disabled={disabled}
                  onClick={() => onToggleTag(tag.slug)}
                >
                  <span>@{tag.name}</span>
                  <span>{tag.targetCount}</span>
                </button>
              </ContextMenu>
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
            <ContextMenu
              actions={metadataActions("category", category.id, category.name)}
              key={category.id}
              label={`Context menu for ${category.name}`}
              target={metadataTarget("category", category.id, category.name, null)}
              {...(onContextAction === undefined ? {} : { onAction: onContextAction })}
            >
              <button
                type="button"
                className="metadata-category-option"
                aria-pressed={selectedCategoryId === category.id}
                disabled={disabled}
                onClick={() => onSelectCategory(category.id)}
              >
                <CategoryBadge category={category} />
                <span>{category.targetCount}</span>
              </button>
            </ContextMenu>
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

function metadataTarget(
  type: "tag" | "category",
  id: string,
  label: string,
  kind: string | null
): ContextMenuTarget {
  return {
    id,
    type,
    label,
    kind,
    capabilities: {
      edit: false,
      delete: false
    }
  };
}

function metadataActions(
  type: "tag" | "category",
  id: string,
  label: string
): ContextMenuActionViewModel[] {
  return resolveContextMenuActions({
    target: metadataTarget(type, id, label, null),
    hideDisabled: false
  }).map((action) => ({
    id: action.id,
    title: action.title,
    group: action.group,
    disabledReason: action.disabledReason,
    danger: action.danger
  }));
}
