import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  SearchFilters,
  SearchResultCard,
  formatAustralianDate,
  renderLoadableState,
  type SearchFiltersValue,
  type SearchResultCardViewModel,
  type SnoozePreset
} from "@local-work-os/ui";
import type {
  LocalWorkOsApi,
  RecentSearchSummary,
  SearchFilterInput,
  SearchResultKind,
  SearchWorkspaceInput,
  SearchResultSummary,
  WorkspaceSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type SearchPageProps = {
  apiClient?: LocalWorkOsApi;
  disableLiveLoading?: boolean;
  initialQuery?: string;
  initialKinds?: SearchResultKind[];
  initialResults?: SearchResultSummary[];
  initialWorkspace?: WorkspaceSummary;
};

const searchKindOptions = [
  { label: "Inbox", value: "inbox" },
  { label: "Projects", value: "project" },
  { label: "Contacts", value: "contact" },
  { label: "Tasks", value: "task" },
  { label: "Lists", value: "list" },
  { label: "Notes", value: "note" },
  { label: "Files", value: "file" },
  { label: "Links", value: "link" },
  { label: "Checklist rows", value: "list_item" }
] as const satisfies readonly { label: string; value: SearchResultKind }[];

const SEARCH_PAGE_SIZE = 30;
const emptySearchFilters: SearchFiltersValue<SearchResultKind> = {
  kinds: [],
  tags: "",
  category: "",
  status: "",
  dueFrom: "",
  dueTo: "",
  includeArchived: false
};

type SearchResultGroup = {
  key: SearchResultKind | string;
  label: string;
  description: string;
  results: SearchResultCardViewModel[];
};

export function SearchPage({
  apiClient = desktopApiClient,
  disableLiveLoading = false,
  initialQuery,
  initialKinds = [],
  initialResults = [],
  initialWorkspace
}: SearchPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentWorkspace } = useWorkspaceStore();
  const workspace = initialWorkspace ?? currentWorkspace;
  const searchParamsKey = searchParams.toString();
  const queryFromRoute = searchParams.get("q") ?? "";
  const [draftQuery, setDraftQuery] = useState(initialQuery ?? queryFromRoute);
  const [filterDraft, setFilterDraft] = useState<SearchFiltersValue<SearchResultKind>>(
    () => {
      const routeFilters = parseSearchFiltersFromParams(searchParams);

      return {
        ...routeFilters,
        kinds: initialKinds.length > 0 ? initialKinds : routeFilters.kinds
      };
    }
  );
  const [results, setResults] = useState<SearchResultSummary[]>(initialResults);
  const [recentSearches, setRecentSearches] = useState<RecentSearchSummary[]>([]);
  const [hasMoreResults, setHasMoreResults] = useState(
    initialResults.length >= SEARCH_PAGE_SIZE
  );
  const [loading, setLoading] = useState(false);
  const [settledSearchKey, setSettledSearchKey] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const activeQuery = initialQuery ?? queryFromRoute;
  const activeFilters = useMemo(
    () =>
      initialQuery === undefined
        ? parseSearchFiltersFromParams(new URLSearchParams(searchParamsKey))
        : { ...emptySearchFilters, kinds: initialKinds },
    [initialKinds, initialQuery, searchParamsKey]
  );
  const parsedQuery = useMemo(
    () => ({ chips: parseStructuredSearchChips(draftQuery) }),
    [draftQuery]
  );
  const activeParsedQuery = useMemo(
    () => ({ chips: parseStructuredSearchChips(activeQuery) }),
    [activeQuery]
  );
  const suggestions = useMemo(
    () => getStructuredSearchSuggestions(draftQuery),
    [draftQuery]
  );
  const visibleResults = useMemo(
    () => results.map((result) => toSearchResultCardViewModel(result, activeQuery)),
    [activeQuery, results]
  );
  const visibleResultGroups = useMemo(
    () => groupSearchResults(visibleResults),
    [visibleResults]
  );
  const activeFilterSummary = useMemo(
    () => summarizeActiveFilters(activeFilters),
    [activeFilters]
  );
  const activeSearchStateKey = useMemo(
    () => buildSearchStateKey(activeQuery, activeFilters),
    [activeFilters, activeQuery]
  );
  const searchPending = loading && settledSearchKey !== activeSearchStateKey;

  useEffect(() => {
    if (initialQuery !== undefined) {
      return;
    }

    setDraftQuery(queryFromRoute);
    setFilterDraft(parseSearchFiltersFromParams(new URLSearchParams(searchParamsKey)));
  }, [initialQuery, queryFromRoute, searchParamsKey]);

  useEffect(() => {
    if (workspace === null || disableLiveLoading) {
      setRecentSearches([]);
      return;
    }

    let active = true;
    void apiClient.search.listRecentSearches(workspace.id).then((result) => {
      if (!active || !result.ok) {
        return;
      }
      setRecentSearches(result.data);
    });

    return () => {
      active = false;
    };
  }, [apiClient, disableLiveLoading, workspace]);

  useEffect(() => {
    if (workspace === null || initialResults.length > 0 || disableLiveLoading) {
      return;
    }

    const trimmedQuery = activeQuery.trim();
    const filterInput = toSearchFilterInput(activeFilters);

    if (trimmedQuery.length === 0 && filterInput === undefined) {
      setResults([]);
      setError(null);
      setHasMoreResults(false);
      setLoading(false);
      setSettledSearchKey(activeSearchStateKey);
      return;
    }

    let active = true;
    const workspaceId = workspace.id;
    const searchStateKey = activeSearchStateKey;

    async function runSearch(): Promise<void> {
      setLoading(true);
      setError(null);
      setResults([]);
      setHasMoreResults(false);

      const input: SearchWorkspaceInput = {
        workspaceId,
        query: trimmedQuery,
        limit: SEARCH_PAGE_SIZE,
        offset: 0
      };

      if (filterInput !== undefined) {
        input.filters = filterInput;
      }

      const result = await apiClient.search.searchWorkspace(input);

      if (!active) {
        return;
      }

      setLoading(false);
      setSettledSearchKey(searchStateKey);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setResults(result.data);
      await refreshRecentSearches();
      setActiveResultIndex(0);
      setHasMoreResults(result.data.length === SEARCH_PAGE_SIZE);
    }

    void runSearch();

    return () => {
      active = false;
    };
  }, [activeSearchStateKey, apiClient, activeFilters, activeQuery, disableLiveLoading, initialResults.length, workspace]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmedQuery = draftQuery.trim();
    const params = new URLSearchParams();

    if (trimmedQuery.length > 0) {
      params.set("q", trimmedQuery);
    }

    appendSearchFiltersToParams(params, filterDraft);

    setSavedMessage(null);
    setSearchParams(params);
    setActiveResultIndex(0);
  }

  async function saveCurrentSearch(): Promise<void> {
    if (workspace === null || activeQuery.trim().length === 0) {
      return;
    }

    setError(null);
    setSavedMessage(null);
    const result = await apiClient.search.saveSearch({
      workspaceId: workspace.id,
      query: activeQuery,
      name: `Search: ${activeQuery.trim().slice(0, 64)}`
    });

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSavedMessage(`Saved search "${result.data.name}".`);
  }

  async function reloadSearchResults(): Promise<void> {
    if (workspace === null) {
      return;
    }

    const trimmedQuery = activeQuery.trim();
    const filterInput = toSearchFilterInput(activeFilters);

    if (trimmedQuery.length === 0 && filterInput === undefined) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    const input: SearchWorkspaceInput = {
      workspaceId: workspace.id,
      query: trimmedQuery,
      limit: Math.max(results.length, SEARCH_PAGE_SIZE),
      offset: 0
    };

    if (filterInput !== undefined) {
      input.filters = filterInput;
    }

    const result = await apiClient.search.searchWorkspace(input);

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setResults(result.data);
    await refreshRecentSearches();
    setActiveResultIndex(0);
    setHasMoreResults(result.data.length === input.limit);
  }

  async function snoozeTask(
    result: SearchResultCardViewModel,
    preset: SnoozePreset
  ): Promise<void> {
    setBusyTaskId(result.targetId);
    setError(null);

    const mutation = await apiClient.tasks.snooze({
      itemId: result.targetId,
      preset
    });

    setBusyTaskId(null);

    if (!mutation.ok) {
      setError(mutation.error.message);
      return;
    }

    await reloadSearchResults();
  }

  async function rescheduleTask(
    result: SearchResultCardViewModel,
    dueAt: string | null
  ): Promise<void> {
    setBusyTaskId(result.targetId);
    setError(null);

    const mutation = await apiClient.tasks.reschedule({
      itemId: result.targetId,
      dueAt,
      allDay: true
    });

    setBusyTaskId(null);

    if (!mutation.ok) {
      setError(mutation.error.message);
      return;
    }

    await reloadSearchResults();
  }

  async function loadMoreResults(): Promise<void> {
    if (workspace === null || loading) {
      return;
    }

    const trimmedQuery = activeQuery.trim();
    const filterInput = toSearchFilterInput(activeFilters);

    if (trimmedQuery.length === 0 && filterInput === undefined) {
      return;
    }

    setLoading(true);
    setError(null);

    const input: SearchWorkspaceInput = {
      workspaceId: workspace.id,
      query: trimmedQuery,
      limit: SEARCH_PAGE_SIZE,
      offset: results.length
    };

    if (filterInput !== undefined) {
      input.filters = filterInput;
    }

    const result = await apiClient.search.searchWorkspace(input);

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setResults((current) => [...current, ...result.data]);
    setHasMoreResults(result.data.length === SEARCH_PAGE_SIZE);
  }

  function applyFilters(): void {
    const params = new URLSearchParams(searchParams);
    params.delete("type");
    params.delete("tag");
    params.delete("category");
    params.delete("status");
    params.delete("dueFrom");
    params.delete("dueTo");
    params.delete("archived");
    appendSearchFiltersToParams(params, filterDraft);
    setSavedMessage(null);
    setSearchParams(params);
  }

  function resetFilters(): void {
    const params = new URLSearchParams(searchParams);
    params.delete("type");
    params.delete("tag");
    params.delete("category");
    params.delete("status");
    params.delete("dueFrom");
    params.delete("dueTo");
    params.delete("archived");
    setFilterDraft(emptySearchFilters);
    setSavedMessage(null);
    setSearchParams(params);
  }

  async function refreshRecentSearches(): Promise<void> {
    if (workspace === null || disableLiveLoading) {
      return;
    }

    const result = await apiClient.search.listRecentSearches(workspace.id);

    if (result.ok) {
      setRecentSearches(result.data);
    }
  }

  function useRecentSearch(entry: RecentSearchSummary): void {
    const params = new URLSearchParams();
    if (entry.query.length > 0) {
      params.set("q", entry.query);
    }
    appendSearchFiltersToParams(params, toSearchFiltersValue(entry.filters));
    setDraftQuery(entry.query);
    setFilterDraft(toSearchFiltersValue(entry.filters));
    setSavedMessage(null);
    setSearchParams(params);
  }

  function openResult(resultId: string): void {
    const result = results.find((candidate) => candidate.id === resultId);

    if (result?.destinationPath !== undefined && result.destinationPath !== null) {
      navigate(buildHighlightedDestinationPath(result));
    }
  }

  function handleResultsKeyDown(event: React.KeyboardEvent<HTMLElement>): void {
    if (visibleResults.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveResultIndex((current) => Math.min(current + 1, visibleResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResultIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      openResult(visibleResults[Math.min(activeResultIndex, visibleResults.length - 1)]!.id);
    }
  }

  const activeResult = visibleResults.length === 0
    ? null
    : (visibleResults[Math.min(activeResultIndex, visibleResults.length - 1)] ?? null);

  if (workspace === null) {
    return (
      <section className="search-page">
        <div className="page-heading">
          <p className="top-eyebrow">Find</p>
          <h2>Search</h2>
          <p>Open or create a local workspace before searching indexed content.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="search-page">
      <div className="page-heading">
        <p className="top-eyebrow">Find</p>
        <h2>Search</h2>
        <p>
          Search projects, tasks, lists, notes, files, tags, and categories from the
          local workspace index.
        </p>
      </div>

      <form className="search-page-form" role="search" onSubmit={submitSearch}>
        <label
          className="search-page-input"
          data-space-budget-min-width="640px"
          data-space-budget-fallback-min-width="420px"
          data-space-budget-surface="search-command"
        >
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search query</span>
          <input
            type="search"
            value={draftQuery}
            placeholder="Search task, note, file, link, project, contact, tag, or saved view"
            onChange={(event) => setDraftQuery(event.target.value)}
          />
        </label>
        <button type="submit" className="primary-button">
          Search
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={activeQuery.trim().length === 0}
          onClick={() => void saveCurrentSearch()}
        >
          Save search as view
        </button>
      </form>

      {parsedQuery.chips.length === 0 ? null : (
        <div className="structured-search-chips" aria-label="Parsed search filters">
          {parsedQuery.chips.map((chip) => (
            <span key={`${chip.kind}:${chip.value}`} className="metadata-chip static-chip">
              {chip.label}: {chip.value}
            </span>
          ))}
        </div>
      )}

      {suggestions.length === 0 ? null : (
        <div className="structured-search-suggestions" aria-label="Structured search suggestions">
          <span>Try</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.token}
              type="button"
              className="metadata-chip"
              title={suggestion.description}
              onClick={() => setDraftQuery(applySuggestion(draftQuery, suggestion.token))}
            >
              {suggestion.token}
            </button>
          ))}
        </div>
      )}

      <div className="search-layout">
        <aside>
          <SearchFilters
            kindOptions={searchKindOptions}
            value={filterDraft}
            onApply={applyFilters}
            onChange={setFilterDraft}
            onReset={resetFilters}
          />
          {recentSearches.length === 0 ? null : (
            <div className="search-filter-panel" aria-label="Recent searches">
              <div className="panel-heading">
                <h3>Recent</h3>
              </div>
              <div className="search-filter-list">
                {recentSearches.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="metadata-chip"
                    onClick={() => useRecentSearch(entry)}
                  >
                    {formatRecentSearch(entry)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section
          className="search-results-panel"
          aria-busy={loading}
          data-space-budget-min-width="620px"
          data-space-budget-surface="search-results"
          onKeyDown={handleResultsKeyDown}
        >
          <div className="metadata-results-heading">
            <div>
              <p className="top-eyebrow">Results</p>
              <h3>{activeQuery.trim().length === 0 ? "No query" : activeQuery}</h3>
            </div>
            <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
          </div>

          {error === null ? null : <ErrorState error={error} title="Search error" />}
          {savedMessage === null ? null : (
            <p className="form-status-success">{savedMessage}</p>
          )}

          {activeParsedQuery.chips.length === 0 ? null : (
            <div className="structured-search-chips compact" aria-label="Active search filters">
              {activeParsedQuery.chips.map((chip) => (
                <span key={`${chip.kind}:${chip.value}`} className="metadata-chip static-chip">
                  {chip.label}: {chip.value}
                </span>
              ))}
            </div>
          )}

          <SearchTrustSummary
            activeQuery={activeQuery}
            groupCount={visibleResultGroups.length}
            includeArchived={activeFilters.includeArchived}
            loading={searchPending}
            resultCount={results.length}
          />

          {activeQuery.trim().length === 0 && toSearchFilterInput(activeFilters) === undefined ? (
            <SearchEmptyState
              title="Type a title, note phrase, contact, tag, or file name"
              description="Search uses the local workspace index. Try a project title, a phrase from a note, a contact name, or a type filter such as type:note."
            />
          ) : searchPending && results.length === 0 ? (
            renderLoadableState({
              loading: searchPending,
              loadingLabel: `Searching local index${activeQuery.trim().length === 0 ? "" : ` for "${activeQuery.trim()}"`}...`
            })
          ) : results.length === 0 ? (
            <SearchEmptyState
              title={`No visible matches${activeQuery.trim().length === 0 ? "" : ` for "${activeQuery.trim()}"`}`}
              description="Check spelling, remove a filter, try a shorter phrase, or include archived records if the work may have been archived. Deleted records stay hidden."
            />
          ) : (
            <div
              className="search-result-groups"
              aria-label="Search results grouped by type"
              aria-busy={searchPending || busyTaskId !== null}
            >
              {visibleResultGroups.map((group) => (
                <section
                  className="search-result-group"
                  key={group.key}
                  aria-labelledby={`search-result-group-${group.key}`}
                >
                  <div className="search-result-group-heading">
                    <div>
                      <h4 id={`search-result-group-${group.key}`}>{group.label}</h4>
                      <p>{group.description}</p>
                    </div>
                    <span>{group.results.length} result{group.results.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="load-more-list" aria-label={`${group.label} search results`}>
                    {group.results.map((result) => (
                      <div className="load-more-list-item" key={result.id}>
                        <SearchResultCard
                          result={{
                            ...result,
                            disabled: result.disabled === true || busyTaskId === result.targetId
                          }}
                          selected={visibleResults[activeResultIndex]?.id === result.id}
                          onOpen={openResult}
                          onRescheduleTask={rescheduleTask}
                          onSnoozeTask={snoozeTask}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
              {hasMoreResults ? (
                <button
                  className="secondary-button load-more-button"
                  disabled={searchPending || busyTaskId !== null}
                  type="button"
                  onClick={() => void loadMoreResults()}
                >
                  {searchPending ? "Loading..." : "Load more local results"}
                </button>
              ) : null}
            </div>
          )}
        </section>
        <SearchResultPreviewPanel
          activeQuery={activeQuery}
          filterSummary={activeFilterSummary}
          result={activeResult}
          {...(activeResult === null
            ? {}
            : { onOpen: () => openResult(activeResult.id) })}
        />
      </div>
    </section>
  );
}

function SearchResultPreviewPanel({
  activeQuery,
  filterSummary,
  onOpen,
  result
}: {
  activeQuery: string;
  filterSummary: string[];
  onOpen?: () => void;
  result: SearchResultCardViewModel | null;
}): React.JSX.Element {
  if (result === null) {
    return (
      <aside
        className="search-preview-panel"
        data-space-budget-min-width="320px"
        data-space-budget-surface="search-preview"
        aria-label="Search result preview"
      >
        <div className="panel-heading">
          <h3>Preview</h3>
        </div>
        <p>
          Select a result to see the full title, why it matched, container context,
          metadata, and the next safe action.
        </p>
        <div className="search-preview-context">
          <span>Current query</span>
          <strong>{activeQuery.trim().length === 0 ? "Not started" : activeQuery}</strong>
        </div>
      </aside>
    );
  }

  const tags = result.tags?.filter((tag) => tag.slug.trim().length > 0) ?? [];

  return (
    <aside
      className="search-preview-panel"
      data-space-budget-min-width="320px"
      data-space-budget-surface="search-preview"
      aria-label={`Preview for ${result.title}`}
    >
      <div className="panel-heading">
        <p className="top-eyebrow">{formatKindLabelForPreview(result.kind)}</p>
        <h3>{result.title}</h3>
      </div>
      <p className="search-preview-body">
        {result.body === undefined || result.body === null || result.body.trim().length === 0
          ? "No body preview is available for this result; use Open to inspect the full local record."
          : result.body}
      </p>
      <dl className="search-preview-metadata">
        <div>
          <dt>Why matched</dt>
          <dd>{result.whyMatched ?? "Matched title, body, metadata, or active filters."}</dd>
        </div>
        <div>
          <dt>Container</dt>
          <dd>{result.contextLabel ?? "Workspace-level result"}</dd>
        </div>
        <div>
          <dt>Status/date</dt>
          <dd>
            {[result.status, result.taskStatus, result.dueAt, result.updatedLabel]
              .filter((value): value is string => value !== undefined && value !== null && value.length > 0)
              .join(" · ") || "No status metadata"}
          </dd>
        </div>
        <div>
          <dt>Active filters</dt>
          <dd>{filterSummary.length === 0 ? "None" : filterSummary.join(" · ")}</dd>
        </div>
      </dl>
      {tags.length === 0 ? null : (
        <div className="item-tag-list" aria-label="Preview tags">
          {tags.map((tag) => (
            <span key={tag.id ?? tag.slug} className="tag-badge">
              #{tag.slug}
            </span>
          ))}
        </div>
      )}
      <div className="button-row">
        <button
          type="button"
          className="primary-button"
          disabled={onOpen === undefined || result.disabled === true}
          onClick={onOpen}
        >
          Open result
        </button>
        <button type="button" className="secondary-button" disabled>
          Add to Today
        </button>
      </div>
    </aside>
  );
}

function SearchTrustSummary({
  activeQuery,
  groupCount,
  includeArchived,
  loading,
  resultCount
}: {
  activeQuery: string;
  groupCount: number;
  includeArchived: boolean;
  loading: boolean;
  resultCount: number;
}): React.JSX.Element {
  const trimmedQuery = activeQuery.trim();

  return (
    <div className="search-trust-summary" aria-label="Search scope and confidence">
      <article>
        <span>Query</span>
        <strong>{trimmedQuery.length === 0 ? "Filters only or not started" : `"${trimmedQuery}"`}</strong>
        <small>Route, field, and results stay in sync after Enter or Search.</small>
      </article>
      <article>
        <span>Scope</span>
        <strong>{includeArchived ? "Active + archived" : "Active local records"}</strong>
        <small>No cloud index or remote search is used.</small>
      </article>
      <article>
        <span>Visible result shape</span>
        <strong>{loading && resultCount === 0 ? "Searching..." : `${resultCount} result${resultCount === 1 ? "" : "s"} in ${groupCount} group${groupCount === 1 ? "" : "s"}`}</strong>
        <small>Cards show type, title, snippet, context, status/date, tags, and highlights when available.</small>
      </article>
    </div>
  );
}

function SearchEmptyState({
  description,
  title
}: {
  description: string;
  title: string;
}): React.JSX.Element {
  return (
    <EmptyState description={description} title={title} />
  );
}

function toSearchResultCardViewModel(
  result: SearchResultSummary,
  query: string
): SearchResultCardViewModel {
  const queryTerms = getSearchPlainTerms(query);
  const viewModel: SearchResultCardViewModel = {
    id: result.id,
    targetId: result.targetId,
    targetType: result.targetType,
    kind: result.kind,
    title: result.title,
    body: result.excerpt?.text ?? result.body,
    status: result.status,
    category:
      result.category === null
        ? null
        : {
            name: result.category,
            color: "#245c55"
          },
    tags: result.tags.map((tag) => ({
      name: tag,
      slug: tag,
      source: "manual"
    })),
    contextLabel: buildContextLabel(result),
    whyMatched: buildWhyMatchedLabel(result, query),
    updatedLabel: formatAustralianDate(result.updatedAt),
    dueAt: result.dueAt === null || result.dueAt === undefined ? null : formatAustralianDate(result.dueAt),
    taskStatus: result.taskStatus ?? null,
    disabled: result.destinationPath === null
  };

  if (result.titleHighlights !== undefined) {
    viewModel.titleHighlights = result.titleHighlights;
  } else {
    const titleHighlights = highlightText(result.title, queryTerms);
    if (titleHighlights !== undefined) {
      viewModel.titleHighlights = titleHighlights;
    }
  }

  if (result.excerpt?.segments !== undefined) {
    viewModel.excerptSegments = result.excerpt.segments;
  } else if (viewModel.body !== undefined && viewModel.body !== null) {
    const excerptSegments = highlightText(viewModel.body, queryTerms);
    if (excerptSegments !== undefined) {
      viewModel.excerptSegments = excerptSegments;
    }
  }

  return viewModel;
}

function formatKindLabelForPreview(kind: string): string {
  return getSearchResultGroupLabel(kind).replace(/s$/, "");
}

function buildWhyMatchedLabel(result: SearchResultSummary, query: string): string {
  const structured = parseStructuredSearchChips(query);
  const plainTerms = getSearchPlainTerms(query);

  if (result.excerpt?.segments.some((segment) => segment.match)) {
    return "The body or note preview contains the searched phrase.";
  }

  if (result.titleHighlights?.some((segment) => segment.match) === true) {
    return "The title contains the searched phrase.";
  }

  if (plainTerms.some((term) => result.title.toLowerCase().includes(term.toLowerCase()))) {
    return "The title contains the searched phrase.";
  }

  if (
    result.containerTitle !== null &&
    plainTerms.some((term) => result.containerTitle?.toLowerCase().includes(term.toLowerCase()))
  ) {
    return "The containing project or contact matches the query.";
  }

  if (
    result.tags.some((tag) =>
      plainTerms.some((term) => tag.toLowerCase().includes(term.toLowerCase()))
    )
  ) {
    return "A tag or metadata value matches the query.";
  }

  if (structured.length > 0) {
    return `Matched structured filter${structured.length === 1 ? "" : "s"}: ${structured
      .map((chip) => `${chip.label} ${chip.value}`)
      .join(", ")}.`;
  }

  if (result.category !== null) {
    return `Matched local search projection or active category ${result.category}.`;
  }

  return "Matched the local workspace search index.";
}

function groupSearchResults(
  results: SearchResultCardViewModel[]
): SearchResultGroup[] {
  const groups = new Map<string, SearchResultGroup>();

  for (const result of results) {
    const key = result.kind;
    const existing = groups.get(key);

    if (existing !== undefined) {
      existing.results.push(result);
      continue;
    }

    groups.set(key, {
      key,
      label: getSearchResultGroupLabel(result.kind),
      description: getSearchResultGroupDescription(result.kind),
      results: [result]
    });
  }

  return Array.from(groups.values());
}

function getSearchResultGroupLabel(kind: string): string {
  if (kind === "list_item") return "Checklist rows";
  if (kind === "inbox") return "Inbox";
  if (kind === "project") return "Projects";
  if (kind === "contact") return "Contacts";
  if (kind === "task") return "Tasks";
  if (kind === "list") return "Lists";
  if (kind === "note") return "Notes";
  if (kind === "file") return "Files";
  if (kind === "link") return "Links";
  if (kind === "heading") return "Headings";
  if (kind === "location") return "Locations";
  if (kind === "comment") return "Comments";
  return "Other results";
}

function getSearchResultGroupDescription(kind: string): string {
  if (kind === "project") return "Project containers where the match belongs.";
  if (kind === "contact") return "Contact containers and client context matches.";
  if (kind === "task") return "Actionable work with status, dates, project/contact context, and tags.";
  if (kind === "note") return "Note titles and body snippets from the local index.";
  if (kind === "file") return "File items and attachment metadata stored in this workspace.";
  if (kind === "link") return "Saved links with title, URL context, and containing project/contact.";
  if (kind === "list_item") return "Checklist rows shown beside their parent list and container.";
  if (kind === "list") return "Lists and checklist containers matching the query.";
  return "Local indexed records matching the current query and filters.";
}

function summarizeActiveFilters(
  filters: SearchFiltersValue<SearchResultKind>
): string[] {
  const summary = [
    ...filters.kinds.map(getSearchResultGroupLabel),
    ...splitTagFilter(filters.tags).map((tag) => `#${tag}`),
    filters.category.trim().length > 0 ? `Category ${filters.category.trim()}` : null,
    filters.status.trim().length > 0 ? `Status ${filters.status.trim()}` : null,
    filters.dueFrom.trim().length > 0 ? `From ${filters.dueFrom.trim()}` : null,
    filters.dueTo.trim().length > 0 ? `To ${filters.dueTo.trim()}` : null,
    filters.includeArchived ? "Includes archived" : null
  ];

  return summary.filter((value): value is string => value !== null);
}

function buildSearchStateKey(
  query: string,
  filters: SearchFiltersValue<SearchResultKind>
): string {
  const filterInput = toSearchFilterInput(filters);

  return JSON.stringify({
    filters: filterInput ?? null,
    query: query.trim()
  });
}

function getSearchPlainTerms(query: string): string[] {
  return (query.match(/"[^"]+"|'[^']+'|\S+/g) ?? [])
    .map((word) => word.replace(/^['"]|['"]$/g, "").trim())
    .filter((word) => word.length >= 2 && !word.includes(":"))
    .slice(0, 8);
}

function highlightText(
  text: string,
  queryTerms: readonly string[]
): SearchResultCardViewModel["titleHighlights"] {
  if (queryTerms.length === 0) {
    return undefined;
  }

  const pattern = new RegExp(`(${queryTerms.map(escapeRegExp).join("|")})`, "gi");
  const segments = text.split(pattern).filter((part) => part.length > 0);

  if (segments.length <= 1) {
    return undefined;
  }

  return segments.map((segment) => ({
    text: segment,
    match: queryTerms.some((term) => segment.toLowerCase() === term.toLowerCase())
  }));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildContextLabel(result: SearchResultSummary): string | null {
  if (result.kind === "list_item" && result.parentItemTitle !== null) {
    return result.containerTitle === null
      ? result.parentItemTitle
      : `${result.parentItemTitle} in ${result.containerTitle}`;
  }

  return result.containerTitle;
}

function applySuggestion(query: string, token: string): string {
  const parts = query.split(/\s+/);
  if (query.trim().length === 0) {
    return `${token} `;
  }
  parts[parts.length - 1] = token;
  return `${parts.filter(Boolean).join(" ")} `;
}


type StructuredSearchChip = {
  kind: string;
  label: string;
  value: string;
};

const structuredSearchSuggestionTokens = [
  "type:task",
  "type:note",
  "type:file",
  "tag:call",
  "category:work",
  "due:<+7d",
  "status:open",
  "has:file",
  "in:project:launch"
] as const;

function parseStructuredSearchChips(query: string): StructuredSearchChip[] {
  const chips: StructuredSearchChip[] = [];
  const text: string[] = [];
  for (const word of query.match(/"[^"]+"|'[^']+'|\S+/g) ?? []) {
    const clean = word.replace(/^['"]|['"]$/g, "");
    const delimiter = clean.indexOf(":");
    if (delimiter <= 0) {
      text.push(clean);
      continue;
    }
    const key = clean.slice(0, delimiter).toLowerCase();
    const value = clean.slice(delimiter + 1);
    if (key === "type") chips.push({ kind: key, label: "Type", value });
    else if (key === "tag") chips.push({ kind: key, label: "Tag", value: value.replace(/^@/, "") });
    else if (key === "category") chips.push({ kind: key, label: "Category", value });
    else if (key === "due") chips.push({ kind: key, label: "Due", value });
    else if (key === "status") chips.push({ kind: key, label: "Status", value });
    else if (key === "has") chips.push({ kind: key, label: "Has", value });
    else if (key === "in") chips.push({ kind: key, label: "In", value });
    else text.push(clean);
  }
  const textQuery = text.join(" ").trim();
  if (textQuery.length > 0) {
    chips.push({ kind: "text", label: "Text", value: textQuery });
  }
  return chips;
}

function getStructuredSearchSuggestions(query: string): Array<{ token: string; description: string }> {
  const active = query.split(/\s+/).at(-1)?.toLowerCase() ?? "";
  return structuredSearchSuggestionTokens
    .filter((token) => active.length > 0 && token.toLowerCase().startsWith(active))
    .slice(0, 8)
    .map((token) => ({ token, description: "Structured search token" }));
}

function parseSearchFiltersFromParams(
  params: URLSearchParams
): SearchFiltersValue<SearchResultKind> {
  return {
    kinds: params
      .getAll("type")
      .filter((kind): kind is SearchResultKind =>
        searchKindOptions.some((option) => option.value === kind)
      ),
    tags: params.getAll("tag").join(", "),
    category: params.get("category") ?? "",
    status: params.get("status") ?? "",
    dueFrom: params.get("dueFrom") ?? "",
    dueTo: params.get("dueTo") ?? "",
    includeArchived: params.get("archived") === "1"
  };
}

function appendSearchFiltersToParams(
  params: URLSearchParams,
  filters: SearchFiltersValue<SearchResultKind>
): void {
  for (const kind of filters.kinds) {
    params.append("type", kind);
  }

  for (const tag of splitTagFilter(filters.tags)) {
    params.append("tag", tag);
  }

  if (filters.category.trim().length > 0) {
    params.set("category", filters.category.trim());
  }

  if (filters.status.trim().length > 0) {
    params.set("status", filters.status.trim());
  }

  if (filters.dueFrom.trim().length > 0) {
    params.set("dueFrom", filters.dueFrom.trim());
  }

  if (filters.dueTo.trim().length > 0) {
    params.set("dueTo", filters.dueTo.trim());
  }

  if (filters.includeArchived) {
    params.set("archived", "1");
  }
}

function toSearchFilterInput(
  filters: SearchFiltersValue<SearchResultKind>
): SearchFilterInput | undefined {
  const input: SearchFilterInput = {};
  const tags = splitTagFilter(filters.tags);

  if (filters.kinds.length > 0) {
    input.kinds = filters.kinds;
  }

  if (tags.length > 0) {
    input.tags = tags;
  }

  if (filters.category.trim().length > 0) {
    input.category = filters.category.trim();
  }

  if (filters.status.trim().length > 0) {
    input.status = filters.status.trim();
  }

  if (filters.dueFrom.trim().length > 0 && filters.dueTo.trim().length > 0) {
    input.due = {
      operator: "between",
      from: filters.dueFrom.trim(),
      to: filters.dueTo.trim()
    };
  } else if (filters.dueFrom.trim().length > 0) {
    input.due = { operator: "after", value: filters.dueFrom.trim() };
  } else if (filters.dueTo.trim().length > 0) {
    input.due = { operator: "before", value: filters.dueTo.trim() };
  }

  if (filters.includeArchived) {
    input.includeArchived = true;
  }

  return Object.keys(input).length === 0 ? undefined : input;
}

function toSearchFiltersValue(
  filters: SearchFilterInput
): SearchFiltersValue<SearchResultKind> {
  const value = {
    ...emptySearchFilters,
    kinds: filters.kinds ?? [],
    tags: filters.tags?.join(", ") ?? "",
    category: filters.category ?? "",
    status: filters.status ?? "",
    includeArchived: filters.includeArchived === true
  };

  if (filters.due !== undefined) {
    if (filters.due.operator === "between") {
      value.dueFrom = filters.due.from.slice(0, 10);
      value.dueTo = filters.due.to.slice(0, 10);
    } else if (filters.due.operator === "after") {
      value.dueFrom = filters.due.value.slice(0, 10);
    } else {
      value.dueTo = filters.due.value.slice(0, 10);
    }
  }

  return value;
}

function splitTagFilter(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatRecentSearch(entry: RecentSearchSummary): string {
  const filters = toSearchFiltersValue(entry.filters);
  const filterParts = [
    ...filters.kinds,
    ...splitTagFilter(filters.tags).map((tag) => `#${tag}`),
    filters.category.length > 0 ? filters.category : null,
    filters.status.length > 0 ? filters.status : null
  ].filter((value): value is string => value !== null);
  const query = entry.query.length === 0 ? "(filters only)" : entry.query;

  return filterParts.length === 0 ? query : `${query} · ${filterParts.join(", ")}`;
}


function buildHighlightedDestinationPath(result: SearchResultSummary): string {
  if (result.destinationPath === null) {
    return "#";
  }

  const params = new URLSearchParams();
  if (result.targetType === "item" || result.targetType === "attachment") {
    const itemId = result.targetType === "attachment" ? result.parentItemId : result.targetId;
    if (itemId !== null) params.set("item", itemId);
  } else if (result.targetType === "list_item" && result.parentItemId !== null) {
    params.set("item", result.parentItemId);
    params.set("listItem", result.targetId);
  }

  params.set("highlight", result.targetId);
  const separator = result.destinationPath.includes("?") ? "&" : "?";
  return `${result.destinationPath}${separator}${params.toString()}`;
}
