import { FolderKanban, Plus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resolveContextMenuActions, type ContextMenuTarget } from "@local-work-os/core";
import {
  ContextMenu,
  EmptyState,
  ErrorState,
  KanbanBoard,
  CreateFromTemplateDialog,
  ProjectForm,
  TemplateLibrary,
  renderLoadableState,
  type TemplateLibraryItem,
  type ProjectFormValues
} from "@local-work-os/ui";
import type {
  CategorySummary,
  LocalWorkOsApi,
  ProjectMutableStatus,
  ProjectSummary,
  TemplateSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type ProjectBoardGrouping = "status" | "category";

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
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [boardGrouping, setBoardGrouping] = useState<ProjectBoardGrouping>("status");
  const [movingProjectId, setMovingProjectId] = useState<string | null>(null);
  const [templateSavingId, setTemplateSavingId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSummary | null>(null);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
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
      if (apiClient.templates !== undefined) {
        const templateResult = await apiClient.templates.listTemplates({
          workspaceId,
          kind: "project"
        });

        if (active && templateResult.ok) {
          setTemplates(templateResult.data);
        }
      }

      const categoryResult = await apiClient.categories.list(workspaceId);

      if (active && categoryResult.ok) {
        setCategories(categoryResult.data);
      }
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

  async function saveProjectAsTemplate(project: ProjectSummary): Promise<void> {
    setTemplateSavingId(project.id);
    setError(null);

    if (apiClient.templates === undefined) {
      setError("Template library is unavailable.");
      return;
    }

    const result = await apiClient.templates.saveContainerAsTemplate({
      containerId: project.id,
      name: `${project.name} template`
    });

    setTemplateSavingId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setTemplates((current) => [result.data, ...current]);
  }

  async function createProjectFromTemplate(values: { name: string; baseDate: string }): Promise<void> {
    if (currentWorkspace === null || selectedTemplate === null) {
      return;
    }

    setApplyingTemplateId(selectedTemplate.id);
    setError(null);

    if (apiClient.templates === undefined) {
      setError("Template library is unavailable.");
      return;
    }

    const result = await apiClient.templates.createContainerFromTemplate({
      templateId: selectedTemplate.id,
      workspaceId: currentWorkspace.id,
      baseDate: values.baseDate,
      ...(values.name.trim().length === 0 ? {} : { name: values.name })
    });

    setApplyingTemplateId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    const project = result.data.container;

    if (project.type === "project") {
      setSelectedTemplate(null);
      setProjects((current) => [project, ...current]);
      navigate(`/projects/${project.id}`);
    }
  }

  async function moveProjectOnBoard(projectId: string, targetColumnId: string): Promise<void> {
    const project = projects.find((entry) => entry.id === projectId);

    if (project === undefined) {
      return;
    }

    if (
      (boardGrouping === "status" && project.status === targetColumnId) ||
      (boardGrouping === "category" &&
        (project.categoryId ?? PROJECT_BOARD_UNCATEGORIZED_COLUMN_ID) === targetColumnId)
    ) {
      return;
    }

    setMovingProjectId(projectId);
    setError(null);

    const result = await apiClient.projects.update({
      projectId,
      ...(boardGrouping === "status"
        ? { status: targetColumnId as ProjectMutableStatus }
        : {
            categoryId:
              targetColumnId === PROJECT_BOARD_UNCATEGORIZED_COLUMN_ID
                ? null
                : targetColumnId
          })
    });

    setMovingProjectId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setProjects((current) =>
      current.map((entry) => (entry.id === result.data.id ? result.data : entry))
    );
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

      {error === null ? null : <ErrorState error={error} title="Projects error" />}

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

      <CreateFromTemplateDialog
        open={selectedTemplate !== null}
        templateName={selectedTemplate?.name ?? "Template"}
        submitting={applyingTemplateId !== null}
        onClose={() => setSelectedTemplate(null)}
        onSubmit={createProjectFromTemplate}
      />

      <TemplateLibrary
        kind="project"
        templates={templates.map(toTemplateLibraryItem)}
        applyingTemplateId={applyingTemplateId}
        onApplyTemplate={(template) =>
          setSelectedTemplate(templates.find((entry) => entry.id === template.id) ?? null)
        }
      />

      <div className="project-board-toolbar" aria-label="Project board controls">
        <div>
          <strong>Project phase board</strong>
          <p>Drag project cards between local columns or use the move control.</p>
        </div>
        <label>
          Board columns
          <select
            value={boardGrouping}
            onChange={(event) => setBoardGrouping(event.currentTarget.value as ProjectBoardGrouping)}
          >
            <option value="status">Status / phase</option>
            <option value="category">Category</option>
          </select>
        </label>
      </div>

      <div className="project-list-panel project-board-panel" aria-busy={loading}>
        {renderLoadableState({
          loading,
          loadingLabel: "Loading projects..."
        }) ??
        (projects.length === 0 ? (
          <ProjectsEmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <KanbanBoard
            ariaLabel="Project phase/status board"
            columns={toProjectKanbanColumns(projects, categories, boardGrouping)}
            movingCardId={movingProjectId}
            onMoveCard={(card, column) => moveProjectOnBoard(card.id, column.id)}
            onOpenCard={(card) => navigate(`/projects/${card.id}`)}
          />
        ))}
      </div>

      <div className="project-list-panel project-list-secondary" aria-label="Project list">
        <div className="project-list">
          {projects.map((project) => (
            <ProjectListRow
              key={project.id}
              project={project}
              savingTemplate={templateSavingId === project.id}
              onSaveTemplate={saveProjectAsTemplate}
            />
          ))}
        </div>
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
    <EmptyState
      action={
        <button type="button" className="secondary-button" onClick={onCreate}>
          <Plus size={17} aria-hidden="true" />
          Create project
        </button>
      }
      description="Create the first local project container before adding mixed content to it."
      icon={<FolderKanban size={28} aria-hidden="true" />}
      title="No projects yet"
    />
  );
}

function ProjectListRow({
  project,
  savingTemplate,
  onSaveTemplate
}: {
  project: ProjectSummary;
  savingTemplate: boolean;
  onSaveTemplate: (project: ProjectSummary) => void;
}): React.JSX.Element {
  const target = toProjectContextMenuTarget(project);
  const actions = resolveContextMenuActions({
    target,
    hideDisabled: false
  }).map((action) => ({
    id: action.id,
    title: action.title,
    group: action.group,
    disabledReason: action.disabledReason,
    danger: action.danger
  }));

  return (
    <ContextMenu actions={actions} label={`Context menu for ${project.name}`} target={target}>
      <div className="project-list-row">
        <Link className="project-list-main" to={`/projects/${project.id}`}>
          <span
            className="project-list-color"
            style={{ backgroundColor: project.color ?? "#245c55" }}
            aria-hidden="true"
          />
          <span>
            <strong>{project.name}</strong>
            <span>{project.description ?? "No description"}</span>
          </span>
        </Link>
        <span className="project-list-meta">
          {project.isFavorite ? <Star size={16} aria-label="Pinned" /> : null}
          <span>{project.status}</span>
          <button
            type="button"
            className="secondary-button compact-button"
            disabled={savingTemplate}
            onClick={() => onSaveTemplate(project)}
          >
            {savingTemplate ? "Saving..." : "Save as template"}
          </button>
        </span>
      </div>
    </ContextMenu>
  );
}

function toProjectContextMenuTarget(project: ProjectSummary): ContextMenuTarget {
  return {
    id: project.id,
    type: "container",
    label: project.name,
    kind: project.type,
    capabilities: {
      edit: false,
      move: false,
      tag: false,
      category: false,
      pin: false,
      archive: false,
      duplicate: false,
      copyLink: false,
      inspect: false,
      delete: false
    }
  };
}

function toTemplateLibraryItem(template: TemplateSummary): TemplateLibraryItem {
  return {
    id: template.id,
    kind: "project",
    name: template.name,
    description: template.description,
    updatedAt: template.updatedAt
  };
}

const PROJECT_BOARD_UNCATEGORIZED_COLUMN_ID = "uncategorized";

function toProjectKanbanColumns(
  projects: ProjectSummary[],
  categories: CategorySummary[],
  grouping: ProjectBoardGrouping
) {
  if (grouping === "category") {
    return [
      {
        id: PROJECT_BOARD_UNCATEGORIZED_COLUMN_ID,
        title: "Uncategorized",
        description: "Projects without a category.",
        cards: projects
          .filter((project) => project.categoryId === null)
          .map((project) => toProjectKanbanCard(project, "Uncategorized"))
      },
      ...categories.map((category) => ({
        id: category.id,
        title: category.name,
        description: category.description ?? "Projects assigned to this category.",
        color: category.color,
        cards: projects
          .filter((project) => project.categoryId === category.id)
          .map((project) => toProjectKanbanCard(project, category.name))
      }))
    ];
  }

  return [
    {
      id: "active",
      title: "Active",
      description: "Projects currently moving forward.",
      color: "#245c55",
      cards: projects
        .filter((project) => project.status === "active")
        .map((project) => toProjectKanbanCard(project, "active"))
    },
    {
      id: "waiting",
      title: "Waiting",
      description: "Projects paused by a blocker or external response.",
      color: "#ad7c18",
      cards: projects
        .filter((project) => project.status === "waiting")
        .map((project) => toProjectKanbanCard(project, "waiting"))
    },
    {
      id: "completed",
      title: "Completed",
      description: "Finished projects kept visible for review.",
      color: "#4f6f52",
      cards: projects
        .filter((project) => project.status === "completed")
        .map((project) => toProjectKanbanCard(project, "completed"))
    }
  ];
}

function toProjectKanbanCard(project: ProjectSummary, meta: string) {
  return {
    id: project.id,
    title: project.name,
    description: project.description,
    color: project.color,
    meta,
    pinned: project.isFavorite
  };
}
