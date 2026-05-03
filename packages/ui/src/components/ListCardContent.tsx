import type { UniversalItemViewModel } from "./ItemCard";
import {
  ChecklistEditor,
  type ChecklistEditorItem
} from "./ChecklistEditor";

export type ListCardItemViewModel = ChecklistEditorItem & {
  body?: string | null;
  sortOrder?: number;
};

export type ListCardViewModel = UniversalItemViewModel & {
  listItems: readonly ListCardItemViewModel[];
  progressMode?: string | null;
  showCompleted?: boolean | null;
};

export type ListCardContentProps = {
  item: ListCardViewModel;
  disabled?: boolean;
  error?: string | null;
  onAddItem?: (
    item: ListCardViewModel,
    title: string
  ) => Promise<boolean | void> | boolean | void;
  onBulkAddItems?: (
    item: ListCardViewModel,
    text: string
  ) => Promise<boolean | void> | boolean | void;
  onToggleItem?: (
    item: ListCardViewModel,
    listItem: ListCardItemViewModel
  ) => Promise<boolean | void> | boolean | void;
};

export function ListCardContent({
  item,
  disabled = false,
  error = null,
  onAddItem,
  onBulkAddItems,
  onToggleItem
}: ListCardContentProps): React.JSX.Element {
  const visibleItems =
    item.showCompleted === false
      ? item.listItems.filter((listItem) => listItem.status !== "done")
      : item.listItems;
  const completedCount = item.listItems.filter(
    (listItem) => listItem.status === "done"
  ).length;
  const totalCount = item.listItems.length;
  const progressLabel =
    totalCount === 0
      ? "0 items"
      : `${completedCount} of ${totalCount} complete`;

  return (
    <div className="list-card-content">
      {item.body === undefined || item.body === null || item.body.length === 0 ? null : (
        <p>{item.body}</p>
      )}

      <div className="list-progress" aria-label={`Checklist progress: ${progressLabel}`}>
        <span>{progressLabel}</span>
      </div>

      <ChecklistEditor
        disabled={disabled}
        emptyText="Add the first checklist item."
        error={error}
        items={visibleItems}
        onAddItem={(title) => onAddItem?.(item, title)}
        onBulkAddItems={(text) => onBulkAddItems?.(item, text)}
        onToggleItem={(listItem) => onToggleItem?.(item, listItem)}
      />
    </div>
  );
}
