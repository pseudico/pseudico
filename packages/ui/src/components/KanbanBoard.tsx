import { Star } from "lucide-react";
import { useState } from "react";

export type KanbanCardViewModel = {
  id: string;
  title: string;
  description?: string | null;
  color?: string | null;
  meta?: string | null;
  pinned?: boolean;
};

export type KanbanColumnViewModel = {
  id: string;
  title: string;
  description?: string | null;
  color?: string | null;
  cards: KanbanCardViewModel[];
  emptyLabel?: string;
};

export type KanbanBoardProps = {
  columns: KanbanColumnViewModel[];
  ariaLabel: string;
  disabled?: boolean;
  movingCardId?: string | null;
  onMoveCard?: (
    card: KanbanCardViewModel,
    targetColumn: KanbanColumnViewModel
  ) => Promise<boolean | void> | boolean | void;
  onOpenCard?: (card: KanbanCardViewModel) => void;
};

export function KanbanBoard({
  ariaLabel,
  columns,
  disabled = false,
  movingCardId = null,
  onMoveCard,
  onOpenCard
}: KanbanBoardProps): React.JSX.Element {
  const [draggedCard, setDraggedCard] = useState<KanbanCardViewModel | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  async function moveCard(
    card: KanbanCardViewModel,
    targetColumn: KanbanColumnViewModel
  ): Promise<void> {
    if (disabled || movingCardId !== null) {
      return;
    }

    await onMoveCard?.(card, targetColumn);
    setDraggedCard(null);
    setDragOverColumnId(null);
  }

  return (
    <div className="kanban-board" role="list" aria-label={ariaLabel}>
      {columns.map((column) => (
        <section
          aria-label={column.title}
          className="kanban-column"
          data-kanban-drag-over={dragOverColumnId === column.id ? "true" : "false"}
          key={column.id}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
              return;
            }

            setDragOverColumnId(null);
          }}
          onDragOver={(event) => {
            if (draggedCard !== null && !disabled && movingCardId === null) {
              event.preventDefault();
              setDragOverColumnId(column.id);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (draggedCard !== null) {
              void moveCard(draggedCard, column);
            }
          }}
          role="listitem"
        >
          <header className="kanban-column-header">
            <span
              className="kanban-column-color"
              style={{ backgroundColor: column.color ?? "#d5d0c3" }}
              aria-hidden="true"
            />
            <div>
              <h3>{column.title}</h3>
              {column.description === null || column.description === undefined ? null : (
                <p>{column.description}</p>
              )}
            </div>
            <span className="kanban-column-count">{column.cards.length}</span>
          </header>

          <div className="kanban-card-list" role="list" aria-label={`${column.title} cards`}>
            {column.cards.length === 0 ? (
              <p className="empty-inline">
                {column.emptyLabel ?? "No cards in this column."}
              </p>
            ) : (
              column.cards.map((card) => (
                <article
                  aria-label={card.title}
                  className="kanban-card"
                  data-kanban-card-moving={movingCardId === card.id ? "true" : "false"}
                  draggable={!disabled && movingCardId === null}
                  key={card.id}
                  onDragEnd={() => {
                    setDraggedCard(null);
                    setDragOverColumnId(null);
                  }}
                  onDragStart={(event) => {
                    setDraggedCard(card);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", card.id);
                  }}
                >
                  <div className="kanban-card-title-row">
                    <span
                      className="kanban-card-color"
                      style={{ backgroundColor: card.color ?? "#245c55" }}
                      aria-hidden="true"
                    />
                    <strong>{card.title}</strong>
                    {card.pinned === true ? <Star size={14} aria-label="Pinned" /> : null}
                  </div>
                  {card.description === null || card.description === undefined ? null : (
                    <p>{card.description}</p>
                  )}
                  {card.meta === null || card.meta === undefined ? null : (
                    <span className="kanban-card-meta">{card.meta}</span>
                  )}
                  <div className="kanban-card-actions">
                    {onOpenCard === undefined ? null : (
                      <button
                        type="button"
                        className="secondary-button compact-button"
                        onClick={() => onOpenCard(card)}
                      >
                        Open project
                      </button>
                    )}
                    {onMoveCard === undefined ? null : (
                      <label className="kanban-card-move">
                        Move to
                        <select
                          aria-label={`Move ${card.title} to column`}
                          disabled={disabled || movingCardId !== null}
                          value={column.id}
                          onChange={(event) => {
                            const targetColumn = columns.find(
                              (entry) => entry.id === event.currentTarget.value
                            );

                            if (targetColumn !== undefined) {
                              void moveCard(card, targetColumn);
                            }
                          }}
                        >
                          {columns.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.title}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
