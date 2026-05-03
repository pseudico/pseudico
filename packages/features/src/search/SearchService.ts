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
  type ContainerRecord,
  type ItemRecord,
  type ListItemRecord,
  type NoteDetailsRecord
} from "@local-work-os/db";
import {
  SearchIndexOrchestrator,
  type UpsertListIndexResult,
  type UpsertSearchTargetInput
} from "./SearchIndexOrchestrator";

// Owns search-facing application service contracts.
// Does not own source-of-truth domain records or remote indexing.
export class SearchService {
  readonly module = "search";

  private readonly searchIndexOrchestrator: SearchIndexOrchestrator;
  private readonly searchIndexService: SearchIndexService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: SearchIndexIdFactory;
    now?: () => Date;
  }) {
    this.searchIndexService = new SearchIndexService(input);
    this.searchIndexOrchestrator = new SearchIndexOrchestrator(input);
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

  rebuildWorkspaceIndex(workspaceId: string): RebuildWorkspaceIndexResult {
    return this.searchIndexService.rebuildWorkspaceIndex(workspaceId);
  }

  getSearchIndexHealth(workspaceId: string): SearchIndexHealthReport {
    return this.searchIndexOrchestrator.getSearchIndexHealth(workspaceId);
  }
}

export const searchModuleContract = {
  module: "search",
  purpose: "Coordinate local searchable projections, queries, reindexing, and diagnostics.",
  owns: ["search service boundary", "searchable projection coordination", "reindex entry points"],
  doesNotOwn: ["source domain records", "saved-view persistence", "remote indexing services"],
  integrationPoints: ["database search repository", "all searchable modules", "saved views", "dashboard"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;
