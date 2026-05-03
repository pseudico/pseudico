export type CategoryBadgeViewModel = {
  id?: string;
  name: string;
  color: string;
};

export type CategoryBadgeProps = {
  category: CategoryBadgeViewModel | null;
  fallbackLabel?: string;
};

export function CategoryBadge({
  category,
  fallbackLabel = "No category"
}: CategoryBadgeProps): React.JSX.Element {
  if (category === null) {
    return <span className="category-badge category-badge-empty">{fallbackLabel}</span>;
  }

  return (
    <span className="category-badge">
      <span
        className="category-badge-swatch"
        style={{ backgroundColor: category.color }}
        aria-hidden="true"
      />
      <span>{category.name}</span>
    </span>
  );
}
