import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type Clock
} from "@local-work-os/core";
import {
  ActivityLogService,
  AppSettingsRepository,
  ContainerGroupingRepository,
  TransactionService,
  type AppSettingRecord,
  type ContainerGroupingContainerType,
  type ContainerGroupingTargetRecord,
  type DatabaseConnection
} from "@local-work-os/db";
import type { FeatureModuleContract } from "../featureModuleContract";

export const CONTAINER_GROUPING_SETTING_KEY_PREFIX =
  "container.libraryGrouping.v1";

export const PROJECT_LIBRARY_GROUPING_MODES = [
  "none",
  "category",
  "tag",
  "status",
  "favorite",
  "stale"
] as const;
export const CONTACT_LIBRARY_GROUPING_MODES = [
  "none",
  "company",
  "label",
  "tag",
  "category"
] as const;

export type ProjectLibraryGroupingMode =
  (typeof PROJECT_LIBRARY_GROUPING_MODES)[number];
export type ContactLibraryGroupingMode =
  (typeof CONTACT_LIBRARY_GROUPING_MODES)[number];
export type ContainerLibraryGroupingMode =
  | ProjectLibraryGroupingMode
  | ContactLibraryGroupingMode;

export type ContainerGroupingScope = ContainerGroupingContainerType;

export type ContainerGroupingPreferences = {
  workspaceId: string;
  containerType: ContainerGroupingScope;
  mode: ContainerLibraryGroupingMode;
  collapsedGroupKeys: string[];
  updatedAt: string | null;
};

export type UpdateContainerGroupingPreferencesInput = {
  workspaceId: string;
  containerType: ContainerGroupingScope;
  mode?: ContainerLibraryGroupingMode;
  collapsedGroupKeys?: readonly string[];
};

export type GetContainerGroupingInput = {
  workspaceId: string;
  containerType: ContainerGroupingScope;
  mode?: ContainerLibraryGroupingMode;
  includeArchived?: boolean;
  staleAfterDays?: number;
};

export type ContainerGroupingFacet = {
  key: string;
  label: string;
  count: number;
};

export type ContainerGroupingTarget = {
  id: string;
  workspaceId: string;
  type: ContainerGroupingScope;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  categoryId: string | null;
  categoryName: string | null;
  color: string | null;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
  tags: Array<{ id: string; name: string; slug: string }>;
};

export type ContainerGroupingGroup = {
  key: string;
  label: string;
  count: number;
  collapsed: boolean;
  targets: ContainerGroupingTarget[];
};

export type ContainerGroupingViewModel = {
  workspaceId: string;
  containerType: ContainerGroupingScope;
  mode: ContainerLibraryGroupingMode;
  generatedAt: string;
  staleAfterDays: number;
  totalCount: number;
  facets: ContainerGroupingFacet[];
  preferences: ContainerGroupingPreferences;
  groups: ContainerGroupingGroup[];
};

type StoredContainerGroupingPayload = {
  version: 1;
  containerType: ContainerGroupingScope;
  mode: ContainerLibraryGroupingMode;
  collapsedGroupKeys: string[];
};

type MutableGroup = {
  key: string;
  label: string;
  targetIds: Set<string>;
  targets: ContainerGroupingTarget[];
};

const DEFAULT_STALE_AFTER_DAYS = 30;
const COMPANY_LABEL_KEYS = new Set(["company", "organisation", "organization"]);

export type ContainerGroupingServiceOptions = {
  connection: DatabaseConnection;
  idFactory?: (prefix: string) => string;
  now?: Clock;
};

export class ContainerGroupingService {
  readonly module = "containers.grouping";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: (prefix: string) => string;
  private readonly now: Clock;

  constructor(options: ContainerGroupingServiceOptions) {
    this.connection = options.connection;
    this.idFactory = options.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = options.now ?? (() => new Date());
  }

  getPreferences(input: {
    workspaceId: string;
    containerType: ContainerGroupingScope;
  }): ContainerGroupingPreferences {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateContainerType(input.containerType);

    const setting = new AppSettingsRepository(this.connection).findByKey({
      workspaceId: input.workspaceId,
      settingKey: createContainerGroupingSettingKey(input.containerType)
    });

    return toContainerGroupingPreferences({
      workspaceId: input.workspaceId,
      containerType: input.containerType,
      setting
    });
  }

  async updatePreferences(
    input: UpdateContainerGroupingPreferencesInput
  ): Promise<ContainerGroupingPreferences> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateContainerType(input.containerType);

    if (input.mode === undefined && input.collapsedGroupKeys === undefined) {
      throw new Error("At least one grouping preference must be provided.");
    }

