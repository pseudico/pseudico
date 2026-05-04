import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  isSupportedLinkProtocol,
  type ActivityActorType,
  type LinkRecord
} from "@local-work-os/core";
import {
  ActivityLogService,
  ItemRepository,
  LinkRepository,
  SearchIndexService,
  SortOrderService,
  TagRepository,
  TransactionService,
  type DatabaseConnection,
  type ItemRecord,
  type LinkWithItemRecord,
  type SearchIndexRecord,
  type UpdateItemPatch,
  type UpdateLinkDetailsPatch
} from "@local-work-os/db";

// Owns URL/link item application operations.
// Does not own hosted preview services or browser extension implementation.
export type LinkServiceIdFactory = (prefix: string) => string;

export type CreateLinkInput = {
  workspaceId: string;
  containerId: string;
  url: string;
  actorType?: ActivityActorType;
  categoryId?: string | null;
  containerTabId?: string | null;
  description?: string | null;
  sortOrder?: number;
  pinned?: boolean;
  title?: string | null;
};

export type UpdateLinkInput = {
  itemId: string;
  actorType?: ActivityActorType;
  categoryId?: string | null;
  containerTabId?: string | null;
  description?: string | null;
  pinned?: boolean;
  sortOrder?: number;
  title?: string | null;
  url?: string;
};

export type LinkMutationResult = LinkWithItemRecord & {
  searchRecord: SearchIndexRecord;
};

