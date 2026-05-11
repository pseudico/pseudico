import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type Clock
} from "@local-work-os/core";
import {
  ActivityLogService,
  AppSettingsRepository,
  TransactionService,
  type AppSettingRecord,
  type DatabaseConnection
} from "@local-work-os/db";

export const TODAY_PREFERENCES_SETTING_KEY = "today.preferences.v1";
export const TODAY_PLANNING_MODES = ["standard", "top_six", "ivy_lee"] as const;

export type TodayPlanningMode = (typeof TODAY_PLANNING_MODES)[number];

export type TodayPreferencesValue = {
  maxFocusTasks: number;
  planningMode: TodayPlanningMode;
  backlogDays: number;
  showWaiting: boolean;
  showDeferred: boolean;
  showDailyCompletionSummary: boolean;
};

export type TodayPreferences = TodayPreferencesValue & {
  workspaceId: string;
  updatedAt: string | null;
};

export type UpdateTodayPreferencesInput = Partial<TodayPreferencesValue> & {
  workspaceId: string;
};

type StoredTodayPreferencesPayload = TodayPreferencesValue & {
  version: 1;
};

export const DEFAULT_TODAY_PREFERENCES: TodayPreferencesValue = {
  maxFocusTasks: 6,
  planningMode: "standard",
  backlogDays: 14,
  showWaiting: false,
  showDeferred: false,
  showDailyCompletionSummary: true
};

export class TodayPreferencesService {
  readonly module = "today";

  private readonly connection: DatabaseConnection | null;
  private readonly repository: Pick<AppSettingsRepository, "findByKey" | "upsert">;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: Clock;
  private readonly logActivity: boolean;

  constructor(options: {
    connection?: DatabaseConnection;
    appSettingsRepository?: Pick<AppSettingsRepository, "findByKey" | "upsert">;
    idFactory?: (prefix: string) => string;
    now?: Clock;
    logActivity?: boolean;
  }) {
    if (options.connection === undefined && options.appSettingsRepository === undefined) {
      throw new Error("TodayPreferencesService requires a database connection or app settings repository.");
    }

    this.connection = options.connection ?? null;
    this.repository = options.appSettingsRepository ?? new AppSettingsRepository(options.connection!);
    this.idFactory = options.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = options.now ?? (() => new Date());
    this.logActivity = options.logActivity ?? options.connection !== undefined;
  }

  getPreferences(workspaceId: string): TodayPreferences {
    validateWorkspaceId(workspaceId);

    const setting = this.repository.findByKey({
      workspaceId,
      settingKey: TODAY_PREFERENCES_SETTING_KEY
    });

    return toTodayPreferences({ workspaceId, setting });
  }

  async updatePreferences(input: UpdateTodayPreferencesInput): Promise<TodayPreferences> {
    validateWorkspaceId(input.workspaceId);
    const patch = normalizeTodayPreferencesPatch(input);

    const operation = (): TodayPreferences => {
      const before = this.getPreferences(input.workspaceId);
      const timestamp = createIsoTimestamp(this.now());
      const nextValue: TodayPreferencesValue = normalizeTodayPreferencesValue({
        maxFocusTasks: patch.maxFocusTasks ?? before.maxFocusTasks,
        planningMode: patch.planningMode ?? before.planningMode,
        backlogDays: patch.backlogDays ?? before.backlogDays,
        showWaiting: patch.showWaiting ?? before.showWaiting,
        showDeferred: patch.showDeferred ?? before.showDeferred,
        showDailyCompletionSummary:
          patch.showDailyCompletionSummary ?? before.showDailyCompletionSummary
      });

      const saved = this.repository.upsert({
        id: this.idFactory("app_setting"),
        workspaceId: input.workspaceId,
        settingKey: TODAY_PREFERENCES_SETTING_KEY,
        valueJson: stringifyTodayPreferences(nextValue),
        timestamp
      });
      const after = toTodayPreferences({ workspaceId: input.workspaceId, setting: saved });

      if (this.logActivity && this.connection !== null) {
        new ActivityLogService({
          connection: this.connection,
          idFactory: this.idFactory
        }).logEvent({
          workspaceId: input.workspaceId,
          actorType: "local_user",
          action: ActivityAction.workspacePreferencesUpdated,
          targetType: "workspace",
          targetId: input.workspaceId,
          summary: "Updated Today planning preferences.",
          beforeJson: JSON.stringify(stripWorkspaceMetadata(before)),
          afterJson: JSON.stringify(stripWorkspaceMetadata(after)),
          timestamp
        });
      }

      return after;
    };

    if (this.connection === null) {
      return operation();
    }

    return await new TransactionService({ connection: this.connection }).runInTransaction(operation);
  }
}

