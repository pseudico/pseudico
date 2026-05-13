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

export const PRIVACY_NETWORK_SETTINGS_KEY = "privacy.network.settings.v1";

export const NETWORK_FEATURE_IDS = [
  "metadataFetch",
  "webWidgets",
  "icsUrlImport",
  "imapImport",
  "browserCapture"
] as const;

export type NetworkFeatureId = (typeof NETWORK_FEATURE_IDS)[number];

export type PrivacyNetworkSettingsValue = {
  metadataFetchEnabled: boolean;
  webWidgetsEnabled: boolean;
  icsUrlImportEnabled: boolean;
  imapImportEnabled: boolean;
  browserCaptureEnabled: boolean;
};

export type PrivacyNetworkSettings = PrivacyNetworkSettingsValue & {
  workspaceId: string;
  telemetryEnabled: false;
  telemetryNotice: string;
  updatedAt: string | null;
};

export type UpdatePrivacyNetworkSettingsInput =
  Partial<PrivacyNetworkSettingsValue> & {
    workspaceId: string;
  };

type StoredPrivacyNetworkSettingsPayload = PrivacyNetworkSettingsValue & {
  version: 1;
  telemetryEnabled: false;
};

export const DEFAULT_PRIVACY_NETWORK_SETTINGS: PrivacyNetworkSettingsValue = {
  metadataFetchEnabled: false,
  webWidgetsEnabled: false,
  icsUrlImportEnabled: false,
  imapImportEnabled: false,
  browserCaptureEnabled: false
};

export const PRIVACY_TELEMETRY_NOTICE =
  "Local Work OS does not include telemetry or analytics. Optional network features stay off until explicitly enabled.";

export type PrivacySettingsServiceOptions = {
  connection?: DatabaseConnection;
  appSettingsRepository?: Pick<AppSettingsRepository, "findByKey" | "upsert">;
  idFactory?: (prefix: string) => string;
  now?: Clock;
  logActivity?: boolean;
};

export class PrivacySettingsService {
  readonly module = "privacy";

  private readonly connection: DatabaseConnection | null;
  private readonly repository: Pick<AppSettingsRepository, "findByKey" | "upsert">;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: Clock;
  private readonly logActivity: boolean;

  constructor(options: PrivacySettingsServiceOptions) {
    if (options.connection === undefined && options.appSettingsRepository === undefined) {
      throw new Error(
        "PrivacySettingsService requires a database connection or app settings repository."
      );
    }

    this.connection = options.connection ?? null;
    this.repository = options.appSettingsRepository ?? new AppSettingsRepository(options.connection!);
    this.idFactory = options.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = options.now ?? (() => new Date());
    this.logActivity = options.logActivity ?? options.connection !== undefined;
  }

  getSettings(workspaceId: string): PrivacyNetworkSettings {
    validateWorkspaceId(workspaceId);

    const setting = this.repository.findByKey({
      workspaceId,
      settingKey: PRIVACY_NETWORK_SETTINGS_KEY
    });

    return toPrivacyNetworkSettings({ workspaceId, setting });
  }

