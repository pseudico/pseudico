import type { SavedViewEvaluationTargetRecord } from "@local-work-os/db";
import type {
  SavedViewGroupBy,
  SavedViewQuery,
  SavedViewQueryCondition,
  SavedViewSortField
} from "./SavedViewQuery";

export type SavedViewResultRef = {
  targetType: "container" | "item";
  targetId: string;
  kind: string;
  title: string;
  containerId: string;
  containerType: string;
  containerTitle: string;
  categoryId: string | null;
  categoryName: string | null;
  taskStatus: string | null;
  dueAt: string | null;
  tags: string[];
  destinationPath: string;
};

export type SavedViewResultGroup = {
  key: string;
  label: string;
  results: SavedViewResultRef[];
};

export type SavedViewEvaluationResult = {
  total: number;
  results: SavedViewResultRef[];
  groups: SavedViewResultGroup[];
};

export class QueryEvaluator {
  evaluate(
    query: SavedViewQuery,
    targets: SavedViewEvaluationTargetRecord[]
  ): SavedViewEvaluationResult {
    const selectedTargets = new Set(query.targets ?? ["container", "item"]);
    const filtered = targets
      .filter((target) => selectedTargets.has(target.targetType))
      .filter((target) => query.includeArchived === true || target.archivedAt === null)
      .filter((target) => query.includeDeleted === true || target.deletedAt === null)
      .filter((target) => this.matchesConditions(query, target));
    const sorted = this.sortTargets(filtered, query);
    const limited =
      query.limit === undefined ? sorted : sorted.slice(0, query.limit);
    const results = limited.map(toResultRef);

    return {
      total: results.length,
      results,
      groups: groupResults(query.groupBy ?? "none", results)
    };
  }

  private matchesConditions(
    query: SavedViewQuery,
    target: SavedViewEvaluationTargetRecord
  ): boolean {
    if (query.conditions.length === 0) {
      return true;
    }

    const checks = query.conditions.map((condition) =>
      this.matchesCondition(condition, target)
    );

    return query.match === "all"
      ? checks.every((matched) => matched)
      : checks.some((matched) => matched);
  }

  private matchesCondition(
    condition: SavedViewQueryCondition,
    target: SavedViewEvaluationTargetRecord
  ): boolean {
    if (condition.field === "itemType") {
      return target.targetType === "item" && matchesSet(target.kind, condition.value);
    }

    if (condition.field === "containerType") {
      return matchesSet(target.containerType, condition.value);
    }

    if (condition.field === "tag") {
      const expected = normalizeValues(condition.value);

      return condition.operator === "has"
        ? expected.every((tag) => target.tagSlugs.includes(tag))
        : expected.some((tag) => target.tagSlugs.includes(tag));
    }

    if (condition.field === "category") {
      if (condition.operator === "isEmpty") {
        return target.categoryId === null;
      }

      if (condition.operator === "isNotEmpty") {
        return target.categoryId !== null;
      }

      return normalizeValues(condition.value).some((value) =>
        [target.categoryId, target.categorySlug, target.categoryName]
          .filter((entry): entry is string => entry !== null)
          .map((entry) => entry.toLowerCase())
          .includes(value.toLowerCase())
      );
    }

    if (condition.field === "taskStatus") {
      return (
        target.targetType === "item" &&
        target.kind === "task" &&
        target.taskStatus !== null &&
        matchesSet(target.taskStatus, condition.value)
      );
    }

    if (condition.field === "dueDate") {
      return matchesDueDateCondition(target.dueAt, condition);
    }

    return includesText(target, condition.value);
  }

  private sortTargets(
    targets: SavedViewEvaluationTargetRecord[],
    query: SavedViewQuery
  ): SavedViewEvaluationTargetRecord[] {
    const sort = query.sort ?? [
      { field: "updatedAt" as const, direction: "desc" as const },
      { field: "title" as const, direction: "asc" as const }
    ];

    return [...targets].sort((left, right) => {
      for (const sortSpec of sort) {
        const comparison = compareNullableStrings(
          getSortValue(left, sortSpec.field),
          getSortValue(right, sortSpec.field)
        );

        if (comparison !== 0) {
          return sortSpec.direction === "desc" ? -comparison : comparison;
        }
      }

      return left.targetId.localeCompare(right.targetId);
    });
  }
}

function matchesSet(actual: string, expected: string | string[]): boolean {
  return normalizeValues(expected).includes(actual);
}

