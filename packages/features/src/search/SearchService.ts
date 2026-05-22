import type { FeatureModuleContract } from "../featureModuleContract";
import { createLocalId } from "@local-work-os/core";
import {
  AppSettingsRepository,
  SearchIndexService,
  type DatabaseConnection,
  type RebuildWorkspaceIndexResult,
  type RemoveSearchIndexInput,
  type SearchIndexHealthReport,
  type SearchIndexIdFactory,
  type SearchIndexRecord,
  type SearchProjectionInput,
  type SearchWorkspaceInput,
  type AttachmentRecord,
  type ContainerRecord,
  type ItemRecord,
  type ListItemRecord,
  type NoteDetailsRecord,
  SearchIndexRepository
} from "@local-work-os/db";
import { SlowQueryLogger, type SlowQueryLogSink } from "@local-work-os/db";
import {
  SearchIndexOrchestrator,
  type UpsertListIndexResult,
  type UpsertSearchTargetInput
} from "./SearchIndexOrchestrator";
import {
  SearchResultHydrator,
  type HydrateSearchResultsOptions,
  type SearchResult,
  type SearchResultKind,
  type SearchHighlightSegment,
  type SearchResultExcerpt
} from "./SearchResultHydrator";
import { SavedViewService, type SavedViewMutationResult } from "../savedViews";
import {
  SearchQueryParser,
  filterStructuredSearchResults,
  type StructuredSearchParseResult,
  type StructuredSearchSuggestion
} from "./StructuredSearchQuery";

export const RECENT_SEARCHES_SETTING_KEY = "search.recent.v1";
export const DEFAULT_RECENT_SEARCH_LIMIT = 8;

