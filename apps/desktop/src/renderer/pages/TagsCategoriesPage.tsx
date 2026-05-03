import { FolderKanban, Layers, ListChecks, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CategoryBadge,
  MetadataFilterPanel,
  TagBadge,
  type MetadataCategoryFilterOption,
  type MetadataTagFilterOption
} from "@local-work-os/ui";
import type {
  CategoryCountSummary,
  LocalWorkOsApi,
  MetadataTargetSummary,
  TagCountSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type TagsCategoriesPageProps = {
  apiClient?: LocalWorkOsApi;
  initialCategories?: CategoryCountSummary[];
  initialSelectedCategoryId?: string | null;
  initialSelectedTagSlugs?: string[];
  initialTags?: TagCountSummary[];
  initialTargets?: MetadataTargetSummary[];
};

export function TagsCategoriesPage({
  apiClient = desktopApiClient,
  initialCategories = [],
  initialSelectedCategoryId = null,
  initialSelectedTagSlugs = [],
  initialTags = [],
  initialTargets = []
}: TagsCategoriesPageProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const [tags, setTags] = useState<TagCountSummary[]>(initialTags);
  const [categories, setCategories] =
    useState<CategoryCountSummary[]>(initialCategories);
  const [targets, setTargets] =
    useState<MetadataTargetSummary[]>(initialTargets);
  const [selectedTagSlugs, setSelectedTagSlugs] = useState<string[]>(
    initialSelectedTagSlugs
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialSelectedCategoryId
  );
  const [loading, setLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId]
  );
  const groupedTargets = useMemo(() => groupTargets(targets), [targets]);
  const hasActiveFilter =
    selectedTagSlugs.length > 0 || selectedCategoryId !== null;

  async function loadMetadata(workspaceId: string): Promise<void> {
    setLoading(true);
    setError(null);

    const [tagsResult, categoriesResult] = await Promise.all([
      apiClient.metadata.listTagsWithCounts(workspaceId),
      apiClient.metadata.listCategoriesWithCounts(workspaceId)
    ]);

    setLoading(false);

    if (!tagsResult.ok) {
      setError(tagsResult.error.message);
      return;
    }

    if (!categoriesResult.ok) {
      setError(categoriesResult.error.message);
      return;
    }

    setTags(tagsResult.data);
    setCategories(categoriesResult.data);
  }

  useEffect(() => {
    if (currentWorkspace === null) {
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadActiveMetadata(): Promise<void> {
      setLoading(true);
      setError(null);

      const [tagsResult, categoriesResult] = await Promise.all([
        apiClient.metadata.listTagsWithCounts(workspaceId),
        apiClient.metadata.listCategoriesWithCounts(workspaceId)
      ]);

      if (!active) {
        return;
      }

      setLoading(false);

      if (!tagsResult.ok) {
        setError(tagsResult.error.message);
        return;
      }

      if (!categoriesResult.ok) {
        setError(categoriesResult.error.message);
        return;
      }

      setTags(tagsResult.data);
      setCategories(categoriesResult.data);
    }

    void loadActiveMetadata();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace]);

  useEffect(() => {
    if (currentWorkspace === null) {
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;
    const tagSlugs = [...selectedTagSlugs];
    const categoryId = selectedCategoryId;

    async function loadActiveTargets(): Promise<void> {
      if (tagSlugs.length === 0 && categoryId === null) {
        setTargets([]);
        return;
      }

      setResultsLoading(true);
      setError(null);

      const result = await apiClient.metadata.listTargetsByMetadata({
        workspaceId,
        tagSlugs,
        categoryId
      });

      if (!active) {
        return;
      }

      setResultsLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setTargets(result.data);
    }

    void loadActiveTargets();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, selectedCategoryId, selectedTagSlugs]);

  function toggleTag(tagSlug: string): void {
    setSelectedTagSlugs((current) =>
      current.includes(tagSlug)
        ? current.filter((slug) => slug !== tagSlug)
        : [...current, tagSlug].sort()
    );
  }

  function clearFilters(): void {
    setSelectedTagSlugs([]);
    setSelectedCategoryId(null);
    setTargets([]);
  }

  if (currentWorkspace === null) {
    return (
      <section className="metadata-page">
        <div className="page-heading">
          <p className="top-eyebrow">Metadata</p>
          <h2>Tags & Categories</h2>
          <p>Open or create a local workspace before browsing metadata.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="metadata-page">
      <div className="page-heading page-heading-actions">
        <div>
          <p className="top-eyebrow">Metadata</p>
          <h2>Tags & Categories</h2>
          <p>
            Browse local tags and categories across projects, Inbox items, notes,
            lists, and checklist rows.
          </p>
        </div>
        <button
          className="secondary-button"
          disabled={loading}
          type="button"
          onClick={() => void loadMetadata(currentWorkspace.id)}
        >
          <RefreshCw size={17} aria-hidden="true" />
          Refresh
        </button>
      </div>

      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      <div className="metadata-browser-layout">
        <MetadataFilterPanel
          categories={categories.map(toCategoryOption)}
          disabled={loading || resultsLoading}
          selectedCategoryId={selectedCategoryId}
          selectedTagSlugs={selectedTagSlugs}
          tags={tags.map(toTagOption)}
          onClear={clearFilters}
          onSelectCategory={setSelectedCategoryId}
          onToggleTag={toggleTag}
        />

        <section className="metadata-results-panel" aria-busy={resultsLoading}>
          <div className="metadata-results-heading">
            <div>
              <p className="top-eyebrow">Matches</p>
              <h3>{formatSelectionTitle(selectedTagSlugs, selectedCategory)}</h3>
            </div>
            <span>{targets.length} target{targets.length === 1 ? "" : "s"}</span>
          </div>

          {!hasActiveFilter ? (
            <MetadataEmptyState
              title="Select metadata"
              description="Choose one or more tags, a category, or both."
            />
          ) : resultsLoading ? (
            <p className="muted-text">Loading matches...</p>
          ) : targets.length === 0 ? (
            <MetadataEmptyState
              title="No matching targets"
              description="Archived and deleted records are excluded from this browser."
            />
          ) : (
            <div className="metadata-result-groups">
              {groupedTargets.map((group) => (
                <MetadataTargetGroup key={group.label} group={group} />
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function MetadataTargetGroup({
  group
}: {
  group: MetadataTargetGroupModel;
}): React.JSX.Element {
  return (
    <section className="metadata-result-group" aria-labelledby={group.id}>
      <div className="metadata-result-group-heading">
        {group.icon}
        <h4 id={group.id}>{group.label}</h4>
      </div>
      <div className="metadata-target-list">
        {group.targets.map((target) => (
          <MetadataTargetCard key={`${target.targetType}:${target.targetId}`} target={target} />
        ))}
      </div>
    </section>
  );
}

function MetadataTargetCard({
  target
}: {
  target: MetadataTargetSummary;
}): React.JSX.Element {
  const title =
    target.targetType === "container" && target.kind === "project" ? (
      <Link className="text-link" to={`/projects/${target.targetId}`}>
        {target.title}
      </Link>
    ) : (
      <strong>{target.title}</strong>
    );

  return (
    <article className="metadata-target-card">
      <div className="metadata-target-main">
        <div>
          <span className="item-type-badge">{formatKind(target.kind)}</span>
          {title}
        </div>
        {target.body === null ? null : <p>{target.body}</p>}
      </div>
      <div className="metadata-target-metadata">
        <span>{target.status}</span>
        <CategoryBadge category={target.category} fallbackLabel="No category" />
        {target.tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </div>
    </article>
  );
}

function MetadataEmptyState({
  description,
  title
}: {
  description: string;
  title: string;
}): React.JSX.Element {
  return (
    <div className="item-feed-empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

type MetadataTargetGroupModel = {
  id: string;
  label: string;
  icon: React.ReactNode;
  targets: MetadataTargetSummary[];
};

function groupTargets(
  targets: readonly MetadataTargetSummary[]
): MetadataTargetGroupModel[] {
  const containers = targets.filter((target) => target.targetType === "container");
  const items = targets.filter((target) => target.targetType === "item");
  const listItems = targets.filter((target) => target.targetType === "list_item");

  return [
    {
      id: "metadata-targets-containers",
      label: "Containers",
      icon: <FolderKanban size={17} aria-hidden="true" />,
      targets: containers
    },
    {
      id: "metadata-targets-items",
      label: "Items",
      icon: <Layers size={17} aria-hidden="true" />,
      targets: items
    },
    {
      id: "metadata-targets-list-items",
      label: "Checklist rows",
      icon: <ListChecks size={17} aria-hidden="true" />,
      targets: listItems
    }
  ].filter((group) => group.targets.length > 0);
}

function toTagOption(tag: TagCountSummary): MetadataTagFilterOption {
  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    targetCount: tag.targetCount
  };
}

function toCategoryOption(
  category: CategoryCountSummary
): MetadataCategoryFilterOption {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    targetCount: category.targetCount
  };
}

function formatSelectionTitle(
  tagSlugs: readonly string[],
  category: CategoryCountSummary | null
): string {
  const parts = [
    ...tagSlugs.map((slug) => `@${slug}`),
    ...(category === null ? [] : [category.name])
  ];

  return parts.length === 0 ? "No filter selected" : parts.join(" + ");
}

function formatKind(kind: string): string {
  return kind
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
