import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createTimelineZoomRange,
  type TimelineZoomLevel
} from "@local-work-os/core";
import {
  EmptyState,
  ErrorState,
  TimelineFilterPanel,
  TimelineView,
  type TimelineFilterPanelValues,
  type TimelineViewGroup,
  type TimelineViewItem
} from "@local-work-os/ui";
import type {
  LocalWorkOsApi,
  TimelineFilterInput,
  TimelineStatusFilter,
  TimelineGroupBy,
  TimelineGroupSummary,
  TimelineItemSummary,
  TimelineViewModelSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type TimelinePageProps = {
  apiClient?: LocalWorkOsApi;
  initialTimeline?: TimelineViewModelSummary | null;
};

export function TimelinePage({
  apiClient = desktopApiClient,
  initialTimeline
}: TimelinePageProps): React.JSX.Element {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const defaultRange = useMemo(() => createDefaultRange(), []);
  const [start, setStart] = useState(defaultRange.start);
  const [end, setEnd] = useState(defaultRange.end);
  const [groupBy, setGroupBy] = useState<TimelineGroupBy>("project");
  const [zoom, setZoom] = useState<TimelineZoomLevel>("week");
  const [includeCompleted, setIncludeCompleted] = useState(false);
  const [filters, setFilters] = useState<TimelineFilterPanelValues>(defaultFilterValues);
  const [savingFilter, setSavingFilter] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineViewModelSummary | null>(
    initialTimeline ?? null
  );
  const [loading, setLoading] = useState(initialTimeline === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTimeline !== undefined) {
      return;
    }

    if (currentWorkspace === null) {
      setTimeline(null);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadTimeline(): Promise<void> {
      setLoading(true);
      setError(null);

      const result = await apiClient.timeline!.getViewModel({
        workspaceId,
        start,
        end,
        groupBy,
        includeCompleted,
        filters: toTimelineFilterInput(filters)
      });

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setTimeline(result.data);
    }

    void loadTimeline();

    return () => {
      active = false;
    };
  }, [
    apiClient,
    currentWorkspace,
    end,
    groupBy,
    includeCompleted,
    filters,
    initialTimeline,
    start
  ]);

  async function refreshTimeline(): Promise<void> {
    const workspaceId = currentWorkspace?.id ?? timeline?.workspaceId;

    if (workspaceId === undefined) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await apiClient.timeline!.getViewModel({
      workspaceId,
      start,
      end,
      groupBy,
      includeCompleted,
      filters: toTimelineFilterInput(filters)
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setTimeline(result.data);
  }

  async function saveFilterAsView(): Promise<void> {
    const workspaceId = currentWorkspace?.id ?? timeline?.workspaceId;

    if (workspaceId === undefined || apiClient.timeline?.saveFilterAsView === undefined) {
      return;
    }

    setSavingFilter(true);
    setSaveMessage(null);
    setError(null);

    const result = await apiClient.timeline.saveFilterAsView({
      workspaceId,
      name: filters.savedViewName,
      start,
      end,
      groupBy,
      includeCompleted,
      filters: toTimelineFilterInput(filters)
    });

    setSavingFilter(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSaveMessage(`Saved view "${result.data.name}".`);
  }

  function openTaskSource(item: TimelineViewItem): void {
    navigate(getTimelineItemDestination(item));
  }

  function applyZoom(nextZoom: TimelineZoomLevel): void {
    const range = createTimelineZoomRange({
      anchorDate: start,
      zoom: nextZoom
    });
    setZoom(nextZoom);
    setStart(toDateInputValue(new Date(range.startInclusive)));
    setEnd(toDateInputValue(new Date(range.endExclusive)));
  }

  if (currentWorkspace === null && initialTimeline === undefined) {
    return (
      <section className="timeline-page">
        <div className="page-heading">
          <p className="top-eyebrow">Planning</p>
          <h2>Timeline</h2>
          <EmptyState
            description="Open a local workspace to see dated task workload."
            title="No workspace open"
          />
        </div>
      </section>
    );
  }

  return (
    <section className="timeline-page">
      <div className="page-heading page-heading-actions">
        <div>
          <p className="top-eyebrow">Planning</p>
          <h2>Timeline</h2>
          <p>
            Dated task workload with range bars, zoom controls, and grouping by
            project, contact, or category for the current local workspace.
          </p>
        </div>
        <button
          className="secondary-button compact-button"
          disabled={loading}
          type="button"
          onClick={() => void refreshTimeline()}
        >
          <RefreshCw size={16} aria-hidden="true" />
          Refresh
        </button>
      </div>

      <div className="timeline-filter-bar">
        <label>
          <span>Start</span>
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.currentTarget.value)}
          />
        </label>
        <label>
          <span>End</span>
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.currentTarget.value)}
          />
        </label>
        <label>
          <span>Zoom</span>
          <select
            value={zoom}
            onChange={(event) =>
              applyZoom(event.currentTarget.value as TimelineZoomLevel)
            }
          >
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
          </select>
        </label>
        <label>
          <span>Group by</span>
          <select
            value={groupBy}
            onChange={(event) =>
              setGroupBy(event.currentTarget.value as TimelineGroupBy)
            }
          >
            <option value="project">Project</option>
            <option value="contact">Contact</option>
            <option value="category">Category</option>
          </select>
        </label>
        <label className="timeline-checkbox">
          <input
            checked={includeCompleted}
            type="checkbox"
            onChange={(event) =>
              setIncludeCompleted(event.currentTarget.checked)
            }
          />
          <span>Show completed</span>
        </label>
      </div>

      <TimelineFilterPanel
        saving={savingFilter}
        values={filters}
        onChange={setFilters}
        onSaveView={() => void saveFilterAsView()}
      />

      {saveMessage === null ? null : (
        <p className="timeline-save-message">{saveMessage}</p>
      )}

      {error === null ? null : (
        <ErrorState error={error} title="Timeline error" />
      )}

      <TimelineView
        groups={(timeline?.groups ?? []).map(toTimelineViewGroup)}
        loading={loading && timeline === null}
        zoom={zoom}
        onOpenTask={openTaskSource}
        {...(timeline === null ? {} : { range: timeline.range, workload: timeline.workload })}
      />
    </section>
  );
}

