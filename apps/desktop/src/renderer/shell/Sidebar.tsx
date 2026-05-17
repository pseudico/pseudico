import {
  CalendarDays,
  Contact,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LucideIcon,
  CircleHelp,
  Search,
  Settings,
  Star,
  Tags,
  Layers3,
  Trash2,
  Workflow
} from "lucide-react";
import { t } from "@local-work-os/core";
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import type { LocalWorkOsApi, PinnedFavoriteTargetSummary } from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { getActiveNavRouteId, navRoutes, type AppRouteId } from "../routes";
import { useWorkspaceStore } from "../state/workspaceStore";

const routeIcons: Partial<Record<AppRouteId, LucideIcon>> = {
  today: CalendarDays,
  inbox: Inbox,
  projects: FolderKanban,
  projectTags: Tags,
  contacts: Contact,
  contactLabels: Tags,
  collections: Workflow,
  workflows: Workflow,
  help: CircleHelp,
  tagsCategories: Tags,
  templates: Layers3,
  search: Search,
  dashboard: LayoutDashboard,
  settings: Settings,
  trash: Trash2
};

type SidebarProps = {
  apiClient?: LocalWorkOsApi;
  initialPinnedFavorites?: PinnedFavoriteTargetSummary[];
};

export function Sidebar({
  apiClient = desktopApiClient,
  initialPinnedFavorites
}: SidebarProps = {}): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const location = useLocation();
  const activeRouteId = getActiveNavRouteId(location.pathname);
  const [pinnedFavorites, setPinnedFavorites] = useState<
    PinnedFavoriteTargetSummary[]
  >(initialPinnedFavorites ?? []);

  useEffect(() => {
    if (initialPinnedFavorites !== undefined) {
      return;
    }

    if (currentWorkspace === null) {
      setPinnedFavorites([]);
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadPinnedFavorites(): Promise<void> {
      const result = await apiClient.navigation.listPinnedFavorites(
        workspaceId
      );

      if (!active) {
        return;
      }

      setPinnedFavorites(result.ok ? result.data : []);
    }

    void loadPinnedFavorites();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, initialPinnedFavorites]);

  return (
    <aside className="sidebar" aria-label={t("app.shell.primaryNavigation")}>
      <NavLink to="/workspace" className="brand-link" aria-label={t("nav.workspace.title")}>
        <span className="brand-mark" aria-hidden="true">
          L
        </span>
        <span>
          <span className="brand-title">{t("app.brand.title")}</span>
          <span className="brand-subtitle">{t("app.brand.subtitle")}</span>
        </span>
      </NavLink>

      <nav className="nav-list">
        {navRoutes.map((route) => {
          const Icon = routeIcons[route.id] ?? LayoutDashboard;
          const isActive = activeRouteId === route.id;

          return (
            <NavLink
              key={route.id}
              to={route.path}
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "nav-item nav-item-active" : "nav-item"}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{route.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <PinnedFavoritesNav favorites={pinnedFavorites} />
    </aside>
  );
}

function PinnedFavoritesNav({
  favorites
}: {
  favorites: readonly PinnedFavoriteTargetSummary[];
}): React.JSX.Element | null {
  if (favorites.length === 0) {
    return null;
  }

  return (
    <nav className="nav-list pinned-favorites-nav" aria-label={t("sidebar.pinnedFavorites")}>
      <p className="nav-section-label">{t("sidebar.pinnedFavorites")}</p>
      {favorites.map((favorite) => (
        <NavLink
          key={`${favorite.targetType}:${favorite.targetId}`}
          to={favorite.path}
          className="nav-item pinned-favorite-item"
          title={favorite.subtitle}
        >
          <PinnedFavoriteIcon favorite={favorite} />
          <span>{favorite.title}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function PinnedFavoriteIcon({
  favorite
}: {
  favorite: PinnedFavoriteTargetSummary;
}): React.JSX.Element {
  if (favorite.targetType === "container" && favorite.targetKind === "project") {
    return <FolderKanban size={18} aria-hidden="true" />;
  }

  if (favorite.targetType === "container" && favorite.targetKind === "inbox") {
    return <Inbox size={18} aria-hidden="true" />;
  }

  if (favorite.targetType === "saved_view") {
    return <ListChecks size={18} aria-hidden="true" />;
  }

  if (favorite.source === "favorite") {
    return <Star size={18} aria-hidden="true" />;
  }

  return <FileText size={18} aria-hidden="true" />;
}