export type SearchInput = {
  workspaceId: string;
  query: string;
  kinds?: SearchResultKind[];
  filters?: SearchFilterInput;
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export type SearchFilterInput = {
  kinds?: SearchResultKind[];
  tags?: string[];
  category?: string;
  status?: string;
  due?: SearchDueFilterInput;
  includeArchived?: boolean;
  includeDeleted?: boolean;
};

export type SearchDueFilterInput =
  | { operator: "before"; value: string }
  | { operator: "after"; value: string }
  | { operator: "on"; value: string }
  | { operator: "between"; from: string; to: string };

export type RecentSearchEntry = {
  id: string;
  workspaceId: string;
  query: string;
  filters: SearchFilterInput;
  searchedAt: string;
};

export type SaveStructuredSearchInput = {
  workspaceId: string;
  query: string;
  name?: string;
  description?: string | null;
};

export type SaveStructuredSearchResult = SavedViewMutationResult & {
  parsed: StructuredSearchParseResult;
};

// Owns search-facing application service contracts.
// Does not own source-of-truth domain records or remote indexing.
export class SearchService {
  readonly module = "search";

  private readonly connection: DatabaseConnection;
  private readonly now: () => Date;
  private readonly idFactory: SearchIndexIdFactory | undefined;
  private readonly searchIndexOrchestrator: SearchIndexOrchestrator;
  private readonly searchIndexService: SearchIndexService;
  private readonly searchResultHydrator: SearchResultHydrator;
  private readonly slowQueryLogger: SlowQueryLogger;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: SearchIndexIdFactory;
    now?: () => Date;
    slowQueryThresholdMs?: number;
    slowQuerySink?: SlowQueryLogSink;
  }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
    this.idFactory = input.idFactory;
    this.searchIndexService = new SearchIndexService(input);
    this.searchIndexOrchestrator = new SearchIndexOrchestrator(input);
    this.searchResultHydrator = new SearchResultHydrator(input);
    this.slowQueryLogger = new SlowQueryLogger({
      ...(input.slowQueryThresholdMs === undefined
        ? {}
        : { thresholdMs: input.slowQueryThresholdMs }),
      ...(input.slowQuerySink === undefined ? {} : { sink: input.slowQuerySink }),
      clock: { now: this.now }
    });
  }

  upsertContainer(
    container: ContainerRecord,
    input?: SearchProjectionInput
  ): SearchIndexRecord {
    return this.searchIndexService.upsertContainer(container, input);
  }

  upsertContainerIndex(
    containerId: string,
    input?: UpsertSearchTargetInput
  ): SearchIndexRecord {
    return this.searchIndexOrchestrator.upsertContainerIndex(containerId, input);
  }

  upsertItem(item: ItemRecord, input?: SearchProjectionInput): SearchIndexRecord {
    return this.searchIndexService.upsertItem(item, input);
  }

  upsertItemIndex(
    itemId: string,
    input?: UpsertSearchTargetInput
  ): SearchIndexRecord {
    return this.searchIndexOrchestrator.upsertItemIndex(itemId, input);
  }

  upsertAttachment(
    attachment: AttachmentRecord,
    input?: SearchProjectionInput
  ): SearchIndexRecord {
    return this.searchIndexService.upsertAttachment(attachment, input);
  }

  upsertAttachmentIndex(
    attachmentId: string,
    input?: UpsertSearchTargetInput
  ): SearchIndexRecord {
    return this.searchIndexOrchestrator.upsertAttachmentIndex(attachmentId, input);
  }

  upsertListItem(
    listItem: ListItemRecord,
    input?: SearchProjectionInput
  ): SearchIndexRecord {
    return this.searchIndexService.upsertListItem(listItem, input);
  }

  upsertListIndex(
    listId: string,
    input?: UpsertSearchTargetInput
  ): UpsertListIndexResult {
    return this.searchIndexOrchestrator.upsertListIndex(listId, input);
  }

  upsertNote(
    item: ItemRecord,
    note: NoteDetailsRecord,
    input?: SearchProjectionInput
  ): SearchIndexRecord {
    return this.searchIndexService.upsertNote(item, note, input);
  }

  removeFromIndex(input: RemoveSearchIndexInput): void {
    this.searchIndexService.removeTarget(input);
  }

  searchWorkspace(input: SearchWorkspaceInput): SearchIndexRecord[] {
    return this.searchIndexService.searchWorkspace(input);
  }

  search(input: SearchInput): SearchResult[] {
    return this.slowQueryLogger.time(
      "search.search",
      () => this.searchWithoutDiagnostics(input),
      {
        workspaceId: input.workspaceId,
        queryLength: input.query.length,
        limit: input.limit ?? 25,
        offset: input.offset ?? 0
      }
    );
  }

  private searchWithoutDiagnostics(input: SearchInput): SearchResult[] {
    const parsed = mergeParsedWithInputFilters(
      this.parseStructuredQuery(input.query),
      input.filters
    );
    const searchWorkspaceInput: SearchWorkspaceInput = {
      workspaceId: input.workspaceId,
      query: parsed.textQuery.length > 0 ? parsed.textQuery : input.query,
      targetTypes: ["container", "item", "list_item", "attachment"]
    };

    const includeArchived = input.filters?.includeArchived ?? input.includeArchived;
    const includeDeleted = input.filters?.includeDeleted ?? input.includeDeleted;

    if (includeDeleted !== undefined || includeArchived === true) {
      searchWorkspaceInput.includeDeleted =
        includeDeleted === true || includeArchived === true;
    }

    const resultLimit = input.limit ?? 25;
    const resultOffset = normalizeOffset(input.offset);
    searchWorkspaceInput.limit = resultOffset + Math.max(resultLimit * 3, resultLimit);

    const records = parsed.textQuery.length > 0
      ? this.searchIndexService.searchWorkspace(searchWorkspaceInput)
      : new SearchIndexRepository(this.connection).listByWorkspace(input.workspaceId, {
          targetTypes: ["container", "item", "list_item", "attachment"]
        });

    const hydrateOptions: HydrateSearchResultsOptions = {};

    if (includeArchived !== undefined) {
      hydrateOptions.includeArchived = includeArchived;
    }

    if (includeDeleted !== undefined) {
      hydrateOptions.includeDeleted = includeDeleted;
    }

    const structuredKinds = parsed.filters.kinds;
    if (input.kinds !== undefined || structuredKinds !== undefined) {
      const mergedKinds = mergeKinds(input.kinds, structuredKinds);
      if (mergedKinds !== undefined) {
        hydrateOptions.kinds = mergedKinds;
      }
    }

    return deduplicateAttachmentFilePairs(
      filterStructuredSearchResults(
        this.searchResultHydrator.hydrateSearchResults(records, hydrateOptions),
        parsed
      )
    )
      .map((result) => decorateSearchResult(result, parsed.textQuery))
      .sort(compareDecoratedSearchResults)
      .slice(resultOffset, resultOffset + resultLimit);
  }

  parseStructuredQuery(query: string): StructuredSearchParseResult {
    return new SearchQueryParser().parse(query, this.now());
  }

  getStructuredSearchSuggestions(query: string): StructuredSearchSuggestion[] {
    return new SearchQueryParser().getSuggestions(query);
  }

  async saveStructuredSearch(
    input: SaveStructuredSearchInput
  ): Promise<SaveStructuredSearchResult> {
    const parsed = this.parseStructuredQuery(input.query);
    const name = input.name?.trim() || createSavedSearchName(input.query);
    const service = new SavedViewService({
      connection: this.connection,
      now: this.now,
      ...(this.idFactory === undefined ? {} : { idFactory: this.idFactory })
    });
    const result = await service.createSavedView({
      workspaceId: input.workspaceId,
      type: "search",
      name,
      description: input.description ?? `Saved search for ${input.query.trim()}`,
      query: parsed.savedViewQuery
    });

    return { ...result, parsed };
  }

  rebuildWorkspaceIndex(workspaceId: string): RebuildWorkspaceIndexResult {
    return this.searchIndexService.rebuildWorkspaceIndex(workspaceId);
  }

  getSearchIndexHealth(workspaceId: string): SearchIndexHealthReport {
    return this.searchIndexOrchestrator.getSearchIndexHealth(workspaceId);
  }

  listRecentSearches(workspaceId: string, limit = DEFAULT_RECENT_SEARCH_LIMIT): RecentSearchEntry[] {
    return readRecentSearches(
      new AppSettingsRepository(this.connection).findByKey({
        workspaceId,
        settingKey: RECENT_SEARCHES_SETTING_KEY
      }),
      workspaceId
    ).slice(0, normalizeRecentSearchLimit(limit));
  }

  recordRecentSearch(input: {
    workspaceId: string;
    query: string;
    filters?: SearchFilterInput;
    limit?: number;
  }): RecentSearchEntry[] {
    const query = input.query.trim();
    const filters = normalizeSearchFilterInput(input.filters);

    if (query.length === 0 && isEmptySearchFilters(filters)) {
      return this.listRecentSearches(input.workspaceId, input.limit);
    }

    const limit = normalizeRecentSearchLimit(input.limit);
    const repository = new AppSettingsRepository(this.connection);
    const existing = readRecentSearches(
      repository.findByKey({
        workspaceId: input.workspaceId,
        settingKey: RECENT_SEARCHES_SETTING_KEY
      }),
      input.workspaceId
    );
    const searchedAt = this.now().toISOString();
    const nextEntry: RecentSearchEntry = {
      id: this.createId("recent_search"),
      workspaceId: input.workspaceId,
      query,
      filters,
      searchedAt
    };
    const nextEntries = [
      nextEntry,
      ...existing.filter((entry) => getRecentSearchKey(entry) !== getRecentSearchKey(nextEntry))
    ].slice(0, limit);

    repository.upsert({
      id: this.createId("app_setting"),
      workspaceId: input.workspaceId,
      settingKey: RECENT_SEARCHES_SETTING_KEY,
      valueJson: JSON.stringify({
        version: 1,
        entries: nextEntries
      }),
      timestamp: searchedAt
    });

    return nextEntries;
  }

  private createId(prefix: string): string {
    return this.idFactory?.(prefix) ?? createLocalId(prefix);
  }
}

