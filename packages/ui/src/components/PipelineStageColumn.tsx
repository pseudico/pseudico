import { useState } from "react";
import type { ListCardItemViewModel } from "./ListCardContent";

export type PipelineStageColumnProps = {
  stage: ListCardItemViewModel;
  cards: readonly ListCardItemViewModel[];
  allStages: readonly ListCardItemViewModel[];
  disabled?: boolean;
  draggedCard?: ListCardItemViewModel | null;
  onAddCard?: (
    stage: ListCardItemViewModel,
    title: string
  ) => Promise<boolean | void> | boolean | void;
  onMoveCard?: (
    card: ListCardItemViewModel,
    stage: ListCardItemViewModel
  ) => Promise<boolean | void> | boolean | void;
  onStartDrag?: (card: ListCardItemViewModel) => void;
  onEndDrag?: () => void;
};

export function PipelineStageColumn({
  stage,
  cards,
  allStages,
  disabled = false,
  draggedCard = null,
  onAddCard,
  onMoveCard,
  onStartDrag,
  onEndDrag
}: PipelineStageColumnProps): React.JSX.Element {
  const [newCardTitle, setNewCardTitle] = useState("");

  async function submitNewCard(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newCardTitle.trim();

    if (title.length === 0) {
      return;
    }

    const result = await onAddCard?.(stage, title);

    if (result !== false) {
      setNewCardTitle("");
    }
  }

  async function handleStageDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();

    if (draggedCard !== null && draggedCard.id !== stage.id) {
      await onMoveCard?.(draggedCard, stage);
    }

    onEndDrag?.();
  }

  return (
    <section
      aria-label={`Pipeline stage ${stage.title}`}
      className="pipeline-stage-column"
      data-pipeline-stage-id={stage.id}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleStageDrop}
    >
      <header className="pipeline-stage-header">
        <h4>{stage.title}</h4>
        <span>{cards.length} cards</span>
      </header>

      <div className="pipeline-cards">
        {cards.length === 0 ? (
          <p className="empty-inline">No cards in this stage.</p>
        ) : (
          cards.map((card) => (
            <article
              className="pipeline-card"
              data-pipeline-card-id={card.id}
              data-pipeline-card-status={card.status}
              draggable={!disabled}
              key={card.id}
              onDragEnd={onEndDrag}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/plain", card.id);
                onStartDrag?.(card);
              }}
            >
              <strong>{card.title}</strong>
              {card.body === undefined || card.body === null || card.body.length === 0 ? null : (
                <p>{card.body}</p>
              )}
              {allStages.length <= 1 ? null : (
                <label className="pipeline-card-move">
                  <span>Move to</span>
                  <select
                    disabled={disabled}
                    value={stage.id}
                    onChange={(event) => {
                      const target = allStages.find(
                        (candidate) => candidate.id === event.currentTarget.value
                      );

                      if (target !== undefined && target.id !== stage.id) {
                        void onMoveCard?.(card, target);
                      }
                    }}
                  >
                    {allStages.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </article>
          ))
        )}
      </div>

      {onAddCard === undefined ? null : (
        <form className="pipeline-card-add" onSubmit={submitNewCard}>
          <input
            aria-label={`New card for ${stage.title}`}
            disabled={disabled}
            placeholder="Add card"
            value={newCardTitle}
            onChange={(event) => setNewCardTitle(event.currentTarget.value)}
          />
          <button className="secondary-button compact-button" disabled={disabled} type="submit">
            Add card
          </button>
        </form>
      )}
    </section>
  );
}
