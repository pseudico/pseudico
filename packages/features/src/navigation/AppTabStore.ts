import {
  AppSettingsRepository,
  type AppSettingRecord
} from "@local-work-os/db";
import { createLocalId } from "@local-work-os/core";
import type { NavigationTargetType, RecordNavigationTargetInput } from "./NavigationHistoryService";

export const APP_TABS_SETTING_KEY = "navigation.appTabs.v1";
export const DEFAULT_APP_TAB_LIMIT = 16;

export type AppTabRouteTarget = RecordNavigationTargetInput["target"];

export type AppTab = {
  id: string;
  workspaceId: string;
  targetType: NavigationTargetType;
  targetId: string | null;
  path: string;
  label: string;
  subtitle: string | null;
  openedAt: string;
  updatedAt: string;
};

export type AppTabSession = {
  workspaceId: string;
  tabs: AppTab[];
  activeTabId: string | null;
};

export type OpenAppTabInput = {
  workspaceId: string;
  target: AppTabRouteTarget;
};

export type CloseAppTabInput = {
  workspaceId: string;
  tabId: string;
};

export type ReorderAppTabsInput = {
  workspaceId: string;
  tabIds: string[];
};

export type SetActiveAppTabInput = {
  workspaceId: string;
  tabId: string;
};

type StoredAppTabsPayload = {
  version: 1;
  activeTabId: string | null;
  tabs: AppTab[];
};

export type AppTabStoreOptions = {
  appSettingsRepository: Pick<AppSettingsRepository, "findByKey" | "upsert">;
  idFactory?: (prefix: string) => string;
  now?: () => Date;
  limit?: number;
};

export class AppTabStore {
  private readonly appSettingsRepository: Pick<
    AppSettingsRepository,
    "findByKey" | "upsert"
  >;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => Date;
  private readonly limit: number;

  constructor(options: AppTabStoreOptions) {
    this.appSettingsRepository = options.appSettingsRepository;
    this.idFactory = options.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = options.now ?? (() => new Date());
    this.limit = Math.max(1, options.limit ?? DEFAULT_APP_TAB_LIMIT);
  }

  listTabs(workspaceId: string): AppTabSession {
    return normalizeAppTabSession({
      workspaceId,
      setting: this.appSettingsRepository.findByKey({
        workspaceId,
        settingKey: APP_TABS_SETTING_KEY
      }),
      limit: this.limit
    });
  }

  openTab(input: OpenAppTabInput): AppTabSession {
    const timestamp = this.now().toISOString();
    const current = this.listTabs(input.workspaceId);
    const normalizedTarget = normalizeAppTabRouteTarget(input.target);
    const existing = current.tabs.find(
      (tab) => getAppTabTargetKey(tab) === getAppTabTargetKey(normalizedTarget)
    );
    const activeTab: AppTab = existing === undefined
      ? {
          id: this.idFactory("app_tab"),
          workspaceId: input.workspaceId,
          targetType: normalizedTarget.targetType,
          targetId: normalizedTarget.targetId,
          path: normalizedTarget.path,
          label: normalizedTarget.label,
          subtitle: normalizedTarget.subtitle,
          openedAt: timestamp,
          updatedAt: timestamp
        }
      : {
          ...existing,
          path: normalizedTarget.path,
          label: normalizedTarget.label,
          subtitle: normalizedTarget.subtitle,
          updatedAt: timestamp
        };
    const nextTabs = [
      ...current.tabs.filter((tab) => tab.id !== activeTab.id),
      activeTab
    ].slice(-this.limit);

    return this.saveSession({
      workspaceId: input.workspaceId,
      tabs: nextTabs,
      activeTabId: activeTab.id,
      timestamp
    });
  }

  closeTab(input: CloseAppTabInput): AppTabSession {
    const current = this.listTabs(input.workspaceId);
    const removedIndex = current.tabs.findIndex((tab) => tab.id === input.tabId);

    if (removedIndex === -1) {
      return current;
    }

    const nextTabs = current.tabs.filter((tab) => tab.id !== input.tabId);
    const activeTabId = resolveActiveTabAfterClose({
      current,
      removedIndex,
      nextTabs,
      closedTabId: input.tabId
    });

    return this.saveSession({
      workspaceId: input.workspaceId,
      tabs: nextTabs,
      activeTabId,
      timestamp: this.now().toISOString()
    });
  }

  reorderTabs(input: ReorderAppTabsInput): AppTabSession {
    const current = this.listTabs(input.workspaceId);
    const uniqueTabIds = [...new Set(input.tabIds)];

    if (
      uniqueTabIds.length !== current.tabs.length ||
      uniqueTabIds.some((tabId) => !current.tabs.some((tab) => tab.id === tabId))
    ) {
      throw new Error("reorderTabs requires every current app tab id exactly once.");
    }

    const tabsById = new Map(current.tabs.map((tab) => [tab.id, tab]));
    const nextTabs = uniqueTabIds.map((tabId) => tabsById.get(tabId)!);

    return this.saveSession({
      workspaceId: input.workspaceId,
      tabs: nextTabs,
      activeTabId: current.activeTabId,
      timestamp: this.now().toISOString()
    });
  }