export class LinkService {
  readonly module = "links";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: LinkServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: LinkServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async createLink(input: CreateLinkInput): Promise<LinkMutationResult> {
    this.validateCreateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const normalizedUrl = this.normaliseUrl(input.url);
      const domain = this.extractDomain(normalizedUrl);
      const title = normalizeNullableString(input.title) ?? normalizedUrl;
      const description = normalizeNullableString(input.description);
      const itemRepository = new ItemRepository(this.connection);
      const linkRepository = new LinkRepository(this.connection);
      const sortOrderService = new SortOrderService({
        connection: this.connection
      });
      const item = itemRepository.create({
        id: this.idFactory("item"),
        workspaceId: input.workspaceId,
        containerId: input.containerId,
        containerTabId: input.containerTabId ?? null,
        type: "link",
        title,
        body: description,
        categoryId: normalizeNullableString(input.categoryId),
        sortOrder:
          input.sortOrder ??
          sortOrderService.getNextItemSortOrder({
            containerId: input.containerId,
            containerTabId: input.containerTabId ?? null
          }),
        ...(input.pinned === undefined ? {} : { pinned: input.pinned }),
        timestamp
      });
      const link = linkRepository.createDetails({
        itemId: item.id,
        workspaceId: item.workspaceId,
        url: input.url.trim(),
        normalizedUrl,
        title,
        description,
        domain,
        timestamp
      });

      this.logLinkEvent({
        item,
        link,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.linkCreated,
        summary: `Created link "${item.title}".`,
        before: null,
        timestamp
      });

      const searchRecord = this.upsertSearchRecord(item, link, timestamp);

      return {
        item,
        link,
        searchRecord
      };
    });
  }

  async updateLink(input: UpdateLinkInput): Promise<LinkMutationResult> {
    this.validateUpdateInput(input);

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const before = this.requireLink(input.itemId);
      const itemPatch: UpdateItemPatch = { timestamp };
      const linkPatch: UpdateLinkDetailsPatch = { timestamp };

      if (input.url !== undefined) {
        const normalizedUrl = this.normaliseUrl(input.url);
        linkPatch.url = input.url.trim();
        linkPatch.normalizedUrl = normalizedUrl;
        linkPatch.domain = this.extractDomain(normalizedUrl);
      }

      if (input.title !== undefined) {
        const title =
          normalizeNullableString(input.title) ??
          linkPatch.normalizedUrl ??
          before.link.normalizedUrl;
        itemPatch.title = title;
        linkPatch.title = title;
      }

      if (input.description !== undefined) {
        const description = normalizeNullableString(input.description);
        itemPatch.body = description;
        linkPatch.description = description;
      }

      if (input.categoryId !== undefined) {
        itemPatch.categoryId = normalizeNullableString(input.categoryId);
      }

      if (input.containerTabId !== undefined) {
        itemPatch.containerTabId = input.containerTabId;
      }

      if (input.sortOrder !== undefined) {
        itemPatch.sortOrder = input.sortOrder;
      }

      if (input.pinned !== undefined) {
        itemPatch.pinned = input.pinned;
      }

      const item = new ItemRepository(this.connection).update(
        input.itemId,
        itemPatch
      );
      const link = new LinkRepository(this.connection).updateDetails(
        input.itemId,
        linkPatch
      );

      this.logLinkEvent({
        item,
        link,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.linkUpdated,
        summary: `Updated link "${item.title}".`,
        before,
        timestamp
      });

      const searchRecord = this.upsertSearchRecord(item, link, timestamp);

      return {
        item,
        link,
        searchRecord
      };
    });
  }

  listLinksByContainer(containerId: string): LinkWithItemRecord[] {
    validateNonEmptyString(containerId, "containerId");

    return new LinkRepository(this.connection).listByContainer(containerId);
  }

  getLinkByItemId(itemId: string): LinkWithItemRecord | null {
    validateNonEmptyString(itemId, "itemId");

    return new LinkRepository(this.connection).getByItemId(itemId);
  }

  normaliseUrl(url: string): string {
    validateNonEmptyString(url, "url");

    const trimmed = url.trim();
    const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

    let parsed: URL;

    try {
      parsed = new URL(withProtocol);
    } catch {
      throw new Error("url must be a valid HTTP or HTTPS URL.");
    }

    if (!isSupportedLinkProtocol(parsed.protocol)) {
      throw new Error("url must use HTTP or HTTPS.");
    }

    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();

    return parsed.href;
  }

  extractDomain(url: string): string {
    const normalizedUrl = this.normaliseUrl(url);
    const hostname = new URL(normalizedUrl).hostname.toLowerCase();
    return hostname.replace(/^www\./, "");
  }

  private requireLink(itemId: string): LinkWithItemRecord {
    const link = new LinkRepository(this.connection).getByItemId(itemId);

    if (link === null) {
      throw new Error(`Link was not found: ${itemId}.`);
    }

    return link;
  }

  private upsertSearchRecord(
    item: ItemRecord,
    link: LinkRecord,
    timestamp: string
  ): SearchIndexRecord {
    const tags = new TagRepository(this.connection).listTagsForTarget({
      workspaceId: item.workspaceId,
      targetType: "item",
      targetId: item.id
    });

    return new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    }).upsertLink(item, link, {
      timestamp,
      tags: tags.map((tag) => tag.slug),
      metadata: {
        tagIds: tags.map((tag) => tag.id),
        tagSlugs: tags.map((tag) => tag.slug)
      }
    });
  }

  private logLinkEvent(input: {
    item: ItemRecord;
    link: LinkRecord;
    actorType?: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: LinkWithItemRecord | null;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.item.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: input.action,
      targetType: "item",
      targetId: input.item.id,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify({ item: input.item, link: input.link }),
      timestamp: input.timestamp
    });
  }

  private validateCreateInput(input: CreateLinkInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.containerId, "containerId");
    validateNonEmptyString(input.url, "url");

    if (input.title !== undefined && input.title !== null) {
      validateNonEmptyString(input.title, "title");
    }
  }

  private validateUpdateInput(input: UpdateLinkInput): void {
    validateNonEmptyString(input.itemId, "itemId");

    if (input.url !== undefined) {
      validateNonEmptyString(input.url, "url");
    }

    if (input.title !== undefined && input.title !== null) {
      validateNonEmptyString(input.title, "title");
    }

    if (
      input.url === undefined &&
      input.title === undefined &&
      input.description === undefined &&
      input.categoryId === undefined &&
      input.containerTabId === undefined &&
      input.sortOrder === undefined &&
      input.pinned === undefined
    ) {
      throw new Error("At least one link field must be provided.");
    }
  }
}

export const linksModuleContract = {
  module: "links",
  purpose: "Manage URL/link item behavior and local link metadata contracts.",
  owns: ["link item operations", "URL normalization contracts", "local link metadata"],
  doesNotOwn: ["hosted preview services", "browser extension implementation", "notes/files search internals"],
  integrationPoints: ["projects", "contacts", "inbox", "search", "metadata"],
  priority: "MVP"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function normalizeNullableString(
  value: string | null | undefined
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
