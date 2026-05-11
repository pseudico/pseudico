import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType,
  type Clock
} from "@local-work-os/core";
import {
  ActivityLogService,
  AppSettingsRepository,
  ContainerRepository,
  SavedViewRepository,
  TransactionService,
  type ContainerRecord,
  type DatabaseConnection,
  type SavedViewRecord
} from "@local-work-os/db";
import type { FeatureModuleContract } from "../featureModuleContract";
import { SavedViewService } from "../savedViews/SavedViewService";

export const VIEW_MODES = ["list", "timeline", "calendar"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const CONTAINER_VIEW_MODE_SETTING_KEY_PREFIX = "view-mode.container.v1";

export type ViewModeContextType = "saved_view" | "container";

export type ViewModePreference = {
  contextType: ViewModeContextType;
  contextId: string;
  workspaceId: string;
  mode: ViewMode;
  updatedAt: string | null;
};

export type SetViewModeInput = {
  contextType: ViewModeContextType;
  contextId: string;
  mode: ViewMode;
  actorType?: ActivityActorType;
};

export type ViewModeServiceOptions = {
  connection: DatabaseConnection;
  idFactory?: (prefix: string) => string;
  now?: Clock;
};

export class ViewModeService {
  readonly module = "viewModes";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: Clock;

  constructor(options: ViewModeServiceOptions) {
    this.connection = options.connection;
    this.idFactory = options.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = options.now ?? (() => new Date());
  }

  getViewMode(contextType: ViewModeContextType, contextId: string): ViewModePreference {
    validateContext(contextType, contextId);

    if (contextType === "saved_view") {
      const savedView = this.requireSavedView(contextId);
      const display = parseJsonRecord(savedView.displayJson);

      return {
        contextType,
        contextId,
        workspaceId: savedView.workspaceId,
        mode: isViewMode(display.viewMode) ? display.viewMode : "list",
        updatedAt: savedView.updatedAt
      };
    }

    const container = this.requireViewModeContainer(contextId);
    const setting = new AppSettingsRepository(this.connection).findByKey({
      workspaceId: container.workspaceId,
      settingKey: createContainerViewModeSettingKey(container.id)
    });
    const stored = setting === null ? {} : parseJsonRecord(setting.valueJson);

    return {
      contextType,
      contextId,
      workspaceId: container.workspaceId,
      mode: isViewMode(stored.viewMode) ? stored.viewMode : "list",
      updatedAt: setting?.updatedAt ?? null
    };
  }

  async setViewMode(input: SetViewModeInput): Promise<ViewModePreference> {
    validateContext(input.contextType, input.contextId);
    const mode = validateViewMode(input.mode);

    if (input.contextType === "saved_view") {
      return await this.setSavedViewMode(input.contextId, mode, input.actorType);
    }

    return await this.setContainerMode(input.contextId, mode, input.actorType);
  }

  private async setSavedViewMode(
    savedViewId: string,
    mode: ViewMode,
    actorType: ActivityActorType = "local_user"
  ): Promise<ViewModePreference> {
    const before = this.requireSavedView(savedViewId);
    const display = parseJsonRecord(before.displayJson);
    const result = await new SavedViewService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).updateSavedView({
      savedViewId,
      actorType,
      display: {
        ...display,
        viewMode: mode
      }
    });

    return {
      contextType: "saved_view",
      contextId: savedViewId,
      workspaceId: result.savedView.workspaceId,
      mode,
      updatedAt: result.savedView.updatedAt
    };
  }

  private async setContainerMode(
    containerId: string,
    mode: ViewMode,
    actorType: ActivityActorType = "local_user"
  ): Promise<ViewModePreference> {
    return await new TransactionService({ connection: this.connection }).runInTransaction(() => {
      const container = this.requireViewModeContainer(containerId);
      const before = this.getViewMode("container", container.id);
      const timestamp = createIsoTimestamp(this.now());
      const setting = new AppSettingsRepository(this.connection).upsert({
        id: this.idFactory("app_setting"),
        workspaceId: container.workspaceId,
        settingKey: createContainerViewModeSettingKey(container.id),
        valueJson: JSON.stringify({ version: 1, containerId: container.id, viewMode: mode }),
        timestamp
      });
      const after: ViewModePreference = {
        contextType: "container",
        contextId: container.id,
        workspaceId: container.workspaceId,
        mode,
        updatedAt: setting.updatedAt
      };

      new ActivityLogService({
        connection: this.connection,
        idFactory: this.idFactory
      }).logEvent({
        workspaceId: container.workspaceId,
        actorType,
        action: ActivityAction.workspacePreferencesUpdated,
        targetType: "container",
        targetId: container.id,
        summary: `Updated view mode for ${container.type} "${container.name}" to ${mode}.`,
        beforeJson: JSON.stringify(before),
        afterJson: JSON.stringify(after),
        timestamp
      });

      return after;
    });
  }

  private requireSavedView(savedViewId: string): SavedViewRecord {
    validateNonEmptyString(savedViewId, "savedViewId");
    const savedView = new SavedViewRepository(this.connection).getById(savedViewId);

    if (savedView === null) {
      throw new Error(`Saved view was not found: ${savedViewId}.`);
    }

    return savedView;
  }

  private requireViewModeContainer(containerId: string): ContainerRecord {
    validateNonEmptyString(containerId, "containerId");
    const container = new ContainerRepository(this.connection).getById(containerId);

    if (container === null) {
      throw new Error(`Container was not found: ${containerId}.`);
    }

    if (container.type !== "project" && container.type !== "contact") {
      throw new Error("Only project and contact containers support view modes.");
    }

    return container;
  }
}

export const viewModesModuleContract = {
  module: "viewModes",
  purpose: "Persist local list, timeline, and calendar display mode choices for saved views and compatible containers.",
  owns: ["view mode validation", "saved view display preferences", "project/contact view mode preferences"],
  doesNotOwn: ["calendar data persistence", "timeline rescheduling", "cloud-shared view settings"],
  integrationPoints: ["saved views", "app settings", "project/contact detail UI", "activity log"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

export function createContainerViewModeSettingKey(containerId: string): string {
  validateNonEmptyString(containerId, "containerId");
  return `${CONTAINER_VIEW_MODE_SETTING_KEY_PREFIX}:${containerId}`;
}

export function validateViewMode(value: unknown): ViewMode {
  if (isViewMode(value)) {
    return value;
  }

  throw new Error("view mode must be one of: list, timeline, calendar.");
}

export function isViewMode(value: unknown): value is ViewMode {
  return typeof value === "string" && (VIEW_MODES as readonly string[]).includes(value);
}

function validateContext(contextType: ViewModeContextType, contextId: string): void {
  if (contextType !== "saved_view" && contextType !== "container") {
    throw new Error("contextType must be saved_view or container.");
  }
  validateNonEmptyString(contextId, "contextId");
}

function validateNonEmptyString(value: unknown, name: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string.`);
  }
}

function parseJsonRecord(json: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}