  async updateSettings(
    input: UpdatePrivacyNetworkSettingsInput
  ): Promise<PrivacyNetworkSettings> {
    validateWorkspaceId(input.workspaceId);
    const patch = normalizePrivacyNetworkSettingsPatch(input);

    const operation = (): PrivacyNetworkSettings => {
      const before = this.getSettings(input.workspaceId);
      const timestamp = createIsoTimestamp(this.now());
      const nextValue: PrivacyNetworkSettingsValue = {
        metadataFetchEnabled:
          patch.metadataFetchEnabled ?? before.metadataFetchEnabled,
        webWidgetsEnabled: patch.webWidgetsEnabled ?? before.webWidgetsEnabled,
        icsUrlImportEnabled:
          patch.icsUrlImportEnabled ?? before.icsUrlImportEnabled,
        imapImportEnabled: patch.imapImportEnabled ?? before.imapImportEnabled,
        browserCaptureEnabled:
          patch.browserCaptureEnabled ?? before.browserCaptureEnabled
      };

      const saved = this.repository.upsert({
        id: this.idFactory("app_setting"),
        workspaceId: input.workspaceId,
        settingKey: PRIVACY_NETWORK_SETTINGS_KEY,
        valueJson: stringifyPrivacyNetworkSettings(nextValue),
        timestamp
      });
      const after = toPrivacyNetworkSettings({
        workspaceId: input.workspaceId,
        setting: saved
      });

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
          summary: "Updated privacy and network preferences.",
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

  isFeatureEnabled(workspaceId: string, featureId: NetworkFeatureId): boolean {
    const settings = this.getSettings(workspaceId);
    return isNetworkFeatureEnabled(settings, featureId);
  }

  assertFeatureAllowed(workspaceId: string, featureId: NetworkFeatureId): void {
    if (!this.isFeatureEnabled(workspaceId, featureId)) {
      throw new Error(networkFeatureDisabledMessage(featureId));
    }
  }
}

export const privacyModuleContract = {
  module: "privacy",
  purpose:
    "Persist local privacy preferences and gate optional network-capable features.",
  owns: [
    "privacy and network settings",
    "no-telemetry notice",
    "optional network feature guards"
  ],
  doesNotOwn: [
    "cloud sync",
    "hosted accounts",
    "telemetry SDKs",
    "network transport implementations"
  ],
  integrationPoints: [
    "app settings",
    "settings UI",
    "calendar feeds",
    "IMAP import",
    "browser capture",
    "dashboard web widgets"
  ],
  priority: "V1"
} as const satisfies FeatureModuleContract;

export function normalizePrivacyNetworkSettingsValue(
  value: unknown
): PrivacyNetworkSettingsValue {
  if (!isRecord(value)) {
    return { ...DEFAULT_PRIVACY_NETWORK_SETTINGS };
  }

  return {
    metadataFetchEnabled: value.metadataFetchEnabled === true,
    webWidgetsEnabled: value.webWidgetsEnabled === true,
    icsUrlImportEnabled: value.icsUrlImportEnabled === true,
    imapImportEnabled: value.imapImportEnabled === true,
    browserCaptureEnabled: value.browserCaptureEnabled === true
  };
}

export function isNetworkFeatureEnabled(
  settings: PrivacyNetworkSettingsValue,
  featureId: NetworkFeatureId
): boolean {
  switch (featureId) {
    case "metadataFetch":
      return settings.metadataFetchEnabled;
    case "webWidgets":
      return settings.webWidgetsEnabled;
    case "icsUrlImport":
      return settings.icsUrlImportEnabled;
    case "imapImport":
      return settings.imapImportEnabled;
    case "browserCapture":
      return settings.browserCaptureEnabled;
  }
}

export function networkFeatureDisabledMessage(featureId: NetworkFeatureId): string {
  switch (featureId) {
    case "metadataFetch":
      return "Link metadata fetching is disabled in Privacy & Network settings.";
    case "webWidgets":
      return "Web widgets are disabled in Privacy & Network settings.";
    case "icsUrlImport":
      return "ICS URL imports are disabled in Privacy & Network settings.";
    case "imapImport":
      return "IMAP import is disabled in Privacy & Network settings.";
    case "browserCapture":
      return "Browser capture is disabled in Privacy & Network settings.";
  }
}

function toPrivacyNetworkSettings(input: {
  workspaceId: string;
  setting: AppSettingRecord | null;
}): PrivacyNetworkSettings {
  if (input.setting === null) {
    return {
      workspaceId: input.workspaceId,
      telemetryEnabled: false,
      telemetryNotice: PRIVACY_TELEMETRY_NOTICE,
      updatedAt: null,
      ...DEFAULT_PRIVACY_NETWORK_SETTINGS
    };
  }

  try {
    const parsed = JSON.parse(input.setting.valueJson) as unknown;
    const value = isRecord(parsed) && parsed.version === 1
      ? normalizePrivacyNetworkSettingsValue(parsed)
      : normalizePrivacyNetworkSettingsValue(parsed);

    return {
      workspaceId: input.workspaceId,
      telemetryEnabled: false,
      telemetryNotice: PRIVACY_TELEMETRY_NOTICE,
      updatedAt: input.setting.updatedAt,
      ...value
    };
  } catch {
    return {
      workspaceId: input.workspaceId,
      telemetryEnabled: false,
      telemetryNotice: PRIVACY_TELEMETRY_NOTICE,
      updatedAt: input.setting.updatedAt,
      ...DEFAULT_PRIVACY_NETWORK_SETTINGS
    };
  }
}

function stringifyPrivacyNetworkSettings(
  value: PrivacyNetworkSettingsValue
): string {
  const payload: StoredPrivacyNetworkSettingsPayload = {
    version: 1,
    telemetryEnabled: false,
    ...value
  };

  return JSON.stringify(payload);
}

function normalizePrivacyNetworkSettingsPatch(
  input: Partial<PrivacyNetworkSettingsValue>
): Partial<PrivacyNetworkSettingsValue> {
  return {
    ...(input.metadataFetchEnabled === undefined
      ? {}
      : { metadataFetchEnabled: validateBoolean(input.metadataFetchEnabled, "metadataFetchEnabled") }),
    ...(input.webWidgetsEnabled === undefined
      ? {}
      : { webWidgetsEnabled: validateBoolean(input.webWidgetsEnabled, "webWidgetsEnabled") }),
    ...(input.icsUrlImportEnabled === undefined
      ? {}
      : { icsUrlImportEnabled: validateBoolean(input.icsUrlImportEnabled, "icsUrlImportEnabled") }),
    ...(input.imapImportEnabled === undefined
      ? {}
      : { imapImportEnabled: validateBoolean(input.imapImportEnabled, "imapImportEnabled") }),
    ...(input.browserCaptureEnabled === undefined
      ? {}
      : { browserCaptureEnabled: validateBoolean(input.browserCaptureEnabled, "browserCaptureEnabled") })
  };
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

function stripWorkspaceMetadata(
  settings: PrivacyNetworkSettings
): PrivacyNetworkSettingsValue {
  return {
    metadataFetchEnabled: settings.metadataFetchEnabled,
    webWidgetsEnabled: settings.webWidgetsEnabled,
    icsUrlImportEnabled: settings.icsUrlImportEnabled,
    imapImportEnabled: settings.imapImportEnabled,
    browserCaptureEnabled: settings.browserCaptureEnabled
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