function mergeKinds(
  left: readonly SearchResultKind[] | undefined,
  right: readonly SearchResultKind[] | undefined
): SearchResultKind[] | undefined {
  if (left === undefined) return right === undefined ? undefined : [...right];
  if (right === undefined) return [...left];
  const rightSet = new Set(right);
  return left.filter((kind) => rightSet.has(kind));
}

function mergeParsedWithInputFilters(
  parsed: StructuredSearchParseResult,
  filters: SearchFilterInput | undefined
): StructuredSearchParseResult {
  const normalized = normalizeSearchFilterInput(filters);

  if (isEmptySearchFilters(normalized)) {
    return parsed;
  }

  const mergedFilters: StructuredSearchParseResult["filters"] = {
    tags: [...new Set([...parsed.filters.tags, ...(normalized.tags ?? [])])],
    hasFile: parsed.filters.hasFile
  };
  const kinds = mergeKinds(parsed.filters.kinds, normalized.kinds);
  const category = normalized.category ?? parsed.filters.category;
  const due = normalized.due ?? parsed.filters.due;
  const status = normalized.status ?? parsed.filters.status;
  const inProject = parsed.filters.inProject;

  if (kinds !== undefined) {
    mergedFilters.kinds = kinds;
  }

  if (category !== undefined) {
    mergedFilters.category = category;
  }

  if (due !== undefined) {
    mergedFilters.due = due;
  }

  if (status !== undefined) {
    mergedFilters.status = status;
  }

  if (inProject !== undefined) {
    mergedFilters.inProject = inProject;
  }

  return {
    ...parsed,
    filters: mergedFilters
  };
}

