import { Activity, AlertTriangle, CalendarClock } from "lucide-react";
import { DashboardWidget } from "../DashboardWidget";
import type { ProjectHealthViewModel } from "../ProjectHealthCard";

export type ProjectHealthWidgetProps = {
  projects: readonly ProjectHealthViewModel[];
  loading?: boolean;
  onOpenProject?: (project: ProjectHealthViewModel) => void;
};

export function ProjectHealthWidget({
  projects,
  loading = false,
  onOpenProject
}: ProjectHealthWidgetProps): React.JSX.Element {
  return (
    <DashboardWidget
      count={projects.length}
      emptyDescription="Projects with active work will appear here."
      emptyTitle="No project summaries"
      kind="project_health"
      loading={loading}
      title="Project Health"
    >
      {projects.length === 0 ? null : (
        <ol className="dashboard-widget-list">
          {projects.map((project) => (
            <li key={project.projectId}>
              <button
                className="dashboard-widget-row project-health-widget-row"
                type="button"
                onClick={() => onOpenProject?.(project)}
              >
                <span
                  className="project-widget-color"
                  style={{ backgroundColor: project.color ?? "#245c55" }}
                  aria-hidden="true"
                />
                <span className="dashboard-widget-row-main">
                  <strong>{project.name}</strong>
                  <span>
                    <AlertTriangle size={13} aria-hidden="true" />
                    {`${project.overdueTaskCount} overdue`}
                    <Activity size={13} aria-hidden="true" />
                    {`${project.openTaskCount} open`}
                    <CalendarClock size={13} aria-hidden="true" />
                    {project.nextDueTask?.dueAt?.slice(0, 10) ?? "No due date"}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </DashboardWidget>
  );
}
