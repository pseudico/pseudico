import {
  RELATIONSHIP_TYPES,
  type RelationshipType
} from "@local-work-os/core";
import {
  ContainerRepository,
  ItemRepository,
  ListRepository,
  RelationshipRepository,
  type ContainerRecord,
  type DatabaseConnection,
  type ItemRecord,
  type ListItemRecord,
  type RelationshipRecord
} from "@local-work-os/db";
import {
  RelationshipService,
  type CreateRelationshipInput,
  type RelationshipEndpoint,
  type RelationshipMutationResult,
  type RelationshipServiceIdFactory,
  type RemoveRelationshipInput
} from "./RelationshipService";

export type RelatedContentDepth = 1 | 2;

export type RelationshipGraphEndpoint = RelationshipEndpoint & {
  kind: "project" | "contact" | "inbox" | "item" | "list_item" | "missing";
  title: string;
  description: string | null;
  containerId: string | null;
  containerType: string | null;
  status: string | null;
  deleted: boolean;
};

export type RelationshipGraphEdge = {
  id: string;
  direction: "incoming" | "outgoing";
  depth: RelatedContentDepth;
  relationType: RelationshipType;
  label: string | null;
  source: RelationshipGraphEndpoint;
  target: RelationshipGraphEndpoint;
  createdAt: string;
};

export type RelationshipGraphNode = RelationshipGraphEndpoint & {
  depth: 0 | RelatedContentDepth;
  directRelationshipCount: number;
  secondDegreeRelationshipCount: number;
};

export type RelationshipGraphView = {
  root: RelationshipGraphEndpoint;
  relationTypes: readonly RelationshipType[];
  selectedRelationType: RelationshipType | "all";
  nodes: RelationshipGraphNode[];
  edges: RelationshipGraphEdge[];
};

export type GetRelationshipGraphInput = {
  workspaceId: string;
  root: RelationshipEndpoint;
  relationType?: RelationshipType | "all";
  maxDepth?: RelatedContentDepth;
};

export class RelationshipGraphService {
  readonly module = "relationshipGraph";

  private readonly connection: DatabaseConnection;
  private readonly relationshipService: RelationshipService;
  private readonly relationshipRepository: RelationshipRepository;
  private readonly containerRepository: ContainerRepository;
  private readonly itemRepository: ItemRepository;
  private readonly listRepository: ListRepository;

  constructor(input: {
    connection: DatabaseConnection;
    idFactory?: RelationshipServiceIdFactory;
    now?: () => Date;
  }) {
    this.connection = input.connection;
    this.relationshipService = new RelationshipService(input);
    this.relationshipRepository = new RelationshipRepository(input.connection);
    this.containerRepository = new ContainerRepository(input.connection);
    this.itemRepository = new ItemRepository(input.connection);
    this.listRepository = new ListRepository(input.connection);
  }

  async createRelationship(
    input: CreateRelationshipInput
  ): Promise<RelationshipMutationResult> {
    return await this.relationshipService.createRelationship(input);
  }

  async removeRelationship(
    input: RemoveRelationshipInput | string
  ): Promise<RelationshipMutationResult> {
    return await this.relationshipService.removeRelationship(input);
  }

  getGraph(input: GetRelationshipGraphInput): RelationshipGraphView {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateEndpoint(input.root, "root");

    const selectedRelationType = input.relationType ?? "all";

    if (
      selectedRelationType !== "all" &&
      !RELATIONSHIP_TYPES.includes(selectedRelationType)
    ) {
      throw new Error("relationType must be all or a supported relationship type.");
    }

    const maxDepth = input.maxDepth ?? 2;
    const root = this.hydrateEndpoint(input.workspaceId, input.root);
    const nodes = new Map<string, RelationshipGraphNode>();
    const edges = new Map<string, RelationshipGraphEdge>();
    const visitedExpansions = new Set<string>();

    nodes.set(endpointKey(root), {
      ...root,
      depth: 0,
      directRelationshipCount: 0,
      secondDegreeRelationshipCount: 0
    });

    const expand = (
      endpoint: RelationshipGraphEndpoint,
      depth: RelatedContentDepth
    ): void => {
      const expansionKey = `${endpointKey(endpoint)}:${depth}`;

      if (visitedExpansions.has(expansionKey)) {
        return;
      }

      visitedExpansions.add(expansionKey);

      const relationships = this.relationshipRepository
        .listBacklinks({
          workspaceId: input.workspaceId,
          target: { type: endpoint.type, id: endpoint.id }
        })
        .filter(({ relationship }) =>
          selectedRelationType === "all"
            ? true
            : relationship.relationType === selectedRelationType
        );

      for (const backlink of relationships) {
        const source = this.hydrateEndpoint(input.workspaceId, {
          type: backlink.relationship.sourceType,
          id: backlink.relationship.sourceId
        });
        const target = this.hydrateEndpoint(input.workspaceId, {
          type: backlink.relationship.targetType,
          id: backlink.relationship.targetId
        });
        const edge = toGraphEdge(backlink.relationship, source, target, depth);
        const existingEdge = edges.get(edge.id);
        if (existingEdge === undefined || existingEdge.depth > depth) {
          edges.set(edge.id, edge);
        }

        const other = backlink.direction === "incoming" ? source : target;
        if (endpointKey(other) !== endpointKey(root)) {
          upsertNode(nodes, other, depth);
        }
      }

      if (depth < maxDepth) {
        for (const backlink of relationships) {
          const other = backlink.direction === "incoming"
            ? { type: backlink.relationship.sourceType, id: backlink.relationship.sourceId }
            : { type: backlink.relationship.targetType, id: backlink.relationship.targetId };

          if (endpointKey(other) !== endpointKey(root)) {
            expand(this.hydrateEndpoint(input.workspaceId, other), 2);
          }
        }
      }
    };

    expand(root, 1);

    return {
      root,
      relationTypes: RELATIONSHIP_TYPES,
      selectedRelationType,
      nodes: [...nodes.values()].sort(sortNodes),
      edges: [...edges.values()].sort(sortEdges)
    };
  }

