import {
  ArrowRight,
  FileText,
  FolderKanban,
  Inbox,
  ListChecks,
  Star
} from "lucide-react";
import { DashboardWidget } from "../DashboardWidget";

export type DashboardProjectWidgetItem = {
  projectId: string;
  name: string;
  status: string;
  color: string | null;
};

export type DashboardFavoriteWidgetItem = {
  targetType: "container" | "item" | "saved_view";
  targetId: string;
  workspaceId?: string;
  title: string;
  subtitle: string;
  path: string;
  source: "favorite" | "pinned";
  targetKind: string;
  containerId: string | null;
  containerType: string | null;
  containerTitle: string | null;
};

export type FavoriteProjectsWidgetProps = {
  favorites?: readonly DashboardFavoriteWidgetItem[];
  projects?: readonly DashboardProjectWidgetItem[];
  loading?: boolean;
  error?: string | null;
  onOpenFavorite?: (favorite: DashboardFavoriteWidgetItem) => void;
  onOpenProject?: (project: DashboardProjectWidgetItem) => void;
};

export function FavoriteProjectsWidget({
  favorites,
  projects = [],
  loading = false,
  error = null,
  onOpenFavorite,
  onOpenProject
}: FavoriteProjectsWidgetProps): React.JSX.Element {
  const entries = favorites ?? projects.map(projectToFavorite);

  return (
    <DashboardWidget
      count={entries.length}
      description="Pinned items, favorite containers, and favorite saved views from the current workspace."
      emptyDescription="Pinned items and favorite workspace objects will appear here."
      emptyTitle="No pinned or favorite items"
      error={error}
      kind="favorites"
      loading={loading}
      title="Pinned & Favorites"
    >
      {loading || error !== null || entries.length === 0 ? null : (
        <ol className="dashboard-widget-list">
          {entries.map((entry) => (
            <li key={`${entry.targetType}:${entry.targetId}`}>
              <button
                type="button"
                className="dashboard-widget-row"
                onClick={() => {
                  onOpenFavorite?.(entry);
                  const project = projects.find(
                    (candidate) => candidate.projectId === entry.targetId
                  );
                  if (project !== undefined) {
                    onOpenProject?.(project);
                  }
                }}
              >
                <span className="dashboard-widget-row-main project-widget-main">
                  <FavoriteIcon favorite={entry} />
                  <span>
                    <strong>{entry.title}</strong>
                    <span>
                      <Star size={14} aria-hidden="true" />
                      {entry.subtitle}
                    </span>
                  </span>
                </span>
                <span className="dashboard-widget-row-meta">
                  <small>{entry.source === "pinned" ? "Pinned" : "Favorite"}</small>
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </DashboardWidget>
  );
}

function FavoriteIcon({
  favorite
}: {
  favorite: DashboardFavoriteWidgetItem;
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

  return <FileText size={18} aria-hidden="true" />;
}

function projectToFavorite(
  project: DashboardProjectWidgetItem
): DashboardFavoriteWidgetItem {
  return {
    targetType: "container",
    targetId: project.projectId,
    title: project.name,
    subtitle: project.status,
    path: `/projects/${project.projectId}`,
    source: "favorite",
    targetKind: "project",
    containerId: project.projectId,
    containerType: "project",
    containerTitle: project.name
  };
}
