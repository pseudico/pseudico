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
import type { FeatureModuleContract } from "../featureModuleContract";

export const APPEARANCE_SETTINGS_KEY = "appearance.settings.v1";

export const APPEARANCE_THEMES = ["system", "light", "dark"] as const;
export const APPEARANCE_DENSITIES = ["comfortable", "compact"] as const;
export const APPEARANCE_FONT_SIZES = ["small", "medium", "large"] as const;

export type AppearanceThemePreference = (typeof APPEARANCE_THEMES)[number];
export type AppearanceDensityPreference = (typeof APPEARANCE_DENSITIES)[number];
export type AppearanceFontSizePreference = (typeof APPEARANCE_FONT_SIZES)[number];

export type AppearanceSettingsValue = {
  theme: AppearanceThemePreference;
  density: AppearanceDensityPreference;
  fontSize: AppearanceFontSizePreference;
};

export type AppearanceSettings = AppearanceSettingsValue & {
  workspaceId: string;
  updatedAt: string | null;
};

export type UpdateAppearanceSettingsInput = Partial<AppearanceSettingsValue> & {
  workspaceId: string;
};

type StoredAppearanceSettingsPayload = AppearanceSettingsValue & {
  version: 1;
};

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettingsValue = {
  theme: "system",
  density: "comfortable",
  fontSize: "medium"
};

export type AppearanceSettingsServiceOptions = {
  connection?: DatabaseConnection;
  appSettingsRepository?: Pick<AppSettingsRepository, "findByKey" | "upsert">;
  idFactory?: (prefix: string) => string;
  now?: Clock;
  logActivity?: boolean;
};

export class AppearanceSettingsService {
  readonly module = "appearance";

  private readonly connection: DatabaseConnection | null;
  private readonly repository: Pick<AppSettingsRepository, "findByKey" | "upsert">;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: Clock;
  private readonly logActivity: boolean;

  constructor(options: AppearanceSettingsServiceOptions) {
    if (options.connection === undefined && options.appSettingsRepository === undefined) {
      throw new Error(
        "AppearanceSettingsService requires a database connection or app settings repository."
      );
    }

    this.connection = options.connection ?? null;
    this.repository = options.appSettingsRepository ?? new AppSettingsRepository(options.connection!);
    this.idFactory = options.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = options.now ?? (() => new Date());
    this.logActivity = options.logActivity ?? options.connection !== undefined;
  }

  getSettings(workspaceId: string): AppearanceSettings {
    validateWorkspaceId(workspaceId);

    const setting = this.repository.findByKey({
      workspaceId,
      settingKey: APPEARANCE_SETTINGS_KEY
    });

    return toAppearanceSettings({ workspaceId, setting });
  }

