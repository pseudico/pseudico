import { useSearchParams } from "react-router-dom";
import {
  KanbanBoard,
  PipelineView,
  type KanbanColumnViewModel,
  type ListCardViewModel
} from "@local-work-os/ui";
import type {
  CalendarMonthViewModelSummary,
  TimelineViewModelSummary
} from "../../preload/api";
import { CalendarPage } from "./CalendarPage";
import { TimelinePage } from "./TimelinePage";

export function PlanningSpaceBudgetFixturePage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const surface = searchParams.get("surface") ?? "timeline";

  if (surface === "calendar") {
    return (
      <CalendarPage
        initialCalendar={calendarFixture}
        initialSelectedDate="2026-05-20"
        initialViewMode={searchParams.get("view") === "week" ? "week" : "month"}
      />
    );
  }

  if (surface === "pipeline") {
    return <PipelineFixture />;
  }

  return <TimelinePage initialTimeline={timelineFixture} />;
}

function PipelineFixture(): React.JSX.Element {
  return (
    <section className="planning-space-budget-fixture-page">
      <div className="page-heading">
        <p className="top-eyebrow">Planning</p>
        <h2>Pipeline planning fixture</h2>
        <p>
          Pipeline and board columns keep a 260–320px working budget, scroll horizontally
          before cards collapse, and keep long card titles readable with one metadata line.
        </p>
      </div>
      <div className="planning-pipeline-grid">
        <section className="planning-fixture-panel">
          <h3>Checklist pipeline</h3>
          <PipelineView disabled item={pipelineListFixture} />
        </section>
        <section className="planning-fixture-panel">
          <h3>Project board fallback</h3>
          <KanbanBoard ariaLabel="Long-data project pipeline" columns={kanbanColumns} />
        </section>
      </div>
    </section>
  );
}

const longTitle =
  "Coordinate the multi-day supplier readiness review, attachment audit, calendar handoff, and executive sign-off without hiding the actual task name";
const longContainer =
  "Client onboarding program with legal review, vendor security notes, and launch readiness tasks";
const longBody =
  "This fixture proves the planning surface keeps the real work title in a row label, agenda, or card detail instead of squeezing the phrase into a tiny date bar.";

const timelineFixture: TimelineViewModelSummary = {
  workspaceId: "workspace_pse_236",
  generatedAt: "2026-05-18T22:30:00.000Z",
  range: {
    startInclusive: "2026-05-18T00:00:00.000Z",
    endExclusive: "2026-06-01T00:00:00.000Z"
  },
  includeCompleted: false,
  groupBy: "project",
  totalCount: 3,
  workload: {
    itemCount: 3,
    activeCount: 2,
    completedCount: 1,
    density: [
      { date: "2026-05-18", itemCount: 1, completedCount: 0 },
      { date: "2026-05-20", itemCount: 2, completedCount: 1 },
      { date: "2026-05-25", itemCount: 1, completedCount: 0 }
    ]
  },
  filters: {
    tagSlugs: ["handoff", "space-budget"],
    categoryIds: ["category_ops"],
    projectIds: ["container_project_long"],
    contactIds: [],
    statuses: ["open"],
    hideCompleted: false
  },
  groups: [
    {
      key: "container_project_long",
      label: longContainer,
      groupBy: "project",
      color: "#245c55",
      itemCount: 3,
      completedCount: 1,
      workload: {
        itemCount: 3,
        activeCount: 2,
        completedCount: 1,
        density: [
          { date: "2026-05-18", itemCount: 1, completedCount: 0 },
          { date: "2026-05-20", itemCount: 2, completedCount: 1 }
        ]
      },
      items: [
        timelineItem("task_long", longTitle, "2026-05-18T09:00:00.000Z", "2026-05-20T17:00:00.000Z", "open", 1),
        timelineItem(
          "task_marker",
          "Call Avery with the final local backup verification result and update the launch checklist",
          "2026-05-20T11:00:00.000Z",
          "2026-05-20T11:00:00.000Z",
          "open",
          2
        ),
        timelineItem(
          "task_done",
          "Archive the old short-label timeline mockup so nobody uses it as a production density reference",
          "2026-05-25T13:00:00.000Z",
          "2026-05-27T15:00:00.000Z",
          "done",
          null
        )
      ]
    }
  ]
};

function timelineItem(
  id: string,
  title: string,
  startAt: string,
  endAt: string,
  status: "open" | "done",
  priority: number | null
): TimelineViewModelSummary["groups"][number]["items"][number] {
  return {
    kind: "task",
    itemId: id,
    workspaceId: "workspace_pse_236",
    title,
    body: longBody,
    containerId: "container_project_long",
    containerName: longContainer,
    containerType: "project",
    containerColor: "#245c55",
    categoryId: "category_ops",
    categoryName: "Operations",
    categoryColor: "#2c6b8f",
    taskStatus: status,
    itemStatus: status === "done" ? "completed" : "active",
    priority,
    startAt,
    dueAt: endAt,
    timelineStartAt: startAt,
    timelineEndAt: endAt,
    allDay: false,
    completedAt: status === "done" ? "2026-05-27T16:00:00.000Z" : null,
    updatedAt: "2026-05-18T22:00:00.000Z",
    tags: [
      { id: "tag_handoff", name: "handoff", slug: "handoff" },
      { id: "tag_space", name: "space-budget", slug: "space-budget" }
    ],
    navigationTarget: {
      targetType: "item",
      targetId: id,
      containerId: "container_project_long",
      workspaceId: "workspace_pse_236",
      sourceItemId: null
    }
  };
}

