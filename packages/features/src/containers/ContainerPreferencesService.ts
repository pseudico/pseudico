import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type Clock
} from "@local-work-os/core";
import {
  ActivityLogService,
  AppSettingsRepository,
  ContainerRepository,
  ContainerTabRepository,
  TransactionService,
  type AppSettingRecord,
  type ContainerRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import type { FeatureModuleContract } from "../featureModuleContract";

export const CONTAINER_PREFERENCES_SETTING_KEY_PREFIX =
  "container.preferences.v1";

export const CONTAINER_DEFAULT_VIEWS = ["feed", "tab", "summary"] as const;
export const CONTAINER_GROUPING_MODES = ["none", "type", "tab", "status"] as const;
export const CONTAINER_QUICK_ADD_TYPES = ["task", "note", "list", "link", "file"] as const;

export type ContainerDefaultView = (typeof CONTAINER_DEFAULT_VIEWS)[number];
export type ContainerGroupingMode = (typeof CONTAINER_GROUPING_MODES)[number];
export type ContainerQuickAddType = (typeof CONTAINER_QUICK_ADD_TYPES)[number];

export type ContainerPreferencesValue = {
  defaultView: ContainerDefaultView;
  defaultTabId: string | null;
  showCompleted: boolean;
  grouping: ContainerGroupingMode;
  defaultQuickAddType: ContainerQuickAddType;
  summaryFirst: boolean;
  compactMode: boolean;
};

export type ContainerPreferences = ContainerPreferencesValue & {
  workspaceId: string;
  containerId: string;
  updatedAt: string | null;
};

export type UpdateContainerPreferencesInput = Partial<ContainerPreferencesValue> & {
  containerId: string;
};

type StoredContainerPreferencesPayload = Partial<ContainerPreferencesValue> & {
  version: 1;
  containerId: string;
};

export const DEFAULT_CONTAINER_PREFERENCES: ContainerPreferencesValue = {
  defaultView: "feed",
  defaultTabId: null,
  showCompleted: true,
  grouping: "none",
  defaultQuickAddType: "task",
  summaryFirst: false,
  compactMode: false
};

export type ContainerPreferencesServiceOptions = {
  connection: DatabaseConnection;
  idFactory?: (prefix: string) => string;
  now?: Clock;
};

export class ContainerPreferencesService {
  readonly module = "containers.preferences";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: Clock;

  constructor(options: ContainerPreferencesServiceOptions) {
    this.connection = options.connection;
    this.idFactory = options.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = options.now ?? (() => new Date());
  }

  getPreferences(containerId: string): ContainerPreferences {
    const container = this.requireSupportedContainer(containerId);
    const setting = new AppSettingsRepository(this.connection).findByKey({
      workspaceId: container.workspaceId,
      settingKey: createContainerPreferencesSettingKey(container.id)
    });

    return toContainerPreferences({
      container,
      setting,
      tabRepository: new ContainerTabRepository(this.connection)
    });
  }

  async updatePreferences(
    input: UpdateContainerPreferencesInput
  ): Promise<ContainerPreferences> {
    validateNonEmptyString(input.containerId, "containerId");
    const patch = this.normalizePatch(input, input.containerId);

    return await new TransactionService({ connection: this.connection }).runInTransaction(() => {
      const container = this.requireSupportedContainer(input.containerId);
      const before = this.getPreferences(container.id);
      const timestamp = createIsoTimestamp(this.now());
      const nextValue: ContainerPreferencesValue = {
        defaultView: patch.defaultView ?? before.defaultView,
        defaultTabId:
          patch.defaultTabId === undefined ? before.defaultTabId : patch.defaultTabId,
        showCompleted: patch.showCompleted ?? before.showCompleted,
        grouping: patch.grouping ?? before.grouping,
        defaultQuickAddType: patch.defaultQuickAddType ?? before.defaultQuickAddType,
        summaryFirst: patch.summaryFirst ?? before.summaryFirst,
        compactMode: patch.compactMode ?? before.compactMode
      };

      const saved = new AppSettingsRepository(this.connection).upsert({
        id: this.idFactory("app_setting"),
        workspaceId: container.workspaceId,
        settingKey: createContainerPreferencesSettingKey(container.id),
        valueJson: stringifyContainerPreferences(container.id, nextValue),
        timestamp
      });
      const after = toContainerPreferences({
        container,
        setting: saved,
        tabRepository: new ContainerTabRepository(this.connection)
      });

      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId: container.workspaceId,
        actorType: "local_user",
        action: ActivityAction.workspacePreferencesUpdated,
        targetType: "container",
        targetId: container.id,
        summary: `Updated display preferences for ${container.type} "${container.name}".`,
        beforeJson: JSON.stringify(stripContainerPreferenceMetadata(before)),
        afterJson: JSON.stringify(stripContainerPreferenceMetadata(after)),
        timestamp
      });

      return after;
    });
  }

  private requireSupportedContainer(containerId: string): ContainerRecord {
    validateNonEmptyString(containerId, "containerId");

    const container = new ContainerRepository(this.connection).getById(containerId);

    if (container === null) {
      throw new Error(`Container was not found: ${containerId}.`);
    }

    if (container.type !== "project" && container.type !== "contact") {
      throw new Error("Only project and contact containers support display preferences.");
    }

    return container;
  }

  private normalizePatch(
    input: Partial<ContainerPreferencesValue>,
    containerId: string
  ): Partial<ContainerPreferencesValue> {
    return {
      ...(input.defaultView === undefined
        ? {}
        : { defaultView: validateDefaultView(input.defaultView) }),
      ...(input.defaultTabId === undefined
        ? {}
        : { defaultTabId: this.validateDefaultTabId(input.defaultTabId, containerId) }),
      ...(input.showCompleted === undefined
        ? {}
        : { showCompleted: validateBoolean(input.showCompleted, "showCompleted") }),
      ...(input.grouping === undefined ? {} : { grouping: validateGrouping(input.grouping) }),
      ...(input.defaultQuickAddType === undefined
        ? {}
        : { defaultQuickAddType: validateQuickAddType(input.defaultQuickAddType) }),
      ...(input.summaryFirst === undefined
        ? {}
        : { summaryFirst: validateBoolean(input.summaryFirst, "summaryFirst") }),
      ...(input.compactMode === undefined
        ? {}
        : { compactMode: validateBoolean(input.compactMode, "compactMode") })
    };
  }

  private validateDefaultTabId(value: unknown, containerId: string): string | null {
    if (value === null) {
      return null;
    }

    validateNonEmptyString(value, "defaultTabId");
    const tab = new ContainerTabRepository(this.connection).getById(value);

    if (tab === null || tab.containerId !== containerId) {
      throw new Error(`Default tab was not found for this container: ${value}.`);
    }

    return value;
  }
}