export function getTimelineItemDestination(item: TimelineViewItem): string {
  const sourceItemId =
    item.kind === "list_item" && item.sourceItemId !== null && item.sourceItemId !== undefined
      ? item.sourceItemId
      : item.itemId;
  const itemQuery = `?item=${encodeURIComponent(sourceItemId)}`;

  if (item.containerType === "contact") {
    return `/contacts/${item.containerId}${itemQuery}`;
  }

  if (item.containerType === "project") {
    return `/projects/${item.containerId}${itemQuery}`;
  }

  return "/inbox";
}

function createDefaultRange(): { start: string; end: string } {
  const start = new Date();
  const end = new Date(start);
  end.setDate(start.getDate() + 14);

  return {
    start: toDateInputValue(start),
    end: toDateInputValue(end)
  };
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function toTimelineViewGroup(group: TimelineGroupSummary): TimelineViewGroup {
  return {
    key: group.key,
    label: group.label,
    color: group.color,
    itemCount: group.itemCount,
    completedCount: group.completedCount,
    workload: group.workload,
    items: group.items.map(toTimelineViewItem)
  };
}

function toTimelineViewItem(item: TimelineItemSummary): TimelineViewItem {
  return {
    itemId: item.itemId,
    kind: item.kind,
    sourceItemId: item.navigationTarget.sourceItemId,
    title: item.title,
    body: item.body,
    containerId: item.containerId,
    containerName: item.containerName,
    containerType: item.containerType,
    categoryName: item.categoryName,
    categoryColor: item.categoryColor,
    taskStatus: item.taskStatus,
    priority: item.priority,
    startAt: item.startAt,
    dueAt: item.dueAt,
    timelineStartAt: item.timelineStartAt,
    timelineEndAt: item.timelineEndAt,
    completedAt: item.completedAt,
    tags: item.tags
  };
}

const defaultFilterValues: TimelineFilterPanelValues = {
  tagSlugs: "",
  categoryIds: "",
  projectIds: "",
  contactIds: "",
  statuses: [],
  hideCompleted: false,
  savedViewName: ""
};

function toTimelineFilterInput(values: TimelineFilterPanelValues): TimelineFilterInput {
  return {
    tagSlugs: splitFilterValues(values.tagSlugs),
    categoryIds: splitFilterValues(values.categoryIds),
    projectIds: splitFilterValues(values.projectIds),
    contactIds: splitFilterValues(values.contactIds),
    statuses: values.statuses as TimelineStatusFilter[],
    hideCompleted: values.hideCompleted
  };
}

function splitFilterValues(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
