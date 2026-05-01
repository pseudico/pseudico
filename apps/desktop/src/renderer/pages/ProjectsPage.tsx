import { FolderKanban, Plus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProjectForm, type ProjectFormValues } from "@local-work-os/ui";
import type { LocalWorkOsApi, ProjectSummary } from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type ProjectsPageProps = {
  apiClient?: LocalWorkOsApi;
  initialProjects?: ProjectSummary[];
};

export function ProjectsPage({
  apiClient = desktopApiClient,
  initialProjects = []
}: ProjectsPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace === null) {
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadProjects(): Promise<void> {
      setLoading(true);
      setError(null);

      const result = await apiClient.projects.list(workspaceId);

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setProjects(result.data);
    }

    void loadProjects();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace]);

  async function createProject(values: ProjectFormValues): Promise<void> {
    if (currentWorkspace === null) {
      setError("Open a workspace before creating projects.");
      return;
    }

    setCreating(true);
    setError(null);

    const result = await apiClient.projects.create({
      workspaceId: currentWorkspace.id,
      name: values.name,
      description: values.description.length === 0 ? null : values.description,
      color: values.color,
      isFavorite: values.isFavorite
    });

    setCreating(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCreateOpen(false);
    setProjects((current) => [result.data.project, ...current]);
    navigate(`/projects/${result.data.project.id}`);
  }

  if (currentWorkspace === null) {
    return (
      <section className="projects-page">
        <div className="page-heading">
          <p className="top-eyebrow">Project containers</p>
          <h2>Projects</h2>
          <p>Open or create a local workspace before adding project containers.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="projects-page">
      <div className="page-heading page-heading-actions">
        <div>
          <p className="top-eyebrow">Project containers</p>
          <h2>Projects</h2>
          <p>
            Project pages collect local tasks, notes, lists, files, links, and
            related context.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={18} aria-hidden="true" />
          New project
        </button>
      </div>

      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      <dialog className="project-dialog" open={createOpen}>
        <div className="project-dialog-header">
          <div>
            <p className="top-eyebrow">Create project</p>
            <h3>New project</h3>
          </div>
          <button
            type="button"
            className="secondary-button compact-button"
            onClick={() => setCreateOpen(false)}
          >
            Close
          </button>
        </div>
        <ProjectForm submitting={creating} onSubmit={createProject} />
      </dialog>

      <div className="project-list-panel" aria-busy={loading}>
        {loading ? (
          <p className="muted-text">Loading projects...</p>
        ) : projects.length === 0 ? (
          <ProjectsEmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="project-list" aria-label="Projects">
            {projects.map((project) => (
              <ProjectListRow key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectsEmptyState({
  onCreate
}: {
  onCreate: () => void;
}): React.JSX.Element {
  return (
    <div className="projects-empty-state">
      <FolderKanban size={28} aria-hidden="true" />
      <h3>No projects yet</h3>
      <p>
        Create the first local project container before adding mixed content to
        it.
      </p>
      <button type="button" className="secondary-button" onClick={onCreate}>
        <Plus size={17} aria-hidden="true" />
        Create project
      </button>
    </div>
  );
}

function ProjectListRow({
  project
}: {
  project: ProjectSummary;
}): React.JSX.Element {
  return (
    <Link className="project-list-row" to={`/projects/${project.id}`}>
      <span
        className="project-list-color"
        style={{ backgroundColor: project.color ?? "#245c55" }}
        aria-hidden="true"
      />
      <span className="project-list-main">
        <strong>{project.name}</strong>
        <span>{project.description ?? "No description"}</span>
      </span>
      <span className="project-list-meta">
        {project.isFavorite ? <Star size={16} aria-label="Pinned" /> : null}
        <span>{project.status}</span>
      </span>
    </Link>
  );
}
