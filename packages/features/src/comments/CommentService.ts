import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  type ActivityActorType
} from "@local-work-os/core";
import {
  ActivityLogService,
  CommentRepository,
  ContainerRepository,
  ItemRepository,
  LinkRepository,
  ListRepository,
  NoteRepository,
  SearchIndexService,
  TransactionService,
  type CommentRecord,
  type CommentTargetType,
  type DatabaseConnection,
  type SearchIndexRecord
} from "@local-work-os/db";

export type CommentServiceIdFactory = (prefix: string) => string;

export type CommentTargetInput = {
  targetType: CommentTargetType;
  targetId: string;
};

export type AddCommentInput = CommentTargetInput & {
  workspaceId: string;
  body: string;
  actorType?: ActivityActorType;
  authorLabel?: string | null;
};

export type UpdateCommentInput = {
  commentId: string;
  body: string;
  actorType?: ActivityActorType;
  authorLabel?: string | null;
};

export type DeleteCommentInput = {
  commentId: string;
  actorType?: ActivityActorType;
};

export type CommentMutationResult = {
  comment: CommentRecord;
  comments: CommentRecord[];
  searchRecord: SearchIndexRecord;
};

export type CommentThreadSummary = {
  targetType: CommentTargetType;
  targetId: string;
  count: number;
  latestComment: CommentRecord | null;
};