  private hydrateEndpoint(
    workspaceId: string,
    endpoint: RelationshipEndpoint
  ): RelationshipGraphEndpoint {
    if (endpoint.type === "container") {
      const container = this.containerRepository.getById(endpoint.id);
      return container === null || container.workspaceId !== workspaceId
        ? missingEndpoint(endpoint)
        : containerEndpoint(container);
    }

    if (endpoint.type === "item") {
      const item = this.itemRepository.getById(endpoint.id);
      return item === null || item.workspaceId !== workspaceId
        ? missingEndpoint(endpoint)
        : itemEndpoint(item);
    }

    const listItem = this.listRepository.getListItemById(endpoint.id);
    return listItem === null || listItem.workspaceId !== workspaceId
      ? missingEndpoint(endpoint)
      : listItemEndpoint(listItem);
  }
}

function toGraphEdge(
  relationship: RelationshipRecord,
  source: RelationshipGraphEndpoint,
  target: RelationshipGraphEndpoint,
  depth: RelatedContentDepth
): RelationshipGraphEdge {
  return {
    id: relationship.id,
    direction: relationship.sourceId === source.id ? "outgoing" : "incoming",
    depth,
    relationType: relationship.relationType,
    label: relationship.label,
    source,
    target,
    createdAt: relationship.createdAt
  };
}

function upsertNode(
  nodes: Map<string, RelationshipGraphNode>,
  endpoint: RelationshipGraphEndpoint,
  depth: RelatedContentDepth
): void {
  const key = endpointKey(endpoint);
  const existing = nodes.get(key);

  if (existing === undefined) {
    nodes.set(key, {
      ...endpoint,
      depth,
      directRelationshipCount: depth === 1 ? 1 : 0,
      secondDegreeRelationshipCount: depth === 2 ? 1 : 0
    });
    return;
  }

  nodes.set(key, {
    ...existing,
    depth: existing.depth === 0 ? 0 : Math.min(existing.depth, depth) as RelatedContentDepth,
    directRelationshipCount:
      existing.directRelationshipCount + (depth === 1 ? 1 : 0),
    secondDegreeRelationshipCount:
      existing.secondDegreeRelationshipCount + (depth === 2 ? 1 : 0)
  });
}

function containerEndpoint(
  container: ContainerRecord
): RelationshipGraphEndpoint {
  return {
    type: "container",
    id: container.id,
    kind: container.type === "project" || container.type === "contact"
      ? container.type
      : "inbox",
    title: container.name,
    description: container.description,
    containerId: container.id,
    containerType: container.type,
    status: container.status,
    deleted: container.deletedAt !== null || container.archivedAt !== null
  };
}

function itemEndpoint(item: ItemRecord): RelationshipGraphEndpoint {
  return {
    type: "item",
    id: item.id,
    kind: "item",
    title: item.title,
    description: item.body,
    containerId: item.containerId,
    containerType: null,
    status: item.status,
    deleted: item.deletedAt !== null || item.archivedAt !== null
  };
}

function listItemEndpoint(
  listItem: ListItemRecord
): RelationshipGraphEndpoint {
  return {
    type: "list_item",
    id: listItem.id,
    kind: "list_item",
    title: listItem.title,
    description: listItem.body,
    containerId: listItem.listId,
    containerType: "list",
    status: listItem.status,
    deleted: listItem.deletedAt !== null || listItem.archivedAt !== null
  };
}

function missingEndpoint(endpoint: RelationshipEndpoint): RelationshipGraphEndpoint {
  return {
    ...endpoint,
    kind: "missing",
    title: `Missing ${endpoint.type}`,
    description: null,
    containerId: null,
    containerType: null,
    status: null,
    deleted: true
  };
}

function endpointKey(endpoint: RelationshipEndpoint): string {
  return `${endpoint.type}:${endpoint.id}`;
}

function sortNodes(
  a: RelationshipGraphNode,
  b: RelationshipGraphNode
): number {
  return a.depth - b.depth || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
}

function sortEdges(
  a: RelationshipGraphEdge,
  b: RelationshipGraphEdge
): number {
  return a.depth - b.depth || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
}

function validateEndpoint(endpoint: RelationshipEndpoint, name: string): void {
  if (
    endpoint.type !== "container" &&
    endpoint.type !== "item" &&
    endpoint.type !== "list_item"
  ) {
    throw new Error(`${name}.type must be container, item, or list_item.`);
  }

  validateNonEmptyString(endpoint.id, `${name}.id`);
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
