import {
  AppSettingsRepository,
  type AppSettingRecord
} from "@local-work-os/db";
import { createLocalId } from "@local-work-os/core";

export const RECENT_NAVIGATION_TARGETS_SETTING_KEY =
  "navigation.recentTargets.v1";
export const DEFAULT_RECENT_NAVIGATION_LIMIT = 12;

export type NavigationTargetType =
  | "view"
  | "container"
  | "item"
  | "saved_view";

export type NavigationRecentTarget = {
  targetType: NavigationTargetType;
  targetId: string | null;
  workspaceId: string;
  path: string;
  label: string;
  subtitle: string | null;
  viewedAt: string;
};

export type RecordNavigationTargetInput = {
  workspaceId: string;
  target: {
    targetType: NavigationTargetType;
    targetId?: string | null;
    path: string;
    label: string;
    subtitle?: string | null;
  };
};

type StoredRecentTargetsPayload = {
  version: 1;
  entries: NavigationRecentTarget[];
};

export type NavigationHistoryServiceOptions = {
  appSettingsRepository: Pick<AppSettingsRepository, "findByKey" | "upsert">;
  idFactory?: (prefix: string) => string;
  now?: () => Date;
  limit?: number;
};

export class NavigationHistoryService {
  private readonly appSettingsRepository: Pick<
    AppSettingsRepository,
    "findByKey" | "upsert"
  >;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: () => Date;
  private readonly limit: number;

  constructor(options: NavigationHistoryServiceOptions) {
    this.appSettingsRepository = options.appSettingsRepository;
    this.idFactory = options.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = options.now ?? (() => new Date());
    this.limit = options.limit ?? DEFAULT_RECENT_NAVIGATION_LIMIT;
  }

  listRecentTargets(workspaceId: string): NavigationRecentTarget[] {
    const setting = this.appSettingsRepository.findByKey({
      workspaceId,
      settingKey: RECENT_NAVIGATION_TARGETS_SETTING_KEY
    });

    return normalizeRecentTargets(setting).slice(0, this.limit);
  }

  recordTarget(input: RecordNavigationTargetInput): NavigationRecentTarget[] {
    const timestamp = this.now().toISOString();
    const nextEntry: NavigationRecentTarget = {
      targetType: input.target.targetType,
      targetId: normalizeNullableString(input.target.targetId),
      workspaceId: input.workspaceId,
      path: normalizePath(input.target.path),
      label: normalizeLabel(input.target.label),
      subtitle: normalizeNullableString(input.target.subtitle),
      viewedAt: timestamp
    };
    const nextEntries = mergeRecentTarget({
      entries: this.listRecentTargets(input.workspaceId),
      nextEntry,
      limit: this.limit
    });

    this.appSettingsRepository.upsert({
      id: this.idFactory("app_setting"),
      workspaceId: input.workspaceId,
      settingKey: RECENT_NAVIGATION_TARGETS_SETTING_KEY,
      valueJson: stringifyRecentTargets(nextEntries),
      timestamp
    });

    return nextEntries;
  }
}

export function mergeRecentTarget(input: {
  entries: readonly NavigationRecentTarget[];
  nextEntry: NavigationRecentTarget;
  limit?: number;
}): NavigationRecentTarget[] {
  const limit = Math.max(1, input.limit ?? DEFAULT_RECENT_NAVIGATION_LIMIT);
  const nextKey = getRecentTargetKey(input.nextEntry);

  return [
    input.nextEntry,
    ...input.entries.filter((entry) => getRecentTargetKey(entry) !== nextKey)
  ].slice(0, limit);
}

export function resolveNavigationTargetPath(
  target: Pick<NavigationRecentTarget, "targetType" | "targetId" | "path">
): string {
  if (target.path.startsWith("/")) {
    return target.path;
  }

  if (target.targetType === "container" && target.targetId !== null) {
    return `/projects/${encodeURIComponent(target.targetId)}`;
  }

  return "/workspace";
}

function stringifyRecentTargets(
  entries: readonly NavigationRecentTarget[]
): string {
  const payload: StoredRecentTargetsPayload = {
    version: 1,
    entries: [...entries]
  };

  return JSON.stringify(payload);
}

function normalizeRecentTargets(
  setting: AppSettingRecord | null
): NavigationRecentTarget[] {
  if (setting === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(setting.valueJson) as unknown;

    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.entries)) {
      return [];
    }

    return parsed.entries.filter(isNavigationRecentTarget);
  } catch {
    return [];
  }
}

function isNavigationRecentTarget(value: unknown): value is NavigationRecentTarget {
  return (
    isRecord(value) &&
    isNavigationTargetType(value.targetType) &&
    (typeof value.targetId === "string" || value.targetId === null) &&
    typeof value.workspaceId === "string" &&
    typeof value.path === "string" &&
    value.path.startsWith("/") &&
    typeof value.label === "string" &&
    value.label.trim().length > 0 &&
    (typeof value.subtitle === "string" || value.subtitle === null) &&
    typeof value.viewedAt === "string"
  );
}

function isNavigationTargetType(value: unknown): value is NavigationTargetType {
  return (
    value === "view" ||
    value === "container" ||
    value === "item" ||
    value === "saved_view"
  );
}

function getRecentTargetKey(entry: NavigationRecentTarget): string {
  return `${entry.targetType}:${entry.targetId ?? ""}:${entry.path}`;
}

function normalizePath(path: string): string {
  const trimmedPath = path.trim();

  return trimmedPath.startsWith("/") ? trimmedPath : "/workspace";
}

function normalizeLabel(label: string): string {
  const trimmedLabel = label.trim();

  return trimmedLabel.length === 0 ? "Untitled target" : trimmedLabel;
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
