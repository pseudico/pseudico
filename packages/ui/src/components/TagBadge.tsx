export type TagBadgeViewModel = {
  id?: string;
  name?: string;
  slug: string;
  source?: "inline" | "manual" | "imported";
};

export type TagBadgeProps = {
  tag: TagBadgeViewModel;
};

export function TagBadge({ tag }: TagBadgeProps): React.JSX.Element {
  const label = tag.name?.trim() || tag.slug;

  return (
    <span className="tag-badge" data-tag-source={tag.source ?? "inline"}>
      @{label}
    </span>
  );
}
