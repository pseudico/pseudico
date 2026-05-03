import { ListFilter, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  SearchResultCard,
  type SearchResultCardViewModel
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
  { label: "Checklist rows", value: "list_item" }
] as const satisfies readonly { label: string; value: SearchResultKind }[];

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeQuery = initialQuery ?? queryFromRoute;
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
        limit: 30
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

    setSearchParams(params);
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
    setSearchParams(params);
  }

  function openResult(resultId: string): void {
    const result = results.find((candidate) => candidate.id === resultId);

    if (result?.destinationPath !== undefined && result.destinationPath !== null) {
      navigate(result.destinationPath);
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
          Search projects, tasks, lists, notes, tags, and categories from the
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
      </form>

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

        <section className="search-results-panel" aria-busy={loading}>
          <div className="metadata-results-heading">
            <div>
              <p className="top-eyebrow">Results</p>
              <h3>{activeQuery.trim().length === 0 ? "No query" : activeQuery}</h3>
            </div>
            <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
          </div>

          {error === null ? null : (
            <p className="form-message form-message-error">{error}</p>
          )}

          {activeQuery.trim().length === 0 ? (
            <SearchEmptyState
              title="Search the workspace"
              description="Enter a query to find active indexed content."
            />
          ) : loading ? (
            <p className="muted-text">Searching local index...</p>
          ) : results.length === 0 ? (
            <SearchEmptyState
              title="No results"
              description="Archived and deleted records are excluded by default."
            />
          ) : (
            <div className="search-result-list" aria-label="Search results">
              {visibleResults.map((result) => (
                <SearchResultCard
                  key={result.id}
                  result={result}
                  onOpen={openResult}
                />
              ))}
            </div>
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
    <div className="item-feed-empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function toSearchResultCardViewModel(
  result: SearchResultSummary
): SearchResultCardViewModel {
  return {
    id: result.id,
    kind: result.kind,
    title: result.title,
    body: result.body,
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
    disabled: result.destinationPath === null
  };
}

function buildContextLabel(result: SearchResultSummary): string | null {
  if (result.kind === "list_item" && result.parentItemTitle !== null) {
    return result.containerTitle === null
      ? result.parentItemTitle
      : `${result.parentItemTitle} in ${result.containerTitle}`;
  }

  return result.containerTitle;
}
