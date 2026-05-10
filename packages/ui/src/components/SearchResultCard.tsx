import { ArrowUpRight } from "lucide-react";
import { CategoryBadge, type CategoryBadgeViewModel } from "./CategoryBadge";
import { getItemTypeLabel, ItemTypeIcon } from "./ItemTypeIcon";
import { SnoozeMenu, type SnoozePreset } from "./SnoozeMenu";
import { TagBadge, type TagBadgeViewModel } from "./TagBadge";

export type SearchResultCardViewModel = {
  id: string;
  targetId: string;
  targetType?: "container" | "item" | "list_item" | "attachment";
  kind: string;
  title: string;
  body?: string | null;
  status?: string | null;
  category?: CategoryBadgeViewModel | null;
  tags?: readonly TagBadgeViewModel[];
  contextLabel?: string | null;
  updatedLabel?: string | null;
  dueAt?: string | null;
  taskStatus?: string | null;
  disabled?: boolean;
};

export type SearchResultCardProps = {
  result: SearchResultCardViewModel;
  selected?: boolean;
  onOpen?: (resultId: string) => void;
  onSnoozeTask?: (
    result: SearchResultCardViewModel,
    preset: SnoozePreset
  ) => Promise<void> | void;
  onRescheduleTask?: (
    result: SearchResultCardViewModel,
    dueAt: string | null
  ) => Promise<void> | void;
  onSelectionChange?: (resultId: string, selected: boolean) => void;
};

export function SearchResultCard({
  result,
  selected = false,
  onOpen,
  onSnoozeTask,
  onRescheduleTask,
  onSelectionChange
}: SearchResultCardProps): React.JSX.Element {
  const typeLabel = formatKindLabel(result.kind);
  const tags = result.tags?.filter((tag) => tag.slug.trim().length > 0) ?? [];

  return (
    <div
      className={`search-result-card${selected ? " search-result-card-selected" : ""}`}
      data-search-result-id={result.id}
    >
      {onSelectionChange === undefined ? null : (
        <label className="selection-checkbox">
          <input
            type="checkbox"
            checked={selected}
            disabled={result.disabled === true}
            aria-label={`Select ${result.title}`}
            onChange={(event) =>
              onSelectionChange(result.id, event.currentTarget.checked)
            }
          />
        </label>
      )}
      <span className="search-result-card-main">
        <span className="search-result-card-title">
          <span className="item-type-badge">
            <ItemTypeIcon itemType={result.kind} />
            <span>{typeLabel}</span>
          </span>
          <strong>{result.title}</strong>
        </span>
        {result.body === undefined || result.body === null || result.body.length === 0 ? null : (
          <span className="search-result-card-body">{result.body}</span>
        )}
        <span className="search-result-card-meta">
          {result.status === undefined || result.status === null ? null : (
            <span>{result.status}</span>
          )}
          <CategoryBadge category={result.category ?? null} fallbackLabel="No category" />
          {result.contextLabel === undefined || result.contextLabel === null ? null : (
            <span>{result.contextLabel}</span>
          )}
          {result.updatedLabel === undefined || result.updatedLabel === null ? null : (
            <span>Updated {result.updatedLabel}</span>
          )}
        </span>
        {tags.length === 0 ? null : (
          <span className="item-tag-list" aria-label="Tags">
            {tags.map((tag) => (
              <TagBadge key={tag.id ?? tag.slug} tag={tag} />
            ))}
          </span>
        )}
      </span>
      <button
        type="button"
        className="icon-button"
        disabled={result.disabled === true || onOpen === undefined}
        aria-label={`Open ${result.title}`}
        onClick={() => onOpen?.(result.id)}
      >
        <ArrowUpRight size={17} aria-hidden="true" />
      </button>
      {result.kind === "task" && result.targetType === "item" ? (
        <SnoozeMenu
          busy={result.disabled === true}
          onReschedule={(dueAt) => onRescheduleTask?.(result, dueAt)}
          onSnoozePreset={(preset) => onSnoozeTask?.(result, preset)}
        />
      ) : null}
    </div>
  );
}

function formatKindLabel(kind: string): string {
  if (kind === "list_item") {
    return "Checklist row";
  }

  if (kind === "project" || kind === "inbox" || kind === "contact") {
    return kind.charAt(0).toUpperCase() + kind.slice(1);
  }

  return getItemTypeLabel(kind);
}
