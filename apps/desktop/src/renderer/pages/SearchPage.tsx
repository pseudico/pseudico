import { ListFilter, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  EmptyState,
  ErrorState,
  LoadMoreList,
  SearchResultCard,
  renderLoadableState,
  type SearchResultCardViewModel,
  type SnoozePreset
} from "@local-work-os/ui";
import type {
  LocalWorkOsApi,
  SearchResultKind,
  SearchWorkspaceInput,
  SearchResultSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type SearchPageProps = {
  apiClient?: LocalWorkOsApi;
  initialQuery?: string;
  initialKinds?: SearchResultKind[];
  initialResults?: SearchResultSummary[];
};

const searchKindOptions = [
  { label: "Projects", value: "project" },
  { label: "Tasks", value: "task" },
  { label: "Lists", value: "list" },
  { label: "Notes", value: "note" },
  { label: "Files", value: "file" },
  { label: "Checklist rows", value: "list_item" }
] as const satisfies readonly { label: string; value: SearchResultKind }[];

const SEARCH_PAGE_SIZE = 30;

export function SearchPage({
  apiClient = desktopApiClient,
  initialQuery,
  initialKinds = [],
  initialResults = []
}: SearchPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentWorkspace } = useWorkspaceStore();
  const queryFromRoute = searchParams.get("q") ?? "";
  const kindsFromRoute = searchParams.getAll("type") as SearchResultKind[];
  const [draftQuery, setDraftQuery] = useState(initialQuery ?? queryFromRoute);
  const [selectedKinds, setSelectedKinds] =
    useState<SearchResultKind[]>(initialKinds);
  const [results, setResults] = useState<SearchResultSummary[]>(initialResults);
  const [hasMoreResults, setHasMoreResults] = useState(
    initialResults.length >= SEARCH_PAGE_SIZE
  );
  const [loading, setLoading] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const activeQuery = initialQuery ?? queryFromRoute;
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
    () => results.map(toSearchResultCardViewModel),
    [results]
  );

  useEffect(() => {
    if (initialQuery !== undefined) {
      return;
    }

    setDraftQuery(queryFromRoute);
    setSelectedKinds(
      kindsFromRoute.filter((kind): kind is SearchResultKind =>
        searchKindOptions.some((option) => option.value === kind)
      )
    );
  }, [initialQuery, queryFromRoute, searchParams]);

  useEffect(() => {
    if (currentWorkspace === null || initialResults.length > 0) {
      return;
    }

    const trimmedQuery = activeQuery.trim();

    if (trimmedQuery.length === 0) {
      setResults([]);
      setError(null);
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function runSearch(): Promise<void> {
      setLoading(true);
      setError(null);

      const input: SearchWorkspaceInput = {
        workspaceId,
        query: trimmedQuery,
        limit: SEARCH_PAGE_SIZE,
        offset: 0
      };

      if (selectedKinds.length > 0) {
        input.kinds = selectedKinds;
      }

      const result = await apiClient.search.searchWorkspace(input);

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setResults(result.data);
      setActiveResultIndex(0);
      setHasMoreResults(result.data.length === SEARCH_PAGE_SIZE);
    }

    void runSearch();

    return () => {
      active = false;
    };
  }, [apiClient, activeQuery, currentWorkspace, initialResults.length, selectedKinds]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const trimmedQuery = draftQuery.trim();
    const params = new URLSearchParams();

    if (trimmedQuery.length > 0) {
      params.set("q", trimmedQuery);
    }

    for (const kind of selectedKinds) {
      params.append("type", kind);
    }

    setSavedMessage(null);
    setSearchParams(params);
    setActiveResultIndex(0);
  }

  async function saveCurrentSearch(): Promise<void> {
    if (currentWorkspace === null || activeQuery.trim().length === 0) {
      return;
    }

    setError(null);
    setSavedMessage(null);
    const result = await apiClient.search.saveSearch({
      workspaceId: currentWorkspace.id,
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
    if (currentWorkspace === null) {
      return;
    }

    const trimmedQuery = activeQuery.trim();

    if (trimmedQuery.length === 0) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    const input: SearchWorkspaceInput = {
      workspaceId: currentWorkspace.id,
      query: trimmedQuery,
      limit: Math.max(results.length, SEARCH_PAGE_SIZE),
      offset: 0
    };

    if (selectedKinds.length > 0) {
      input.kinds = selectedKinds;
    }

    const result = await apiClient.search.searchWorkspace(input);

    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setResults(result.data);
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
    if (currentWorkspace === null || loading) {
      return;
    }

    const trimmedQuery = activeQuery.trim();

    if (trimmedQuery.length === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    const input: SearchWorkspaceInput = {
      workspaceId: currentWorkspace.id,
      query: trimmedQuery,
      limit: SEARCH_PAGE_SIZE,
      offset: results.length
    };

    if (selectedKinds.length > 0) {
      input.kinds = selectedKinds;
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

  function toggleKind(kind: SearchResultKind): void {
    const next = selectedKinds.includes(kind)
      ? selectedKinds.filter((value) => value !== kind)
      : [...selectedKinds, kind];
    const params = new URLSearchParams(searchParams);

    params.delete("type");

    for (const value of next) {
      params.append("type", value);
    }

    setSelectedKinds(next);
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

  if (currentWorkspace === null) {
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
        <label className="search-page-input">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Search query</span>
          <input
            type="search"
            value={draftQuery}
            placeholder="Search local workspace"
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
          Save search
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
        <aside className="search-filter-panel" aria-label="Search filters">
          <div className="panel-heading">
            <ListFilter size={17} aria-hidden="true" />
            <h3>Type</h3>
          </div>
          <div className="search-filter-list">
            {searchKindOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="metadata-chip"
                aria-pressed={selectedKinds.includes(option.value)}
                onClick={() => toggleKind(option.value)}
              >
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="search-results-panel" aria-busy={loading} onKeyDown={handleResultsKeyDown}>
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

          {activeQuery.trim().length === 0 ? (
            <SearchEmptyState
              title="Search the workspace"
              description="Enter a query to find active indexed content."
            />
          ) : loading ? (
            renderLoadableState({
              loading,
              loadingLabel: "Searching local index..."
            })
          ) : results.length === 0 ? (
            <SearchEmptyState
              title="No results"
              description="Archived and deleted records are excluded by default."
            />
          ) : (
            <LoadMoreList
              ariaLabel="Search results"
              getKey={(result) => result.id}
              hasMore={hasMoreResults}
              items={visibleResults}
              loading={loading || busyTaskId !== null}
              renderItem={(result) => (
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
              )}
              onLoadMore={() => void loadMoreResults()}
            />
          )}
        </section>
      </div>
    </section>
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
  result: SearchResultSummary
): SearchResultCardViewModel {
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
    updatedLabel: result.updatedAt.slice(0, 10),
    dueAt: result.dueAt ?? null,
    taskStatus: result.taskStatus ?? null,
    disabled: result.destinationPath === null
  };

  if (result.titleHighlights !== undefined) {
    viewModel.titleHighlights = result.titleHighlights;
  }

  if (result.excerpt?.segments !== undefined) {
    viewModel.excerptSegments = result.excerpt.segments;
  }

  return viewModel;
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
