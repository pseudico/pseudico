import { useMemo, useState } from "react";
import type { ListCardItemViewModel, ListCardViewModel } from "./ListCardContent";
import { PipelineStageColumn } from "./PipelineStageColumn";

export type PipelineViewProps = {
  item: ListCardViewModel;
  disabled?: boolean;
  onAddStage?: (item: ListCardViewModel, title: string) => Promise<boolean | void> | boolean | void;
  onAddCard?: (
    item: ListCardViewModel,
    stage: ListCardItemViewModel,
    title: string
  ) => Promise<boolean | void> | boolean | void;
  onMoveCard?: (
    item: ListCardViewModel,
    card: ListCardItemViewModel,
    stage: ListCardItemViewModel
  ) => Promise<boolean | void> | boolean | void;
};

export function PipelineView({
  item,
  disabled = false,
  onAddStage,
  onAddCard,
  onMoveCard
}: PipelineViewProps): React.JSX.Element {
  const [newStageTitle, setNewStageTitle] = useState("");
  const [draggedCard, setDraggedCard] = useState<ListCardItemViewModel | null>(null);
  const stages = useMemo(
    () =>
      item.listItems.filter(
        (listItem) => listItem.depth === 0 && listItem.listItemParentId === null
      ),
    [item.listItems]
  );
  const cardsByStage = useMemo(
    () =>
      new Map(
        stages.map((stage) => [
          stage.id,
          item.listItems.filter((listItem) => listItem.listItemParentId === stage.id)
        ])
      ),
    [item.listItems, stages]
  );

  async function submitNewStage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newStageTitle.trim();

    if (title.length === 0) {
      return;
    }

    const result = await onAddStage?.(item, title);

    if (result !== false) {
      setNewStageTitle("");
    }
  }

  return (
    <div className="pipeline-view" data-list-display-mode="pipeline">
      <div className="pipeline-view-header">
        <div>
          <strong>Pipeline mode</strong>
          <p>Top-level checklist rows are stages. Child rows are cards.</p>
        </div>
        {onAddStage === undefined ? null : (
          <form className="pipeline-stage-add" onSubmit={submitNewStage}>
            <input
              aria-label="New pipeline stage"
              disabled={disabled}
              placeholder="Add stage"
              value={newStageTitle}
              onChange={(event) => setNewStageTitle(event.currentTarget.value)}
            />
            <button className="secondary-button compact-button" disabled={disabled} type="submit">
              Add stage
            </button>
          </form>
        )}
      </div>

      {stages.length === 0 ? (
        <p className="empty-inline">Add a top-level row to create the first pipeline stage.</p>
      ) : (
        <div className="pipeline-stage-board" role="list" aria-label={`${item.title} pipeline stages`}>
          {stages.map((stage) => (
            <PipelineStageColumn
              allStages={stages}
              cards={cardsByStage.get(stage.id) ?? []}
              disabled={disabled}
              draggedCard={draggedCard}
              key={stage.id}
              stage={stage}
              onAddCard={(targetStage, title) => onAddCard?.(item, targetStage, title)}
              onEndDrag={() => setDraggedCard(null)}
              onMoveCard={(card, targetStage) => onMoveCard?.(item, card, targetStage)}
              onStartDrag={setDraggedCard}
            />
          ))}
        </div>
      )}
    </div>
  );
}
