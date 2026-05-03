import { CheckCircle2, FolderPlus, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from "react";
import { useNavigate } from "react-router-dom";
import {
  CreateCollectionForm,
  GroupedResultsList,
  type CreateCollectionFormValues,
  type GroupedResultGroupViewModel
} from "@local-work-os/ui";
import type {
  CollectionEvaluationSummary,
  CollectionSummary,
  LocalWorkOsApi,
  ProjectSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type CollectionsPageProps = {
  apiClient?: LocalWorkOsApi;
  initialCollections?: CollectionSummary[];
  initialEvaluation?: CollectionEvaluationSummary | null;
  initialProjects?: ProjectSummary[];
};

export function CollectionsPage({
  apiClient = desktopApiClient,
  initialCollections,
  initialEvaluation = null,
  initialProjects
}: CollectionsPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [collections, setCollections] = useState<CollectionSummary[]>(
    initialCollections ?? []
  );
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects ?? []);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    initialEvaluation?.collection.id ?? initialCollections?.[0]?.id ?? null
  );
  const [evaluation, setEvaluation] =
    useState<CollectionEvaluationSummary | null>(initialEvaluation);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskContainerId, setTaskContainerId] = useState(
    initialProjects?.[0]?.id ?? ""
  );
  const selectedCollection = useMemo(
    () =>
      collections.find((collection) => collection.id === selectedCollectionId) ??
      null,
    [collections, selectedCollectionId]
  );
  const groupedResults = useMemo(
    () => evaluation?.groups.map(toGroupedResultGroupViewModel) ?? [],
    [evaluation]
  );

  const loadCollections = useCallback(async () => {
    if (currentWorkspace === null || initialCollections !== undefined) {
      return;
    }

    setLoading(true);
    setError(null);

    const [collectionResult, projectResult] = await Promise.all([
      apiClient.collections.listCollections(currentWorkspace.id),
      apiClient.projects.listProjects(currentWorkspace.id)
    ]);

    setLoading(false);

    if (!collectionResult.ok) {
      setError(collectionResult.error.message);
      return;
    }

    setCollections(collectionResult.data);

    if (!projectResult.ok) {
      setError(projectResult.error.message);
    } else {
      setProjects(projectResult.data);
      setTaskContainerId((current) => current || (projectResult.data[0]?.id ?? ""));
    }

    const firstCollectionId = collectionResult.data[0]?.id;

    if (firstCollectionId !== undefined && selectedCollectionId === null) {
      setSelectedCollectionId(firstCollectionId);
    }
  }, [apiClient, currentWorkspace, initialCollections, selectedCollectionId]);

  const evaluateSelectedCollection = useCallback(async () => {
    if (selectedCollectionId === null || initialEvaluation !== null) {
      return;
    }

    setLoading(true);
    setError(null);
    const result = await apiClient.collections.evaluateCollection(selectedCollectionId);
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setEvaluation(result.data);
  }, [apiClient, initialEvaluation, selectedCollectionId]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  useEffect(() => {
    void evaluateSelectedCollection();
  }, [evaluateSelectedCollection]);

  async function createCollection(values: CreateCollectionFormValues): Promise<void> {
    if (currentWorkspace === null) {
      return;
    }

    setSaving(true);
    setError(null);

    const result =
      values.mode === "tag"
        ? await apiClient.collections.createTagCollection({
            workspaceId: currentWorkspace.id,
            tagSlug: values.value,
            ...(values.name.length === 0 ? {} : { name: values.name })
          })
        : await apiClient.collections.createKeywordCollection({
            workspaceId: currentWorkspace.id,
            query: values.value,
            ...(values.name.length === 0 ? {} : { name: values.name })
          });

    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCollections((current) => [...current, result.data]);
    setSelectedCollectionId(result.data.id);
    setEvaluation(null);
  }

  async function completeTask(itemId: string): Promise<void> {
    setError(null);
    const result = await apiClient.tasks.completeTask(itemId);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    await evaluateSelectedCollection();
  }

  async function createTaskInCollection(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    if (
      currentWorkspace === null ||
      selectedCollection === null ||
      taskContainerId.length === 0 ||
      taskTitle.trim().length === 0
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    const result = await apiClient.collections.createTaskInCollection({
      workspaceId: currentWorkspace.id,
      collectionId: selectedCollection.id,
      containerId: taskContainerId,
      title: taskTitle.trim()
    });

    setSaving(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setTaskTitle("");
    await evaluateSelectedCollection();
  }

  if (currentWorkspace === null) {
    return (
      <section className="collections-page">
        <div className="page-heading">
          <p className="top-eyebrow">Saved views</p>
          <h2>Collections</h2>
          <p>Open or create a local workspace before using collections.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="collections-page" aria-busy={loading}>
      <div className="page-heading">
        <p className="top-eyebrow">Saved views</p>
        <h2>Collections</h2>
      </div>

      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      <div className="collections-layout">
        <aside className="collections-sidebar" aria-label="Collections">
          <CreateCollectionForm disabled={saving} onSubmit={createCollection} />

          <div className="collection-list">
            {collections.length === 0 ? (
              <div className="item-feed-empty-state">
                <h3>No collections</h3>
                <p>Create a tag or keyword collection to save it here.</p>
              </div>
            ) : (
              collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  className="collection-list-item"
                  aria-pressed={collection.id === selectedCollectionId}
                  onClick={() => {
                    setSelectedCollectionId(collection.id);
                    setEvaluation(null);
                  }}
                >
                  <span>
                    <strong>{collection.name}</strong>
                    <small>{formatCollectionDetail(collection)}</small>
                  </span>
                  <span>{collection.kind}</span>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="collections-results-panel">
          {selectedCollection === null ? (
            <div className="item-feed-empty-state">
              <h3>Select a collection</h3>
              <p>Saved collection results will appear in this workspace panel.</p>
            </div>
          ) : (
            <>
              <header className="collection-detail-heading">
                <div>
                  <p className="top-eyebrow">{selectedCollection.kind}</p>
                  <h3>{selectedCollection.name}</h3>
                  {selectedCollection.description === null ? null : (
                    <p>{selectedCollection.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void evaluateSelectedCollection()}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                  <span>Refresh</span>
                </button>
              </header>

              {selectedCollection.kind === "tag" ? (
                <form
                  className="collection-task-form"
                  onSubmit={(event) => void createTaskInCollection(event)}
                >
                  <label className="field-label">
                    <span>Task</span>
                    <input
                      type="text"
                      value={taskTitle}
                      placeholder="Follow up"
                      onChange={(event) => setTaskTitle(event.target.value)}
                    />
                  </label>
                  <label className="field-label">
                    <span>Project</span>
                    <select
                      value={taskContainerId}
                      onChange={(event) => setTaskContainerId(event.target.value)}
                    >
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="secondary-button"
                    disabled={
                      saving ||
                      projects.length === 0 ||
                      taskTitle.trim().length === 0
                    }
                  >
                    <FolderPlus size={16} aria-hidden="true" />
                    <span>Add task</span>
                  </button>
                </form>
              ) : null}

              <div className="collection-results-summary">
                <span>{evaluation?.total ?? 0} result{evaluation?.total === 1 ? "" : "s"}</span>
                {loading ? (
                  <span>Loading</span>
                ) : (
                  <span>
                    <CheckCircle2 size={16} aria-hidden="true" />
                    Active
                  </span>
                )}
              </div>

              <GroupedResultsList
                groups={groupedResults}
                onCompleteTask={(itemId) => void completeTask(itemId)}
                onOpenResult={(path) => navigate(path)}
              />
            </>
          )}
        </main>
      </div>
    </section>
  );
}

function formatCollectionDetail(collection: CollectionSummary): string {
  if (collection.kind === "tag") {
    return collection.tagSlug === null ? "Tag collection" : `@${collection.tagSlug}`;
  }

  if (collection.kind === "keyword") {
    return collection.keyword ?? "Keyword collection";
  }

  return "Saved query";
}

function toGroupedResultGroupViewModel(
  group: CollectionEvaluationSummary["groups"][number]
): GroupedResultGroupViewModel {
  return {
    key: group.key,
    label: group.label,
    results: group.results.map((result) => ({
      targetType: result.targetType,
      targetId: result.targetId,
      kind: result.kind,
      title: result.title,
      containerTitle: result.containerTitle,
      categoryName: result.categoryName,
      taskStatus: result.taskStatus,
      dueAt: result.dueAt,
      tags: result.tags,
      destinationPath: result.destinationPath
    }))
  };
}