function normalizeSearchFilterInput(
  filters: SearchFilterInput | undefined
): SearchFilterInput {
  if (filters === undefined) {
    return {};
  }

  const normalized: SearchFilterInput = {};
  const tags = filters.tags
    ?.map((tag) => normalizeTagFilter(tag))
    .filter((tag) => tag.length > 0);

  if (filters.kinds !== undefined && filters.kinds.length > 0) {
    normalized.kinds = [...new Set(filters.kinds)];
  }

  if (tags !== undefined && tags.length > 0) {
    normalized.tags = [...new Set(tags)];
  }

  if (filters.category !== undefined && filters.category.trim().length > 0) {
    normalized.category = filters.category.trim();
  }

  if (filters.status !== undefined && filters.status.trim().length > 0) {
    normalized.status = filters.status.trim().toLowerCase();
  }

  if (filters.due !== undefined) {
    const due = normalizeDueFilter(filters.due);
    if (due !== null) {
      normalized.due = due;
    }
  }

  if (filters.includeArchived !== undefined) {
    normalized.includeArchived = filters.includeArchived;
  }

  if (filters.includeDeleted !== undefined) {
    normalized.includeDeleted = filters.includeDeleted;
  }

  return normalized;
}

function normalizeDueFilter(filter: SearchDueFilterInput): SearchDueFilterInput | null {
  if (filter.operator === "between") {
    const from = normalizeDateFilterValue(filter.from);
    const to = normalizeDateFilterValue(filter.to);
    return from === null || to === null ? null : { operator: "between", from, to };
  }

  const value = normalizeDateFilterValue(filter.value);
  return value === null ? null : { operator: filter.operator, value };
}