    return await new TransactionService({ connection: this.connection }).runInTransaction(
      () => {
        const before = this.getPreferences(input);
        const timestamp = createIsoTimestamp(this.now());
        const next: ContainerGroupingPreferences = {
          workspaceId: input.workspaceId,
          containerType: input.containerType,
          mode:
            input.mode === undefined
              ? before.mode
              : validateGroupingMode(input.containerType, input.mode),
          collapsedGroupKeys:
            input.collapsedGroupKeys === undefined
              ? before.collapsedGroupKeys
              : normalizeCollapsedGroupKeys(input.collapsedGroupKeys),
          updatedAt: timestamp
        };

        const saved = new AppSettingsRepository(this.connection).upsert({
          id: this.idFactory("app_setting"),
          workspaceId: input.workspaceId,
          settingKey: createContainerGroupingSettingKey(input.containerType),
          valueJson: stringifyContainerGroupingPreferences(next),
          timestamp
        });
        const after = toContainerGroupingPreferences({
          workspaceId: input.workspaceId,
          containerType: input.containerType,
          setting: saved
        });

        new ActivityLogService({
          connection: this.connection,
          idFactory: this.idFactory
        }).logEvent({
          workspaceId: input.workspaceId,
          actorType: "local_user",
          action: ActivityAction.workspacePreferencesUpdated,
          targetType: "workspace",
          targetId: input.workspaceId,
          summary: `Updated ${input.containerType} library grouping preferences.`,
          beforeJson: JSON.stringify(stripPreferenceMetadata(before)),
          afterJson: JSON.stringify(stripPreferenceMetadata(after)),
          timestamp
        });

        return after;
      }
    );
  }

  getViewModel(input: GetContainerGroupingInput): ContainerGroupingViewModel {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateContainerType(input.containerType);
    const preferences = this.getPreferences(input);
    const mode =
      input.mode === undefined
        ? preferences.mode
        : validateGroupingMode(input.containerType, input.mode);
    const staleAfterDays = normalizeStaleAfterDays(input.staleAfterDays);
    const generatedAt = createIsoTimestamp(this.now());
    const targets = new ContainerGroupingRepository(this.connection).listTargets({
      workspaceId: input.workspaceId,
      containerType: input.containerType,
      ...(input.includeArchived === undefined
        ? {}
        : { includeArchived: input.includeArchived })
    });
    const groups = buildGroups({
      containerType: input.containerType,
      mode,
      targets,
      generatedAt,
      staleAfterDays,
      collapsedGroupKeys: new Set(preferences.collapsedGroupKeys)
    });

    return {
      workspaceId: input.workspaceId,
      containerType: input.containerType,
      mode,
      generatedAt,
      staleAfterDays,
      totalCount: targets.length,
      facets: groups.map((group) => ({
        key: group.key,
        label: group.label,
        count: group.count
      })),
      preferences: {
        ...preferences,
        mode
      },
      groups
    };
  }
}

