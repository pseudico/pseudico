import { Tag } from "lucide-react";
import { CategoryBadge, type CategoryBadgeViewModel } from "./CategoryBadge";

export type CategoryPickerOption = CategoryBadgeViewModel & {
  description?: string | null;
};

export type CategoryPickerProps = {
  categories: readonly CategoryPickerOption[];
  value: string | null | undefined;
  label?: string;
  disabled?: boolean;
  onChange: (categoryId: string | null) => void;
};

export function CategoryPicker({
  categories,
  value,
  label = "Category",
  disabled = false,
  onChange
}: CategoryPickerProps): React.JSX.Element {
  const selected =
    categories.find((category) => category.id === value) ?? null;

  return (
    <label className="category-picker">
      <span>
        <Tag size={15} aria-hidden="true" />
        {label}
      </span>
      <select
        disabled={disabled}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">No category</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <CategoryBadge category={selected} />
    </label>
  );
}
