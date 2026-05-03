import {
  ContainerRepository,
  ItemRepository,
  ListRepository,
  NoteRepository,
  SearchIndexService,
  type DatabaseConnection,
  type ListDetailsRecord,
  type RebuildWorkspaceIndexResult,
  type SearchIndexHealthReport,
  type SearchIndexIdFactory,
  type SearchIndexRecord,
  type SearchProjectionInput
} from "@local-work-os/db";

export type UpsertSearchTargetInput = SearchProjectionInput & {
  timestamp?: string;
};

export type UpsertListIndexResult = {
  listRecord: SearchIndexRecord;
  listItemRecords: SearchIndexRecord[];
};

// Coordinates ID-based search projections across source repositories.
export class SearchIndexOrchestrator {
  private readonly connection: DatabaseConnection;
  private readonly idFactory: SearchIndexIdFactory | undefined;
  private readonly now: (() => Date) | undefined;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: SearchIndexIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory;
    this.now = input.now;
  }

  upsertContainerIndex(
    containerId: string,
    input: UpsertSearchTargetInput = {}
  ): SearchIndexRecord {
    validateNonEmptyString(containerId, "containerId");

    const container = new ContainerRepository(this.connection).getById(containerId);

    if (container === null) {
      throw new Error(`Container was not found: ${containerId}.`);
    }

    return this.createSearchIndexService().upsertContainer(container, input);
  }

  upsertItemIndex(
    itemId: string,
    input: UpsertSearchTargetInput = {}
  ): SearchIndexRecord {
    validateNonEmptyString(itemId, "itemId");

    const item = new ItemRepository(this.connection).getById(itemId);

    if (item === null) {
      throw new Error(`Item was not found: ${itemId}.`);
    }

    const searchIndexService = this.createSearchIndexService();

    if (item.type === "note") {
      const note = new NoteRepository(this.connection).getDetailsByItemId(item.id);

      if (note !== null) {
        return searchIndexService.upsertNote(item, note, input);
      }
    }

    if (item.type === "list") {
      const list = new ListRepository(this.connection).getDetailsByItemId(item.id);

      if (list !== null) {
        return searchIndexService.upsertItem(item, {
          ...input,
          metadata: {
            ...createListMetadata(list),
            ...input.metadata
          }
        });
      }
    }

    return searchIndexService.upsertItem(item, input);
  }

  upsertListIndex(
    listId: string,
    input: UpsertSearchTargetInput = {}
  ): UpsertListIndexResult {
    validateNonEmptyString(listId, "listId");

    const list = new ListRepository(this.connection).getByItemId(listId);

    if (list === null) {
      throw new Error(`List was not found: ${listId}.`);
    }

    const searchIndexService = this.createSearchIndexService();
    const listRecord = searchIndexService.upsertItem(list.item, {
      ...input,
      metadata: {
        ...createListMetadata(list.list),
        ...input.metadata
      }
    });
    const listItemRecords = new ListRepository(this.connection)
      .listItems(listId, {
        includeArchived: true,
        includeDeleted: true
      })
      .map((listItem) => searchIndexService.upsertListItem(listItem, input));

    return { listRecord, listItemRecords };
  }

  rebuildWorkspaceIndex(workspaceId: string): RebuildWorkspaceIndexResult {
    validateNonEmptyString(workspaceId, "workspaceId");

    return this.createSearchIndexService().rebuildWorkspaceIndex(workspaceId);
  }

  getSearchIndexHealth(workspaceId: string): SearchIndexHealthReport {
    validateNonEmptyString(workspaceId, "workspaceId");

    return this.createSearchIndexService().getSearchIndexHealth(workspaceId);
  }

  private createSearchIndexService(): SearchIndexService {
    return new SearchIndexService({
      connection: this.connection,
      ...(this.idFactory === undefined ? {} : { idFactory: this.idFactory }),
      ...(this.now === undefined ? {} : { now: this.now })
    });
  }
}

function createListMetadata(
  list: ListDetailsRecord
): Record<string, string | boolean> {
  return {
    displayMode: list.displayMode,
    showCompleted: list.showCompleted,
    progressMode: list.progressMode
  };
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
