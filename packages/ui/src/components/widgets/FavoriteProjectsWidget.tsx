import { ArrowRight, Star } from "lucide-react";
import { DashboardWidget } from "../DashboardWidget";

export type DashboardProjectWidgetItem = {
  projectId: string;
  name: string;
  status: string;
  color: string | null;
};

export type FavoriteProjectsWidgetProps = {
  projects: readonly DashboardProjectWidgetItem[];
  loading?: boolean;
  error?: string | null;
  onOpenProject?: (project: DashboardProjectWidgetItem) => void;
};

export function FavoriteProjectsWidget({
  projects,
  loading = false,
  error = null,
  onOpenProject
}: FavoriteProjectsWidgetProps): React.JSX.Element {
  return (
    <DashboardWidget
      count={projects.length}
      description="Pinned project containers from the current workspace."
      emptyDescription="Pinned projects will appear here."
      emptyTitle="No favorite projects"
      error={error}
      kind="favorites"
      loading={loading}
      title="Favorite Projects"
    >
      {loading || error !== null || projects.length === 0 ? null : (
        <ol className="dashboard-widget-list">
          {projects.map((project) => (
            <li key={project.projectId}>
              <button
                type="button"
                className="dashboard-widget-row"
                onClick={() => onOpenProject?.(project)}
              >
                <span className="dashboard-widget-row-main project-widget-main">
                  <span
                    className="project-list-color"
                    style={{ backgroundColor: project.color ?? "#245c55" }}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{project.name}</strong>
                    <span>
                      <Star size={14} aria-hidden="true" />
                      {project.status}
                    </span>
                  </span>
                </span>
                <span className="dashboard-widget-row-meta">
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
