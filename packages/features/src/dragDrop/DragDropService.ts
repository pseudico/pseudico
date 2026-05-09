import type { FeatureModuleContract } from "../featureModuleContract";
import {
  createSequentialSortOrders,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ItemRepository,
  ListRepository,
  type DatabaseConnection,
  type ItemRecord,
  type ListItemRecord
} from "@local-work-os/db";
import { FileAttachmentService, type FileAttachmentMutationResult } from "../files";
import { ItemService, type ItemMutationResult } from "../items";
import { ListService, type ListItemMutationResult } from "../lists";
import { TabService } from "../tabs";

export type DragDropServiceIdFactory = (prefix: string) => string;

export type ReorderContainerItemsInput = {
  containerId: string;
  itemIds: string[];
  actorType?: ActivityActorType;
  containerTabId?: string | null;
};

export type MoveDraggedItemInput = {
  itemId: string;
  targetContainerId: string;
  actorType?: ActivityActorType;
  targetContainerTabId?: string | null;
  sortOrder?: number;
};

export type ReorderDraggedListItemsInput = {
  listId: string;
  listItemIds: string[];
  actorType?: ActivityActorType;
};

export type ReorderDraggedTabsInput = {
  containerId: string;
  tabIds: string[];
  actorType?: ActivityActorType;
};

export type AttachDroppedCopiedFileToContainerInput = {
  workspaceId: string;
  containerId: string;
  copiedFiles: Array<Parameters<FileAttachmentService["attachFileToContainer"]>[0]["copiedFile"]>;
  actorType?: ActivityActorType;
  containerTabId?: string | null;
  description?: string | null;
  startSortOrder?: number;
};

export type AttachDroppedCopiedFileToItemInput = {
  itemId: string;
  copiedFiles: Array<Parameters<FileAttachmentService["attachFileToItem"]>[0]["copiedFile"]>;
  actorType?: ActivityActorType;
  description?: string | null;
};

