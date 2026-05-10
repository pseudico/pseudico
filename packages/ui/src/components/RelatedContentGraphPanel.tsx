import { GitBranch, Link2, Trash2 } from "lucide-react";

export type RelatedContentRelationType =
  | "related"
  | "depends_on"
  | "blocked_by"
  | "references"
  | "belongs_to"
  | "follow_up_for";

export type RelatedContentEndpointType = "container" | "item" | "list_item";

export type RelatedContentEndpointViewModel = {
  type: RelatedContentEndpointType;
  id: string;
  kind: "project" | "contact" | "inbox" | "item" | "list_item" | "missing";
  title: string;
  description: string | null;
  containerId: string | null;
  containerType: string | null;
  status: string | null;
  deleted: boolean;
};

export type RelatedContentNodeViewModel = RelatedContentEndpointViewModel & {
  depth: 0 | 1 | 2;
  directRelationshipCount: number;
  secondDegreeRelationshipCount: number;
};

export type RelatedContentEdgeViewModel = {
  id: string;
  depth: 1 | 2;
  relationType: RelatedContentRelationType;
  label: string | null;
  source: RelatedContentEndpointViewModel;
  target: RelatedContentEndpointViewModel;
  createdAt: string;
};

export type RelatedContentTargetOption = {
  type: RelatedContentEndpointType;
  id: string;
  label: string;
  helperText?: string | null;
};

export type RelatedContentGraphViewModel = {
  root: RelatedContentEndpointViewModel;
  relationTypes: readonly RelatedContentRelationType[];
  selectedRelationType: RelatedContentRelationType | "all";
  nodes: readonly RelatedContentNodeViewModel[];
  edges: readonly RelatedContentEdgeViewModel[];
};

export type RelatedContentGraphPanelProps = {
  graph: RelatedContentGraphViewModel | null;
  availableTargets: readonly RelatedContentTargetOption[];
  selectedTargetKey: string;
  selectedRelationType: RelatedContentRelationType;
  relationFilter: RelatedContentRelationType | "all";
  busy?: boolean;
  error?: string | null;
  onRelationFilterChange: (relationType: RelatedContentRelationType | "all") => void;
  onSelectedTargetChange: (targetKey: string) => void;
  onSelectedRelationTypeChange: (relationType: RelatedContentRelationType) => void;
  onCreateRelationship: () => void;
  onRemoveRelationship: (relationshipId: string) => void;
  onOpenTarget: (target: RelatedContentEndpointViewModel) => void;
};

