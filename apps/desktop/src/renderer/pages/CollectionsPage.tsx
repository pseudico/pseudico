import { CheckCircle2, FolderPlus, Printer, RefreshCw } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent
} from "react";
import { useNavigate } from "react-router-dom";
import { resolveContextMenuActions, type ContextMenuTarget } from "@local-work-os/core";
import {
  ContextMenu,
  CreateCollectionForm,
  GroupedResultsList,
  SmartListEditor,
  type CreateCollectionFormValues,
  type GroupedResultGroupViewModel,
  type GroupedResultViewModel,
  type SnoozePreset,
  type SmartListEditorMetadataOption,
  type SmartListEditorValues
} from "@local-work-os/ui";
import type {
  CategoryCountSummary,
  CollectionEvaluationSummary,
  CollectionSummary,
  LocalWorkOsApi,
  ProjectSummary,
  SmartListPreviewSummary,
  SmartListSummary,
  TagCountSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type CollectionsPageProps = {
  apiClient?: LocalWorkOsApi;
  initialCollections?: CollectionSummary[];
  initialEvaluation?: CollectionEvaluationSummary | null;
  initialProjects?: ProjectSummary[];
  initialSmartLists?: SmartListSummary[];
};

const COLLECTION_PAGE_SIZE = 50;

export function CollectionsPage({
  apiClient = desktopApiClient,
  initialCollections,
  initialEvaluation = null,
  initialProjects,
  initialSmartLists
}: CollectionsPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [collections, setCollections] = useState<CollectionSummary[]>(
    initialCollections ?? []
  );
  const [projects, setProjects] = useState<ProjectSummary[]>(initialProjects ?? []);
  const [smartLists, setSmartLists] = useState<SmartListSummary[]>(
    initialSmartLists ?? []
  );
  const [tags, setTags] = useState<TagCountSummary[]>([]);
  const [categories, setCategories] = useState<CategoryCountSummary[]>([]);
  const [smartListPreview, setSmartListPreview] =
    useState<SmartListPreviewSummary | null>(null);
  const [smartListMessage, setSmartListMessage] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(
    initialEvaluation?.collection.id ?? initialCollections?.[0]?.id ?? null
  );
  const [evaluation, setEvaluation] =
    useState<CollectionEvaluationSummary | null>(initialEvaluation);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [printBusy, setPrintBusy] = useState(false);
  const [printMessage, setPrintMessage] = useState<string | null>(null);
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
  const smartListTagOptions = useMemo(
    () =>
      tags.map(
        (tag): SmartListEditorMetadataOption => ({
          id: tag.id,
          label: `@${tag.name}`,
          value: tag.slug,
          count: tag.targetCount
        })
      ),
    [tags]
  );
  const smartListCategoryOptions = useMemo(
    () =>
      categories.map(
        (category): SmartListEditorMetadataOption => ({
          id: category.id,
          label: category.name,
          value: category.id,
          count: category.targetCount
        })
      ),
    [categories]
  );

  const loadCollections = useCallback(async () => {
    if (currentWorkspace === null || initialCollections !== undefined) {
      return;
    }

    setLoading(true);
    setError(null);

    const [
      collectionResult,
      projectResult,
      smartListResult,
      tagResult,
      categoryResult
    ] = await Promise.all([
      apiClient.collections.listCollections(currentWorkspace.id),
      apiClient.projects.listProjects(currentWorkspace.id),
      apiClient.collections.listSmartLists(currentWorkspace.id),
      apiClient.metadata.listTagsWithCounts(currentWorkspace.id),
      apiClient.metadata.listCategoriesWithCounts(currentWorkspace.id)
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

    if (!smartListResult.ok) {
      setError(smartListResult.error.message);
    } else {
      setSmartLists(smartListResult.data);
    }

    if (!tagResult.ok) {
      setError(tagResult.error.message);
    } else {
      setTags(tagResult.data);
    }

    if (!categoryResult.ok) {
      setError(categoryResult.error.message);
    } else {
      setCategories(categoryResult.data);
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
    const result = await apiClient.collections.evaluateCollection({
      collectionId: selectedCollectionId,
      limit: COLLECTION_PAGE_SIZE,
      offset: 0
    });
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setEvaluation(result.data);
  }, [apiClient, initialEvaluation, selectedCollectionId]);

  async function loadMoreCollectionResults(): Promise<void> {
    if (selectedCollectionId === null || evaluation === null || loading) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await apiClient.collections.evaluateCollection({
      collectionId: selectedCollectionId,
      limit: COLLECTION_PAGE_SIZE,
      offset: evaluation.results.length
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setEvaluation(mergeCollectionEvaluation(evaluation, result.data));
  }

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

  async function previewSmartList(values: SmartListEditorValues): Promise<void> {
    if (currentWorkspace === null) {
      return;
    }

    setSaving(true);
    setSmartListMessage(null);
    setError(null);

    const result = await apiClient.collections.previewSmartList({
      workspaceId: currentWorkspace.id,
      criteria: toSmartListCriteria(values),
      limit: COLLECTION_PAGE_SIZE,
      offset: 0
    });

    setSaving(false);

    if (!result.ok) {
      setSmartListPreview(null);
      setSmartListMessage(result.error.message);
      return;
    }

    setSmartListPreview(result.data);
    setSmartListMessage("Query is valid.");
  }

  async function saveSmartList(values: SmartListEditorValues): Promise<void> {
    if (currentWorkspace === null) {
      return;
    }

    setSaving(true);
    setSmartListMessage(null);
    setError(null);

    const result = await apiClient.collections.createSmartList({
      workspaceId: currentWorkspace.id,
      name: values.name.trim(),
      description:
        values.description.trim().length === 0 ? null : values.description.trim(),
      criteria: toSmartListCriteria(values)
    });

    setSaving(false);

    if (!result.ok) {
      setSmartListMessage(result.error.message);
      return;
    }

    setSmartLists((current) => [...current, result.data]);
    setSmartListMessage(`Saved "${result.data.name}" as a smart list.`);
    await previewSmartList(values);
  }

  async function completeTask(itemId: string): Promise<void> {
    setError(null);
    const result = await apiClient.tasks.completeTask(itemId);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    await refreshSelectedCollection();
  }

  async function refreshSelectedCollection(): Promise<void> {
    if (selectedCollectionId === null) {
      return;
    }

    setLoading(true);
    setError(null);

    const result = await apiClient.collections.evaluateCollection({
      collectionId: selectedCollectionId,
      limit: Math.max(evaluation?.results.length ?? COLLECTION_PAGE_SIZE, COLLECTION_PAGE_SIZE),
      offset: 0
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setEvaluation(result.data);
  }

  async function snoozeTask(
    result: GroupedResultViewModel,
    preset: SnoozePreset
  ): Promise<void> {
    setBusyTaskId(result.targetId);
    setError(null);

    const mutation = await apiClient.tasks.snoozeTask({
      itemId: result.targetId,
      preset
    });

    setBusyTaskId(null);

    if (!mutation.ok) {
      setError(mutation.error.message);
      return;
    }

    await refreshSelectedCollection();
  }

  async function rescheduleTask(
    result: GroupedResultViewModel,
    dueAt: string | null
  ): Promise<void> {
    setBusyTaskId(result.targetId);
    setError(null);

    const mutation = await apiClient.tasks.rescheduleTask({
      itemId: result.targetId,
      dueAt,
      allDay: true
    });

    setBusyTaskId(null);

    if (!mutation.ok) {
      setError(mutation.error.message);
      return;
    }

    await refreshSelectedCollection();
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

  async function printSelectedCollectionPdf(): Promise<void> {
    if (currentWorkspace === null || selectedCollection === null) {
      return;
    }

    const printableItemIds =
      evaluation?.results
        .filter((result) => result.targetType === "item")
        .map((result) => result.targetId) ?? [];

    if (printableItemIds.length === 0) {
      setError("Evaluate this collection before printing item results.");
      return;
    }

    setPrintBusy(true);
    setPrintMessage(null);
    setError(null);

    const result = await apiClient.print?.printPdf({
      workspaceId: currentWorkspace.id,
      title: selectedCollection.name,
      itemIds: printableItemIds
    });

    setPrintBusy(false);

    if (result === undefined) {
      setError("Print/PDF export is not available.");
      return;
    }

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setPrintMessage(`Collection PDF created at ${result.data.relativePath}.`);
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
    <section className="collections-page" aria-busy={loading || busyTaskId !== null}>
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

          <SmartListEditor
            categoryOptions={smartListCategoryOptions}
            disabled={saving}
            previewCount={smartListPreview?.total ?? null}
            saving={saving}
            tagOptions={smartListTagOptions}
            validationMessage={smartListMessage}
            onPreview={(values) => void previewSmartList(values)}
            onSave={(values) => void saveSmartList(values)}
          />

          <div className="collection-list" aria-label="Smart lists">
            {smartLists.length === 0 ? (
              <div className="item-feed-empty-state">
                <h3>No smart lists</h3>
                <p>Use the criteria editor to save a smart list.</p>
              </div>
            ) : (
              smartLists.map((smartList) => (
                <ContextMenu
                  actions={savedViewActions(toSavedViewTarget(smartList.id, smartList.name, "smart_list"))}
                  key={smartList.id}
                  label={`Context menu for ${smartList.name}`}
                  target={toSavedViewTarget(smartList.id, smartList.name, "smart_list")}
                >
                  <div className="collection-list-item">
                    <span>
                      <strong>{smartList.name}</strong>
                      <small>smart_list</small>
                    </span>
                    <span>{countSmartListConditions(smartList)} criteria</span>
                  </div>
                </ContextMenu>
              ))
            )}
          </div>

          <div className="collection-list">
            {collections.length === 0 ? (
              <div className="item-feed-empty-state">
                <h3>No collections</h3>
                <p>Create a tag or keyword collection to save it here.</p>
              </div>
            ) : (
              collections.map((collection) => (
                <ContextMenu
                  actions={savedViewActions(toSavedViewTarget(collection.id, collection.name, collection.kind))}
                  key={collection.id}
                  label={`Context menu for ${collection.name}`}
                  target={toSavedViewTarget(collection.id, collection.name, collection.kind)}
                >
                  <button
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
                </ContextMenu>
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
                <div className="button-row">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={printBusy}
                    onClick={() => void printSelectedCollectionPdf()}
                  >
                    <Printer size={16} aria-hidden="true" />
                    <span>Print / PDF</span>
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => void evaluateSelectedCollection()}
                  >
                    <RefreshCw size={16} aria-hidden="true" />
                    <span>Refresh</span>
                  </button>
                </div>
              </header>

              {printMessage === null ? null : (
                <p className="form-message">{printMessage}</p>
              )}

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
                onRescheduleTask={(result, dueAt) =>
                  void rescheduleTask(result, dueAt)
                }
                onSnoozeTask={(result, preset) =>
                  void snoozeTask(result, preset)
                }
              />
              {evaluation?.page?.hasMore === true ? (
                <button
                  className="secondary-button load-more-button"
                  disabled={loading}
                  type="button"
                  onClick={() => void loadMoreCollectionResults()}
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              ) : null}
            </>
          )}
        </main>
      </div>
    </section>
  );
}

function mergeCollectionEvaluation(
  current: CollectionEvaluationSummary,
  next: CollectionEvaluationSummary
): CollectionEvaluationSummary {
  const results = [...current.results, ...next.results];
  const groupsByKey = new Map(
    current.groups.map((group) => [
      group.key,
      { ...group, results: [...group.results] }
    ])
  );

  for (const group of next.groups) {
    const existing = groupsByKey.get(group.key);

    if (existing === undefined) {
      groupsByKey.set(group.key, { ...group, results: [...group.results] });
    } else {
      existing.results.push(...group.results);
    }
  }

  return {
    ...next,
    results,
    groups: [...groupsByKey.values()],
    page: {
      ...(next.page ?? {
        limit: results.length,
        offset: 0,
        hasMore: false
      }),
      offset: 0
    }
  };
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

function toSmartListCriteria(values: SmartListEditorValues) {
  return {
    match: values.match,
    includeItems: values.includeItems,
    includeContainers: values.includeContainers,
    itemTypes: values.itemTypes,
    containerTypes: values.containerTypes,
    tagSlugs: values.tagSlugs,
    categoryIds: values.categoryIds,
    categoryMode: values.categoryMode,
    taskStatuses: values.taskStatuses,
    taskPriorities: values.taskPriorities,
    dueFilter: values.dueFilter,
    customDueFrom: values.customDueFrom,
    customDueTo: values.customDueTo
  };
}

function countSmartListConditions(smartList: SmartListSummary): number {
  const query = smartList.query;

  if (
    typeof query === "object" &&
    query !== null &&
    "conditions" in query &&
    Array.isArray(query.conditions)
  ) {
    return query.conditions.length;
  }

  return 0;
}

function toSavedViewTarget(
  id: string,
  label: string,
  kind: string
): ContextMenuTarget {
  return {
    id,
    type: "savedView",
    label,
    kind,
    capabilities: {
      edit: false,
      move: false,
      pin: false,
      archive: false,
      duplicate: false,
      copyLink: false,
      inspect: false,
      delete: false
    }
  };
}

function savedViewActions(target: ContextMenuTarget) {
  return resolveContextMenuActions({
    target,
    hideDisabled: false
  }).map((action) => ({
    id: action.id,
    title: action.title,
    group: action.group,
    disabledReason: action.disabledReason,
    danger: action.danger
  }));
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
      taskPriority: result.taskPriority ?? null,
      dueAt: result.dueAt,
      tags: result.tags,
      destinationPath: result.destinationPath
    }))
  };
}