const calendarFixture: CalendarMonthViewModelSummary = {
  workspaceId: "workspace_pse_236",
  generatedAt: "2026-05-18T22:30:00.000Z",
  range: {
    month: "2026-05",
    startInclusive: "2026-05-01T00:00:00.000Z",
    endExclusive: "2026-06-01T00:00:00.000Z"
  },
  includeCompleted: false,
  totalCount: 4,
  days: Array.from({ length: 31 }, (_, index) => {
    const day = index + 1;
    const date = `2026-05-${String(day).padStart(2, "0")}`;
    return {
      date,
      dayOfMonth: day,
      weekday: new Date(`${date}T00:00:00.000Z`).getUTCDay(),
      inCurrentMonth: true,
      isToday: date === "2026-05-20",
      items: date === "2026-05-20" ? createCalendarItems() : []
    };
  })
};

function createCalendarItems(): CalendarMonthViewModelSummary["days"][number]["items"] {
  return [
    calendarItem("calendar_task_long", longTitle, "2026-05-20T09:00:00.000Z", false, "open", 1),
    calendarItem(
      "calendar_task_all_day",
      "Verify that the agenda keeps this long all-day risk review readable when the month cell only has room for dots and counts",
      "2026-05-20T00:00:00.000Z",
      true,
      "open",
      2
    ),
    calendarItem(
      "calendar_list_item",
      "Confirm pipeline owners before the Friday handoff and keep the owner names visible in the agenda",
      "2026-05-20T14:00:00.000Z",
      false,
      "open",
      null,
      "list_item"
    )
  ];
}

function calendarItem(
  id: string,
  title: string,
  dueAt: string,
  allDay: boolean,
  status: "open" | "done",
  priority: number | null,
  kind: "task" | "list_item" = "task"
): CalendarMonthViewModelSummary["days"][number]["items"][number] {
  return {
    id,
    kind,
    workspaceId: "workspace_pse_236",
    title,
    body: longBody,
    containerId: "container_project_long",
    containerName: longContainer,
    containerType: "project",
    containerColor: "#245c55",
    categoryId: "category_ops",
    categoryName: "Operations",
    categoryColor: "#2c6b8f",
    status,
    itemStatus: "active",
    priority,
    startAt: allDay ? null : dueAt,
    dueAt,
    allDay,
    completedAt: null,
    updatedAt: "2026-05-18T22:00:00.000Z",
    navigationTarget: {
      targetType: kind === "list_item" ? "list_item" : "item",
      targetId: id,
      containerId: "container_project_long",
      workspaceId: "workspace_pse_236",
      sourceItemId: kind === "list_item" ? "source_list_for_calendar" : null
    }
  };
}

const pipelineListFixture = {
  id: "pipeline_list",
  type: "list",
  title: "Operator launch pipeline with local backup, calendar readiness, and cross-object handoff",
  body: "Columns scroll horizontally instead of collapsing into unreadable cards.",
  status: "active",
  tags: [],
  listItems: [
    stage("stage_ready", "Ready for operator review"),
    stage("stage_waiting", "Waiting on local evidence"),
    stage("stage_done", "Accepted for pilot"),
    card("card_1", "stage_ready", longTitle, longBody),
    card("card_2", "stage_waiting", "Collect the final 1280x800 screenshots before asking the owner for acceptance", "Needs timeline, calendar agenda, and pipeline evidence."),
    card("card_3", "stage_done", "Documented no cloud, account, telemetry, or remote storage changes in the implementation summary", "Local-only safety remains intact.", "done")
  ],
  displayMode: "pipeline"
} satisfies ListCardViewModel;

function stage(id: string, title: string) {
  return {
    id,
    title,
    status: "open" as const,
    depth: 0,
    listItemParentId: null,
    sortOrder: 0,
    checked: false
  };
}

function card(
  id: string,
  parent: string,
  title: string,
  body: string,
  status: "open" | "done" = "open"
) {
  return {
    id,
    title,
    body,
    status,
    depth: 1,
    listItemParentId: parent,
    sortOrder: 0,
    checked: status === "done"
  };
}

const kanbanColumns: KanbanColumnViewModel[] = [
  {
    id: "kanban_ready",
    title: "Ready",
    description: "Work with enough column width for titles and one metadata line.",
    color: "#245c55",
    cards: [
      {
        id: "kanban_1",
        title: longTitle,
        description: "Open the project detail for full notes; the board keeps the title readable.",
        meta: `${longContainer} · P1`,
        color: "#245c55",
        pinned: true
      }
    ]
  },
  {
    id: "kanban_review",
    title: "Review",
    description: "Horizontal scroll happens before columns shrink below budget.",
    color: "#2c6b8f",
    cards: [
      {
        id: "kanban_2",
        title: "Check that event dots and agenda rows explain calendar workload without tiny month-cell text",
        description: "Calendar agenda is the readable fallback.",
        meta: "Calendar · Operations",
        color: "#2c6b8f"
      }
    ]
  },
  {
    id: "kanban_done",
    title: "Done",
    description: "Accepted planning work remains visible but secondary.",
    color: "#5f7f4d",
    cards: [
      {
        id: "kanban_3",
        title: "Replaced syllable-wrapped timeline labels with fixed readable row labels",
        description: "Bars carry date/status only.",
        meta: "Timeline · Done",
        color: "#5f7f4d"
      }
    ]
  }
];