  setActiveTab(input: SetActiveAppTabInput): AppTabSession {
    const current = this.listTabs(input.workspaceId);

    if (!current.tabs.some((tab) => tab.id === input.tabId)) {
      throw new Error("setActiveTab requires an existing app tab id.");
    }

    return this.saveSession({
      workspaceId: input.workspaceId,
      tabs: current.tabs,
      activeTabId: input.tabId,
      timestamp: this.now().toISOString()
    });
  }

  private saveSession(input: {
    workspaceId: string;
    tabs: AppTab[];
    activeTabId: string | null;
    timestamp: string;
  }): AppTabSession {
    const activeTabId = input.tabs.some((tab) => tab.id === input.activeTabId)
      ? input.activeTabId
      : input.tabs.at(-1)?.id ?? null;

    this.appSettingsRepository.upsert({
      id: this.idFactory("app_setting"),
      workspaceId: input.workspaceId,
      settingKey: APP_TABS_SETTING_KEY,
      valueJson: stringifyAppTabSession({
        tabs: input.tabs,
        activeTabId
      }),
      timestamp: input.timestamp
    });

    return {
      workspaceId: input.workspaceId,
      tabs: input.tabs,
      activeTabId
    };
  }
}

export function moveAppTab(input: {
  tabs: readonly AppTab[];
  tabId: string;
  direction: "left" | "right";
}): AppTab[] {
  const index = input.tabs.findIndex((tab) => tab.id === input.tabId);

  if (index === -1) {
    return [...input.tabs];
  }

  const targetIndex = input.direction === "left" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= input.tabs.length) {
    return [...input.tabs];
  }

  const nextTabs = [...input.tabs];
  const [tab] = nextTabs.splice(index, 1);
  nextTabs.splice(targetIndex, 0, tab!);

  return nextTabs;
}

function resolveActiveTabAfterClose(input: {
  current: AppTabSession;
  removedIndex: number;
  nextTabs: AppTab[];
  closedTabId: string;
}): string | null {
  if (input.nextTabs.length === 0) {
    return null;
  }

  if (input.current.activeTabId !== input.closedTabId) {
    return input.current.activeTabId;
  }

  return input.nextTabs[Math.min(input.removedIndex, input.nextTabs.length - 1)]?.id ?? null;
}

function stringifyAppTabSession(input: {
  tabs: readonly AppTab[];
  activeTabId: string | null;
}): string {
  const payload: StoredAppTabsPayload = {
    version: 1,
    tabs: [...input.tabs],
    activeTabId: input.activeTabId
  };

  return JSON.stringify(payload);
}

function normalizeAppTabSession(input: {
  workspaceId: string;
  setting: AppSettingRecord | null;
  limit: number;
}): AppTabSession {
  if (input.setting === null) {
    return { workspaceId: input.workspaceId, tabs: [], activeTabId: null };
  }

  try {
    const parsed = JSON.parse(input.setting.valueJson) as unknown;

    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.tabs)) {
      return { workspaceId: input.workspaceId, tabs: [], activeTabId: null };
    }

    const tabs = parsed.tabs
      .filter((value): value is AppTab => isAppTab(value, input.workspaceId))
      .slice(-input.limit);
    const activeTabId =
      typeof parsed.activeTabId === "string" &&
      tabs.some((tab) => tab.id === parsed.activeTabId)
        ? parsed.activeTabId
        : tabs.at(-1)?.id ?? null;

    return { workspaceId: input.workspaceId, tabs, activeTabId };
  } catch {
    return { workspaceId: input.workspaceId, tabs: [], activeTabId: null };
  }
}

function isAppTab(value: unknown, workspaceId: string): value is AppTab {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    value.workspaceId === workspaceId &&
    isNavigationTargetType(value.targetType) &&
    (typeof value.targetId === "string" || value.targetId === null) &&
    typeof value.path === "string" &&
    value.path.startsWith("/") &&
    typeof value.label === "string" &&
    value.label.trim().length > 0 &&
    (typeof value.subtitle === "string" || value.subtitle === null) &&
    typeof value.openedAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function normalizeAppTabRouteTarget(target: AppTabRouteTarget): Required<AppTabRouteTarget> {
  return {
    targetType: target.targetType,
    targetId: normalizeNullableString(target.targetId),
    path: normalizePath(target.path),
    label: normalizeLabel(target.label),
    subtitle: normalizeNullableString(target.subtitle)
  };
}

function getAppTabTargetKey(
  target: Pick<AppTab, "targetType" | "targetId" | "path"> | Required<AppTabRouteTarget>
): string {
  return `${target.targetType}:${target.targetId ?? ""}:${target.path}`;
}

function isNavigationTargetType(value: unknown): value is NavigationTargetType {
  return (
    value === "view" ||
    value === "container" ||
    value === "item" ||
    value === "saved_view"
  );
}

function normalizePath(path: string): string {
  const trimmedPath = path.trim();

  return trimmedPath.startsWith("/") ? trimmedPath : "/workspace";
}

function normalizeLabel(label: string): string {
  const trimmedLabel = label.trim();

  return trimmedLabel.length === 0 ? "Untitled tab" : trimmedLabel;
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length === 0 ? null : trimmedValue;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
