import { formatAustralianDateTime } from "../dateFormat";

export type CalendarAgendaItem = {
  id: string;
  kind: "task" | "list_item" | "calendar_event";
  title: string;
  containerName: string;
  categoryName: string | null;
  status: string;
  priority: number | null;
  startAt?: string | null;
  dueAt?: string | null;
  allDay?: boolean;
  body?: string | null;
};

export type CalendarAgendaProps = {
  title: string;
  description?: string;
  items: CalendarAgendaItem[];
  emptyLabel?: string;
  onOpenItem?: (item: CalendarAgendaItem) => void;
};

export function CalendarAgenda({
  title,
  description,
  items,
  emptyLabel = "No dated work in this agenda.",
  onOpenItem
}: CalendarAgendaProps): React.JSX.Element {
  return (
    <aside className="calendar-agenda-panel" aria-label={title}>
      <div>
        <span className="top-eyebrow">Readable agenda</span>
        <h3>{title}</h3>
        {description === undefined ? null : <p>{description}</p>}
      </div>
      {items.length === 0 ? (
        <p className="empty-inline">{emptyLabel}</p>
      ) : (
        <ol className="calendar-agenda-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                className="calendar-agenda-item"
                type="button"
                onClick={() => onOpenItem?.(item)}
              >
                <span className="calendar-agenda-kind">
                  {item.kind === "list_item"
                    ? "List item"
                    : item.kind === "calendar_event"
                      ? "Event"
                      : "Task"}
                  {item.allDay === true ? " · all-day" : ""}
                </span>
                <strong>{item.title}</strong>
                <span className="calendar-agenda-meta">
                  {item.containerName}
                  {item.categoryName === null ? "" : ` · ${item.categoryName}`}
                  {item.priority === null ? "" : ` · P${item.priority}`}
                  {item.status === "done" ? " · done" : ""}
                  {item.dueAt === null || item.dueAt === undefined
                    ? ""
                    : ` · ${formatAgendaDate(item.dueAt)}`}
                </span>
                {item.body === null || item.body === undefined || item.body.trim().length === 0 ? null : (
                  <span className="calendar-agenda-body">{item.body}</span>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}

function formatAgendaDate(value: string): string {
  return formatAustralianDateTime(value);
}

