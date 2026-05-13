import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ContainerRepository,
  WorkspaceRepository,
  type DatabaseConnection
} from "@local-work-os/db";
import { WidgetDataService, type DashboardWidgetData } from "../dashboard";
import { ExportService } from "../export";
import { SearchService } from "../search";
import { TodayService } from "../today";

export type LargeWorkspaceBenchmarkSize = 1_000 | 10_000 | 100_000;

export type LargeWorkspaceBenchmarkOperation =
  | "open"
  | "search"
  | "dashboard"
  | "today"
  | "export";

export type LargeWorkspaceBenchmarkBudget = {
  operation: LargeWorkspaceBenchmarkOperation;
  maxMs: number;
  notes: string;
};

export type LargeWorkspaceBenchmarkBudgetSet = {
  itemCount: LargeWorkspaceBenchmarkSize;
  budgets: Record<LargeWorkspaceBenchmarkOperation, LargeWorkspaceBenchmarkBudget>;
};

export type LargeWorkspaceBenchmarkInput = {
  workspaceId: string;
  itemCount: LargeWorkspaceBenchmarkSize;
  searchQuery?: string;
  date?: string | Date;
  operations?: LargeWorkspaceBenchmarkOperation[];
};

export type LargeWorkspaceBenchmarkOperationResult = {
  operation: LargeWorkspaceBenchmarkOperation;
  elapsedMs: number;
  maxMs: number;
  passedBudget: boolean;
  rowCount: number;
  notes: string;
};

export type LargeWorkspaceBenchmarkResult = {
  workspaceId: string;
  itemCount: LargeWorkspaceBenchmarkSize;
  generatedAt: string;
  budgets: LargeWorkspaceBenchmarkBudgetSet;
  operations: LargeWorkspaceBenchmarkOperationResult[];
  passed: boolean;
};

type Timer = {
  now: () => number;
};

const DEFAULT_OPERATIONS: LargeWorkspaceBenchmarkOperation[] = [
  "open",
  "search",
  "dashboard",
  "today",
  "export"
];

export const LARGE_WORKSPACE_BENCHMARK_BUDGETS: LargeWorkspaceBenchmarkBudgetSet[] = [
  {
    itemCount: 1_000,
    budgets: {
      open: {
        operation: "open",
        maxMs: 200,
        notes: "Open summary should use bounded startup counts, not unbounded feed reads."
      },
      search: {
        operation: "search",
        maxMs: 150,
        notes: "Search budget covers indexed query hydration for the first 25 results."
      },
      dashboard: {
        operation: "dashboard",
        maxMs: 250,
        notes: "Dashboard budget covers default local widgets with bounded pages."
      },
      today: {
        operation: "today",
        maxMs: 300,
        notes: "Today budget covers due, backlog, tomorrow, and summary projections."
      },
      export: {
        operation: "export",
        maxMs: 1_000,
        notes: "Export budget covers in-memory workspace JSON assembly only."
      }
    }
  },
  {
    itemCount: 10_000,
    budgets: {
      open: {
        operation: "open",
        maxMs: 500,
        notes: "Open summary should stay sub-second on a 10k item local workspace."
      },
      search: {
        operation: "search",
        maxMs: 350,
        notes: "Search remains bounded by result page and indexed text scan."
      },
      dashboard: {
        operation: "dashboard",
        maxMs: 750,
        notes: "Default dashboard widgets should avoid unbounded renderer payloads."
      },
      today: {
        operation: "today",
        maxMs: 900,
        notes: "Today projections should remain usable with 10k dated items."
      },
      export: {
        operation: "export",
        maxMs: 6_000,
        notes: "Workspace JSON export may scale with item count but should finish quickly."
      }
    }
  },
  {
    itemCount: 100_000,
    budgets: {
      open: {
        operation: "open",
        maxMs: 1_500,
        notes: "App open must not scan or render every row before becoming usable."
      },
      search: {
        operation: "search",
        maxMs: 1_000,
        notes: "Indexed search should stay around one second for first-page results."
      },
      dashboard: {
        operation: "dashboard",
        maxMs: 2_000,
        notes: "Dashboard must keep widget reads bounded at the service boundary."
      },
      today: {
        operation: "today",
        maxMs: 3_000,
        notes: "Today remains a heavier planning projection but should stay under 3s."
      },
      export: {
        operation: "export",
        maxMs: 45_000,
        notes: "Full local JSON export is allowed to be batch-grade at 100k items."
      }
    }
  }
];

export class LargeWorkspaceBenchmarkService {
  readonly module = "performance";

  private readonly connection: DatabaseConnection;
  private readonly now: () => Date;
  private readonly timer: Timer;

  constructor(input: {
    connection: DatabaseConnection;
    now?: () => Date;
    timer?: Timer;
  }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
    this.timer = input.timer ?? createDefaultTimer();
  }

  run(input: LargeWorkspaceBenchmarkInput): LargeWorkspaceBenchmarkResult {
    validateInput(input);

    const budgets = getLargeWorkspaceBenchmarkBudgets(input.itemCount);
    const operations = input.operations ?? DEFAULT_OPERATIONS;
    const operationResults = operations.map((operation) =>
      this.measureOperation({
        input,
        operation,
        budget: budgets.budgets[operation]
      })
    );

    return {
      workspaceId: input.workspaceId,
      itemCount: input.itemCount,
      generatedAt: this.now().toISOString(),
      budgets,
      operations: operationResults,
      passed: operationResults.every((result) => result.passedBudget)
    };
  }

