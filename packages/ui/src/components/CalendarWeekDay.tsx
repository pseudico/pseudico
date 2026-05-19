import { CalendarPlus } from "lucide-react";
import { EmptyState } from "./EmptyState";

export type CalendarScheduleItem = {
  id: string;
  kind: "task" | "list_item" | "calendar_event";
  title: string;
  containerName: string;
  categoryName: string | null;
  status: string;
  priority: number | null;
  startAt: string | null;
  dueAt: string | null;
  allDay: boolean;
};

export type CalendarScheduleDay = {
  date: string;
  dayOfMonth: number;
  weekday: number;
  isToday: boolean;
  items: CalendarScheduleItem[];
};

export type CalendarRescheduleDrop = {
  itemId: string;
  kind: "task" | "list_item";
  date: string;
  hour?: number;
  allDay: boolean;
};

export type CalendarWeekViewProps = {
  days: CalendarScheduleDay[];
  loading?: boolean;
  onCreateTask?: (date: string, hour?: number) => void;
  onOpenItem?: (item: CalendarScheduleItem) => void;
  onRescheduleItem?: (drop: CalendarRescheduleDrop) => void;
};

export type CalendarDayViewProps = Omit<CalendarWeekViewProps, "days"> & {
  day: CalendarScheduleDay | null;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 12 }, (_, index) => index + 8);

export function CalendarWeekView({
  days,
  loading = false,
  onCreateTask,
  onOpenItem,
  onRescheduleItem
}: CalendarWeekViewProps): React.JSX.Element {
  if (loading) {
    return <p className="muted-text">Loading week...</p>;
  }

  if (days.length === 0) {
    return (
      <EmptyState
        description="Dated tasks and list items for the selected week will appear here."
        title="No week dates"
      />
    );
  }

  return (
    <section className="calendar-week-view" aria-label="Week calendar">
      <div className="calendar-week-grid">
        {days.map((day) => (
          <CalendarScheduleColumn
            day={day}
            key={day.date}
            onCreateTask={onCreateTask}
            onOpenItem={onOpenItem}
            onRescheduleItem={onRescheduleItem}
          />
        ))}
      </div>
    </section>
  );
}

export function CalendarDayView({
  day,
  loading = false,
  onCreateTask,
  onOpenItem,
  onRescheduleItem
}: CalendarDayViewProps): React.JSX.Element {
  if (loading) {
    return <p className="muted-text">Loading day...</p>;
  }

  if (day === null) {
    return (
      <EmptyState
        description="Choose a day to see all-day and timed work."
        title="No day selected"
      />
    );
  }

  return (
    <section className="calendar-day-view" aria-label={`${day.date} calendar`}>
      <CalendarScheduleColumn
        day={day}
        onCreateTask={onCreateTask}
        onOpenItem={onOpenItem}
        onRescheduleItem={onRescheduleItem}
      />
    </section>
  );
}

function CalendarScheduleColumn({
  day,
  onCreateTask,
  onOpenItem,
  onRescheduleItem
}: {
  day: CalendarScheduleDay;
  onCreateTask: ((date: string, hour?: number) => void) | undefined;
  onOpenItem: ((item: CalendarScheduleItem) => void) | undefined;
  onRescheduleItem: ((drop: CalendarRescheduleDrop) => void) | undefined;
}): React.JSX.Element {
  const allDayItems = day.items.filter((item) => item.allDay || getItemHour(item) === null);
  const timedItems = day.items.filter((item) => !allDayItems.includes(item));

  return (
    <article className={`calendar-schedule-day${day.isToday ? " is-today" : ""}`}>
      <header className="calendar-schedule-day-header">
        <div>
          <span>{WEEKDAY_LABELS[day.weekday]}</span>
          <time dateTime={day.date}>{day.dayOfMonth}</time>
        </div>
        <button
          aria-label={`Create all-day task for ${day.date}`}
          className="ghost-icon-button"
          type="button"
          onClick={() => onCreateTask?.(day.date)}
        >
          <CalendarPlus size={15} aria-hidden="true" />
        </button>
      </header>

      <DropZone
        allDay
        date={day.date}
        label={`All-day drop zone for ${day.date}`}
        onRescheduleItem={onRescheduleItem}
      >
        {allDayItems.length === 0 ? (
          <p className="month-calendar-empty">No all-day work</p>
        ) : (
          <CalendarItemStack items={allDayItems} onOpenItem={onOpenItem} />
        )}
      </DropZone>

      <div className="calendar-time-grid">
        {HOURS.map((hour) => {
          const hourItems = timedItems.filter((item) => getItemHour(item) === hour);
          return (
            <DropZone
              date={day.date}
              hour={hour}
              key={`${day.date}-${hour}`}
              label={`${hour}:00 drop zone for ${day.date}`}
              onRescheduleItem={onRescheduleItem}
            >
              <button
                className="calendar-hour-label"
                type="button"
                onClick={() => onCreateTask?.(day.date, hour)}
              >
                {String(hour).padStart(2, "0")}:00
              </button>
              {hourItems.length === 0 ? null : (
                <CalendarItemStack items={hourItems} onOpenItem={onOpenItem} />
              )}
            </DropZone>
          );
        })}
      </div>
    </article>
  );
}

