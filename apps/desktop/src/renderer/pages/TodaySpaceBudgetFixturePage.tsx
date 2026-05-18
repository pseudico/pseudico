import { longDataFixtures } from "@local-work-os/ui";
import type { TodayViewModelSummary } from "../../preload/api";
import { TodayPage } from "./TodayPage";

export function TodaySpaceBudgetFixturePage(): React.JSX.Element {
  return <TodayPage initialViewModel={todaySpaceBudgetFixture} />;
}

const todaySpaceBudgetFixture: TodayViewModelSummary = {
  workspaceId: "workspace_space_budget_fixture",
  generatedAt: "2026-05-18T09:30:00.000Z",
  localDate: "2026-05-18",
  backlogDays: 14,
  preferences: {
    maxFocusTasks: 6,
    planningMode: "top_six",
    backlogDays: 14,
    showWaiting: true,
    showDeferred: true,
    showDailyCompletionSummary: true
  },
  focusSummary: {
    plannedTodayCount: 4,
    maxFocusTasks: 6,
    limitExceeded: false,
    warning: null
  },
  completionSummary: {
    completedTodayCount: 1,
    plannedTodayCompletedCount: 1,
    show: true
  },
  planningSummary: {
    workspaceId: "workspace_space_budget_fixture",
    generatedAt: "2026-05-18T09:30:00.000Z",
    daily: {
      localDate: "2026-05-18",
      plannedCount: 5,
      completedCount: 1,
      snoozedCount: 2,
      overdueCount: 2,
      plannedByLane: { today: 4, tomorrow: 2, backlog: 2 }
    },
    weekly: {
      startDate: "2026-05-18",
      endDate: "2026-05-24",
      byProject: [
        {
          id: "project_operator_handoff",
          label: longDataFixtures.projectName,
          plannedCount: 5,
          completedCount: 1,
          snoozedCount: 2,
          overdueCount: 2
        }
      ],
      byCategory: [
        {
          id: "category_ops",
          label: "Operator handoff and local-only recovery evidence",
          plannedCount: 5,
          completedCount: 1,
          snoozedCount: 2,
          overdueCount: 2
        }
      ]
    }
  },
  ranges: {
    today: {
      startInclusive: "2026-05-18T00:00:00.000Z",
      endExclusive: "2026-05-19T00:00:00.000Z"
    },
    overdueBacklog: {
      startInclusive: "2026-05-04T00:00:00.000Z",
      endExclusive: "2026-05-18T00:00:00.000Z"
    },
    tomorrow: {
      startInclusive: "2026-05-19T00:00:00.000Z",
      endExclusive: "2026-05-20T00:00:00.000Z"
    }
  },
  dueToday: [
    todayFixtureTask({
      itemId: "task_today_handoff",
      title: longDataFixtures.taskTitle,
      body: longDataFixtures.notePreview,
      dueAt: "2026-05-18T14:00:00.000Z",
      plannedLane: "today",
      plannedSortOrder: 1024,
      addedManually: true,
      priority: 2
    }),
    todayFixtureTask({
      itemId: "task_today_normal",
      title: "Call Avery to confirm the backup restore evidence and next pilot handoff window",
      body: "Normal-length title remains fully readable with destination, due date, and complete action visible.",
      dueAt: "2026-05-18T16:00:00.000Z",
      plannedLane: "today",
      plannedSortOrder: 2048,
      addedManually: true
    }),
    todayFixtureTask({
      itemId: "task_today_completed",
      title: "Confirm completed/reopened state appears in Today after the recovery checklist is signed",
      body: "Completed tasks keep the safe Reopen action visible for operator recovery.",
      dueAt: "2026-05-18T10:00:00.000Z",
      taskStatus: "done",
      itemStatus: "completed",
      plannedLane: "today",
      plannedSortOrder: 3072,
      addedManually: true
    })
  ],
  tomorrowPreview: [
    todayFixtureTask({
      itemId: "task_tomorrow_review",
      title: "Review tomorrow launch notes with the project owner and update the local runbook caveats",
      body: "Tomorrow lane preserves planning context without crowding Today.",
      dueAt: "2026-05-19T09:00:00.000Z",
      plannedLane: "tomorrow",
      plannedSortOrder: 1024,
      addedManually: true
    })
  ],
  overdueBacklog: [
    todayFixtureTask({
      itemId: "task_backlog_overdue",
      title: "Recover overdue vendor security notes before they disappear from the operator planning loop",
      body: "Backlog keeps overdue work readable rather than hiding it behind lane caps.",
      dueAt: "2026-05-17T11:00:00.000Z",
      plannedLane: "backlog",
      plannedSortOrder: 1024,
      addedManually: true,
      priority: 1
    })
  ],
  laneSummaries: {
    dueToday: { totalCount: 3, returnedCount: 3, limit: 50, hasMore: false },
    tomorrowPreview: { totalCount: 1, returnedCount: 1, limit: 50, hasMore: false },
    overdueBacklog: { totalCount: 1, returnedCount: 1, limit: 50, hasMore: false }
  }
};

function todayFixtureTask(input: {
  addedManually?: boolean;
  body: string;
  dueAt: string;
  itemId: string;
  itemStatus?: string;
  plannedLane?: "today" | "tomorrow" | "backlog" | null;
  plannedSortOrder?: number | null;
  priority?: number | null;
  taskStatus?: "open" | "done" | "waiting" | "deferred" | "cancelled";
  title: string;
}): TodayViewModelSummary["dueToday"][number] {
  return {
    itemType: "task",
    itemId: input.itemId,
    sourceItemId: null,
    workspaceId: "workspace_space_budget_fixture",
    containerId: "project_operator_handoff",
    containerTitle: longDataFixtures.projectName,
    containerTabId: null,
    title: input.title,
    body: input.body,
    categoryId: "category_ops",
    itemStatus: input.itemStatus ?? "active",
    taskStatus: input.taskStatus ?? "open",
    priority: input.priority ?? null,
    startAt: null,
    dueAt: input.dueAt,
    allDay: true,
    timezone: null,
    sortOrder: input.plannedSortOrder ?? 1024,
    plannedLane: input.plannedLane ?? null,
    plannedSortOrder: input.plannedSortOrder ?? null,
    addedManually: input.addedManually ?? false,
    pinned: false,
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T09:00:00.000Z"
  };
}
