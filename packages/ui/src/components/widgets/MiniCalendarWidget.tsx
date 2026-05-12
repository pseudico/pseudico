import { DashboardWidget } from "../DashboardWidget";

export type MiniCalendarWidgetDay = {
  date: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  itemCount: number;
};

export type MiniCalendarWidgetProps = {
  month: string;
  totalCount: number;
  days: MiniCalendarWidgetDay[];
  loading?: boolean;
};

export function MiniCalendarWidget({
  month,
  totalCount,
  days,
  loading = false
}: MiniCalendarWidgetProps): React.JSX.Element {
  return (
    <DashboardWidget
      kind="calendar"
      title="Mini Calendar"
      description={`${formatMonth(month)} - ${totalCount} dated items`}
      count={totalCount}
      loading={loading}
      emptyTitle="No dated work this month"
      emptyDescription="Tasks, list items, and imported local calendar events will appear here."
    >
      <div className="mini-calendar-grid" aria-label={`Mini calendar for ${formatMonth(month)}`}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day} className="mini-calendar-weekday">{day}</span>
        ))}
        {days.map((day) => (
          <span
            key={day.date}
            className={[
              "mini-calendar-day",
              day.inCurrentMonth ? undefined : "mini-calendar-day-muted",
              day.isToday ? "mini-calendar-day-today" : undefined,
              day.itemCount > 0 ? "mini-calendar-day-busy" : undefined
            ].filter(Boolean).join(" ")}
            title={`${day.date}: ${day.itemCount} item${day.itemCount === 1 ? "" : "s"}`}
          >
            <span>{day.dayOfMonth}</span>
            {day.itemCount > 0 ? <strong aria-label={`${day.itemCount} items`}>{Math.min(day.itemCount, 9)}</strong> : null}
          </span>
        ))}
      </div>
    </DashboardWidget>
  );
}

function formatMonth(month: string): string {
  const parts = month.split("-").map(Number);
  const year = parts[0];
  const monthNumber = parts[1];
  if (year === undefined || monthNumber === undefined || !Number.isFinite(year) || !Number.isFinite(monthNumber)) {
    return month;
  }
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}
