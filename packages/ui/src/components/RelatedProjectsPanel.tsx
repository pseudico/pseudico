import { FolderKanban, Link2 } from "lucide-react";
import type { RelatedActivityViewModel } from "./RelatedContactsPanel";

export type RelatedProjectViewModel = {
  relationshipId: string;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  openTaskCount: number;
  recentActivityCount: number;
  recentActivity: RelatedActivityViewModel[];
};

export type RelatedProjectOption = {
  id: string;
  name: string;
};

export type RelatedProjectsPanelProps = {
  relatedProjects: readonly RelatedProjectViewModel[];
  availableProjects: readonly RelatedProjectOption[];
  selectedProjectId: string;
  onOpenProject?: (projectId: string) => void;
  onSelectedProjectChange: (projectId: string) => void;
  onLinkProject: () => void;
  onUnlinkProject: (relationshipId: string) => void;
  busy?: boolean;
  error?: string | null;
};

export function RelatedProjectsPanel({
  relatedProjects,
  availableProjects,
  selectedProjectId,
  onOpenProject,
  onSelectedProjectChange,
  onLinkProject,
  onUnlinkProject,
  busy = false,
  error = null
}: RelatedProjectsPanelProps): React.JSX.Element {
  const canLink = !busy && selectedProjectId.trim().length > 0;

  return (
    <section className="related-items-panel" aria-label="Related projects">
      <div className="panel-heading">
        <FolderKanban size={16} aria-hidden="true" />
        <h4>Related projects</h4>
      </div>
      <div className="relationship-link-controls">
        <label>
          Project
          <select
            value={selectedProjectId}
            onChange={(event) => onSelectedProjectChange(event.currentTarget.value)}
            disabled={busy || availableProjects.length === 0}
          >
            <option value="">Select a project</option>
            {availableProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onLinkProject} disabled={!canLink}>
          <Link2 size={14} aria-hidden="true" />
          Link project
        </button>
      </div>
      {error !== null ? <p className="form-error">{error}</p> : null}
      {relatedProjects.length === 0 ? (
        <p className="muted-text">No related projects yet.</p>
      ) : (
        <ol className="related-summary-list">
          {relatedProjects.map((project) => (
            <li key={project.relationshipId}>
              <article className="related-summary-card">
                <div className="related-summary-card-header">
                  <strong>{project.name}</strong>
                  <span className="status-badge">{formatStatusLabel(project.status)}</span>
                </div>
                {project.description !== null ? (
                  <p className="related-summary-description">{project.description}</p>
                ) : null}
                <small>
                  {formatFollowUpCount(project.openTaskCount)}{" \u00b7 "}
                  {formatActivityCount(project.recentActivityCount)}
                </small>
                {project.recentActivity.length > 0 ? (
                  <ul>
                    {project.recentActivity.map((activity) => (
                      <li key={activity.id}>{activity.description}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="button-row">
                  <button
                    type="button"
                    onClick={() => onOpenProject?.(project.projectId)}
                    disabled={busy || onOpenProject === undefined}
                  >
                    Open project
                  </button>
                  <button
                    type="button"
                    onClick={() => onUnlinkProject(project.relationshipId)}
                    disabled={busy}
                  >
                    Unlink
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatFollowUpCount(count: number): string {
  return `${count} open follow-up${count === 1 ? "" : "s"}`;
}

function formatActivityCount(count: number): string {
  return `${count} recent activity event${count === 1 ? "" : "s"}`;
}

function formatStatusLabel(status: string): string {
  return status.length === 0
    ? "Unknown"
    : `${status.slice(0, 1).toUpperCase()}${status.slice(1)}`;
}
