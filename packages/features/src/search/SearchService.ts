import type { FeatureModuleContract } from "../featureModuleContract";
import {
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
import {
  SearchIndexOrchestrator,
  type UpsertListIndexResult,
  type UpsertSearchTargetInput
} from "./SearchIndexOrchestrator";
import {
  SearchResultHydrator,
  type HydrateSearchResultsOptions,
  type SearchResult,
  type SearchResultKind
} from "./SearchResultHydrator";
import { SavedViewService, type SavedViewMutationResult } from "../savedViews";
import {
  SearchQueryParser,
  filterStructuredSearchResults,
  type StructuredSearchParseResult,
  type StructuredSearchSuggestion
} from "./StructuredSearchQuery";

export type SearchInput = {
  workspaceId: string;
  query: string;
  kinds?: SearchResultKind[];
  limit?: number;
  offset?: number;
  includeArchived?: boolean;
  includeDeleted?: boolean;
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

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: SearchIndexIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.now = input.now ?? (() => new Date());
    this.idFactory = input.idFactory;
    this.searchIndexService = new SearchIndexService(input);
    this.searchIndexOrchestrator = new SearchIndexOrchestrator(input);
    this.searchResultHydrator = new SearchResultHydrator(input);
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
    const parsed = this.parseStructuredQuery(input.query);
    const searchWorkspaceInput: SearchWorkspaceInput = {
      workspaceId: input.workspaceId,
      query: parsed.textQuery.length > 0 ? parsed.textQuery : input.query,
      targetTypes: ["container", "item", "list_item", "attachment"]
    };

    if (input.includeDeleted !== undefined || input.includeArchived === true) {
      searchWorkspaceInput.includeDeleted =
        input.includeDeleted === true || input.includeArchived === true;
    }

    const resultLimit = input.limit ?? 25;
    const resultOffset = normalizeOffset(input.offset);
    searchWorkspaceInput.limit = resultOffset + Math.max(resultLimit * 3, resultLimit);

    const records = parsed.textQuery.length > 0
      ? this.searchIndexService.searchWorkspace(searchWorkspaceInput)
      : new SearchIndexRepository(this.connection).listByWorkspace(input.workspaceId, {
          targetTypes: ["container", "item", "list_item", "attachment"]
        }).slice(0, searchWorkspaceInput.limit);

    const hydrateOptions: HydrateSearchResultsOptions = {};

    if (input.includeArchived !== undefined) {
      hydrateOptions.includeArchived = input.includeArchived;
    }

    if (input.includeDeleted !== undefined) {
      hydrateOptions.includeDeleted = input.includeDeleted;
    }

    const structuredKinds = parsed.filters.kinds;
    if (input.kinds !== undefined || structuredKinds !== undefined) {
      const mergedKinds = mergeKinds(input.kinds, structuredKinds);
      if (mergedKinds !== undefined) {
        hydrateOptions.kinds = mergedKinds;
      }
    }

    return filterStructuredSearchResults(
      this.searchResultHydrator.hydrateSearchResults(records, hydrateOptions),
      parsed
    ).slice(resultOffset, resultOffset + resultLimit);
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
