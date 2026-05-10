import { ChevronRight, FolderKanban, RefreshCw, Tags } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CategoryBadge, TagBadge } from "@local-work-os/ui";
import type {
  LocalWorkOsApi,
  ProjectTagBrowserStatus,
  ProjectTagBrowserSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type ProjectTagBrowserPageProps = {
  apiClient?: LocalWorkOsApi;
  initialViewModel?: ProjectTagBrowserSummary | null;
};

export function ProjectTagBrowserPage({
  apiClient = desktopApiClient,
  initialViewModel = null
}: ProjectTagBrowserPageProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewModel, setViewModel] = useState<ProjectTagBrowserSummary | null>(
    initialViewModel
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const hasActiveFilter =
    filters.tagSlugs.length > 0 || filters.categoryId !== null || filters.status !== null;

  const updateFilters = useCallback(
    (next: ParsedProjectBrowserFilters): void => {
      setSearchParams(serializeFilters(next), { replace: true });
    },
    [setSearchParams]
  );

  const loadBrowser = useCallback(
    async (workspaceId: string, nextFilters: ParsedProjectBrowserFilters): Promise<void> => {
      setLoading(true);
      setError(null);

      const result = await apiClient.metadata.getProjectTagBrowser({
        workspaceId,
        tagSlugs: nextFilters.tagSlugs,
        categoryId: nextFilters.categoryId,
        status: nextFilters.status
      });

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setViewModel(result.data);
    },
    [apiClient]
  );

  useEffect(() => {
    if (currentWorkspace === null) {
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    apiClient.metadata
      .getProjectTagBrowser({
        workspaceId: currentWorkspace.id,
        tagSlugs: filters.tagSlugs,
        categoryId: filters.categoryId,
        status: filters.status
      })
      .then((result) => {
        if (!active) {
          return;
        }

        setLoading(false);

        if (!result.ok) {
          setError(result.error.message);
          return;
        }

        setViewModel(result.data);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }

        setLoading(false);
        setError(caught instanceof Error ? caught.message : "Project tag browser failed.");
      });

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, filters.categoryId, filters.status, filters.tagSlugs]);

  function toggleTag(tagSlug: string): void {
    const tagSlugs = filters.tagSlugs.includes(tagSlug)
      ? filters.tagSlugs.filter((slug) => slug !== tagSlug)
      : [...filters.tagSlugs, tagSlug].sort();

    updateFilters({ ...filters, tagSlugs });
  }

  if (currentWorkspace === null && initialViewModel === null) {
    return (
      <section className="metadata-page project-tag-browser-page">
        <div className="page-heading">
          <p className="top-eyebrow">Project tags</p>
          <h2>Project Tag Browser</h2>
          <p>Open or create a local workspace before browsing project tags.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="metadata-page project-tag-browser-page">
      <div className="page-heading page-heading-actions">
        <div>
          <p className="top-eyebrow">Project tags</p>
          <h2>Project Tag Browser</h2>
          <p>
            Drill into project container tags, narrow by multiple tags, and combine
            category or status filters without leaving local data.
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={loading || currentWorkspace === null}
          type="button"
          onClick={() => {
            if (currentWorkspace !== null) {
              void loadBrowser(currentWorkspace.id, filters);
            }
          }}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error === null ? null : <p className="form-message form-message-error">{error}</p>}

      <div className="project-browser-breadcrumbs" aria-label="Active project filters">
        <span>All projects</span>
        {viewModel?.selectedTags.map((tag) => (
          <span key={tag.id} className="project-browser-crumb">
            <ChevronRight size={14} aria-hidden="true" />@{tag.slug}
          </span>
        ))}
        {filters.categoryId === null ? null : (
          <span className="project-browser-crumb">
            <ChevronRight size={14} aria-hidden="true" />Category filter
          </span>
        )}
        {filters.status === null ? null : (
          <span className="project-browser-crumb">
            <ChevronRight size={14} aria-hidden="true" />{formatStatus(filters.status)}
          </span>
        )}
      </div>

      <div className="metadata-browser-layout project-tag-browser-layout">
        <aside className="metadata-filter-panel" aria-label="Project tag facets">
          <div className="panel-heading">
            <Tags size={17} aria-hidden="true" />
            <h3>Drill down</h3>
          </div>

          <section className="metadata-filter-group" aria-labelledby="project-tag-facets">
            <div className="metadata-filter-title">
              <Tags size={16} aria-hidden="true" />
              <h4 id="project-tag-facets">Tags</h4>
            </div>
            <div className="metadata-chip-list">
              {(viewModel?.tagFacets ?? []).length === 0 ? (
                <p className="muted-text">No project tags match this filter.</p>
              ) : (
                viewModel!.tagFacets.map((tag) => (
                  <button
                    type="button"
                    key={tag.id}
                    className="metadata-chip"
                    aria-pressed={filters.tagSlugs.includes(tag.slug)}
                    disabled={loading}
                    onClick={() => toggleTag(tag.slug)}
                  >
                    <span>@{tag.name}</span>
                    <span>{tag.projectCount}</span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="metadata-filter-group" aria-labelledby="project-category-facets">
            <div className="metadata-filter-title">
              <FolderKanban size={16} aria-hidden="true" />
              <h4 id="project-category-facets">Categories</h4>
            </div>
            <div className="metadata-category-list">
              <button
                type="button"
                className="metadata-category-option"
                aria-pressed={filters.categoryId === null}
                disabled={loading}
                onClick={() => updateFilters({ ...filters, categoryId: null })}
              >
                <CategoryBadge category={null} fallbackLabel="Any category" />
              </button>
              {(viewModel?.categoryFacets ?? []).map((category) => (
                <button
                  type="button"
                  key={category.id}
                  className="metadata-category-option"
                  aria-pressed={filters.categoryId === category.id}
                  disabled={loading}
                  onClick={() => updateFilters({ ...filters, categoryId: category.id })}
                >
                  <CategoryBadge category={category} />
                  <span>{category.projectCount}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="metadata-filter-group" aria-labelledby="project-status-facets">
            <div className="metadata-filter-title">
              <FolderKanban size={16} aria-hidden="true" />
              <h4 id="project-status-facets">Status</h4>
            </div>
            <div className="metadata-chip-list">
              <button
                type="button"
                className="metadata-chip"
                aria-pressed={filters.status === null}
                disabled={loading}
                onClick={() => updateFilters({ ...filters, status: null })}
              >
                <span>Any unarchived status</span>
                <span>{viewModel?.projects.length ?? 0}</span>
              </button>
              {(viewModel?.statusFacets ?? []).map((status) => (
                <button
                  type="button"
                  key={status.status}
                  className="metadata-chip"
                  aria-pressed={filters.status === status.status}
                  disabled={loading}
                  onClick={() => updateFilters({ ...filters, status: status.status })}
                >
                  <span>{formatStatus(status.status)}</span>
                  <span>{status.projectCount}</span>
                </button>
              ))}
            </div>
          </section>

          <button
            type="button"
            className="secondary-button compact-button"
            disabled={loading || !hasActiveFilter}
            onClick={() => updateFilters({ tagSlugs: [], categoryId: null, status: null })}
          >
            Clear browser state
          </button>
        </aside>

        <section className="metadata-results-panel" aria-busy={loading}>
          <div className="metadata-results-heading">
            <div>
              <p className="top-eyebrow">Matching projects</p>
              <h3>{formatProjectSelection(filters)}</h3>
            </div>
            <span>
              {viewModel?.totalProjectCount ?? 0} project
              {(viewModel?.totalProjectCount ?? 0) === 1 ? "" : "s"}
            </span>
          </div>

          {loading && viewModel === null ? (
            <p className="muted-text">Loading project tag browser...</p>
          ) : (viewModel?.projects ?? []).length === 0 ? (
            <div className="item-feed-empty-state">
              <h3>No matching projects</h3>
              <p>Select a different tag, category, or status filter.</p>
            </div>
          ) : (
            <div className="project-list" aria-label="Projects matching tag browser filters">
              {viewModel!.projects.map((project) => (
                <article className="project-browser-result" key={project.id}>
                  <span
                    className="project-list-color"
                    style={{ backgroundColor: project.color ?? "#245c55" }}
                    aria-hidden="true"
                  />
                  <div className="project-list-main">
                    <Link className="text-link" to={`/projects/${project.id}`}>
                      <strong>{project.name}</strong>
                    </Link>
                    <span>{project.description ?? "No description"}</span>
                    <div className="metadata-target-metadata">
                      <span>{formatStatus(project.status)}</span>
                      <CategoryBadge category={project.category} fallbackLabel="No category" />
                      {project.tags.map((tag) => (
                        <TagBadge key={tag.id} tag={tag} />
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

type ParsedProjectBrowserFilters = {
  tagSlugs: string[];
  categoryId: string | null;
  status: ProjectTagBrowserStatus | null;
};

function parseFilters(params: URLSearchParams): ParsedProjectBrowserFilters {
  const tagsParam = params.get("tags");
  const status = parseStatus(params.get("status"));

  return {
    tagSlugs:
      tagsParam === null || tagsParam.trim().length === 0
        ? []
        : [...new Set(tagsParam.split(",").map((tag) => tag.trim()).filter(Boolean))].sort(),
    categoryId: params.get("categoryId"),
    status
  };
}

function serializeFilters(filters: ParsedProjectBrowserFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.tagSlugs.length > 0) {
    params.set("tags", filters.tagSlugs.join(","));
  }

  if (filters.categoryId !== null) {
    params.set("categoryId", filters.categoryId);
  }

  if (filters.status !== null) {
    params.set("status", filters.status);
  }

  return params;
}

function parseStatus(value: string | null): ProjectTagBrowserStatus | null {
  return value === "active" ||
    value === "waiting" ||
    value === "completed" ||
    value === "archived"
    ? value
    : null;
}

function formatProjectSelection(filters: ParsedProjectBrowserFilters): string {
  const parts = [
    ...filters.tagSlugs.map((slug) => `@${slug}`),
    ...(filters.categoryId === null ? [] : ["category"]),
    ...(filters.status === null ? [] : [formatStatus(filters.status)])
  ];

  return parts.length === 0 ? "All active projects" : parts.join(" + ");
}

function formatStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
