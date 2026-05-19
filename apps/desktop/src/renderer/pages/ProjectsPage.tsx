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
  ContainerGroupingViewModelSummary,
  LocalWorkOsApi,
  ProjectLibraryGroupingMode,
  ProjectMutableStatus,
  ProjectSummary,
  TemplateSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type ProjectBoardGrouping = "status" | "category";
type ContainerVisibilityFilter = "active" | "archived";
type ProjectLifecycleAction = "archive" | "complete" | "restore";

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
  const [libraryGrouping, setLibraryGrouping] =
    useState<ProjectLibraryGroupingMode>("status");
  const [groupingView, setGroupingView] =
    useState<ContainerGroupingViewModelSummary | null>(null);
  const [savingGrouping, setSavingGrouping] = useState(false);
  const [visibilityFilter, setVisibilityFilter] = useState<ContainerVisibilityFilter>("active");
  const [movingProjectId, setMovingProjectId] = useState<string | null>(null);
  const [cloningProjectId, setCloningProjectId] = useState<string | null>(null);
  const [transitioningProjectId, setTransitioningProjectId] = useState<string | null>(null);
  const [pendingLifecycle, setPendingLifecycle] = useState<{
    project: ProjectSummary;
    action: ProjectLifecycleAction;
  } | null>(null);
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

      const result = await apiClient.projects.list(
        visibilityFilter === "archived"
          ? { workspaceId, includeArchived: true }
          : workspaceId
      );

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setProjects(filterProjectsByVisibility(result.data, visibilityFilter));
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

      const groupingResult = await apiClient.containers.getGrouping({
        workspaceId,
        containerType: "project",
        mode: libraryGrouping,
        includeArchived: visibilityFilter === "archived"
      });

      if (active && groupingResult.ok) {
        setGroupingView(groupingResult.data);
        setLibraryGrouping(groupingResult.data.mode as ProjectLibraryGroupingMode);
      }
    }

    void loadProjects();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, libraryGrouping, visibilityFilter]);

  async function changeLibraryGrouping(mode: ProjectLibraryGroupingMode): Promise<void> {
    if (currentWorkspace === null) {
      return;
    }

    setLibraryGrouping(mode);
    setSavingGrouping(true);
    setError(null);

    const result = await apiClient.containers.updateGroupingPreferences({
      workspaceId: currentWorkspace.id,
      containerType: "project",
      mode,
      collapsedGroupKeys: []
    });

    setSavingGrouping(false);

    if (!result.ok) {
      setError(result.error.message);
    }
  }

  async function toggleProjectGroup(groupKey: string): Promise<void> {
    if (currentWorkspace === null || groupingView === null) {
      return;
    }

    const currentKeys = new Set(groupingView.preferences.collapsedGroupKeys);

    if (currentKeys.has(groupKey)) {
      currentKeys.delete(groupKey);
    } else {
      currentKeys.add(groupKey);
    }

    const collapsedGroupKeys = [...currentKeys].sort();
    setGroupingView({
      ...groupingView,
      preferences: {
        ...groupingView.preferences,
        collapsedGroupKeys
      },
      groups: groupingView.groups.map((group) =>
        group.key === groupKey ? { ...group, collapsed: !group.collapsed } : group
      )
    });

    const result = await apiClient.containers.updateGroupingPreferences({
      workspaceId: currentWorkspace.id,
      containerType: "project",
      collapsedGroupKeys
    });

    if (!result.ok) {
      setError(result.error.message);
    }
  }

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

  async function cloneProject(project: ProjectSummary): Promise<void> {
    setCloningProjectId(project.id);
    setError(null);

    if (apiClient.projects.clone === undefined) {
      setCloningProjectId(null);
      setError("Project duplicate is unavailable.");
      return;
    }

    const result = await apiClient.projects.clone({
      projectId: project.id
    });

    setCloningProjectId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setProjects((current) => [result.data, ...current]);
    navigate(`/projects/${result.data.id}`);
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

    if (boardGrouping === "status" && targetColumnId === "completed") {
      setPendingLifecycle({ project, action: "complete" });
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

  async function confirmProjectLifecycle(): Promise<void> {
    if (pendingLifecycle === null) {
      return;
    }

    const { project, action } = pendingLifecycle;
    setTransitioningProjectId(project.id);
    setError(null);

    if (action === "complete" && apiClient.projects.complete === undefined) {
      setTransitioningProjectId(null);
      setError("Project complete is unavailable.");
      return;
    }

    if (action === "restore" && apiClient.projects.restore === undefined) {
      setTransitioningProjectId(null);
      setError("Project restore is unavailable.");
      return;
    }

    const result =
      action === "archive"
        ? await apiClient.projects.archive({
            projectId: project.id,
            confirmOpenTasks: true
          })
        : action === "complete"
          ? await apiClient.projects.complete!({
              projectId: project.id,
              confirmOpenTasks: true
            })
          : await apiClient.projects.restore!({ projectId: project.id });

    setTransitioningProjectId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setPendingLifecycle(null);
    setProjects((current) =>
      applyProjectLifecycleResult(current, result.data, action, visibilityFilter)
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
    <section className="projects-page" data-space-budget-surface="projects-library">
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

      <ProjectLibrarySummary
        categories={categories}
        groupingMode={libraryGrouping}
        projects={projects}
        visibilityFilter={visibilityFilter}
      />

      <CreateFromTemplateDialog
        open={selectedTemplate !== null}
        templateName={selectedTemplate?.name ?? "Template"}
        submitting={applyingTemplateId !== null}
        onClose={() => setSelectedTemplate(null)}
        onSubmit={createProjectFromTemplate}
      />

      <LifecycleDialog
        action={pendingLifecycle?.action ?? null}
        containerName={pendingLifecycle?.project.name ?? ""}
        containerType="project"
        submitting={transitioningProjectId !== null}
        onClose={() => setPendingLifecycle(null)}
        onConfirm={confirmProjectLifecycle}
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
        <label>
          View
          <select
            value={visibilityFilter}
            onChange={(event) =>
              setVisibilityFilter(event.currentTarget.value as ContainerVisibilityFilter)
            }
          >
            <option value="active">Active projects</option>
            <option value="archived">Archived projects</option>
          </select>
        </label>
        <label>
          Library grouping
          <select
            value={libraryGrouping}
            disabled={savingGrouping}
            onChange={(event) =>
              void changeLibraryGrouping(event.currentTarget.value as ProjectLibraryGroupingMode)
            }
          >
            <option value="none">No grouping</option>
            <option value="status">Status</option>
            <option value="category">Category</option>
            <option value="tag">Tag</option>
            <option value="favorite">Favourite</option>
            <option value="stale">Stale</option>
          </select>
        </label>
        <Link to="/project-tags" className="secondary-button compact-button">
          Open tag browser
        </Link>
      </div>

      {visibilityFilter === "active" ? (
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
      ) : null}

      <div className="project-list-panel project-list-secondary" aria-label="Project list">
        <GroupedProjectList
          groupingView={groupingView}
          projects={projects}
          savingTemplateId={templateSavingId}
          cloningProjectId={cloningProjectId}
          transitioningProjectId={transitioningProjectId}
          visibilityFilter={visibilityFilter}
          categories={categories}
          onSaveTemplate={saveProjectAsTemplate}
          onClone={cloneProject}
          onLifecycle={(entry, action) => setPendingLifecycle({ project: entry, action })}
          onToggleGroup={(groupKey) => void toggleProjectGroup(groupKey)}
        />
      </div>
    </section>
  );
}

function ProjectLibrarySummary({
  categories,
  groupingMode,
  projects,
  visibilityFilter
}: {
  categories: CategorySummary[];
  groupingMode: ProjectLibraryGroupingMode;
  projects: ProjectSummary[];
  visibilityFilter: ContainerVisibilityFilter;
}): React.JSX.Element {
  const active = projects.filter((project) => project.status === "active").length;
  const waiting = projects.filter((project) => project.status === "waiting").length;
  const completed = projects.filter((project) => project.status === "completed").length;
  const favorites = projects.filter((project) => project.isFavorite).length;

  return (
    <section className="project-library-summary" aria-label="Project library readable summary">
      <div className="project-library-summary-main">
        <div>
          <p className="top-eyebrow">Library scan</p>
          <h3>Readable project browsing</h3>
          <p>
            Category/tag browsing stays secondary to full project names and next
            actions. Columns scroll horizontally before shrinking below the
            operator budget.
          </p>
        </div>
        <dl className="workspace-summary-metrics">
          <div>
            <dt>{visibilityFilter === "archived" ? "Archived" : "Active"}</dt>
            <dd>{active}</dd>
          </div>
          <div>
            <dt>Waiting</dt>
            <dd>{waiting}</dd>
          </div>
          <div>
            <dt>Completed</dt>
            <dd>{completed}</dd>
          </div>
          <div>
            <dt>Pinned</dt>
            <dd>{favorites}</dd>
          </div>
        </dl>
      </div>

      <div className="project-category-browser" aria-label="Category browser preview">
        <ProjectCategoryColumn
          count={projects.filter((project) => project.categoryId === null).length}
          label="Uncategorized"
          projects={projects.filter((project) => project.categoryId === null)}
        />
        {categories.map((category) => (
          <ProjectCategoryColumn
            key={category.id}
            color={category.color}
            count={projects.filter((project) => project.categoryId === category.id).length}
            label={category.name}
            projects={projects.filter((project) => project.categoryId === category.id)}
          />
        ))}
      </div>
      <p className="project-library-grouping-note">
        Current library grouping: <strong>{groupingMode}</strong>. Use the tag
        browser for cross-cutting tag drill-down without squeezing project names
        into chips.
      </p>
    </section>
  );
}

function ProjectCategoryColumn({
  color,
  count,
  label,
  projects
}: {
  color?: string;
  count: number;
  label: string;
  projects: ProjectSummary[];
}): React.JSX.Element {
  return (
    <article className="project-category-column" style={{ borderTopColor: color ?? "#8b8173" }}>
      <header>
        <strong>{label}</strong>
        <span>{count}</span>
      </header>
      {projects.slice(0, 3).map((project) => (
        <Link key={project.id} to={`/projects/${project.id}`} className="project-category-card">
          <strong>{project.name}</strong>
          <span>{project.description ?? "No next action recorded."}</span>
        </Link>
      ))}
      {projects.length === 0 ? (
        <p>No matching projects yet.</p>
      ) : null}
    </article>
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

function GroupedProjectList({
  groupingView,
  projects,
  categories,
  savingTemplateId,
  cloningProjectId,
  transitioningProjectId,
  visibilityFilter,
  onSaveTemplate,
  onClone,
  onLifecycle,
  onToggleGroup
}: {
  groupingView: ContainerGroupingViewModelSummary | null;
  projects: ProjectSummary[];
  categories: CategorySummary[];
  savingTemplateId: string | null;
  cloningProjectId: string | null;
  transitioningProjectId: string | null;
  visibilityFilter: ContainerVisibilityFilter;
  onSaveTemplate: (project: ProjectSummary) => void;
  onClone: (project: ProjectSummary) => void;
  onLifecycle: (project: ProjectSummary, action: ProjectLifecycleAction) => void;
  onToggleGroup: (groupKey: string) => void;
}): React.JSX.Element {
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));
  const groups =
    groupingView?.groups.map((group) => ({
      key: group.key,
      label: group.label,
      count: group.count,
      collapsed: group.collapsed,
      projects: group.targets
        .filter((target) => target.type === "project")
        .map(toProjectSummaryFromGroupingTarget)
    })) ?? [
      {
        key: "all",
        label: "All projects",
        count: projects.length,
        collapsed: false,
        projects
      }
    ];

  return (
    <div className="grouped-results-list" aria-label="Grouped projects">
      {groups.map((group) => (
        <section className="grouped-results-group" key={group.key}>
          <button
            type="button"
            className="grouped-results-heading"
            aria-expanded={!group.collapsed}
            onClick={() => onToggleGroup(group.key)}
          >
            <span>
              <h3>{group.label}</h3>
              <span>
                {group.count} project{group.count === 1 ? "" : "s"}
              </span>
            </span>
          </button>
          {group.collapsed ? null : (
            <div className="project-list grouped-result-items">
              {group.projects.map((project) => (
                <ProjectListRow
                  key={`${group.key}:${project.id}`}
                  project={project}
                  categoryName={
                    project.categoryId === null
                      ? "Uncategorized"
                      : categoryNameById.get(project.categoryId) ?? "Category"
                  }
                  savingTemplate={savingTemplateId === project.id}
                  cloning={cloningProjectId === project.id}
                  transitioning={transitioningProjectId === project.id}
                  visibilityFilter={visibilityFilter}
                  onSaveTemplate={onSaveTemplate}
                  onClone={onClone}
                  onLifecycle={onLifecycle}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function ProjectListRow({
  project,
  categoryName,
  savingTemplate,
  cloning,
  transitioning,
  visibilityFilter,
  onSaveTemplate,
  onClone,
  onLifecycle
}: {
  project: ProjectSummary;
  categoryName: string;
  savingTemplate: boolean;
  cloning: boolean;
  transitioning: boolean;
  visibilityFilter: ContainerVisibilityFilter;
  onSaveTemplate: (project: ProjectSummary) => void;
  onClone: (project: ProjectSummary) => void;
  onLifecycle: (project: ProjectSummary, action: ProjectLifecycleAction) => void;
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
            <span>{project.description ?? "No next action or description recorded yet."}</span>
          </span>
        </Link>
        <span className="project-list-meta">
          {project.isFavorite ? <Star size={16} aria-label="Pinned" /> : null}
          <span>{project.status}</span>
          <span>{categoryName}</span>
          <span>Updated {project.updatedAt.slice(0, 10)}</span>
          {visibilityFilter === "archived" ? (
            <button
              type="button"
              className="secondary-button compact-button"
              disabled={transitioning}
              onClick={() => onLifecycle(project, "restore")}
            >
              {transitioning ? "Restoring..." : "Restore"}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="secondary-button compact-button"
                disabled={transitioning || project.status === "completed"}
                onClick={() => onLifecycle(project, "complete")}
              >
                {transitioning ? "Updating..." : "Complete"}
              </button>
              <button
                type="button"
                className="secondary-button compact-button"
                disabled={transitioning}
                onClick={() => onLifecycle(project, "archive")}
              >
                {transitioning ? "Archiving..." : "Archive"}
              </button>
            </>
          )}
          <button
            type="button"
            className="secondary-button compact-button"
            disabled={cloning}
            onClick={() => onClone(project)}
          >
            {cloning ? "Duplicating..." : "Duplicate"}
          </button>
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

function LifecycleDialog({
  action,
  containerName,
  containerType,
  submitting,
  onClose,
  onConfirm
}: {
  action: ProjectLifecycleAction | null;
  containerName: string;
  containerType: "project";
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}): React.JSX.Element | null {
  if (action === null) {
    return null;
  }

  const title =
    action === "archive"
      ? `Archive ${containerType}`
      : action === "complete"
        ? `Complete ${containerType}`
        : `Restore ${containerType}`;
  const confirmLabel =
    action === "archive" ? "Archive" : action === "complete" ? "Complete" : "Restore";

  return (
    <dialog className="project-dialog" open>
      <div className="project-dialog-header">
        <div>
          <p className="top-eyebrow">Container lifecycle</p>
          <h3>{title}</h3>
        </div>
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={onClose}
          disabled={submitting}
        >
          Close
        </button>
      </div>
      <p>
        {confirmLabel} "{containerName}"? Open tasks, if present, stay attached to
        this {containerType} so history remains restorable.
      </p>
      <div className="form-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? `${confirmLabel}...` : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

function filterProjectsByVisibility(
  projects: ProjectSummary[],
  visibilityFilter: ContainerVisibilityFilter
): ProjectSummary[] {
  return visibilityFilter === "archived"
    ? projects.filter((project) => project.archivedAt !== null)
    : projects.filter((project) => project.archivedAt === null);
}

function applyProjectLifecycleResult(
  projects: ProjectSummary[],
  updated: ProjectSummary,
  action: ProjectLifecycleAction,
  visibilityFilter: ContainerVisibilityFilter
): ProjectSummary[] {
  if (
    (action === "archive" && visibilityFilter === "active") ||
    (action === "restore" && visibilityFilter === "archived")
  ) {
    return projects.filter((project) => project.id !== updated.id);
  }

  return projects.map((project) => (project.id === updated.id ? updated : project));
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

function toProjectSummaryFromGroupingTarget(
  target: ContainerGroupingViewModelSummary["groups"][number]["targets"][number]
): ProjectSummary {
  return {
    id: target.id,
    workspaceId: target.workspaceId,
    type: "project",
    name: target.name,
    slug: target.slug,
    description: target.description,
    status: target.status as ProjectSummary["status"],
    categoryId: target.categoryId,
    color: target.color,
    isFavorite: target.isFavorite,
    sortOrder: target.sortOrder,
    createdAt: target.createdAt,
    updatedAt: target.updatedAt,
    archivedAt: target.archivedAt,
    deletedAt: target.deletedAt
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