export const containerGroupingModuleContract = {
  module: "containers.grouping",
  purpose: "Group project/contact library containers by local facets with persisted UI state.",
  owns: [
    "project library grouping view models",
    "contact library grouping view models",
    "workspace-level grouping and collapsed group preferences"
  ],
  doesNotOwn: ["cloud taxonomy", "team-shared grouping settings", "data mutation outside app settings"],
  integrationPoints: ["containers", "tags", "categories", "contact fields", "activity log"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

export function createContainerGroupingSettingKey(
  containerType: ContainerGroupingScope
): string {
  validateContainerType(containerType);

  return `${CONTAINER_GROUPING_SETTING_KEY_PREFIX}:${containerType}`;
}

export function normalizeContainerGroupingPreferencesPayload(
  input: {
    workspaceId: string;
    containerType: ContainerGroupingScope;
    value: unknown;
    updatedAt?: string | null;
  }
): ContainerGroupingPreferences {
  validateContainerType(input.containerType);

  if (!isRecord(input.value)) {
    return defaultPreferences(input.workspaceId, input.containerType, input.updatedAt ?? null);
  }

  return {
    workspaceId: input.workspaceId,
    containerType: input.containerType,
    mode: isGroupingModeForType(input.containerType, input.value.mode)
      ? input.value.mode
      : defaultGroupingMode(input.containerType),
    collapsedGroupKeys: Array.isArray(input.value.collapsedGroupKeys)
      ? normalizeCollapsedGroupKeys(input.value.collapsedGroupKeys)
      : [],
    updatedAt: input.updatedAt ?? null
  };
}

function buildGroups(input: {
  containerType: ContainerGroupingScope;
  mode: ContainerLibraryGroupingMode;
  targets: ContainerGroupingTargetRecord[];
  generatedAt: string;
  staleAfterDays: number;
  collapsedGroupKeys: Set<string>;
}): ContainerGroupingGroup[] {
  const groups = new Map<string, MutableGroup>();

  for (const target of input.targets) {
    const memberships = getGroupMemberships(target, input);

    for (const membership of memberships) {
      const current = groups.get(membership.key) ?? {
        key: membership.key,
        label: membership.label,
        targetIds: new Set<string>(),
        targets: []
      };

      if (!current.targetIds.has(target.id)) {
        current.targetIds.add(target.id);
        current.targets.push(toGroupingTarget(target));
      }

      groups.set(membership.key, current);
    }
  }

  return [...groups.values()]
    .sort(compareGroups(input.containerType, input.mode))
    .map((group) => ({
      key: group.key,
      label: group.label,
      count: group.targets.length,
      collapsed: input.collapsedGroupKeys.has(group.key),
      targets: group.targets
    }));
}

function getGroupMemberships(
  target: ContainerGroupingTargetRecord,
  input: {
    containerType: ContainerGroupingScope;
    mode: ContainerLibraryGroupingMode;
    generatedAt: string;
    staleAfterDays: number;
  }
): Array<{ key: string; label: string }> {
  if (input.mode === "none") {
    return [{ key: "all", label: input.containerType === "project" ? "All projects" : "All contacts" }];
  }

  if (input.containerType === "project") {
    switch (input.mode) {
      case "status":
        return [{ key: `status:${target.status}`, label: labelStatus(target.status) }];
      case "category":
        return [
          target.category === null
            ? { key: "category:uncategorized", label: "Uncategorized" }
            : { key: `category:${target.category.id}`, label: target.category.name }
        ];
      case "tag":
        return target.tags.length === 0
          ? [{ key: "tag:untagged", label: "Untagged" }]
          : target.tags.map((tag) => ({ key: `tag:${tag.slug}`, label: `#${tag.name}` }));
      case "favorite":
        return target.isFavorite
          ? [{ key: "favorite:pinned", label: "Favourites" }]
          : [{ key: "favorite:not-pinned", label: "Not pinned" }];
      case "stale":
        return isStale(target.updatedAt, input.generatedAt, input.staleAfterDays)
          ? [{ key: "stale:stale", label: `Stale (${input.staleAfterDays}+ days)` }]
          : [{ key: "stale:fresh", label: "Recently updated" }];
    }
  }

  switch (input.mode) {
    case "company": {
      const company = firstMatchingContactField(target, COMPANY_LABEL_KEYS);
      return [
        company === null
          ? { key: "company:none", label: "No company" }
          : { key: `company:${company.valueKey}`, label: company.value }
      ];
    }
    case "label":
      return target.contactFields.length === 0
        ? [{ key: "label:none", label: "No labels" }]
        : target.contactFields.map((field) => ({
            key: `label:${field.labelKey}:${field.valueKey}`,
            label: `${field.label}: ${field.value}`
          }));
    case "tag":
      return target.tags.length === 0
        ? [{ key: "tag:untagged", label: "Untagged" }]
        : target.tags.map((tag) => ({ key: `tag:${tag.slug}`, label: `#${tag.name}` }));
    case "category":
      return [
        target.category === null
          ? { key: "category:uncategorized", label: "Uncategorized" }
          : { key: `category:${target.category.id}`, label: target.category.name }
      ];
  }

  return [{ key: "all", label: "All" }];
}

function toGroupingTarget(target: ContainerGroupingTargetRecord): ContainerGroupingTarget {
  return {
    id: target.id,
    workspaceId: target.workspaceId,
    type: target.type as ContainerGroupingScope,
    name: target.name,
    slug: target.slug,
    description: target.description,
    status: target.status,
    categoryId: target.categoryId,
    categoryName: target.category?.name ?? null,
    color: target.color,
    isFavorite: target.isFavorite,
    sortOrder: target.sortOrder,
    createdAt: target.createdAt,
    updatedAt: target.updatedAt,
    archivedAt: target.archivedAt,
    deletedAt: target.deletedAt,
    tags: target.tags.map((tag) => ({ id: tag.id, name: tag.name, slug: tag.slug }))
  };
}

function compareGroups(
  containerType: ContainerGroupingScope,
  mode: ContainerLibraryGroupingMode
): (left: MutableGroup, right: MutableGroup) => number {
  return (left, right) => {
    const rankDifference =
      groupRank(containerType, mode, left.key) - groupRank(containerType, mode, right.key);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    return left.label.localeCompare(right.label, undefined, { sensitivity: "base" });
  };
}

function groupRank(
  containerType: ContainerGroupingScope,
  mode: ContainerLibraryGroupingMode,
  key: string
): number {
  if (mode === "none") {
    return 0;
  }

  if (containerType === "project" && mode === "status") {
    return ["status:active", "status:waiting", "status:completed", "status:archived"].indexOf(key);
  }

  if (mode === "favorite") {
    return key === "favorite:pinned" ? 0 : 1;
  }

  if (mode === "stale") {
    return key === "stale:stale" ? 0 : 1;
  }

  if (key.endsWith(":uncategorized") || key.endsWith(":untagged") || key.endsWith(":none")) {
    return 10_000;
  }

  return 100;
}

function toContainerGroupingPreferences(input: {
  workspaceId: string;
  containerType: ContainerGroupingScope;
  setting: AppSettingRecord | null;
}): ContainerGroupingPreferences {
  if (input.setting === null) {
    return defaultPreferences(input.workspaceId, input.containerType, null);
  }

  try {
    return normalizeContainerGroupingPreferencesPayload({
      workspaceId: input.workspaceId,
      containerType: input.containerType,
      value: JSON.parse(input.setting.valueJson) as unknown,
      updatedAt: input.setting.updatedAt
    });
  } catch {
    return defaultPreferences(
      input.workspaceId,
      input.containerType,
      input.setting.updatedAt
    );
  }
}

function stringifyContainerGroupingPreferences(
  preferences: ContainerGroupingPreferences
): string {
  const payload: StoredContainerGroupingPayload = {
    version: 1,
    containerType: preferences.containerType,
    mode: preferences.mode,
    collapsedGroupKeys: preferences.collapsedGroupKeys
  };

  return JSON.stringify(payload);
}

function defaultPreferences(
  workspaceId: string,
  containerType: ContainerGroupingScope,
  updatedAt: string | null
): ContainerGroupingPreferences {
  return {
    workspaceId,
    containerType,
    mode: defaultGroupingMode(containerType),
    collapsedGroupKeys: [],
    updatedAt
  };
}

function defaultGroupingMode(
  containerType: ContainerGroupingScope
): ContainerLibraryGroupingMode {
  return containerType === "project" ? "status" : "company";
}

function validateGroupingMode(
  containerType: ContainerGroupingScope,
  mode: ContainerLibraryGroupingMode
): ContainerLibraryGroupingMode {
  if (!isGroupingModeForType(containerType, mode)) {
    throw new Error(
      containerType === "project"
        ? "Project grouping must be none, category, tag, status, favorite, or stale."
        : "Contact grouping must be none, company, label, tag, or category."
    );
  }

  return mode;
}

function isGroupingModeForType(
  containerType: ContainerGroupingScope,
  value: unknown
): value is ContainerLibraryGroupingMode {
  return containerType === "project"
    ? PROJECT_LIBRARY_GROUPING_MODES.includes(value as ProjectLibraryGroupingMode)
    : CONTACT_LIBRARY_GROUPING_MODES.includes(value as ContactLibraryGroupingMode);
}

function validateContainerType(value: unknown): asserts value is ContainerGroupingScope {
  if (value !== "project" && value !== "contact") {
    throw new Error("containerType must be project or contact.");
  }
}

function normalizeCollapsedGroupKeys(values: readonly unknown[]): string[] {
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    )
  ].sort();
}

function normalizeStaleAfterDays(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_STALE_AFTER_DAYS;
  }

  if (!Number.isInteger(value) || value < 1 || value > 3660) {
    throw new Error("staleAfterDays must be an integer from 1 to 3660.");
  }

  return value;
}

function firstMatchingContactField(
  target: ContainerGroupingTargetRecord,
  labelKeys: Set<string>
) {
  return (
    target.contactFields.find((field) => labelKeys.has(field.labelKey)) ?? null
  );
}

function isStale(updatedAt: string, generatedAt: string, staleAfterDays: number): boolean {
  const updatedTime = Date.parse(updatedAt);
  const generatedTime = Date.parse(generatedAt);

  if (!Number.isFinite(updatedTime) || !Number.isFinite(generatedTime)) {
    return false;
  }

  return generatedTime - updatedTime >= staleAfterDays * 24 * 60 * 60 * 1000;
}

function labelStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function stripPreferenceMetadata(
  preferences: ContainerGroupingPreferences
): Omit<ContainerGroupingPreferences, "workspaceId" | "updatedAt"> {
  return {
    containerType: preferences.containerType,
    mode: preferences.mode,
    collapsedGroupKeys: preferences.collapsedGroupKeys
  };
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
