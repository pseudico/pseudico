import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  MonthCalendar,
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
};

export function CalendarPage({
  apiClient = desktopApiClient,
  initialCalendar
}: CalendarPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const defaultMonth = useMemo(() => toMonthInputValue(new Date()), []);
  const [month, setMonth] = useState(initialCalendar?.range.month ?? defaultMonth);
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [calendar, setCalendar] =
    useState<CalendarMonthViewModelSummary | null>(initialCalendar ?? null);
  const [loading, setLoading] = useState(initialCalendar === undefined);
  const [error, setError] = useState<string | null>(null);
  const [creatingTaskDate, setCreatingTaskDate] = useState<string | null>(null);

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

  async function createTaskForDay(date: string): Promise<void> {
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
      dueAt: date
    });

    setCreatingTaskDate(null);

    if (!taskResult.ok) {
      setError(taskResult.error.message);
      return;
    }

    await refreshCalendar();
  }

  function openCalendarItem(item: CalendarItemSummary | MonthCalendarItem): void {
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

  function changeMonth(delta: number): void {
    setMonth(offsetMonth(month, delta));
  }

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

      <MonthCalendar
        days={(calendar?.days ?? []).map(toMonthCalendarDay)}
        loading={loading && calendar === null}
        monthLabel={formatMonthLabel(month)}
        onCreateTask={(date) => void createTaskForDay(date)}
        onOpenItem={openCalendarItem}
      />
    </section>
  );
}

export function getCalendarItemDestination(item: CalendarItemSummary): string {
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

function toMonthInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");

  return `${year}-${month}`;
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
