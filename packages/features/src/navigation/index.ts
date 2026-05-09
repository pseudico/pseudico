import type { FeatureModuleContract } from "../featureModuleContract";

export const navigationHistoryModuleContract: FeatureModuleContract = {
  module: "navigation-history",
  purpose:
    "Track local route history and workspace-scoped recent navigation targets.",
  owns: ["route history coordination", "recent navigation target persistence"],
  doesNotOwn: ["browser history internals", "hosted sync", "raw renderer storage"],
  integrationPoints: ["app shell", "app settings", "projects", "contacts", "saved views"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

export {
  DEFAULT_RECENT_NAVIGATION_LIMIT,
  RECENT_NAVIGATION_TARGETS_SETTING_KEY,
  NavigationHistoryService,
  mergeRecentTarget,
  resolveNavigationTargetPath
} from "./NavigationHistoryService";
export {
  PinnedFavoritesService,
  pinnedFavoritesModuleContract
} from "./PinnedFavoritesService";
export type {
  NavigationRecentTarget,
  NavigationTargetType,
  RecordNavigationTargetInput
} from "./NavigationHistoryService";
export type {
  ListPinnedFavoritesInput,
  PinnedFavoriteTarget,
  PinnedFavoriteTargetType
} from "./PinnedFavoritesService";
