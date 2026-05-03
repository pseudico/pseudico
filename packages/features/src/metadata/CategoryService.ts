import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  CategoryRepository,
  ContainerRepository,
  ItemRepository,
  SearchIndexService,
  TransactionService,
  type CategoryRecord,
  type ContainerRecord,
  type DatabaseConnection,
  type ItemRecord,
  type SearchIndexRecord
} from "@local-work-os/db";

export type CategoryServiceIdFactory = (prefix: string) => string;

export type CreateCategoryInput = {
  workspaceId: string;
  name: string;
  color: string;
  actorType?: ActivityActorType;
  description?: string | null;
};

export type UpdateCategoryInput = {
  categoryId: string;
  actorType?: ActivityActorType;
  color?: string;
  description?: string | null;
  name?: string;
};

export type AssignCategoryToContainerInput = {
  workspaceId: string;
  containerId: string;
  actorType?: ActivityActorType;
  categoryId?: string | null;
};

export type AssignCategoryToItemInput = {
  workspaceId: string;
  itemId: string;
  actorType?: ActivityActorType;
  categoryId?: string | null;
};

export type CategoryAssignmentResult = {
  category: CategoryRecord | null;
  searchRecord: SearchIndexRecord;
};

export type DeleteOrArchiveCategoryResult = {
  category: CategoryRecord;
  clearedContainerCount: number;
  clearedItemCount: number;
};

