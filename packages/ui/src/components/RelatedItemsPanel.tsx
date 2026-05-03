import { Link2 } from "lucide-react";

export type RelatedItemDirection = "incoming" | "outgoing";

export type RelatedItemViewModel = {
  id: string;
  direction: RelatedItemDirection;
  relationType: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  label?: string | null;
};

export type RelatedItemsPanelProps = {
  relationships: readonly RelatedItemViewModel[];
};

export function RelatedItemsPanel({
  relationships
}: RelatedItemsPanelProps): React.JSX.Element {
  return (
    <section className="related-items-panel" aria-label="Related items">
      <div className="panel-heading">
        <Link2 size={16} aria-hidden="true" />
        <h4>Related items</h4>
      </div>
      {relationships.length === 0 ? (
        <p className="muted-text">No relationships recorded yet.</p>
      ) : (
        <ol>
          {relationships.map((relationship) => (
            <li key={relationship.id}>
              <strong>{formatRelationshipLabel(relationship)}</strong>
              <span>{formatEndpointLabel(relationship)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatRelationshipLabel(relationship: RelatedItemViewModel): string {
  const relation = relationship.relationType
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

  if (relationship.label !== undefined && relationship.label !== null) {
    return `${relation}: ${relationship.label}`;
  }

  return relation;
}

function formatEndpointLabel(relationship: RelatedItemViewModel): string {
  if (relationship.direction === "incoming") {
    return `From ${relationship.sourceType} ${relationship.sourceId}`;
  }

  return `To ${relationship.targetType} ${relationship.targetId}`;
}