export const containerPreferencesModuleContract = {
  module: "containers.preferences",
  purpose:
    "Persist local per-project/contact display and default-action preferences.",
  owns: [
    "container display preference validation",
    "per-container app setting payloads",
    "activity logging for preference changes"
  ],
  doesNotOwn: ["cloud profile sync", "team-shared view settings", "remote workspace defaults"],
  integrationPoints: ["app settings", "project detail UI", "contact detail UI", "activity log"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

export function createContainerPreferencesSettingKey(containerId: string): string {
  validateNonEmptyString(containerId, "containerId");

  return `${CONTAINER_PREFERENCES_SETTING_KEY_PREFIX}:${containerId}`;
}

export function normalizeContainerPreferencesValue(
  value: unknown,
  options: { containerId?: string; tabRepository?: ContainerTabRepository } = {}
): ContainerPreferencesValue {
  if (!isRecord(value)) {
    return { ...DEFAULT_CONTAINER_PREFERENCES };
  }

  const defaultTabId =
    value.defaultTabId === null || typeof value.defaultTabId === "string"
      ? normalizeStoredDefaultTabId(value.defaultTabId, options)
      : DEFAULT_CONTAINER_PREFERENCES.defaultTabId;

  return {
    defaultView: isContainerDefaultView(value.defaultView)
      ? value.defaultView
      : DEFAULT_CONTAINER_PREFERENCES.defaultView,
    defaultTabId,
    showCompleted:
      typeof value.showCompleted === "boolean"
        ? value.showCompleted
        : DEFAULT_CONTAINER_PREFERENCES.showCompleted,
    grouping: isContainerGroupingMode(value.grouping)
      ? value.grouping
      : DEFAULT_CONTAINER_PREFERENCES.grouping,
    defaultQuickAddType: isContainerQuickAddType(value.defaultQuickAddType)
      ? value.defaultQuickAddType
      : DEFAULT_CONTAINER_PREFERENCES.defaultQuickAddType,
    summaryFirst:
      typeof value.summaryFirst === "boolean"
        ? value.summaryFirst
        : DEFAULT_CONTAINER_PREFERENCES.summaryFirst,
    compactMode:
      typeof value.compactMode === "boolean"
        ? value.compactMode
        : DEFAULT_CONTAINER_PREFERENCES.compactMode
  };
}

function toContainerPreferences(input: {
  container: ContainerRecord;
  setting: AppSettingRecord | null;
  tabRepository: ContainerTabRepository;
}): ContainerPreferences {
  if (input.setting === null) {
    return {
      workspaceId: input.container.workspaceId,
      containerId: input.container.id,
      updatedAt: null,
      ...DEFAULT_CONTAINER_PREFERENCES
    };
  }

  try {
    const parsed = JSON.parse(input.setting.valueJson) as unknown;
    const payload = isRecord(parsed) && parsed.version === 1 ? parsed : parsed;
    const value = normalizeContainerPreferencesValue(payload, {
      containerId: input.container.id,
      tabRepository: input.tabRepository
    });

    return {
      workspaceId: input.container.workspaceId,
      containerId: input.container.id,
      updatedAt: input.setting.updatedAt,
      ...value
    };
  } catch {
    return {
      workspaceId: input.container.workspaceId,
      containerId: input.container.id,
      updatedAt: input.setting.updatedAt,
      ...DEFAULT_CONTAINER_PREFERENCES
    };
  }
}

function stringifyContainerPreferences(
  containerId: string,
  value: ContainerPreferencesValue
): string {
  const payload: StoredContainerPreferencesPayload = {
    version: 1,
    containerId,
    ...value
  };

  return JSON.stringify(payload);
}

function normalizeStoredDefaultTabId(
  value: string | null,
  options: { containerId?: string; tabRepository?: ContainerTabRepository }
): string | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }

  if (options.tabRepository === undefined || options.containerId === undefined) {
    return value;
  }

  const tab = options.tabRepository.getById(value);

  return tab?.containerId === options.containerId ? value : null;
}