function normalizeDateFilterValue(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed}T00:00:00.000Z`;
  }

  if (!Number.isNaN(Date.parse(trimmed))) {
    return new Date(trimmed).toISOString();
  }

  return null;
}

function normalizeTagFilter(tag: string): string {
  return tag.trim().toLowerCase().replace(/^@/, "").replace(/\s+/g, "-");
}

function isEmptySearchFilters(filters: SearchFilterInput): boolean {
  return (
    filters.kinds === undefined &&
    filters.tags === undefined &&
    filters.category === undefined &&
    filters.status === undefined &&
    filters.due === undefined &&
    filters.includeArchived === undefined &&
    filters.includeDeleted === undefined
  );
}

function normalizeRecentSearchLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
    return DEFAULT_RECENT_SEARCH_LIMIT;
  }

  return Math.min(Math.floor(limit), 20);
}

function readRecentSearches(
  setting: { valueJson: string } | null,
  workspaceId: string
): RecentSearchEntry[] {
  if (setting === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(setting.valueJson);
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.entries)) {
      return [];
    }

    return parsed.entries.filter((entry): entry is RecentSearchEntry =>
      isRecentSearchEntry(entry, workspaceId)
    );
  } catch {
    return [];
  }
}

function isRecentSearchEntry(value: unknown, workspaceId: string): value is RecentSearchEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    value.workspaceId === workspaceId &&
    typeof value.query === "string" &&
    isRecord(value.filters) &&
    typeof value.searchedAt === "string"
  );
}

function getRecentSearchKey(entry: Pick<RecentSearchEntry, "query" | "filters">): string {
  return `${entry.query.toLocaleLowerCase()}:${JSON.stringify(entry.filters)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createSavedSearchName(query: string): string {
  const trimmed = query.trim();
  return trimmed.length === 0 ? "Saved search" : `Search: ${trimmed.slice(0, 80)}`;
}

function normalizeOffset(offset: number | undefined): number {
  if (offset === undefined || !Number.isFinite(offset) || offset < 0) {
    return 0;
  }

  return Math.floor(offset);
}

export const searchModuleContract = {
  module: "search",
  purpose: "Coordinate local searchable projections, queries, reindexing, and diagnostics.",
  owns: ["search service boundary", "searchable projection coordination", "reindex entry points"],
  doesNotOwn: ["source domain records", "saved-view persistence", "remote indexing services"],
  integrationPoints: ["database search repository", "all searchable modules", "saved views", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;


type SearchTerm = {
  normalized: string;
};

function decorateSearchResult(result: SearchResult, query: string): SearchResult {
  const terms = tokenizeSearchTerms(query);
  if (terms.length === 0) {
    return result;
  }

  const titleHighlights = buildHighlightSegments(result.title, terms);
  const excerpt = buildExcerpt(result.body ?? "", terms);

  return {
    ...result,
    score: calculateSearchScore(result, terms),
    titleHighlights,
    excerpt
  };
}

function compareDecoratedSearchResults(left: SearchResult, right: SearchResult): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return right.updatedAt.localeCompare(left.updatedAt) || left.title.localeCompare(right.title);
}

function deduplicateAttachmentFilePairs(results: SearchResult[]): SearchResult[] {
  const fileItemIds = new Set(
    results
      .filter((result) => result.targetType === "item" && result.kind === "file")
      .map((result) => result.targetId)
  );

  return results.filter(
    (result) =>
      result.targetType !== "attachment" ||
      result.parentItemId === null ||
      !fileItemIds.has(result.parentItemId)
  );
}

function calculateSearchScore(result: SearchResult, terms: readonly SearchTerm[]): number {
  const title = normalizeSearchText(result.title);
  const body = normalizeSearchText(result.body ?? "");
  const tags = normalizeSearchText(result.tags.join(" "));
  const category = normalizeSearchText(result.category ?? "");
  let score = 0;

  for (const term of terms) {
    if (title === term.normalized) score += 120;
    if (title.startsWith(term.normalized)) score += 70;
    score += countOccurrences(title, term.normalized) * 45;
    score += countOccurrences(tags, term.normalized) * 24;
    score += countOccurrences(category, term.normalized) * 20;
    score += countOccurrences(body, term.normalized) * 12;
  }

  if (result.kind === "project" || result.kind === "contact" || result.kind === "inbox") {
    score += 4;
  }

  return score;
}

function buildExcerpt(text: string, terms: readonly SearchTerm[]): SearchResultExcerpt | null {
  const trimmed = collapseWhitespace(text);
  if (trimmed.length === 0) {
    return null;
  }

  const normalized = normalizeSearchText(trimmed);
  const firstMatch = terms
    .map((term) => normalized.indexOf(term.normalized))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];

  const excerptText = firstMatch === undefined
    ? trimExcerpt(trimmed, 0)
    : trimExcerpt(trimmed, firstMatch);

  return {
    text: excerptText,
    segments: buildHighlightSegments(excerptText, terms)
  };
}

function trimExcerpt(text: string, matchIndex: number): string {
  const maxLength = 180;
  if (text.length <= maxLength) {
    return text;
  }

  const start = Math.max(0, matchIndex - 70);
  const end = Math.min(text.length, start + maxLength);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function buildHighlightSegments(text: string, terms: readonly SearchTerm[]): SearchHighlightSegment[] {
  if (text.length === 0 || terms.length === 0) {
    return text.length === 0 ? [] : [{ text, match: false }];
  }

  const ranges: Array<{ start: number; end: number }> = [];
  const normalizedText = normalizeSearchText(text);

  for (const term of terms) {
    let index = normalizedText.indexOf(term.normalized);
    while (index >= 0) {
      ranges.push({ start: index, end: index + term.normalized.length });
      index = normalizedText.indexOf(term.normalized, index + term.normalized.length);
    }
  }

  if (ranges.length === 0) {
    return [{ text, match: false }];
  }

  ranges.sort((left, right) => left.start - right.start || right.end - left.end);
  const merged: Array<{ start: number; end: number }> = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous === undefined || range.start > previous.end) {
      merged.push({ ...range });
    } else {
      previous.end = Math.max(previous.end, range.end);
    }
  }

  const segments: SearchHighlightSegment[] = [];
  let cursor = 0;
  for (const range of merged) {
    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), match: false });
    }
    segments.push({ text: text.slice(range.start, range.end), match: true });
    cursor = range.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }
  return segments;
}

function tokenizeSearchTerms(query: string): SearchTerm[] {
  const seen = new Set<string>();
  return (query.match(/"[^"]+"|'[^']+'|\S+/g) ?? [])
    .map((term) => term.replace(/^["']|["']$/g, "").trim())
    .filter(Boolean)
    .map((original) => ({ normalized: normalizeSearchText(original) }))
    .filter((term) => {
      if (term.normalized.length === 0 || seen.has(term.normalized)) return false;
      seen.add(term.normalized);
      return true;
    });
}

function normalizeSearchText(value: string): string {
  return value.toLocaleLowerCase();
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function countOccurrences(value: string, term: string): number {
  if (value.length === 0 || term.length === 0) return 0;
  let count = 0;
  let index = value.indexOf(term);
  while (index >= 0) {
    count += 1;
    index = value.indexOf(term, index + term.length);
  }
  return count;
}
