import type {
  RelationshipObjectType,
  RelationshipType
} from "@local-work-os/core";
import type { DatabaseConnection } from "../connection/createDatabaseConnection";

type RelationshipRow = {
  id: string;
  workspace_id: string;
  source_type: string;
  source_id: string;
  target_type: string;
  target_id: string;
  relation_type: string;
  label: string | null;
  created_at: string;
  deleted_at: string | null;
};

export type RelationshipRecord = {
  id: string;
  workspaceId: string;
  sourceType: RelationshipObjectType;
  sourceId: string;
  targetType: RelationshipObjectType;
  targetId: string;
  relationType: RelationshipType;
  label: string | null;
  createdAt: string;
  deletedAt: string | null;
};

export type RelationshipEndpointInput = {
  type: RelationshipObjectType;
  id: string;
};

export type CreateRelationshipInput = {
  id: string;
  workspaceId: string;
  sourceType: RelationshipObjectType;
  sourceId: string;
  targetType: RelationshipObjectType;
  targetId: string;
  relationType: RelationshipType;
  timestamp: string;
  label?: string | null;
};

export type FindRelationshipDuplicateInput = {
  workspaceId: string;
  sourceType: RelationshipObjectType;
  sourceId: string;
  targetType: RelationshipObjectType;
  targetId: string;
  relationType: RelationshipType;
  label?: string | null;
};

export type ListRelationshipsForEndpointInput = {
  workspaceId: string;
  target: RelationshipEndpointInput;
  includeDeleted?: boolean;
};

export type BacklinkRecord = {
  direction: "incoming" | "outgoing";
  relationship: RelationshipRecord;
};

export class RelationshipRepository {
  private readonly connection: DatabaseConnection;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
  }

  getById(id: string, options: { includeDeleted?: boolean } = {}): RelationshipRecord | null {
    const deletedFilter = options.includeDeleted === true ? "" : "and deleted_at is null";
    const row = this.connection.sqlite
      .prepare<[string], RelationshipRow>(
        `select *
         from relationships
         where id = ?
           ${deletedFilter}`
      )
      .get(id);

    return row === undefined ? null : toRelationshipRecord(row);
  }

  findActiveDuplicate(
    input: FindRelationshipDuplicateInput
  ): RelationshipRecord | null {
    const row = this.connection.sqlite
      .prepare<unknown[], RelationshipRow>(
        `select *
         from relationships
         where workspace_id = ?
           and source_type = ?
           and source_id = ?
           and target_type = ?
           and target_id = ?
           and relation_type = ?
           and label is ?
           and deleted_at is null
         limit 1`
      )
      .get(
        input.workspaceId,
        input.sourceType,
        input.sourceId,
        input.targetType,
        input.targetId,
        input.relationType,
        input.label ?? null
      );

    return row === undefined ? null : toRelationshipRecord(row);
  }

  create(input: CreateRelationshipInput): RelationshipRecord {
    const existing = this.findActiveDuplicate(input);

    if (existing !== null) {
      return existing;
    }

    this.connection.sqlite
      .prepare(
        `insert into relationships (
          id,
          workspace_id,
          source_type,
          source_id,
          target_type,
          target_id,
          relation_type,
          label,
          created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.id,
        input.workspaceId,
        input.sourceType,
        input.sourceId,
        input.targetType,
        input.targetId,
        input.relationType,
        input.label ?? null,
        input.timestamp
      );

    const created = this.getById(input.id);

    if (created === null) {
      throw new Error(`Relationship row was not created: ${input.id}.`);
    }

    return created;
  }

  softDelete(id: string, timestamp: string): RelationshipRecord {
    this.connection.sqlite
      .prepare(
        `update relationships
         set deleted_at = ?
         where id = ?
           and deleted_at is null`
      )
      .run(timestamp, id);

    const deleted = this.getById(id, { includeDeleted: true });

    if (deleted === null) {
      throw new Error(`Relationship row was not found: ${id}.`);
    }

    return deleted;
  }

  listOutgoingRelationships(
    input: ListRelationshipsForEndpointInput
  ): RelationshipRecord[] {
    const rows = this.listRowsForEndpoint(input, "source");
    return rows.map(toRelationshipRecord);
  }

  listIncomingRelationships(
    input: ListRelationshipsForEndpointInput
  ): RelationshipRecord[] {
    const rows = this.listRowsForEndpoint(input, "target");
    return rows.map(toRelationshipRecord);
  }

  listBacklinks(input: ListRelationshipsForEndpointInput): BacklinkRecord[] {
    return [
      ...this.listIncomingRelationships(input).map((relationship) => ({
        direction: "incoming" as const,
        relationship
      })),
      ...this.listOutgoingRelationships(input).map((relationship) => ({
        direction: "outgoing" as const,
        relationship
      }))
    ].sort((a, b) =>
      a.relationship.createdAt.localeCompare(b.relationship.createdAt) ||
      a.relationship.id.localeCompare(b.relationship.id)
    );
  }

  private listRowsForEndpoint(
    input: ListRelationshipsForEndpointInput,
    side: "source" | "target"
  ): RelationshipRow[] {
    const deletedFilter =
      input.includeDeleted === true ? "" : "and deleted_at is null";

    return this.connection.sqlite
      .prepare<unknown[], RelationshipRow>(
        `select *
         from relationships
         where workspace_id = ?
           and ${side}_type = ?
           and ${side}_id = ?
           ${deletedFilter}
         order by created_at asc, id asc`
      )
      .all(input.workspaceId, input.target.type, input.target.id);
  }
}

function toRelationshipRecord(row: RelationshipRow): RelationshipRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    sourceType: row.source_type as RelationshipObjectType,
    sourceId: row.source_id,
    targetType: row.target_type as RelationshipObjectType,
    targetId: row.target_id,
    relationType: row.relation_type as RelationshipType,
    label: row.label,
    createdAt: row.created_at,
    deletedAt: row.deleted_at
  };
}