function validateDefaultView(value: unknown): ContainerDefaultView {
  if (!isContainerDefaultView(value)) {
    throw new Error("defaultView must be feed, tab, or summary.");
  }

  return value;
}

function validateGrouping(value: unknown): ContainerGroupingMode {
  if (!isContainerGroupingMode(value)) {
    throw new Error("grouping must be none, type, tab, or status.");
  }

  return value;
}

function validateQuickAddType(value: unknown): ContainerQuickAddType {
  if (!isContainerQuickAddType(value)) {
    throw new Error("defaultQuickAddType must be task, note, list, link, or file.");
  }

  return value;
}

function validateBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be a boolean.`);
  }

  return value;
}

function validateNonEmptyString(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function isContainerDefaultView(value: unknown): value is ContainerDefaultView {
  return CONTAINER_DEFAULT_VIEWS.includes(value as ContainerDefaultView);
}

function isContainerGroupingMode(value: unknown): value is ContainerGroupingMode {
  return CONTAINER_GROUPING_MODES.includes(value as ContainerGroupingMode);
}

function isContainerQuickAddType(value: unknown): value is ContainerQuickAddType {
  return CONTAINER_QUICK_ADD_TYPES.includes(value as ContainerQuickAddType);
}

function stripContainerPreferenceMetadata(
  preferences: ContainerPreferences
): ContainerPreferencesValue {
  return {
    defaultView: preferences.defaultView,
    defaultTabId: preferences.defaultTabId,
    showCompleted: preferences.showCompleted,
    grouping: preferences.grouping,
    defaultQuickAddType: preferences.defaultQuickAddType,
    summaryFirst: preferences.summaryFirst,
    compactMode: preferences.compactMode
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