export class CommentService {
  readonly module = "comments";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: CommentServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: CommentServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({ connection: input.connection });
  }

  async addComment(input: AddCommentInput): Promise<CommentMutationResult> {
    this.validateTarget(input);
    validateBody(input.body);

    return await this.transactionService.runInTransaction(() => {
      this.assertTargetExists(input.workspaceId, input);
      const timestamp = createIsoTimestamp(this.now());
      const repository = new CommentRepository(this.connection);
      const comment = repository.create({
        id: this.idFactory("comment"),
        workspaceId: input.workspaceId,
        targetType: input.targetType,
        targetId: input.targetId,
        body: input.body.trim(),
        authorLabel: normalizeNullableString(input.authorLabel),
        timestamp
      });
      const comments = repository.listForTarget(input);
      const searchRecord = this.reindexTarget(comment);

      this.logCommentEvent({
        comment,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.commentCreated,
        summary: `Added a comment to ${input.targetType} ${input.targetId}.`,
        before: null,
        after: comment,
        timestamp
      });

      return { comment, comments, searchRecord };
    });
  }

  async updateComment(input: UpdateCommentInput): Promise<CommentMutationResult> {
    validateNonEmptyString(input.commentId, "commentId");
    validateBody(input.body);

    return await this.transactionService.runInTransaction(() => {
      const repository = new CommentRepository(this.connection);
      const before = this.requireComment(input.commentId);
      const timestamp = createIsoTimestamp(this.now());
      const comment = repository.update(input.commentId, {
        body: input.body.trim(),
        ...(input.authorLabel === undefined
          ? {}
          : { authorLabel: normalizeNullableString(input.authorLabel) }),
        timestamp
      });
      const comments = repository.listForTarget(comment);
      const searchRecord = this.reindexTarget(comment);

      this.logCommentEvent({
        comment,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.commentUpdated,
        summary: `Updated a comment on ${comment.targetType} ${comment.targetId}.`,
        before,
        after: comment,
        timestamp
      });

      return { comment, comments, searchRecord };
    });
  }

  async deleteComment(input: DeleteCommentInput): Promise<CommentMutationResult> {
    validateNonEmptyString(input.commentId, "commentId");

    return await this.transactionService.runInTransaction(() => {
      const repository = new CommentRepository(this.connection);
      const before = this.requireComment(input.commentId);
      const timestamp = createIsoTimestamp(this.now());
      const comment = repository.softDelete(input.commentId, timestamp);
      const comments = repository.listForTarget(comment);
      const searchRecord = this.reindexTarget(comment);

      this.logCommentEvent({
        comment,
        ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
        action: ActivityAction.commentDeleted,
        summary: `Deleted a comment from ${comment.targetType} ${comment.targetId}.`,
        before,
        after: comment,
        timestamp
      });

      return { comment, comments, searchRecord };
    });
  }

  listComments(input: AddCommentInput | (CommentTargetInput & { workspaceId: string; limit?: number })): CommentRecord[] {
    this.validateTarget(input);
    return new CommentRepository(this.connection).listForTarget(input);
  }

  getThreadSummary(input: CommentTargetInput & { workspaceId: string }): CommentThreadSummary {
    this.validateTarget(input);
    const repository = new CommentRepository(this.connection);
    const comments = repository.listForTarget(input);

    return {
      targetType: input.targetType,
      targetId: input.targetId,
      count: comments.length,
      latestComment: comments.at(-1) ?? null
    };
  }

  private requireComment(commentId: string): CommentRecord {
    const comment = new CommentRepository(this.connection).getById(commentId);

    if (comment === null) {
      throw new Error(`Comment was not found: ${commentId}.`);
    }

    return comment;
  }

  private assertTargetExists(workspaceId: string, target: CommentTargetInput): void {
    switch (target.targetType) {
      case "container": {
        const container = new ContainerRepository(this.connection).getById(target.targetId);
        if (container === null || container.workspaceId !== workspaceId) {
          throw new Error(`Comment target container was not found: ${target.targetId}.`);
        }
        return;
      }
      case "item": {
        const item = new ItemRepository(this.connection).getById(target.targetId);
        if (item === null || item.workspaceId !== workspaceId) {
          throw new Error(`Comment target item was not found: ${target.targetId}.`);
        }
        return;
      }
      case "list_item": {
        const listItem = new ListRepository(this.connection).getListItemById(target.targetId);
        if (listItem === null || listItem.workspaceId !== workspaceId) {
          throw new Error(`Comment target list row was not found: ${target.targetId}.`);
        }
      }
    }
  }

  private reindexTarget(comment: CommentRecord): SearchIndexRecord {
    const search = new SearchIndexService({
      connection: this.connection,
      idFactory: this.idFactory,
      now: this.now
    });

    switch (comment.targetType) {
      case "container": {
        const container = new ContainerRepository(this.connection).getById(comment.targetId);
        if (container === null) {
          throw new Error(`Comment target container was not found: ${comment.targetId}.`);
        }
        return search.upsertContainer(container, { timestamp: comment.updatedAt });
      }
      case "list_item": {
        const listItem = new ListRepository(this.connection).getListItemById(comment.targetId);
        if (listItem === null) {
          throw new Error(`Comment target list row was not found: ${comment.targetId}.`);
        }
        return search.upsertListItem(listItem, { timestamp: comment.updatedAt });
      }
      case "item": {
        const item = new ItemRepository(this.connection).getById(comment.targetId);
        if (item === null) {
          throw new Error(`Comment target item was not found: ${comment.targetId}.`);
        }
        if (item.type === "note") {
          const note = new NoteRepository(this.connection).getByItemId(item.id);
          if (note !== null) {
            return search.upsertNote(note.item, note.note, { timestamp: comment.updatedAt });
          }
        }
        if (item.type === "link") {
          const link = new LinkRepository(this.connection).getByItemId(item.id);
          if (link !== null) {
            return search.upsertLink(link.item, link.link, { timestamp: comment.updatedAt });
          }
        }
        return search.upsertItem(item, { timestamp: comment.updatedAt });
      }
    }
  }

  private logCommentEvent(input: {
    comment: CommentRecord;
    actorType?: ActivityActorType;
    action: typeof ActivityAction[keyof typeof ActivityAction];
    summary: string;
    before: CommentRecord | null;
    after: CommentRecord;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.comment.workspaceId,
      actorType: input.actorType ?? "local_user",
      action: input.action,
      targetType: input.comment.targetType,
      targetId: input.comment.targetId,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }

  private validateTarget(input: CommentTargetInput & { workspaceId?: string }): void {
    if (input.workspaceId !== undefined) {
      validateNonEmptyString(input.workspaceId, "workspaceId");
    }
    validateNonEmptyString(input.targetId, "targetId");
    if (!["container", "item", "list_item"].includes(input.targetType)) {
      throw new Error("targetType must be container, item, or list_item.");
    }
  }
}

export const commentsModuleContract = {
  module: "comments",
  purpose: "Manage local comments and annotations on containers, items, and list rows.",
  owns: ["comment persistence", "comment activity events", "comment search projections"],
  doesNotOwn: ["team collaboration", "cloud comments", "renderer database access"],
  integrationPoints: ["containers", "items", "lists", "activity log", "search"],
  priority: "V2"
} as const satisfies FeatureModuleContract;

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

function validateBody(value: string): void {
  validateNonEmptyString(value, "body");
  if (value.trim().length > 4000) {
    throw new Error("body must be 4000 characters or fewer.");
  }
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
