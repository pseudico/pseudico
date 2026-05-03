import { X } from "lucide-react";
import { getItemTypeLabel } from "./ItemTypeIcon";
import {
  RelatedItemsPanel,
  type RelatedItemViewModel
} from "./RelatedItemsPanel";
import { RecentActivityList } from "./RecentActivityList";

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
  actionLabel?: string;
  actorLabel?: string;
  targetLabel?: string;
  summary?: string | null;
  description?: string | null;
  createdAt: string;
};

export type ItemInspectorProps = {
  item: ItemInspectorItem;
  activity: readonly ItemInspectorActivity[];
  relationships?: readonly RelatedItemViewModel[];
  open: boolean;
  onClose: () => void;
};

export function ItemInspectorPanel({
  item,
  activity,
  relationships = [],
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

      <RelatedItemsPanel relationships={relationships} />

      <RecentActivityList activity={activity} />
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
