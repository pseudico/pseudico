import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarAgenda,
  CalendarDayView,
  CalendarWeekView,
  EmptyState,
  ErrorState,
  MonthCalendar,
  type CalendarAgendaItem,
  type CalendarRescheduleDrop,
  type CalendarScheduleDay,
  type CalendarScheduleItem,
  type MonthCalendarDay,
  type MonthCalendarItem
} from "@local-work-os/ui";
import type {
  CalendarDaySummary,
  CalendarItemSummary,
  CalendarMonthViewModelSummary,
  LocalWorkOsApi
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type CalendarPageProps = {
  apiClient?: LocalWorkOsApi;
  initialCalendar?: CalendarMonthViewModelSummary | null;
  initialSelectedDate?: string;
  initialViewMode?: "month" | "week" | "day";
};

export function CalendarPage({
  apiClient = desktopApiClient,
  initialCalendar,
  initialSelectedDate,
  initialViewMode = "month"
}: CalendarPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const defaultMonth = useMemo(() => toMonthInputValue(new Date()), []);
  const defaultDate = useMemo(() => toDateInputValue(new Date()), []);
  const [month, setMonth] = useState(initialCalendar?.range.month ?? defaultMonth);
  const [selectedDate, setSelectedDate] = useState(
    initialSelectedDate ?? initialCalendar?.days[0]?.date ?? defaultDate
  );
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">(initialViewMode);
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [calendar, setCalendar] =
    useState<CalendarMonthViewModelSummary | null>(initialCalendar ?? null);
  const [loading, setLoading] = useState(initialCalendar === undefined);
  const [error, setError] = useState<string | null>(null);
  const [creatingTaskDate, setCreatingTaskDate] = useState<string | null>(null);
  const [importingIcs, setImportingIcs] = useState(false);

  useEffect(() => {
    if (initialCalendar !== undefined) {
      return;
    }

    if (currentWorkspace === null) {
      setCalendar(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadCalendar(): Promise<void> {
      setLoading(true);
      setError(null);

      const result = await apiClient.calendar!.getMonth({
        workspaceId,
        month,
        includeCompleted
      });

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setCalendar(result.data);
    }

    void loadCalendar();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, includeCompleted, initialCalendar, month]);

  async function refreshCalendar(): Promise<void> {
    const workspaceId = currentWorkspace?.id ?? calendar?.workspaceId;

    if (workspaceId === undefined) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await apiClient.calendar!.getMonth({
      workspaceId,
      month,
      includeCompleted
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCalendar(result.data);
  }

  async function createTaskForDay(date: string, hour?: number): Promise<void> {
    if (currentWorkspace === null) {
      setError("Open a local workspace before creating calendar tasks.");
      return;
    }

    const title = window.prompt(`Task title for ${date}`);

    if (title === null || title.trim().length === 0) {
      return;
    }

    setCreatingTaskDate(date);
    setError(null);

    const inboxResult = await apiClient.inbox.getInbox(currentWorkspace.id);

    if (!inboxResult.ok) {
      setCreatingTaskDate(null);
      setError(inboxResult.error.message);
      return;
    }

    const taskResult = await apiClient.tasks.create({
      workspaceId: currentWorkspace.id,
      containerId: inboxResult.data.id,
      title: title.trim(),
      dueAt: hour === undefined ? date : toIsoHour(date, hour),
      ...(hour === undefined ? { allDay: true } : { startAt: toIsoHour(date, hour), allDay: false })
    });

    setCreatingTaskDate(null);

    if (!taskResult.ok) {
      setError(taskResult.error.message);
      return;
    }

    await refreshCalendar();
  }

  async function rescheduleCalendarItem(drop: CalendarRescheduleDrop): Promise<void> {
    const workspaceId = currentWorkspace?.id ?? calendar?.workspaceId;

    if (workspaceId === undefined) {
      setError("Open a local workspace before rescheduling calendar items.");
      return;
    }

    setError(null);

    const result = await apiClient.calendar!.rescheduleItem({
      workspaceId,
      itemId: drop.itemId,
      kind: drop.kind,
      dueAt: drop.hour === undefined ? drop.date : toIsoHour(drop.date, drop.hour),
      ...(drop.hour === undefined ? { startAt: null } : { startAt: toIsoHour(drop.date, drop.hour) }),
      allDay: drop.allDay
    });

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    await refreshCalendar();
  }

  async function importIcsFile(): Promise<void> {
    const workspaceId = currentWorkspace?.id ?? calendar?.workspaceId;

    if (workspaceId === undefined) {
      setError("Open a local workspace before importing an ICS file.");
      return;
    }

    const filePath = window.prompt("Absolute path to a local .ics file");

    if (filePath === null || filePath.trim().length === 0) {
      return;
    }

    setImportingIcs(true);
    setError(null);

    const result = await apiClient.calendar!.importIcsFile({
      workspaceId,
      filePath: filePath.trim()
    });

    setImportingIcs(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    await refreshCalendar();
  }

  function openCalendarItem(
    item: CalendarItemSummary | MonthCalendarItem | CalendarScheduleItem
  ): void {
    const fullItem =
      "navigationTarget" in item
        ? item
        : calendar?.days
            .flatMap((day) => day.items)
            .find((candidate) => candidate.id === item.id);

    if (fullItem === undefined) {
      return;
    }

    navigate(getCalendarItemDestination(fullItem));
  }

  function openCalendarAgendaItem(item: CalendarAgendaItem): void {
    const fullItem = calendar?.days
      .flatMap((day) => day.items)
      .find((candidate) => candidate.id === item.id);

    if (fullItem === undefined) {
      return;
    }

    navigate(getCalendarItemDestination(fullItem));
  }

  function changeMonth(delta: number): void {
    setMonth(offsetMonth(month, delta));
  }

  const selectedDay = (calendar?.days ?? []).find((day) => day.date === selectedDate) ?? null;
  const agendaItems =
    viewMode === "month"
      ? getMonthAgendaItems(calendar?.days ?? [])
      : (selectedDay?.items ?? []).map(toAgendaItem);

  if (currentWorkspace === null && initialCalendar === undefined) {
    return (
      <section className="calendar-page">
        <div className="page-heading">
          <p className="top-eyebrow">Planning</p>
          <h2>Calendar</h2>
          <EmptyState
            description="Open a local workspace to see dated tasks by month."
            title="No workspace open"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="calendar-page">
      <div className="page-heading page-heading-actions">
        <div>
          <p className="top-eyebrow">Planning</p>
          <h2>Calendar</h2>
          <p>Month view of local dated tasks and list items.</p>
        </div>
        <div className="button-row">
          <button
            className="secondary-button compact-button"
            disabled={loading || importingIcs}
            type="button"
            onClick={() => void importIcsFile()}
          >
            Import ICS
          </button>
          <button
            className="secondary-button compact-button"
            disabled={loading}
            type="button"
            onClick={() => void refreshCalendar()}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </div>

      <div className="calendar-filter-bar">
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Previous
        </button>
        <label>
          <span>Month</span>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.currentTarget.value)}
          />
        </label>
        <label>
          <span>Focus date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.currentTarget.value);
              setMonth(event.currentTarget.value.slice(0, 7));
            }}
          />
        </label>
        <div className="segmented-control" aria-label="Calendar view">
          {(["month", "week", "day"] as const).map((mode) => (
            <button
              className={viewMode === mode ? "is-active" : ""}
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
        <button
          className="secondary-button compact-button"
          type="button"
          onClick={() => changeMonth(1)}
        >
          Next
          <ChevronRight size={16} aria-hidden="true" />
        </button>
        <label className="timeline-checkbox">
          <input
            checked={includeCompleted}
            type="checkbox"
            onChange={(event) => setIncludeCompleted(event.currentTarget.checked)}
          />
          <span>Show completed</span>
        </label>
      </div>

      {error === null ? null : (
        <ErrorState error={error} title="Calendar error" />
      )}
      {creatingTaskDate === null ? null : (
        <p className="muted-text">Creating task for {creatingTaskDate}...</p>
      )}
      {importingIcs ? (
        <p className="muted-text">Importing read-only ICS events...</p>
      ) : null}

      <div className="calendar-planning-layout" data-space-budget-surface="calendar-planning">
        <div className="calendar-planning-main">
          {viewMode === "month" ? (
            <MonthCalendar
              days={(calendar?.days ?? []).map(toMonthCalendarDay)}
              loading={loading && calendar === null}
              monthLabel={formatMonthLabel(month)}
              onCreateTask={(date) => {
                setSelectedDate(date);
                void createTaskForDay(date);
              }}
              onOpenItem={openCalendarItem}
            />
          ) : null}
          {viewMode === "week" ? (
            <CalendarWeekView
              days={getWeekDays(calendar?.days ?? [], selectedDate).map(toRequiredScheduleDay)}
              loading={loading && calendar === null}
              onCreateTask={(date, hour) => void createTaskForDay(date, hour)}
              onOpenItem={openCalendarItem}
              onRescheduleItem={(drop) => void rescheduleCalendarItem(drop)}
            />
          ) : null}
          {viewMode === "day" ? (
            <CalendarDayView
              day={toScheduleDay(selectedDay)}
              loading={loading && calendar === null}
              onCreateTask={(date, hour) => void createTaskForDay(date, hour)}
              onOpenItem={openCalendarItem}
              onRescheduleItem={(drop) => void rescheduleCalendarItem(drop)}
            />
          ) : null}
        </div>
        <CalendarAgenda
          description={
            viewMode === "month"
              ? "Full titles for dated work stay readable here when month cells use counts or compact event chips."
              : "Full titles for the selected day stay readable outside narrow calendar columns."
          }
          items={agendaItems}
          title={viewMode === "month" ? `${formatMonthLabel(month)} agenda` : `${selectedDate} agenda`}
          onOpenItem={openCalendarAgendaItem}
        />
      </div>
    </section>
  );
}

export function getCalendarItemDestination(item: CalendarItemSummary): string {
  if (item.navigationTarget.targetType === "calendar_event") {
    return "/calendar";
  }

  const sourceItemId =
    item.navigationTarget.sourceItemId ?? item.navigationTarget.targetId;
  const itemQuery = `?item=${encodeURIComponent(sourceItemId)}`;

  if (item.containerType === "contact") {
    return `/contacts/${item.containerId}${itemQuery}`;
  }

  if (item.containerType === "project") {
    return `/projects/${item.containerId}${itemQuery}`;
  }

  return "/inbox";
}

function toMonthCalendarDay(day: CalendarDaySummary): MonthCalendarDay {
  return {
    date: day.date,
    dayOfMonth: day.dayOfMonth,
    weekday: day.weekday,
    isToday: day.isToday,
    items: day.items.map(toMonthCalendarItem)
  };
}

function toMonthCalendarItem(item: CalendarItemSummary): MonthCalendarItem {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    containerName: item.containerName,
    categoryName: item.categoryName,
    status: item.status,
    priority: item.priority
  };
}

function toScheduleDay(day: CalendarDaySummary | null): CalendarScheduleDay | null {
  if (day === null) {
    return null;
  }

  return {
    date: day.date,
    dayOfMonth: day.dayOfMonth,
    weekday: day.weekday,
    isToday: day.isToday,
    items: day.items.map(toScheduleItem)
  };
}

function toRequiredScheduleDay(day: CalendarDaySummary): CalendarScheduleDay {
  return {
    date: day.date,
    dayOfMonth: day.dayOfMonth,
    weekday: day.weekday,
    isToday: day.isToday,
    items: day.items.map(toScheduleItem)
  };
}

function toScheduleItem(item: CalendarItemSummary): CalendarScheduleItem {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    containerName: item.containerName,
    categoryName: item.categoryName,
    status: item.status,
    priority: item.priority,
    startAt: item.startAt,
    dueAt: item.dueAt,
    allDay: item.allDay
  };
}

function toAgendaItem(item: CalendarItemSummary): CalendarAgendaItem {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    containerName: item.containerName,
    categoryName: item.categoryName,
    status: item.status,
    priority: item.priority,
    startAt: item.startAt,
    dueAt: item.dueAt,
    allDay: item.allDay,
    body: item.body
  };
}

function getMonthAgendaItems(days: CalendarDaySummary[]): CalendarAgendaItem[] {
  return days
    .flatMap((day) => day.items)
    .slice(0, 8)
    .map(toAgendaItem);
}

function toMonthInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");

  return `${year}-${month}`;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function offsetMonth(value: string, delta: number): string {
  const [yearText, monthText] = value.split("-");

  if (yearText === undefined || monthText === undefined) {
    return toMonthInputValue(new Date());
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}-01T00:00:00.000Z`));
}

function getWeekDays(
  days: CalendarDaySummary[],
  selectedDate: string
): CalendarDaySummary[] {
  const focus = new Date(`${selectedDate}T00:00:00.000Z`);
  focus.setUTCDate(focus.getUTCDate() - focus.getUTCDay());
  const weekDates = new Set(
    Array.from({ length: 7 }, (_, index) => {
      const date = new Date(focus);
      date.setUTCDate(date.getUTCDate() + index);
      return date.toISOString().slice(0, 10);
    })
  );

  return days.filter((day) => weekDates.has(day.date));
}

function toIsoHour(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}