  private measureOperation(input: {
    input: LargeWorkspaceBenchmarkInput;
    operation: LargeWorkspaceBenchmarkOperation;
    budget: LargeWorkspaceBenchmarkBudget;
  }): LargeWorkspaceBenchmarkOperationResult {
    let rowCount = 0;
    const started = this.timer.now();

    switch (input.operation) {
      case "open":
        rowCount = this.measureOpen(input.input.workspaceId);
        break;
      case "search":
        rowCount = this.measureSearch(input.input);
        break;
      case "dashboard":
        rowCount = this.measureDashboard(input.input);
        break;
      case "today":
        rowCount = this.measureToday(input.input);
        break;
      case "export":
        rowCount = this.measureExport(input.input.workspaceId);
        break;
    }

    const elapsedMs = roundElapsed(this.timer.now() - started);

    return {
      operation: input.operation,
      elapsedMs,
      maxMs: input.budget.maxMs,
      passedBudget: elapsedMs <= input.budget.maxMs,
      rowCount,
      notes: input.budget.notes
    };
  }

  private measureOpen(workspaceId: string): number {
    const workspace = new WorkspaceRepository(this.connection).getById(workspaceId);

    if (workspace === null) {
      throw new Error(`Workspace row was not found: ${workspaceId}.`);
    }

    const containerCount = new ContainerRepository(this.connection).listByWorkspace(
      workspaceId
    ).length;
    const itemCount = this.countRows("items", workspaceId);
    const searchCount = this.countRows("search_index", workspaceId);

    return 1 + containerCount + itemCount + searchCount;
  }

  private measureSearch(input: LargeWorkspaceBenchmarkInput): number {
    return new SearchService({
      connection: this.connection,
      now: this.now
    }).search({
      workspaceId: input.workspaceId,
      query: input.searchQuery ?? "fixture",
      limit: 25
    }).length;
  }

  private measureDashboard(input: LargeWorkspaceBenchmarkInput): number {
    const service = new WidgetDataService({
      connection: this.connection,
      now: this.now
    });
    const widgetInput = {
      workspaceId: input.workspaceId,
      limit: 10,
      date: input.date ?? this.now()
    };
    const today = service.getTodayWidgetData(widgetInput);
    const overdue = service.getOverdueWidgetData(widgetInput);
    const upcoming = service.getUpcomingWidgetData(widgetInput);
    const projectHealth = service.getProjectHealthWidgetData(widgetInput);
    const activity = service.getRecentActivityWidgetData(widgetInput);

    return (
      countDashboardItems(today) +
      countDashboardItems(overdue) +
      countDashboardItems(upcoming) +
      countDashboardItems(projectHealth) +
      countDashboardItems(activity)
    );
  }

  private measureToday(input: LargeWorkspaceBenchmarkInput): number {
    const viewModel = new TodayService({
      connection: this.connection,
      now: this.now
    }).getTodayViewModel({
      workspaceId: input.workspaceId,
      date: input.date ?? this.now()
    });

    return (
      viewModel.dueToday.length +
      viewModel.overdueBacklog.length +
      viewModel.tomorrowPreview.length
    );
  }

  private measureExport(workspaceId: string): number {
    const exportData = new ExportService({
      connection: this.connection,
      fileSystem: {},
      now: this.now
    }).buildWorkspaceExport({ workspaceId });

    return (
      exportData.data.containers.length +
      exportData.data.items.length +
      exportData.data.taskDetails.length +
      exportData.data.noteDetails.length +
      exportData.data.listDetails.length +
      exportData.data.listItems.length
    );
  }

  private countRows(tableName: "items" | "search_index", workspaceId: string): number {
    const row = this.connection.sqlite
      .prepare<[string], { count: number }>(
        `select count(*) as count from ${tableName} where workspace_id = ?`
      )
      .get(workspaceId);

    return row?.count ?? 0;
  }
}

export function getLargeWorkspaceBenchmarkBudgets(
  itemCount: LargeWorkspaceBenchmarkSize
): LargeWorkspaceBenchmarkBudgetSet {
  const budgetSet = LARGE_WORKSPACE_BENCHMARK_BUDGETS.find(
    (candidate) => candidate.itemCount === itemCount
  );

  if (budgetSet === undefined) {
    throw new Error("itemCount must be one of 1000, 10000, or 100000.");
  }

  return budgetSet;
}

export const performanceModuleContract: FeatureModuleContract = {
  module: "performance",
  purpose:
    "Define and run local large-workspace benchmark budgets for release and regression checks.",
  priority: "MVP",
  owns: ["large-workspace benchmark budgets", "local benchmark operation runner"],
  doesNotOwn: [
    "hosted telemetry",
    "cloud performance collection",
    "renderer-only performance assertions"
  ],
  integrationPoints: [
    "Database performance fixture service",
    "Search, Dashboard, Today, and Export services",
    "Local maintenance and release QA documentation"
  ]
} as const satisfies FeatureModuleContract;

function validateInput(input: LargeWorkspaceBenchmarkInput): void {
  validateNonEmptyString(input.workspaceId, "workspaceId");
  getLargeWorkspaceBenchmarkBudgets(input.itemCount);

  if (input.operations !== undefined && input.operations.length === 0) {
    throw new Error("operations must include at least one benchmark operation.");
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function createDefaultTimer(): Timer {
  return { now: () => Date.now() };
}

function roundElapsed(elapsedMs: number): number {
  return Math.round(elapsedMs * 100) / 100;
}

function countDashboardItems(data: DashboardWidgetData): number {
  if ("items" in data) {
    return data.items.length;
  }

  if ("days" in data) {
    return data.days.reduce((total, day) => total + day.itemCount, 0);
  }

  return data.summary.groups.reduce((total, group) => total + group.itemCount, 0);
}
