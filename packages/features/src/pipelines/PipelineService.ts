import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType,
  type ListDisplayMode
} from "@local-work-os/core";
import {
  ActivityLogService,
  ListRepository,
  SearchIndexService,
  TransactionService,
  type DatabaseConnection,
  type ListDetailsRecord,
  type ListItemRecord,
  type ListWithItemRecord,
  type SearchIndexRecord
} from "@local-work-os/db";
import type { FeatureModuleContract } from "../featureModuleContract";

export type PipelineServiceIdFactory = (prefix: string) => string;

export type PipelineStageView = {
  stage: ListItemRecord;
  cards: ListItemRecord[];
};

export type PipelineViewModel = {
  list: ListWithItemRecord;
  stages: PipelineStageView[];
};

export type ListDisplayModeMutationResult = {
  item: ListWithItemRecord["item"];
  list: ListDetailsRecord;
  searchRecord: SearchIndexRecord;
};

export type MovePipelineCardInput = {
  listId: string;
  cardId: string;
  targetStageId: string;
  actorType?: ActivityActorType;
  sortOrder?: number;
};

export type MovePipelineCardResult = {
  card: ListItemRecord;
  searchRecord: SearchIndexRecord;
};

// Owns the list-to-pipeline projection and pipeline-specific mutations.
export class PipelineService {
  readonly module = "pipelines";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: PipelineServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: PipelineServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async enablePipelineMode(
    listId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ListDisplayModeMutationResult> {
    return await this.setDisplayMode(listId, "pipeline", actorType);
  }

  async disablePipelineMode(
    listId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<ListDisplayModeMutationResult> {
    return await this.setDisplayMode(listId, "checklist", actorType);
  }

  getPipelineViewModel(listId: string): PipelineViewModel {
    validateNonEmptyString(listId, "listId");

    const list = this.requireList(listId);
    const listItems = new ListRepository(this.connection).listItems(listId);
    const stages = listItems.filter(
      (listItem) => listItem.depth === 0 && listItem.listItemParentId === null
    );

    return {
      list,
      stages: stages.map((stage) => ({
        stage,
        cards: listItems.filter((listItem) => listItem.listItemParentId === stage.id)
      }))
    };
  }

  async movePipelineCard(
    input: MovePipelineCardInput
  ): Promise<MovePipelineCardResult> {
    this.validateMovePipelineCardInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      this.requireList(input.listId);
      const repository = new ListRepository(this.connection);
      const before = this.requireListItem(input.cardId);
      const stage = this.requireListItem(input.targetStageId);

      if (before.listId !== input.listId) {
        throw new Error("cardId must belong to the requested list.");
      }

      if (stage.listId !== input.listId) {
        throw new Error("targetStageId must belong to the requested list.");
      }

      if (stage.depth !== 0 || stage.listItemParentId !== null) {
        throw new Error("targetStageId must be a top-level pipeline stage.");
      }

      if (before.id === stage.id) {
        throw new Error("cardId cannot be the same as targetStageId.");
      }

      if (before.depth === 0 && before.listItemParentId === null) {
        throw new Error("Pipeline stages cannot be moved as cards.");
      }

      const card = repository.updateListItem(before.id, {
        listItemParentId: stage.id,
        depth: 1,
        sortOrder:
          input.sortOrder ?? this.getNextStageCardSortOrder(input.listId, stage.id),
        timestamp
      });

      this.logListItemEvent({
        listItem: card,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.listItemReordered,
        summary: `Moved pipeline card "${card.title}" to "${stage.title}".`,
        before,
        timestamp
      });

      const searchRecord = this.upsertListItemSearchRecord(card, timestamp);

      return { card, searchRecord };
    });
  }

  private async setDisplayMode(
    listId: string,
    displayMode: ListDisplayMode,
    actorType: ActivityActorType
  ): Promise<ListDisplayModeMutationResult> {
    validateNonEmptyString(listId, "listId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireList(listId);
      const repository = new ListRepository(this.connection);
      const list = repository.updateDetails(listId, {
        displayMode,
        timestamp
      });
      const after = this.requireList(listId);

      this.logListEvent({
        listWithItem: after,
        actorType,
        action: ActivityAction.listUpdated,
        summary:
          displayMode === "pipeline"
            ? `Enabled pipeline mode for list "${after.item.title}".`
            : `Switched list "${after.item.title}" back to checklist mode.`,
        before,
        timestamp
      });

      const searchRecord = this.upsertListSearchRecord(after, timestamp);

      return { item: after.item, list, searchRecord };
    });
  }

  private requireList(itemId: string): ListWithItemRecord {
    const list = new ListRepository(this.connection).getByItemId(itemId);

    if (list === null) {
      throw new Error(`List was not found: ${itemId}.`);
    }

    return list;
  }

  private requireListItem(id: string): ListItemRecord {
    const listItem = new ListRepository(this.connection).getListItemById(id);

    if (listItem === null) {
      throw new Error(`List item was not found: ${id}.`);
    }

    return listItem;
  }

  private getNextStageCardSortOrder(listId: string, stageId: string): number {
    const maxSortOrder = new ListRepository(this.connection)
      .listItems(listId)
      .filter((listItem) => listItem.listItemParentId === stageId)
      .reduce<number | null>(
        (max, listItem) =>
          max === null ? listItem.sortOrder : Math.max(max, listItem.sortOrder),
        null
      );

    return maxSortOrder === null ? 1024 : maxSortOrder + 1024;
  }

  private upsertListSearchRecord(
    listWithItem: ListWithItemRecord,
    timestamp: string
  ): SearchIndexRecord {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertItem(listWithItem.item, {
      timestamp,
      metadata: {
        displayMode: listWithItem.list.displayMode,
        showCompleted: listWithItem.list.showCompleted,
        progressMode: listWithItem.list.progressMode
      }
    });
  }

  private upsertListItemSearchRecord(
    listItem: ListItemRecord,
    timestamp: string
  ): SearchIndexRecord {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertListItem(listItem, { timestamp });
  }

  private logListEvent(input: {
    listWithItem: ListWithItemRecord;
    actorType?: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: ListWithItemRecord | null;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.listWithItem.item.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: input.action,
      targetType: "item",
      targetId: input.listWithItem.item.id,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify(input.listWithItem),
      timestamp: input.timestamp
    });
  }

  private logListItemEvent(input: {
    listItem: ListItemRecord;
    actorType?: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: ListItemRecord | null;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.listItem.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: input.action,
      targetType: "list_item",
      targetId: input.listItem.id,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify(input.listItem),
      timestamp: input.timestamp
    });
  }

  private validateMovePipelineCardInput(input: MovePipelineCardInput): void {
    validateNonEmptyString(input.listId, "listId");
    validateNonEmptyString(input.cardId, "cardId");
    validateNonEmptyString(input.targetStageId, "targetStageId");

    if (input.sortOrder !== undefined && !Number.isInteger(input.sortOrder)) {
      throw new Error("sortOrder must be an integer.");
    }
  }
}

export const pipelinesModuleContract = {
  module: "pipelines",
  purpose: "Render and mutate list-backed pipeline views.",
  owns: ["list display mode", "pipeline stage projections", "pipeline card movement"],
  doesNotOwn: ["project lifecycle", "separate board tables", "cloud workflows"],
  integrationPoints: ["lists", "projects", "activity", "search"],
  priority: "V2"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