export class CategoryService {
  readonly module = "metadata.categories";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: CategoryServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: CategoryServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async createCategory(input: CreateCategoryInput): Promise<CategoryRecord> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.name, "name");
    validateColor(input.color);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new CategoryRepository(this.connection);
      const name = normalizeName(input.name);
      const slug = this.createUniqueSlug(input.workspaceId, name);
      const existing = repository.findBySlug({
        workspaceId: input.workspaceId,
        slug,
        includeDeleted: true
      });

      if (existing?.deletedAt === null) {
        throw new Error(`Category already exists: ${name}.`);
      }

      const category =
        existing === null
          ? repository.create({
              id: this.idFactory("category"),
              workspaceId: input.workspaceId,
              name,
              slug,
              color: input.color,
              description: normalizeNullableString(input.description),
              timestamp
            })
          : repository.restore(existing.id, {
              name,
              slug,
              color: input.color,
              description: normalizeNullableString(input.description),
              timestamp
            });

      this.logCategoryEvent({
        workspaceId: category.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.categoryCreated,
        category,
        summary: `Created category "${category.name}".`,
        before: null,
        after: category,
        timestamp
      });

      return category;
    });
  }

  async updateCategory(input: UpdateCategoryInput): Promise<CategoryRecord> {
    validateNonEmptyString(input.categoryId, "categoryId");

    if (input.name !== undefined) {
      validateNonEmptyString(input.name, "name");
    }

    if (input.color !== undefined) {
      validateColor(input.color);
    }

    if (
      input.name === undefined &&
      input.color === undefined &&
      input.description === undefined
    ) {
      throw new Error("At least one category field must be provided.");
    }

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireCategory(input.categoryId);
      const category = new CategoryRepository(this.connection).update(before.id, {
        timestamp,
        ...(input.name === undefined
          ? {}
          : {
              name: normalizeName(input.name),
              slug: this.createUniqueSlug(
                before.workspaceId,
                input.name,
                before.id
              )
            }),
        ...(input.color === undefined ? {} : { color: input.color }),
        ...(input.description === undefined
          ? {}
          : { description: normalizeNullableString(input.description) })
      });

      this.logCategoryEvent({
        workspaceId: category.workspaceId,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.categoryUpdated,
        category,
        summary: `Updated category "${category.name}".`,
        before,
        after: category,
        timestamp
      });
      this.refreshAssignedSearchRecords(category, timestamp);

      return category;
    });
  }

  async deleteOrArchiveCategory(
    categoryId: string,
    actorType: ActivityActorType = "local_user"
  ): Promise<DeleteOrArchiveCategoryResult> {
    validateNonEmptyString(categoryId, "categoryId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new CategoryRepository(this.connection);
      const before = this.requireCategory(categoryId);
      const assignedContainers = repository.listAssignedContainers(categoryId);
      const assignedItems = repository.listAssignedItems(categoryId);
      const containerRepository = new ContainerRepository(this.connection);
      const itemRepository = new ItemRepository(this.connection);

      for (const container of assignedContainers) {
        const updated = containerRepository.update(container.id, {
          categoryId: null,
          timestamp
        });
        this.upsertContainerSearchRecord(updated, timestamp);
        this.logAssignmentEvent({
          workspaceId: updated.workspaceId,
          actorType,
          targetType: "container",
          targetId: updated.id,
          summary: `Cleared category "${before.name}" from ${updated.type} "${updated.name}".`,
          before: container,
          after: updated,
          timestamp
        });
      }

      for (const item of assignedItems) {
        const updated = itemRepository.update(item.id, {
          categoryId: null,
          timestamp
        });
        this.upsertItemSearchRecord(updated, timestamp);
        this.logAssignmentEvent({
          workspaceId: updated.workspaceId,
          actorType,
          targetType: "item",
          targetId: updated.id,
          summary: `Cleared category "${before.name}" from ${updated.type} "${updated.title}".`,
          before: item,
          after: updated,
          timestamp
        });
      }

      const category = repository.softDelete(categoryId, timestamp);

      this.logCategoryEvent({
        workspaceId: category.workspaceId,
        actorType,
        action: ActivityAction.categoryDeleted,
        category,
        summary: `Deleted category "${category.name}".`,
        before,
        after: category,
        timestamp
      });

      return {
        category,
        clearedContainerCount: assignedContainers.length,
        clearedItemCount: assignedItems.length
      };
    });
  }

  async assignCategoryToContainer(
    input: AssignCategoryToContainerInput
  ): Promise<CategoryAssignmentResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireContainer(input.containerId);
      this.assertWorkspaceMatch(input.workspaceId, before.workspaceId);
      const category = this.resolveAssignableCategory(
        input.workspaceId,
        input.categoryId ?? null
      );
      const container = new ContainerRepository(this.connection).update(
        input.containerId,
        {
          categoryId: category?.id ?? null,
          timestamp
        }
      );
      const searchRecord = this.upsertContainerSearchRecord(container, timestamp);

      this.logAssignmentEvent({
        workspaceId: input.workspaceId,
        actorType: input.actorType ?? "local_user",
        targetType: "container",
        targetId: container.id,
        summary:
          category === null
            ? `Cleared category from ${container.type} "${container.name}".`
            : `Assigned category "${category.name}" to ${container.type} "${container.name}".`,
        before,
        after: { container, category },
        timestamp
      });

      return { category, searchRecord };
    });
  }

  async assignCategoryToItem(
    input: AssignCategoryToItemInput
  ): Promise<CategoryAssignmentResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.itemId, "itemId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireItem(input.itemId);
      this.assertWorkspaceMatch(input.workspaceId, before.workspaceId);
      const category = this.resolveAssignableCategory(
        input.workspaceId,
        input.categoryId ?? null
      );
      const item = new ItemRepository(this.connection).update(input.itemId, {
        categoryId: category?.id ?? null,
        timestamp
      });
      const searchRecord = this.upsertItemSearchRecord(item, timestamp);

      this.logAssignmentEvent({
        workspaceId: input.workspaceId,
        actorType: input.actorType ?? "local_user",
        targetType: "item",
        targetId: item.id,
        summary:
          category === null
            ? `Cleared category from ${item.type} "${item.title}".`
            : `Assigned category "${category.name}" to ${item.type} "${item.title}".`,
        before,
        after: { item, category },
        timestamp
      });

      return { category, searchRecord };
    });
  }

  listCategories(workspaceId: string): CategoryRecord[] {
    validateNonEmptyString(workspaceId, "workspaceId");

    return new CategoryRepository(this.connection).listByWorkspace(workspaceId);
  }

  private requireCategory(categoryId: string): CategoryRecord {
    const category = new CategoryRepository(this.connection).getById(categoryId);

    if (category === null) {
      throw new Error(`Category was not found: ${categoryId}.`);
    }

    return category;
  }

  private requireContainer(containerId: string): ContainerRecord {
    const container = new ContainerRepository(this.connection).getById(containerId);

    if (container === null) {
      throw new Error(`Container was not found: ${containerId}.`);
    }

    return container;
  }

  private requireItem(itemId: string): ItemRecord {
    const item = new ItemRepository(this.connection).getById(itemId);

    if (item === null) {
      throw new Error(`Item was not found: ${itemId}.`);
    }

    return item;
  }

  private resolveAssignableCategory(
    workspaceId: string,
    categoryId: string | null
  ): CategoryRecord | null {
    if (categoryId === null) {
      return null;
    }

    const category = this.requireCategory(categoryId);
    this.assertWorkspaceMatch(workspaceId, category.workspaceId);
    return category;
  }

  private createUniqueSlug(
    workspaceId: string,
    value: string,
    currentCategoryId?: string
  ): string {
    const baseSlug = slugifyCategoryName(value);
    const existingSlugs = new Set(
      new CategoryRepository(this.connection)
        .listByWorkspace(workspaceId, { includeDeleted: true })
        .filter((category) => category.id !== currentCategoryId)
        .map((category) => category.slug)
    );

    if (!existingSlugs.has(baseSlug)) {
      return baseSlug;
    }

    let suffix = 2;

    while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
      suffix += 1;
    }

    return `${baseSlug}-${suffix}`;
  }

  private refreshAssignedSearchRecords(
    category: CategoryRecord,
    timestamp: string
  ): void {
    const repository = new CategoryRepository(this.connection);

    for (const container of repository.listAssignedContainers(category.id)) {
      this.upsertContainerSearchRecord(container, timestamp);
    }

    for (const item of repository.listAssignedItems(category.id)) {
      this.upsertItemSearchRecord(item, timestamp);
    }
  }

  private upsertContainerSearchRecord(
    container: ContainerRecord,
    timestamp: string
  ): SearchIndexRecord {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertContainer(container, { timestamp });
  }

  private upsertItemSearchRecord(
    item: ItemRecord,
    timestamp: string
  ): SearchIndexRecord {
    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertItem(item, { timestamp });
  }

  private logCategoryEvent(input: {
    workspaceId: string;
    actorType: ActivityActorType;
    action:
      | typeof ActivityAction.categoryCreated
      | typeof ActivityAction.categoryUpdated
      | typeof ActivityAction.categoryDeleted;
    category: CategoryRecord;
    summary: string;
    before: unknown;
    after: unknown;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: input.action,
      targetType: "category",
      targetId: input.category.id,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }

  private logAssignmentEvent(input: {
    workspaceId: string;
    actorType: ActivityActorType;
    targetType: "container" | "item";
    targetId: string;
    summary: string;
    before: unknown;
    after: unknown;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.workspaceId,
      actorType: input.actorType,
      action: ActivityAction.categoryAssigned,
      targetType: input.targetType,
      targetId: input.targetId,
      summary: input.summary,
      beforeJson: JSON.stringify(input.before),
      afterJson: JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }

  private assertWorkspaceMatch(requested: string, actual: string): void {
    if (requested !== actual) {
      throw new Error("Category workspaceId must match the target workspace.");
    }
  }
}

export const categoriesModuleContract = {
  module: "metadata.categories",
  purpose: "Manage local category operations and assignment contracts.",
  owns: ["category operations", "category assignment contracts", "category search projections"],
  doesNotOwn: ["saved-view storage", "dashboard rendering", "team taxonomy"],
  integrationPoints: ["all content modules", "search", "saved views", "dashboard", "today"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function validateColor(value: string): void {
  if (!/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new Error("color must be a hex color like #245c55.");
  }
}

function normalizeName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, " ");

  if (normalized.length === 0) {
    throw new Error("Category name must be a non-empty string.");
  }

  return normalized;
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function slugifyCategoryName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug.length === 0 ? "category" : slug;
}
