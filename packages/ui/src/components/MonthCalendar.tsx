import { CalendarPlus } from "lucide-react";
import { EmptyState } from "./EmptyState";

export type MonthCalendarItem = {
  id: string;
  kind: "task" | "list_item";
  title: string;
  containerName: string;
  categoryName: string | null;
  status: string;
  priority: number | null;
};

export type MonthCalendarDay = {
  date: string;
  dayOfMonth: number;
  weekday: number;
  isToday: boolean;
  items: MonthCalendarItem[];
};

export type MonthCalendarProps = {
  days: MonthCalendarDay[];
  loading?: boolean;
  monthLabel: string;
  onCreateTask?: (date: string) => void;
  onOpenItem?: (item: MonthCalendarItem) => void;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthCalendar({
  days,
  loading = false,
  monthLabel,
  onCreateTask,
  onOpenItem
}: MonthCalendarProps): React.JSX.Element {
  if (loading) {
    return <p className="muted-text">Loading calendar...</p>;
  }

  if (days.length === 0) {
    return (
      <EmptyState
        description="Dated tasks and list items for the selected month will appear here."
        title="No calendar days"
      />
    );
  }

  const leadingBlankDays = days[0]?.weekday ?? 0;

  return (
    <section className="month-calendar" aria-label={`${monthLabel} calendar`}>
      <div className="month-calendar-weekdays" aria-hidden="true">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="month-calendar-grid">
        {Array.from({ length: leadingBlankDays }, (_, index) => (
          <div
            aria-hidden="true"
            className="month-calendar-day month-calendar-day-empty"
            key={`blank-${index}`}
          />
        ))}
        {days.map((day) => (
          <article
            className={`month-calendar-day${day.isToday ? " is-today" : ""}`}
            key={day.date}
          >
            <header className="month-calendar-day-header">
              <time dateTime={day.date}>{day.dayOfMonth}</time>
              <button
                aria-label={`Create task for ${day.date}`}
                className="ghost-icon-button"
                type="button"
                onClick={() => onCreateTask?.(day.date)}
              >
                <CalendarPlus size={15} aria-hidden="true" />
              </button>
            </header>

            {day.items.length === 0 ? (
              <p className="month-calendar-empty">No dated work</p>
            ) : (
              <ol className="month-calendar-items">
                {day.items.map((item) => (
                  <li key={item.id}>
                    <button
                      className="month-calendar-item"
                      type="button"
                      onClick={() => onOpenItem?.(item)}
                    >
                      <span className="month-calendar-item-title">
                        {item.title}
                      </span>
                      <span className="month-calendar-item-meta">
                        {item.kind === "list_item" ? "List item" : "Task"}
                        {" · "}
                        {item.containerName}
                        {item.categoryName === null
                          ? ""
                          : ` · ${item.categoryName}`}
                        {item.priority === null ? "" : ` · P${item.priority}`}
                        {item.status === "done" ? " · done" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
