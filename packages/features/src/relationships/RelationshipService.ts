import type { FeatureModuleContract } from "../featureModuleContract";
import {
  ActivityAction,
  createIsoTimestamp,
  createLocalId,
  isRelationshipObjectType,
  isRelationshipType,
  type ActivityActorType,
  type RelationshipObjectType,
  type RelationshipType
} from "@local-work-os/core";
import {
  ActivityLogService,
  ContainerRepository,
  ItemRepository,
  ListRepository,
  RelationshipRepository,
  TransactionService,
  type BacklinkRecord,
  type DatabaseConnection,
  type RelationshipRecord
} from "@local-work-os/db";

export type RelationshipServiceIdFactory = (prefix: string) => string;

export type RelationshipEndpoint = {
  type: RelationshipObjectType;
  id: string;
};

export type CreateRelationshipInput = {
  workspaceId: string;
  source: RelationshipEndpoint;
  target: RelationshipEndpoint;
  relationType: RelationshipType;
  actorType?: ActivityActorType;
  label?: string | null;
};

export type RemoveRelationshipInput = {
  relationshipId: string;
  actorType?: ActivityActorType;
};

export type ListRelationshipsInput = {
  workspaceId: string;
  target: RelationshipEndpoint;
  includeDeleted?: boolean;
};

export type RelationshipMutationResult = {
  relationship: RelationshipRecord;
  changed: boolean;
};

export class RelationshipService {
  readonly module = "relationships";