function matchesDueDateCondition(
  dueAt: string | null,
  condition: Extract<SavedViewQueryCondition, { field: "dueDate" }>
): boolean {
  if (condition.operator === "isEmpty") {
    return dueAt === null;
  }

  if (condition.operator === "isNotEmpty") {
    return dueAt !== null;
  }

  if (dueAt === null) {
    return false;
  }

  if (condition.operator === "between") {
    if (typeof condition.value !== "object" || condition.value === null) {
      return false;
    }

    return dueAt >= condition.value.from && dueAt <= condition.value.to;
  }

  if (typeof condition.value !== "string") {
    return false;
  }

  if (condition.operator === "before") {
    return dueAt < condition.value;
  }

  if (condition.operator === "after") {
    return dueAt > condition.value;
  }

  return dueAt.slice(0, 10) === condition.value.slice(0, 10);
}

function includesText(
  target: SavedViewEvaluationTargetRecord,
  needle: string
): boolean {
  const normalizedNeedle = needle.trim().toLowerCase();
  const haystack = [
    target.title,
    target.body ?? "",
    target.containerTitle,
    target.categoryName ?? "",
    ...target.tagSlugs
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedNeedle);
}

function normalizeValues(value: string | string[] | undefined): string[] {
  if (value === undefined) {
    return [];
  }

  return (Array.isArray(value) ? value : [value])
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getSortValue(
  target: SavedViewEvaluationTargetRecord,
  field: SavedViewSortField
): string | null {
  if (field === "title") {
    return target.title;
  }

  if (field === "type") {
    return target.kind;
  }

  if (field === "container") {
    return target.containerTitle;
  }

  if (field === "category") {
    return target.categoryName;
  }

  if (field === "status") {
    return target.taskStatus ?? target.status;
  }

  if (field === "dueAt") {
    return target.dueAt;
  }

  if (field === "createdAt") {
    return target.createdAt;
  }

  return target.updatedAt;
}

function compareNullableStrings(left: string | null, right: string | null): number {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return left.localeCompare(right);
}

function toResultRef(target: SavedViewEvaluationTargetRecord): SavedViewResultRef {
  return {
    targetType: target.targetType,
    targetId: target.targetId,
    kind: target.kind,
    title: target.title,
    containerId: target.containerId,
    containerType: target.containerType,
    containerTitle: target.containerTitle,
    categoryId: target.categoryId,
    categoryName: target.categoryName,
    taskStatus: target.taskStatus,
    dueAt: target.dueAt,
    tags: target.tagSlugs,
    destinationPath:
      target.targetType === "container"
        ? createContainerPath(target.containerType, target.targetId)
        : `${createContainerPath(target.containerType, target.containerId)}/items/${target.targetId}`
  };
}

function createContainerPath(containerType: string, containerId: string): string {
  if (containerType === "inbox") {
    return "/inbox";
  }

  return `/${containerType}s/${containerId}`;
}

function groupResults(
  groupBy: SavedViewGroupBy,
  results: SavedViewResultRef[]
): SavedViewResultGroup[] {
  if (groupBy === "none") {
    return [{ key: "all", label: "All", results }];
  }

  const groups = new Map<string, SavedViewResultGroup>();

  for (const result of results) {
    const group = getGroup(result, groupBy);
    const existing = groups.get(group.key);

    if (existing === undefined) {
      groups.set(group.key, { ...group, results: [result] });
    } else {
      existing.results.push(result);
    }
  }

  return [...groups.values()];
}

function getGroup(
  result: SavedViewResultRef,
  groupBy: Exclude<SavedViewGroupBy, "none">
): Pick<SavedViewResultGroup, "key" | "label"> {
  if (groupBy === "targetType") {
    return { key: result.targetType, label: result.targetType };
  }

  if (groupBy === "type") {
    return { key: result.kind, label: result.kind };
  }

  if (groupBy === "container") {
    return { key: result.containerId, label: result.containerTitle };
  }

  if (groupBy === "category") {
    return {
      key: result.categoryId ?? "uncategorized",
      label: result.categoryName ?? "Uncategorized"
    };
  }

  if (groupBy === "status") {
    return {
      key: result.taskStatus ?? "none",
      label: result.taskStatus ?? "No task status"
    };
  }

  return {
    key: result.dueAt?.slice(0, 10) ?? "undated",
    label: result.dueAt?.slice(0, 10) ?? "Undated"
  };
}