function DropZone({
  allDay = false,
  children,
  date,
  hour,
  label,
  onRescheduleItem
}: {
  allDay?: boolean;
  children: React.ReactNode;
  date: string;
  hour?: number;
  label: string;
  onRescheduleItem: ((drop: CalendarRescheduleDrop) => void) | undefined;
}): React.JSX.Element {
  return (
    <div
      aria-label={label}
      className={allDay ? "calendar-all-day-dropzone" : "calendar-hour-dropzone"}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const raw = event.dataTransfer.getData("application/x-local-work-os-calendar-item");
        const payload = parseDragPayload(raw);
        if (payload === null) {
          return;
        }
        onRescheduleItem?.({
          ...payload,
          date,
          ...(hour === undefined ? {} : { hour }),
          allDay
        });
      }}
    >
      {children}
    </div>
  );
}

function CalendarItemStack({
  items,
  onOpenItem
}: {
  items: CalendarScheduleItem[];
  onOpenItem: ((item: CalendarScheduleItem) => void) | undefined;
}): React.JSX.Element {
  return (
    <ol className="month-calendar-items">
      {items.map((item, index) => (
        <li key={item.id}>
          <button
            className="month-calendar-item"
            draggable
            style={{ marginLeft: `${Math.min(index, 3) * 10}px` }}
            type="button"
            onClick={() => onOpenItem?.(item)}
            onDragStart={(event) => {
              event.dataTransfer.setData(
                "application/x-local-work-os-calendar-item",
                JSON.stringify({ itemId: item.id, kind: item.kind })
              );
              event.dataTransfer.effectAllowed = "move";
            }}
          >
            <span className="month-calendar-item-title">{item.title}</span>
            <span className="month-calendar-item-meta">
              {item.kind === "list_item" ? "List item" : item.kind === "calendar_event" ? "Event" : "Task"}
              {" · "}
              {item.containerName}
              {item.categoryName === null ? "" : ` · ${item.categoryName}`}
              {item.priority === null ? "" : ` · P${item.priority}`}
              {item.allDay ? " · all-day" : ` · ${formatItemTime(item)}`}
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function parseDragPayload(raw: string): { itemId: string; kind: "task" | "list_item" } | null {
  try {
    const value = JSON.parse(raw) as unknown;
    if (
      typeof value === "object" &&
      value !== null &&
      "itemId" in value &&
      "kind" in value &&
      typeof value.itemId === "string" &&
      (value.kind === "task" || value.kind === "list_item")
    ) {
      return { itemId: value.itemId, kind: value.kind };
    }
  } catch {
    return null;
  }

  return null;
}

function getItemHour(item: CalendarScheduleItem): number | null {
  const value = item.startAt ?? item.dueAt;
  if (value === null) {
    return null;
  }
  const hour = new Date(value).getUTCHours();
  return HOURS.includes(hour) ? hour : null;
}

function formatItemTime(item: CalendarScheduleItem): string {
  const value = item.startAt ?? item.dueAt;
  if (value === null) {
    return "timed";
  }

  return value.slice(11, 16);
}
