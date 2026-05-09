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

export const appTabsModuleContract: FeatureModuleContract = {
  module: "app-tabs",
  purpose: "Persist workspace-scoped top-level app tabs for fast switching among open views.",
  owns: ["open app tab session state", "active app tab selection", "tab ordering"],
  doesNotOwn: ["content tabs inside containers", "browser tabs", "hosted sync"],
  integrationPoints: ["app shell", "app settings", "navigation history"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

export {
  APP_TABS_SETTING_KEY,
  DEFAULT_APP_TAB_LIMIT,
  AppTabStore,
  moveAppTab
} from "./AppTabStore";
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
  AppTab,
  AppTabRouteTarget,
  AppTabSession,
  CloseAppTabInput,
  OpenAppTabInput,
  ReorderAppTabsInput,
  SetActiveAppTabInput
} from "./AppTabStore";
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
