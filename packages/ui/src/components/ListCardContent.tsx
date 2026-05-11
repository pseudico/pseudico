import type { UniversalItemViewModel } from "./ItemCard";
import type { ParsedDateRange } from "@local-work-os/core";
import {
  ChecklistEditor,
  type ChecklistEditorItem
} from "./ChecklistEditor";
import { PipelineView } from "./PipelineView";
import { SaveAsTemplateAction } from "./SaveAsTemplateAction";

export type ListCardItemViewModel = ChecklistEditorItem & {
  body?: string | null;
  listItemParentId?: string | null;
  sortOrder?: number;
};

export type ListCardViewModel = UniversalItemViewModel & {
  listItems: readonly ListCardItemViewModel[];
  displayMode?: string | null;
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
  onListItemDateRangeChange?: (
    item: ListCardViewModel,
    listItem: ListCardItemViewModel,
    range: ParsedDateRange
  ) => Promise<boolean | void> | boolean | void;
  onSaveAsTemplate?: (
    item: ListCardViewModel
  ) => Promise<boolean | void> | boolean | void;
  onToggleDisplayMode?: (
    item: ListCardViewModel,
    displayMode: "checklist" | "pipeline"
  ) => Promise<boolean | void> | boolean | void;
  onAddPipelineCard?: (
    item: ListCardViewModel,
    stage: ListCardItemViewModel,
    title: string
  ) => Promise<boolean | void> | boolean | void;
  onMovePipelineCard?: (
    item: ListCardViewModel,
    card: ListCardItemViewModel,
    stage: ListCardItemViewModel
  ) => Promise<boolean | void> | boolean | void;
  onReorderListItem?: (
    item: ListCardViewModel,
    draggedItemId: string,
    targetItemId: string
  ) => Promise<boolean | void> | boolean | void;
  onIndentListItem?: (
    item: ListCardViewModel,
    listItem: ListCardItemViewModel
  ) => Promise<boolean | void> | boolean | void;
  onOutdentListItem?: (
    item: ListCardViewModel,
    listItem: ListCardItemViewModel
  ) => Promise<boolean | void> | boolean | void;
  onMoveListItem?: (
    item: ListCardViewModel,
    listItem: ListCardItemViewModel,
    direction: "up" | "down"
  ) => Promise<boolean | void> | boolean | void;
};

export function ListCardContent({
  item,
  disabled = false,
  error = null,
  onAddItem,
  onBulkAddItems,
  onListItemDateRangeChange,
  onToggleItem,
  onSaveAsTemplate,
  onToggleDisplayMode,
  onAddPipelineCard,
  onMovePipelineCard,
  onReorderListItem,
  onIndentListItem,
  onMoveListItem,
  onOutdentListItem
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
  const displayMode = item.displayMode === "pipeline" ? "pipeline" : "checklist";

  return (
    <div className="list-card-content">
      {item.body === undefined || item.body === null || item.body.length === 0 ? null : (
        <p>{item.body}</p>
      )}

      <div className="list-progress" aria-label={`Checklist progress: ${progressLabel}`}>
        <span>{progressLabel}</span>
        {onToggleDisplayMode === undefined ? null : (
          <button
            className="secondary-button compact-button"
            disabled={disabled}
            type="button"
            onClick={() =>
              onToggleDisplayMode(
                item,
                displayMode === "pipeline" ? "checklist" : "pipeline"
              )
            }
          >
            {displayMode === "pipeline" ? "Switch to checklist" : "Switch to pipeline"}
          </button>
        )}
        {onSaveAsTemplate === undefined ? null : (
          <SaveAsTemplateAction
            disabled={disabled}
            itemTitle={item.title}
            onSave={() => onSaveAsTemplate(item)}
          />
        )}
      </div>

      {displayMode === "pipeline" ? (
        <PipelineView
          disabled={disabled}
          item={item}
          onAddStage={(list, title) => onAddItem?.(list, title)}
          {...(onAddPipelineCard === undefined
            ? {}
            : { onAddCard: onAddPipelineCard })}
          {...(onMovePipelineCard === undefined
            ? {}
            : { onMoveCard: onMovePipelineCard })}
        />
      ) : (
        <ChecklistEditor
          disabled={disabled}
          emptyText="Add the first checklist item."
          error={error}
          items={visibleItems}
          listId={item.id}
          onAddItem={(title) => onAddItem?.(item, title)}
          onBulkAddItems={(text) => onBulkAddItems?.(item, text)}
          onDateRangeChange={(listItem, range) =>
            onListItemDateRangeChange?.(item, listItem, range)
          }
          onIndentItem={(listItem) => onIndentListItem?.(item, listItem)}
          onMoveItem={(listItem, direction) =>
            onMoveListItem?.(item, listItem, direction)
          }
          onOutdentItem={(listItem) => onOutdentListItem?.(item, listItem)}
          onReorderItem={(draggedItemId, targetItemId) =>
            onReorderListItem?.(item, draggedItemId, targetItemId)
          }
          onToggleItem={(listItem) => onToggleItem?.(item, listItem)}
        />
      )}
    </div>
  );
}