  private readonly connection: DatabaseConnection;
  private readonly idFactory: RelationshipServiceIdFactory;
  private readonly now: () => Date;
  private readonly transactionService: TransactionService;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: RelationshipServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.idFactory = input.idFactory ?? ((prefix) => createLocalId(prefix));
    this.now = input.now ?? (() => new Date());
    this.transactionService = new TransactionService({
      connection: input.connection
    });
  }

  async createRelationship(
    input: CreateRelationshipInput
  ): Promise<RelationshipMutationResult> {
    this.validateCreateInput(input);

    return await this.transactionService.runInTransaction(() => {
      this.requireEndpoint(input.workspaceId, input.source);
      this.requireEndpoint(input.workspaceId, input.target);

      const timestamp = createIsoTimestamp(this.now());
      const repository = new RelationshipRepository(this.connection);
      const normalizedLabel = normalizeNullableString(input.label);
      const duplicate = repository.findActiveDuplicate({
        workspaceId: input.workspaceId,
        sourceType: input.source.type,
        sourceId: input.source.id,
        targetType: input.target.type,
        targetId: input.target.id,
        relationType: input.relationType,
        label: normalizedLabel
      });

      if (duplicate !== null) {
        return { relationship: duplicate, changed: false };
      }

      const relationship = repository.create({
        id: this.idFactory("relationship"),
        workspaceId: input.workspaceId,
        sourceType: input.source.type,
        sourceId: input.source.id,
        targetType: input.target.type,
        targetId: input.target.id,
        relationType: input.relationType,
        label: normalizedLabel,
        timestamp
      });

      this.logRelationshipEvent({
        relationship,
        actorType: input.actorType ?? "local_user",
        action: ActivityAction.relationshipCreated,
        summary: `Created ${formatRelationType(input.relationType)} relationship.`,
        before: null,
        after: relationship,
        timestamp
      });

      return { relationship, changed: true };
    });
  }

  async removeRelationship(
    input: RemoveRelationshipInput | string
  ): Promise<RelationshipMutationResult> {
    const relationshipId =
      typeof input === "string" ? input : input.relationshipId;
    const actorType =
      typeof input === "string" ? "local_user" : input.actorType ?? "local_user";
    validateNonEmptyString(relationshipId, "relationshipId");

    return await this.transactionService.runInTransaction(() => {
      const timestamp = createIsoTimestamp(this.now());
      const repository = new RelationshipRepository(this.connection);
      const before = repository.getById(relationshipId, {
        includeDeleted: true
      });

      if (before === null) {
        throw new Error(`Relationship was not found: ${relationshipId}.`);
      }

      if (before.deletedAt !== null) {
        return { relationship: before, changed: false };
      }

      const relationship = repository.softDelete(relationshipId, timestamp);

      this.logRelationshipEvent({
        relationship,
        actorType,
        action: ActivityAction.relationshipRemoved,
        summary: `Removed ${formatRelationType(relationship.relationType)} relationship.`,
        before,
        after: relationship,
        timestamp
      });

      return { relationship, changed: true };
    });
  }

  listOutgoingRelationships(input: ListRelationshipsInput): RelationshipRecord[] {
    this.validateListInput(input);
    this.requireEndpoint(input.workspaceId, input.target);

    return new RelationshipRepository(this.connection).listOutgoingRelationships({
      workspaceId: input.workspaceId,
      target: input.target,
      ...(input.includeDeleted === undefined
        ? {}
        : { includeDeleted: input.includeDeleted })
    });
  }

  listIncomingRelationships(input: ListRelationshipsInput): RelationshipRecord[] {
    this.validateListInput(input);
    this.requireEndpoint(input.workspaceId, input.target);

    return new RelationshipRepository(this.connection).listIncomingRelationships({
      workspaceId: input.workspaceId,
      target: input.target,
      ...(input.includeDeleted === undefined
        ? {}
        : { includeDeleted: input.includeDeleted })
    });
  }

  listBacklinks(input: ListRelationshipsInput): BacklinkRecord[] {
    this.validateListInput(input);
    this.requireEndpoint(input.workspaceId, input.target);

    return new RelationshipRepository(this.connection).listBacklinks({
      workspaceId: input.workspaceId,
      target: input.target,
      ...(input.includeDeleted === undefined
        ? {}
        : { includeDeleted: input.includeDeleted })
    });
  }

  private requireEndpoint(
    workspaceId: string,
    endpoint: RelationshipEndpoint
  ): void {
    if (endpoint.type === "container") {
      const container = new ContainerRepository(this.connection).getById(endpoint.id);

      if (container === null || container.workspaceId !== workspaceId) {
        throw new Error(`Relationship container target was not found: ${endpoint.id}.`);
      }

      return;
    }

    if (endpoint.type === "item") {
      const item = new ItemRepository(this.connection).getById(endpoint.id);

      if (item === null || item.workspaceId !== workspaceId) {
        throw new Error(`Relationship item target was not found: ${endpoint.id}.`);
      }

      return;
    }

    const listItem = new ListRepository(this.connection).getListItemById(
      endpoint.id
    );

    if (listItem === null || listItem.workspaceId !== workspaceId) {
      throw new Error(`Relationship list item target was not found: ${endpoint.id}.`);
    }
  }

  private validateCreateInput(input: CreateRelationshipInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    this.validateEndpoint(input.source, "source");
    this.validateEndpoint(input.target, "target");

    if (!isRelationshipType(input.relationType)) {
      throw new Error("relationType must be a supported relationship type.");
    }
  }

  private validateListInput(input: ListRelationshipsInput): void {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    this.validateEndpoint(input.target, "target");
  }

  private validateEndpoint(endpoint: RelationshipEndpoint, name: string): void {
    if (!isRelationshipObjectType(endpoint.type)) {
      throw new Error(`${name}.type must be container, item, or list_item.`);
    }

    validateNonEmptyString(endpoint.id, `${name}.id`);
  }

  private logRelationshipEvent(input: {
    relationship: RelationshipRecord;
    actorType: ActivityActorType;
    action:
      | typeof ActivityAction.relationshipCreated
      | typeof ActivityAction.relationshipRemoved;
    summary: string;
    before: RelationshipRecord | null;
    after: RelationshipRecord;
    timestamp: string;
  }): void {
    new ActivityLogService({
      connection: this.connection,
      idFactory: this.idFactory
    }).logEvent({
      workspaceId: input.relationship.workspaceId,
      actorType: input.actorType,
      action: input.action,
      targetType: "relationship",
      targetId: input.relationship.id,
      summary: input.summary,
      beforeJson: input.before === null ? null : JSON.stringify(input.before),
      afterJson: JSON.stringify(input.after),
      timestamp: input.timestamp
    });
  }
}

export const relationshipsModuleContract = {
  module: "relationships",
  purpose: "Manage local object-to-object relationships and backlinks.",
  owns: ["relationship writes", "relationship backlink queries", "relationship activity events"],
  doesNotOwn: ["raw renderer database access", "cloud graph services", "advanced graph visualisation"],
  integrationPoints: ["containers", "items", "lists", "activity log", "inspector UI"],
  priority: "V1"
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

function formatRelationType(relationType: RelationshipType): string {
  return relationType.replaceAll("_", " ");
}