  async updateSettings(input: UpdateAppearanceSettingsInput): Promise<AppearanceSettings> {
    validateWorkspaceId(input.workspaceId);
    const patch = normalizeAppearanceSettingsPatch(input);

    const operation = (): AppearanceSettings => {
      const before = this.getSettings(input.workspaceId);
      const timestamp = createIsoTimestamp(this.now());
      const nextValue: AppearanceSettingsValue = {
        theme: patch.theme ?? before.theme,
        density: patch.density ?? before.density,
        fontSize: patch.fontSize ?? before.fontSize
      };

      const saved = this.repository.upsert({
        id: this.idFactory("app_setting"),
        workspaceId: input.workspaceId,
        settingKey: APPEARANCE_SETTINGS_KEY,
        valueJson: stringifyAppearanceSettings(nextValue),
        timestamp
      });
      const after = toAppearanceSettings({ workspaceId: input.workspaceId, setting: saved });

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
          summary: "Updated appearance preferences.",
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

    return await new TransactionService({ connection: this.connection }).runInTransaction(
      operation
    );
  }
}

export const appearanceModuleContract = {
  module: "appearance",
  purpose:
    "Persist local appearance preferences and expose theme, density, and font-size contracts.",
  owns: ["appearance settings", "theme preference validation", "density and font-size preference validation"],
  doesNotOwn: ["cloud profile sync", "per-object custom themes", "renderer stylesheet implementation"],
  integrationPoints: ["app settings", "settings UI", "app shell", "dashboard", "cards"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

export function normalizeAppearanceSettingsValue(value: unknown): AppearanceSettingsValue {
  if (!isRecord(value)) {
    return { ...DEFAULT_APPEARANCE_SETTINGS };
  }

  return {
    theme: isAppearanceThemePreference(value.theme)
      ? value.theme
      : DEFAULT_APPEARANCE_SETTINGS.theme,
    density: isAppearanceDensityPreference(value.density)
      ? value.density
      : DEFAULT_APPEARANCE_SETTINGS.density,
    fontSize: isAppearanceFontSizePreference(value.fontSize)
      ? value.fontSize
      : DEFAULT_APPEARANCE_SETTINGS.fontSize
  };
}

function toAppearanceSettings(input: {
  workspaceId: string;
  setting: AppSettingRecord | null;
}): AppearanceSettings {
  if (input.setting === null) {
    return {
      workspaceId: input.workspaceId,
      updatedAt: null,
      ...DEFAULT_APPEARANCE_SETTINGS
    };
  }

  try {
    const parsed = JSON.parse(input.setting.valueJson) as unknown;
    const value = isRecord(parsed) && parsed.version === 1
      ? normalizeAppearanceSettingsValue(parsed)
      : normalizeAppearanceSettingsValue(parsed);

    return {
      workspaceId: input.workspaceId,
      updatedAt: input.setting.updatedAt,
      ...value
    };
  } catch {
    return {
      workspaceId: input.workspaceId,
      updatedAt: input.setting.updatedAt,
      ...DEFAULT_APPEARANCE_SETTINGS
    };
  }
}

function stringifyAppearanceSettings(value: AppearanceSettingsValue): string {
  const payload: StoredAppearanceSettingsPayload = {
    version: 1,
    ...value
  };

  return JSON.stringify(payload);
}

function normalizeAppearanceSettingsPatch(
  input: Partial<AppearanceSettingsValue>
): Partial<AppearanceSettingsValue> {
  return {
    ...(input.theme === undefined ? {} : { theme: validateTheme(input.theme) }),
    ...(input.density === undefined ? {} : { density: validateDensity(input.density) }),
    ...(input.fontSize === undefined ? {} : { fontSize: validateFontSize(input.fontSize) })
  };
}

function validateTheme(value: unknown): AppearanceThemePreference {
  if (!isAppearanceThemePreference(value)) {
    throw new Error("theme must be system, light, or dark.");
  }

  return value;
}

function validateDensity(value: unknown): AppearanceDensityPreference {
  if (!isAppearanceDensityPreference(value)) {
    throw new Error("density must be comfortable or compact.");
  }

  return value;
}

function validateFontSize(value: unknown): AppearanceFontSizePreference {
  if (!isAppearanceFontSizePreference(value)) {
    throw new Error("fontSize must be small, medium, or large.");
  }

  return value;
}

function isAppearanceThemePreference(value: unknown): value is AppearanceThemePreference {
  return APPEARANCE_THEMES.includes(value as AppearanceThemePreference);
}

function isAppearanceDensityPreference(value: unknown): value is AppearanceDensityPreference {
  return APPEARANCE_DENSITIES.includes(value as AppearanceDensityPreference);
}

function isAppearanceFontSizePreference(value: unknown): value is AppearanceFontSizePreference {
  return APPEARANCE_FONT_SIZES.includes(value as AppearanceFontSizePreference);
}

function validateWorkspaceId(workspaceId: string): void {
  if (workspaceId.trim().length === 0) {
    throw new Error("workspaceId must be a non-empty string.");
  }
}

function stripWorkspaceMetadata(settings: AppearanceSettings): AppearanceSettingsValue {
  return {
    theme: settings.theme,
    density: settings.density,
    fontSize: settings.fontSize
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
