import { ArrowLeft, FolderKanban, Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { LocalWorkOsApi, ProjectSummary } from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";

type ProjectDetailPageProps = {
  apiClient?: LocalWorkOsApi;
  initialProject?: ProjectSummary | null;
};

export function ProjectDetailPage({
  apiClient = desktopApiClient,
  initialProject
}: ProjectDetailPageProps): React.JSX.Element {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectSummary | null>(
    initialProject ?? null
  );
  const [loading, setLoading] = useState(initialProject === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (projectId === undefined) {
      setLoading(false);
      setError("Project id is missing.");
      return;
    }

    let active = true;
    const activeProjectId = projectId;

    async function loadProject(): Promise<void> {
      setLoading(true);
      setError(null);

      const result = await apiClient.projects.get(activeProjectId);

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setProject(result.data);
    }

    void loadProject();

    return () => {
      active = false;
    };
  }, [apiClient, projectId]);

  if (loading) {
    return <p className="muted-text">Loading project...</p>;
  }

  if (error !== null) {
    return <p className="form-message form-message-error">{error}</p>;
  }

  if (project === null) {
    return (
      <section className="project-detail-page">
        <Link className="text-link" to="/projects">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to projects
        </Link>
        <div className="projects-empty-state">
          <FolderKanban size={28} aria-hidden="true" />
          <h3>Project not found</h3>
          <p>The project may have been archived, deleted, or moved.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="project-detail-page">
      <Link className="text-link page-action-link" to="/projects">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to projects
      </Link>

      <header className="project-detail-header">
        <span
          className="project-detail-color"
          style={{ backgroundColor: project.color ?? "#245c55" }}
          aria-hidden="true"
        />
        <div>
          <p className="top-eyebrow">Project</p>
          <h2>{project.name}</h2>
          <p>{project.description ?? "No description added yet."}</p>
        </div>
      </header>

      <dl className="project-meta-grid">
        <div>
          <dt>Status</dt>
          <dd>{project.status}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{project.categoryId ?? "Not assigned"}</dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>
            <Tag size={15} aria-hidden="true" />
            Placeholder
          </dd>
        </div>
      </dl>

      <section className="content-feed-placeholder" aria-label="Project content">
        <div className="panel-heading">
          <FolderKanban size={17} aria-hidden="true" />
          <h3>Content feed</h3>
        </div>
        <p className="muted-text">
          Tasks, lists, notes, files, and links will appear here as later M2
          tickets add item feeds.
        </p>
      </section>
    </section>
  );
}
