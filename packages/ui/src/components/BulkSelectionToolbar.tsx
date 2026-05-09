import { Archive, CheckCircle2, Download, FolderInput, Tag, Trash2, X } from "lucide-react";

export type BulkSelectionActionId =
  | "move"
  | "tag"
  | "category"
  | "archive"
  | "delete"
  | "complete"
  | "export";

export type BulkSelectionToolbarProps = {
  selectedCount: number;
  busy?: boolean;
  disabledActions?: readonly BulkSelectionActionId[];
  onAction: (action: BulkSelectionActionId) => void;
  onClear: () => void;
};

const BULK_ACTIONS = [
  { id: "move", label: "Move", icon: FolderInput, danger: false },
  { id: "tag", label: "Tag", icon: Tag, danger: false },
  { id: "category", label: "Category", icon: Tag, danger: false },
  { id: "complete", label: "Complete", icon: CheckCircle2, danger: false },
  { id: "archive", label: "Archive", icon: Archive, danger: false },
  { id: "export", label: "Export", icon: Download, danger: false },
  { id: "delete", label: "Delete", icon: Trash2, danger: true }
] as const satisfies readonly {
  id: BulkSelectionActionId;
  label: string;
  icon: typeof FolderInput;
  danger?: boolean;
}[];

export function BulkSelectionToolbar({
  selectedCount,
  busy = false,
  disabledActions = [],
  onAction,
  onClear
}: BulkSelectionToolbarProps): React.JSX.Element | null {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="bulk-selection-toolbar" role="toolbar" aria-label="Bulk actions">
      <strong>
        {selectedCount} selected
      </strong>
      <div className="bulk-selection-actions">
        {BULK_ACTIONS.map((action) => {
          const Icon = action.icon;
          const disabled = busy || disabledActions.includes(action.id);

          return (
            <button
              key={action.id}
              type="button"
              className={action.danger === true ? "danger-button" : "secondary-button"}
              disabled={disabled}
              onClick={() => onAction(action.id)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{action.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="icon-button"
          disabled={busy}
          aria-label="Clear selection"
          title="Clear selection"
          onClick={onClear}
        >
          <X size={17} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
