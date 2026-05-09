import type { ReactNode } from "react";
import {
  LOCAL_WORK_OS_DRAG_MIME_TYPE,
  encodeDragPayload,
  parseDragPayload
} from "@local-work-os/core";
import {
  UniversalItemCard,
  type UniversalItemCardProps,
  type UniversalItemViewModel
} from "./ItemCard";
import type { ItemActionId } from "./ItemActionsMenu";

export type ItemFeedProps = Pick<
  UniversalItemCardProps,
  "disabledActions" | "onAction" | "renderContent"
> & {
  items: readonly UniversalItemViewModel[];
  ariaLabel?: string;
  emptyDescription?: string;
  emptyTitle?: string;
  error?: string | null;
  loading?: boolean;
  getDisabledActions?: (item: UniversalItemViewModel) => readonly ItemActionId[];
  renderEmptyAction?: () => ReactNode;
  onReorderItem?: (
    draggedItemId: string,
    targetItemId: string
  ) => Promise<boolean | void> | boolean | void;
  onDropFilesOnItem?: (
    itemId: string,
    files: readonly File[]
  ) => Promise<boolean | void> | boolean | void;
};

export function ItemFeed({
  items,
  ariaLabel = "Items",
  disabledActions,
  emptyDescription = "Create the first item to start building this feed.",
  emptyTitle = "No items yet",
  error = null,
  getDisabledActions,
  loading = false,
  onAction,
  onDropFilesOnItem,
  onReorderItem,
  renderContent,
  renderEmptyAction
}: ItemFeedProps): React.JSX.Element {
  if (loading) {
    return (
      <section className="item-feed" aria-busy="true" aria-label={ariaLabel}>
        <p className="muted-text">Loading items...</p>
      </section>
    );
  }

  if (error !== null) {
    return (
      <section className="item-feed" aria-label={ariaLabel}>
        <p className="form-message form-message-error">{error}</p>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="item-feed" aria-label={ariaLabel}>
        <div className="item-feed-empty-state">
          <h3>{emptyTitle}</h3>
          <p>{emptyDescription}</p>
          {renderEmptyAction?.()}
        </div>
      </section>
    );
  }

  return (
    <section className="item-feed" aria-label={ariaLabel}>
      <div className="item-feed-list">
        {items.map((item) => {
          const itemDisabledActions =
            getDisabledActions?.(item) ?? disabledActions;

          return (
            <div
              className="item-feed-draggable"
              draggable={onReorderItem !== undefined}
              key={item.id}
              onDragOver={(event) => {
                if (
                  onReorderItem !== undefined ||
                  (onDropFilesOnItem !== undefined &&
                    Array.from(event.dataTransfer.types).includes("Files"))
                ) {
                  event.preventDefault();
                }
              }}
              onDragStart={(event) => {
                if (onReorderItem === undefined) {
                  return;
                }

                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData(
                  LOCAL_WORK_OS_DRAG_MIME_TYPE,
                  encodeDragPayload({
                    type: "item",
                    itemId: item.id
                  })
                );
                event.dataTransfer.setData("text/plain", item.id);
              }}
              onDrop={(event) => {
                if (
                  onDropFilesOnItem !== undefined &&
                  Array.from(event.dataTransfer.types).includes("Files")
                ) {
                  event.preventDefault();
                  event.stopPropagation();
                  void onDropFilesOnItem(
                    item.id,
                    Array.from(event.dataTransfer.files)
                  );
                  return;
                }

                if (onReorderItem === undefined) {
                  return;
                }

                const payload = parseDragPayload(
                  event.dataTransfer.getData(LOCAL_WORK_OS_DRAG_MIME_TYPE)
                );

                if (payload?.type !== "item" || payload.itemId === item.id) {
                  return;
                }

                event.preventDefault();
                void onReorderItem(payload.itemId, item.id);
              }}
            >
              <UniversalItemCard
                item={item}
                {...(itemDisabledActions === undefined
                  ? {}
                  : { disabledActions: itemDisabledActions })}
                {...(onAction === undefined ? {} : { onAction })}
                {...(renderContent === undefined ? {} : { renderContent })}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