export function normalizeTodayPreferencesValue(value: unknown): TodayPreferencesValue {
  if (!isRecord(value)) {
    return { ...DEFAULT_TODAY_PREFERENCES };
  }

  const planningMode = isTodayPlanningMode(value.planningMode)
    ? value.planningMode
    : DEFAULT_TODAY_PREFERENCES.planningMode;
  const maxFocusTasks = normalizeMaxFocusTasks(value.maxFocusTasks, planningMode);

  return {
    maxFocusTasks,
    planningMode,
    backlogDays: normalizeBacklogDays(value.backlogDays),
    showWaiting: typeof value.showWaiting === "boolean"
      ? value.showWaiting
      : DEFAULT_TODAY_PREFERENCES.showWaiting,
    showDeferred: typeof value.showDeferred === "boolean"
      ? value.showDeferred
      : DEFAULT_TODAY_PREFERENCES.showDeferred,
    showDailyCompletionSummary: typeof value.showDailyCompletionSummary === "boolean"
      ? value.showDailyCompletionSummary
      : DEFAULT_TODAY_PREFERENCES.showDailyCompletionSummary
  };
}

function toTodayPreferences(input: {
  workspaceId: string;
  setting: AppSettingRecord | null;
}): TodayPreferences {
  if (input.setting === null) {
    return {
      workspaceId: input.workspaceId,
      updatedAt: null,
      ...DEFAULT_TODAY_PREFERENCES
    };
  }

  try {
    const parsed = JSON.parse(input.setting.valueJson) as unknown;
    const value = isRecord(parsed) && parsed.version === 1
      ? normalizeTodayPreferencesValue(parsed)
      : normalizeTodayPreferencesValue(parsed);

    return {
      workspaceId: input.workspaceId,
      updatedAt: input.setting.updatedAt,
      ...value
    };
  } catch {
    return {
      workspaceId: input.workspaceId,
      updatedAt: input.setting.updatedAt,
      ...DEFAULT_TODAY_PREFERENCES
    };
  }
}

function stringifyTodayPreferences(value: TodayPreferencesValue): string {
  const payload: StoredTodayPreferencesPayload = {
    version: 1,
    ...value
  };

  return JSON.stringify(payload);
}

function normalizeTodayPreferencesPatch(
  input: Partial<TodayPreferencesValue>
): Partial<TodayPreferencesValue> {
  const planningMode = input.planningMode === undefined
    ? undefined
    : validatePlanningMode(input.planningMode);

  return {
    ...(input.maxFocusTasks === undefined
      ? {}
      : { maxFocusTasks: normalizeMaxFocusTasks(input.maxFocusTasks, planningMode) }),
    ...(planningMode === undefined ? {} : { planningMode }),
    ...(input.backlogDays === undefined ? {} : { backlogDays: normalizeBacklogDays(input.backlogDays) }),
    ...(input.showWaiting === undefined ? {} : { showWaiting: validateBoolean(input.showWaiting, "showWaiting") }),
    ...(input.showDeferred === undefined ? {} : { showDeferred: validateBoolean(input.showDeferred, "showDeferred") }),
    ...(input.showDailyCompletionSummary === undefined
      ? {}
      : {
          showDailyCompletionSummary: validateBoolean(
            input.showDailyCompletionSummary,
            "showDailyCompletionSummary"
          )
        })
  };
}

function normalizeMaxFocusTasks(value: unknown, planningMode?: TodayPlanningMode): number {
  if (value === undefined || value === null) {
    return planningMode === "top_six" || planningMode === "ivy_lee" ? 6 : DEFAULT_TODAY_PREFERENCES.maxFocusTasks;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 24) {
    throw new Error("maxFocusTasks must be an integer between 1 and 24.");
  }

  if ((planningMode === "top_six" || planningMode === "ivy_lee") && value > 6) {
    return 6;
  }

  return value;
}

function normalizeBacklogDays(value: unknown): number {
  if (value === undefined || value === null) {
    return DEFAULT_TODAY_PREFERENCES.backlogDays;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 365) {
    throw new Error("backlogDays must be an integer between 1 and 365.");
  }

  return value;
}

function validatePlanningMode(value: unknown): TodayPlanningMode {
  if (!isTodayPlanningMode(value)) {
    throw new Error("planningMode must be standard, top_six, or ivy_lee.");
  }

  return value;
}

function isTodayPlanningMode(value: unknown): value is TodayPlanningMode {
  return TODAY_PLANNING_MODES.includes(value as TodayPlanningMode);
}

function validateBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean.`);
  }

  return value;
}

function validateWorkspaceId(workspaceId: string): void {
  if (workspaceId.trim().length === 0) {
    throw new Error("workspaceId must be a non-empty string.");
  }
}

function stripWorkspaceMetadata(settings: TodayPreferences): TodayPreferencesValue {
  return {
    maxFocusTasks: settings.maxFocusTasks,
    planningMode: settings.planningMode,
    backlogDays: settings.backlogDays,
    showWaiting: settings.showWaiting,
    showDeferred: settings.showDeferred,
    showDailyCompletionSummary: settings.showDailyCompletionSummary
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