export function RelatedContentGraphPanel({
  graph,
  availableTargets,
  selectedTargetKey,
  selectedRelationType,
  relationFilter,
  busy = false,
  error = null,
  onRelationFilterChange,
  onSelectedTargetChange,
  onSelectedRelationTypeChange,
  onCreateRelationship,
  onRemoveRelationship,
  onOpenTarget
}: RelatedContentGraphPanelProps): React.JSX.Element {
  const relationTypes = graph?.relationTypes ?? [
    "related",
    "depends_on",
    "blocked_by",
    "references",
    "belongs_to",
    "follow_up_for"
  ];
  const directEdges = graph?.edges.filter((edge) => edge.depth === 1) ?? [];
  const secondDegreeEdges = graph?.edges.filter((edge) => edge.depth === 2) ?? [];
  const canCreate = !busy && selectedTargetKey.length > 0;

  return (
    <section className="related-items-panel related-content-graph-panel" aria-label="Related content">
      <div className="panel-heading">
        <GitBranch size={16} aria-hidden="true" />
        <h4>Related content</h4>
      </div>

      <div className="relationship-link-controls">
        <label>
          Filter
          <select
            value={relationFilter}
            onChange={(event) =>
              onRelationFilterChange(
                event.currentTarget.value as RelatedContentRelationType | "all"
              )
            }
            disabled={busy}
          >
            <option value="all">All relationship types</option>
            {relationTypes.map((relationType) => (
              <option key={relationType} value={relationType}>
                {formatRelationType(relationType)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="relationship-link-controls">
        <label>
          Add relation
          <select
            value={selectedTargetKey}
            onChange={(event) => onSelectedTargetChange(event.currentTarget.value)}
            disabled={busy || availableTargets.length === 0}
          >
            <option value="">Select local content</option>
            {availableTargets.map((target) => (
              <option key={targetKey(target)} value={targetKey(target)}>
                {target.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select
            value={selectedRelationType}
            onChange={(event) =>
              onSelectedRelationTypeChange(
                event.currentTarget.value as RelatedContentRelationType
              )
            }
            disabled={busy}
          >
            {relationTypes.map((relationType) => (
              <option key={relationType} value={relationType}>
                {formatRelationType(relationType)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onCreateRelationship} disabled={!canCreate}>
          Link
        </button>
      </div>

      {error !== null ? <p className="error-text">{error}</p> : null}
      {busy ? <p className="muted-text">Refreshing relationships…</p> : null}

      {graph === null || graph.edges.length === 0 ? (
        <p className="muted-text">
          No related content yet. Link a project, contact, note, task, list, file,
          or link to build this local graph.
        </p>
      ) : (
        <>
          <div className="related-graph-map" aria-label="Relationship graph map">
            {graph.nodes.map((node) => (
              <button
                key={`${node.type}:${node.id}`}
                type="button"
                className={`related-graph-node depth-${node.depth}`}
                onClick={() => onOpenTarget(node)}
                disabled={node.deleted}
              >
                <span>{node.title}</span>
                <small>
                  {node.depth === 0 ? "Current" : node.depth === 1 ? "Direct" : "Second-degree"} ·{" "}
                  {formatEndpointKind(node)}
                </small>
              </button>
            ))}
          </div>
          <RelatedContentEdgeList
            title="Direct relationships"
            edges={directEdges}
            root={graph.root}
            busy={busy}
            onOpenTarget={onOpenTarget}
            onRemoveRelationship={onRemoveRelationship}
          />
          <RelatedContentEdgeList
            title="Second-degree relationships"
            edges={secondDegreeEdges}
            root={graph.root}
            busy={busy}
            onOpenTarget={onOpenTarget}
            onRemoveRelationship={onRemoveRelationship}
          />
        </>
      )}
    </section>
  );
}

function RelatedContentEdgeList({
  title,
  edges,
  root,
  busy,
  onOpenTarget,
  onRemoveRelationship
}: {
  title: string;
  edges: readonly RelatedContentEdgeViewModel[];
  root: RelatedContentEndpointViewModel;
  busy: boolean;
  onOpenTarget: (target: RelatedContentEndpointViewModel) => void;
  onRemoveRelationship: (relationshipId: string) => void;
}): React.JSX.Element | null {
  if (edges.length === 0) {
    return null;
  }

  return (
    <div className="related-graph-list">
      <h5>{title}</h5>
      <ol>
        {edges.map((edge) => {
          const target = otherEndpoint(edge, root);
          return (
            <li key={`${title}:${edge.id}`}>
              <div>
                <Link2 size={14} aria-hidden="true" />
                <strong>{formatRelationType(edge.relationType)}</strong>
                {edge.label !== null ? <span>{edge.label}</span> : null}
              </div>
              <button
                type="button"
                className="link-button"
                onClick={() => onOpenTarget(target)}
                disabled={target.deleted}
              >
                {target.title}
              </button>
              {edge.depth === 1 ? (
                <button
                  type="button"
                  className="link-button danger-link"
                  onClick={() => onRemoveRelationship(edge.id)}
                  disabled={busy}
                  aria-label={`Remove relationship with ${target.title}`}
                >
                  <Trash2 size={14} aria-hidden="true" />
                  Remove
                </button>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function otherEndpoint(
  edge: RelatedContentEdgeViewModel,
  root: RelatedContentEndpointViewModel
): RelatedContentEndpointViewModel {
  if (edge.source.type === root.type && edge.source.id === root.id) {
    return edge.target;
  }

  return edge.source;
}

function formatRelationType(relationType: string): string {
  return relationType
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatEndpointKind(endpoint: RelatedContentEndpointViewModel): string {
  return endpoint.kind === "list_item" ? "list row" : endpoint.kind.replace("_", " ");
}

function targetKey(target: RelatedContentTargetOption): string {
  return `${target.type}:${target.id}`;
}
