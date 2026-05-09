import type {
  ContainerRecord,
  DatabaseConnection,
  ItemRecord,
  SavedViewRecord
} from "@local-work-os/db";
import {
  ContainerRepository,
  ItemRepository,
  SavedViewRepository
} from "@local-work-os/db";
import type { FeatureModuleContract } from "../featureModuleContract";

export type PinnedFavoriteTargetType = "container" | "item" | "saved_view";

export type PinnedFavoriteTarget = {
  targetType: PinnedFavoriteTargetType;
  targetId: string;
  workspaceId: string;
  title: string;
  subtitle: string;
  path: string;
  source: "favorite" | "pinned";
  targetKind: string;
  containerId: string | null;
  containerType: string | null;
  containerTitle: string | null;
  updatedAt: string;
};

export type ListPinnedFavoritesInput = {
  workspaceId: string;
  limit?: number;
};

const DEFAULT_PINNED_FAVORITES_LIMIT = 12;
const MAX_PINNED_FAVORITES_LIMIT = 100;

export class PinnedFavoritesService {
  readonly module = "navigation.pinnedFavorites";

  private readonly connection: DatabaseConnection;

  constructor(input: { connection: DatabaseConnection }) {
    this.connection = input.connection;
  }

  listPinnedFavorites(input: ListPinnedFavoritesInput): PinnedFavoriteTarget[] {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    const limit = normalizeLimit(input.limit);
    const containerRepository = new ContainerRepository(this.connection);
    const containers = containerRepository.listByWorkspace(input.workspaceId);
    const containersById = new Map(containers.map((container) => [container.id, container]));

    const favoriteContainers = containers
      .filter((container) => container.isFavorite)
      .map(toContainerFavorite);
    const pinnedItems = new ItemRepository(this.connection)
      .listByWorkspace(input.workspaceId)
      .filter((item) => item.pinned)
      .map((item) => toItemFavorite(item, containersById.get(item.containerId)));
    const favoriteSavedViews = new SavedViewRepository(this.connection)
      .listByWorkspace(input.workspaceId)
      .filter((savedView) => savedView.isFavorite)
      .map(toSavedViewFavorite);

    return [...favoriteContainers, ...pinnedItems, ...favoriteSavedViews]
      .sort(comparePinnedFavoriteTargets)
      .slice(0, limit);
  }
}

export const pinnedFavoritesModuleContract = {
  module: "navigation.pinnedFavorites",
  purpose:
    "Aggregate favourite containers, pinned items, and favourite saved views for sidebar and dashboard navigation.",
  owns: ["pinned/favourite target projection", "local navigation target shaping"],
  doesNotOwn: ["source object mutation", "dashboard layout", "raw renderer storage"],
  integrationPoints: ["containers", "items", "saved views", "sidebar", "dashboard"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function toContainerFavorite(container: ContainerRecord): PinnedFavoriteTarget {
  return {
    targetType: "container",
    targetId: container.id,
    workspaceId: container.workspaceId,
    title: container.name,
    subtitle: labelContainer(container.type, container.status),
    path: resolveContainerPath(container),
    source: "favorite",
    targetKind: container.type,
    containerId: container.id,
    containerType: container.type,
    containerTitle: container.name,
    updatedAt: container.updatedAt
  };
}

function toItemFavorite(
  item: ItemRecord,
  container: ContainerRecord | undefined
): PinnedFavoriteTarget {
  return {
    targetType: "item",
    targetId: item.id,
    workspaceId: item.workspaceId,
    title: item.title,
    subtitle: [labelKind(item.type), container?.name ?? "Unknown container"]
      .filter(Boolean)
      .join(" · "),
    path: container === undefined ? "/search" : resolveContainerPath(container),
    source: "pinned",
    targetKind: item.type,
    containerId: item.containerId,
    containerType: container?.type ?? null,
    containerTitle: container?.name ?? null,
    updatedAt: item.updatedAt
  };
}

function toSavedViewFavorite(savedView: SavedViewRecord): PinnedFavoriteTarget {
  return {
    targetType: "saved_view",
    targetId: savedView.id,
    workspaceId: savedView.workspaceId,
    title: savedView.name,
    subtitle: labelSavedView(savedView.type),
    path: "/collections",
    source: "favorite",
    targetKind: savedView.type,
    containerId: null,
    containerType: null,
    containerTitle: null,
    updatedAt: savedView.updatedAt
  };
}

function comparePinnedFavoriteTargets(
  left: PinnedFavoriteTarget,
  right: PinnedFavoriteTarget
): number {
  const sourceOrder = sourceRank(left.source) - sourceRank(right.source);

  if (sourceOrder !== 0) {
    return sourceOrder;
  }

  const typeOrder = typeRank(left.targetType) - typeRank(right.targetType);

  if (typeOrder !== 0) {
    return typeOrder;
  }

  return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
}

function sourceRank(source: PinnedFavoriteTarget["source"]): number {
  return source === "pinned" ? 0 : 1;
}

function typeRank(type: PinnedFavoriteTargetType): number {
  switch (type) {
    case "container":
      return 0;
    case "item":
      return 1;
    case "saved_view":
      return 2;
  }
}

function resolveContainerPath(container: ContainerRecord): string {
  if (container.type === "project") {
    return `/projects/${container.id}`;
  }

  if (container.type === "contact") {
    return `/contacts/${container.id}`;
  }

  return "/inbox";
}

function labelContainer(type: string, status: string): string {
  return `${labelKind(type)} · ${status}`;
}

function labelSavedView(type: string): string {
  if (type === "smart_list") {
    return "Smart list";
  }

  return labelKind(type);
}

function labelKind(kind: string): string {
  return kind
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_PINNED_FAVORITES_LIMIT;
  }

  if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < 1) {
    throw new Error("limit must be a positive integer.");
  }

  return Math.min(limit, MAX_PINNED_FAVORITES_LIMIT);
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
