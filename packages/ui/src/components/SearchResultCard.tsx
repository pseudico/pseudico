import { ArrowUpRight } from "lucide-react";
import { CategoryBadge, type CategoryBadgeViewModel } from "./CategoryBadge";
import { getItemTypeLabel, ItemTypeIcon } from "./ItemTypeIcon";
import { TagBadge, type TagBadgeViewModel } from "./TagBadge";

export type SearchResultCardViewModel = {
  id: string;
  kind: string;
  title: string;
  body?: string | null;
  status?: string | null;
  category?: CategoryBadgeViewModel | null;
  tags?: readonly TagBadgeViewModel[];
  contextLabel?: string | null;
  updatedLabel?: string | null;
  disabled?: boolean;
};

export type SearchResultCardProps = {
  result: SearchResultCardViewModel;
  onOpen?: (resultId: string) => void;
};

export function SearchResultCard({
  result,
  onOpen
}: SearchResultCardProps): React.JSX.Element {
  const typeLabel = formatKindLabel(result.kind);
  const tags = result.tags?.filter((tag) => tag.slug.trim().length > 0) ?? [];

  return (
    <button
      type="button"
      className="search-result-card"
      data-search-result-id={result.id}
      disabled={result.disabled === true || onOpen === undefined}
      onClick={() => onOpen?.(result.id)}
    >
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
      <ArrowUpRight size={17} aria-hidden="true" />
    </button>
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
