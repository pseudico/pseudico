import { Clock3, X } from "lucide-react";
import { getItemTypeLabel } from "./ItemTypeIcon";

export type ItemInspectorItem = {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  categoryLabel?: string | null;
  containerId?: string | null;
  containerTabId?: string | null;
  status?: string | null;
  sortOrder?: number | null;
  pinned?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  archivedAt?: string | null;
  deletedAt?: string | null;
};

export type ItemInspectorActivity = {
  id: string;
  action: string;
  actorType: string;
  summary?: string | null;
  createdAt: string;
};

export type ItemInspectorProps = {
  item: ItemInspectorItem;
  activity: readonly ItemInspectorActivity[];
  open: boolean;
  onClose: () => void;
};

export function ItemInspectorPanel({
  item,
  activity,
  open,
  onClose
}: ItemInspectorProps): React.JSX.Element {
  return (
    <dialog className="item-inspector-panel project-dialog" open={open}>
      <div className="project-dialog-header">
        <div>
          <p className="top-eyebrow">Inspector</p>
          <h3>{item.title}</h3>
        </div>
        <button
          aria-label="Close inspector"
          className="secondary-button compact-button"
          type="button"
          onClick={onClose}
        >
          <X size={16} aria-hidden="true" />
          Close
        </button>
      </div>

      <dl className="item-inspector-metadata">
        {buildInspectorMetadata(item).map((entry) => (
          <div key={entry.label}>
            <dt>{entry.label}</dt>
            <dd>{entry.value}</dd>
          </div>
        ))}
      </dl>

      <section className="item-inspector-activity" aria-label="Recent activity">
        <div className="panel-heading">
          <Clock3 size={16} aria-hidden="true" />
          <h4>Recent activity</h4>
        </div>
        {activity.length === 0 ? (
          <p className="muted-text">No activity recorded yet.</p>
        ) : (
          <ol>
            {activity.map((entry) => (
              <li key={entry.id}>
                <strong>{formatActionLabel(entry.action)}</strong>
                <span>{entry.summary ?? "No summary"}</span>
                <time dateTime={entry.createdAt}>{entry.createdAt}</time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </dialog>
  );
}

function buildInspectorMetadata(
  item: ItemInspectorItem
): Array<{ label: string; value: string }> {
  const metadata: Array<{ label: string; value: string }> = [
    { label: "Type", value: getItemTypeLabel(item.type) },
    { label: "Status", value: item.status ?? "Not set" },
    { label: "Container", value: item.containerId ?? "Not set" },
    { label: "Tab", value: item.containerTabId ?? "None" },
    { label: "Category", value: item.categoryLabel ?? "Not assigned" },
    { label: "Sort order", value: String(item.sortOrder ?? 0) },
    { label: "Pinned", value: item.pinned === true ? "Yes" : "No" },
    { label: "Created", value: item.createdAt ?? "Unknown" },
    { label: "Updated", value: item.updatedAt ?? "Unknown" }
  ];

  if (item.archivedAt !== undefined && item.archivedAt !== null) {
    metadata.push({ label: "Archived", value: item.archivedAt });
  }

  if (item.deletedAt !== undefined && item.deletedAt !== null) {
    metadata.push({ label: "Deleted", value: item.deletedAt });
  }

  return metadata;
}

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