export class DragDropService {
  readonly module = "dragDrop";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: DragDropServiceIdFactory | undefined;
  private readonly now: (() => Date) | undefined;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: DragDropServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory;
    this.now = input.now;
  }

  async reorderContainerItems(
    input: ReorderContainerItemsInput
  ): Promise<ItemMutationResult[]> {
    validateNonEmptyString(input.containerId, "containerId");
    validateIdList(input.itemIds, "itemIds");

    const currentItems =
      input.containerTabId === undefined
        ? new ItemRepository(this.connection).listByContainer(input.containerId)
        : input.containerTabId === null
          ? new ItemRepository(this.connection)
              .listByContainer(input.containerId)
              .filter((item) => item.containerTabId === null)
          : new ItemRepository(this.connection).listByContainerTab(
              input.containerId,
              input.containerTabId
            );

    assertExactItemSet(currentItems, input.itemIds);

    const itemService = this.createItemService();
    const results: ItemMutationResult[] = [];

    for (const order of createSequentialSortOrders(input.itemIds)) {
      const current = currentItems.find((item) => item.id === order.id);

      if (current === undefined) {
        throw new Error(`Item was not found in reorder set: ${order.id}.`);
      }

      results.push(
        await itemService.moveItem({
          itemId: current.id,
          targetContainerId: current.containerId,
          targetContainerTabId: current.containerTabId,
          sortOrder: order.sortOrder,
          ...(input.actorType === undefined ? {} : { actorType: input.actorType })
        })
      );
    }

    return results;
  }

  async moveItem(input: MoveDraggedItemInput): Promise<ItemMutationResult> {
    validateNonEmptyString(input.itemId, "itemId");
    validateNonEmptyString(input.targetContainerId, "targetContainerId");

    return await this.createItemService().moveItem({
      itemId: input.itemId,
      targetContainerId: input.targetContainerId,
      targetContainerTabId: input.targetContainerTabId ?? null,
      ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
      ...(input.actorType === undefined ? {} : { actorType: input.actorType })
    });
  }

  async reorderListItems(
    input: ReorderDraggedListItemsInput
  ): Promise<ListItemMutationResult[]> {
    validateNonEmptyString(input.listId, "listId");
    validateIdList(input.listItemIds, "listItemIds");

    const listItems = new ListRepository(this.connection).listItems(input.listId);
    assertExactListItemSet(listItems, input.listItemIds);

    return await this.createListService().reorderListItems({
      listId: input.listId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      items: createSequentialSortOrders(input.listItemIds).map((order) => {
        const current = listItems.find((item) => item.id === order.id);

        if (current === undefined) {
          throw new Error(`List item was not found in reorder set: ${order.id}.`);
        }

        return {
          id: current.id,
          sortOrder: order.sortOrder,
          depth: current.depth,
          listItemParentId: current.listItemParentId
        };
      })
    });
  }

  async reorderTabs(input: ReorderDraggedTabsInput) {
    validateNonEmptyString(input.containerId, "containerId");
    validateIdList(input.tabIds, "tabIds");

    return await this.createTabService().reorderTabs(input);
  }

  async attachCopiedFilesToContainer(
    input: AttachDroppedCopiedFileToContainerInput
  ): Promise<FileAttachmentMutationResult[]> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");

    if (input.copiedFiles.length === 0) {
      throw new Error("copiedFiles must include at least one file.");
    }

    const fileService = this.createFileAttachmentService();
    const results: FileAttachmentMutationResult[] = [];
    let nextSortOrder = input.startSortOrder ?? undefined;

    for (const copiedFile of input.copiedFiles) {
      results.push(
        await fileService.attachFileToContainer({
          workspaceId: input.workspaceId,
          containerId: input.containerId,
          copiedFile,
          ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
          ...(input.containerTabId === undefined
            ? {}
            : { containerTabId: input.containerTabId }),
          ...(input.description === undefined
            ? {}
            : { description: input.description }),
          ...(nextSortOrder === undefined ? {} : { sortOrder: nextSortOrder })
        })
      );
      nextSortOrder =
        nextSortOrder === undefined ? undefined : nextSortOrder + 1024;
    }

    return results;
  }

  async attachCopiedFilesToItem(
    input: AttachDroppedCopiedFileToItemInput
  ): Promise<FileAttachmentMutationResult[]> {
    validateNonEmptyString(input.itemId, "itemId");

    if (input.copiedFiles.length === 0) {
      throw new Error("copiedFiles must include at least one file.");
    }

    const fileService = this.createFileAttachmentService();
    const results: FileAttachmentMutationResult[] = [];

    for (const copiedFile of input.copiedFiles) {
      results.push(
        await fileService.attachFileToItem({
          itemId: input.itemId,
          copiedFile,
          ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
          ...(input.description === undefined
            ? {}
            : { description: input.description })
        })
      );
    }

    return results;
  }

  private createItemService(): ItemService {
    return new ItemService({
      connection: this.connection,
      ...(this.idFactory === undefined ? {} : { idFactory: this.idFactory }),
      ...(this.now === undefined ? {} : { now: this.now })
    });
  }

  private createListService(): ListService {
    return new ListService({
      connection: this.connection,
      ...(this.idFactory === undefined ? {} : { idFactory: this.idFactory }),
      ...(this.now === undefined ? {} : { now: this.now })
    });
  }

  private createTabService(): TabService {
    return new TabService({
      connection: this.connection,
      ...(this.idFactory === undefined ? {} : { idFactory: this.idFactory }),
      ...(this.now === undefined ? {} : { now: this.now })
    });
  }

  private createFileAttachmentService(): FileAttachmentService {
    return new FileAttachmentService({
      connection: this.connection,
      ...(this.idFactory === undefined ? {} : { idFactory: this.idFactory }),
      ...(this.now === undefined ? {} : { now: this.now })
    });
  }
}

export const dragDropModuleContract = {
  module: "dragDrop",
  purpose: "Coordinate typed local drag/drop moves, reorders, and file-drop imports.",
  owns: ["drag payload handling", "drop intent validation", "reorder orchestration"],
  doesNotOwn: ["raw renderer filesystem access", "type-specific editors"],
  integrationPoints: ["items", "lists", "tabs", "files", "activity log", "search"],
  priority: "V1"
} as const satisfies FeatureModuleContract;

function assertExactItemSet(items: readonly ItemRecord[], itemIds: string[]): void {
  assertExactSet(items.map((item) => item.id), itemIds, "itemIds");
}

function assertExactListItemSet(
  items: readonly ListItemRecord[],
  itemIds: string[]
): void {
  assertExactSet(items.map((item) => item.id), itemIds, "listItemIds");
}

function assertExactSet(
  expectedIds: string[],
  actualIds: string[],
  fieldName: string
): void {
  if (
    expectedIds.length !== actualIds.length ||
    expectedIds.some((id) => !actualIds.includes(id))
  ) {
    throw new Error(`${fieldName} must include every active record exactly once.`);
  }
}

function validateIdList(ids: string[], fieldName: string): void {
  if (ids.length === 0) {
    throw new Error(`${fieldName} must contain at least one id.`);
  }

  const seen = new Set<string>();

  for (const id of ids) {
    validateNonEmptyString(id, fieldName);

    if (seen.has(id)) {
      throw new Error(`${fieldName} must not contain duplicate ids.`);
    }

    seen.add(id);
  }
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
