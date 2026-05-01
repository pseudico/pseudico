import type { DatabaseConnection } from "../connection/createDatabaseConnection";
import { ItemRepository } from "../repositories";

export const DEFAULT_SORT_ORDER_STEP = 1024;

export class SortOrderService {
  private readonly itemRepository: ItemRepository;

  constructor(input: { connection: DatabaseConnection }) {
    this.itemRepository = new ItemRepository(input.connection);
  }

  getNextItemSortOrder(input: {
    containerId: string;
    containerTabId?: string | null;
  }): number {
    const maxSortOrder = this.itemRepository.getMaxSortOrder(input);

    return maxSortOrder === null
      ? DEFAULT_SORT_ORDER_STEP
      : maxSortOrder + DEFAULT_SORT_ORDER_STEP;
  }
}
