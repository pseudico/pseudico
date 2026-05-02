import { useEffect, useState, type FormEvent } from "react";
import { FolderInput, X } from "lucide-react";

export type MoveTargetContainer = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
};

export type MoveToContainerDialogProps = {
  containers: readonly MoveTargetContainer[];
  open: boolean;
  error?: string | null;
  itemTitle?: string | null;
  moving?: boolean;
  onCancel: () => void;
  onMove: (containerId: string) => void | Promise<void>;
};

export function MoveToContainerDialog({
  containers,
  open,
  error = null,
  itemTitle = null,
  moving = false,
  onCancel,
  onMove
}: MoveToContainerDialogProps): React.JSX.Element {
  const [selectedContainerId, setSelectedContainerId] = useState(
    containers[0]?.id ?? ""
  );

  useEffect(() => {
    if (open) {
      setSelectedContainerId(containers[0]?.id ?? "");
    }
  }, [containers, open]);

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (selectedContainerId.length === 0) {
      return;
    }

    void onMove(selectedContainerId);
  }

  return (
    <dialog className="move-to-container-dialog project-dialog" open={open}>
      <div className="project-dialog-header">
        <div>
          <p className="top-eyebrow">Move item</p>
          <h3>{itemTitle === null ? "Move to project" : itemTitle}</h3>
        </div>
        <button
          aria-label="Close move dialog"
          className="secondary-button compact-button"
          disabled={moving}
          type="button"
          onClick={onCancel}
        >
          <X size={16} aria-hidden="true" />
          Close
        </button>
      </div>

      {error === null ? null : (
        <p className="form-message form-message-error">{error}</p>
      )}

      <form className="move-to-container-form" onSubmit={handleSubmit}>
        <label>
          <span>Project</span>
          <select
            autoFocus
            disabled={moving || containers.length === 0}
            value={selectedContainerId}
            onChange={(event) => setSelectedContainerId(event.target.value)}
          >
            {containers.map((container) => (
              <option key={container.id} value={container.id}>
                {container.name}
              </option>
            ))}
          </select>
        </label>

        {containers.length === 0 ? (
          <p className="muted-text">No active projects are available.</p>
        ) : null}

        <button
          className="primary-button"
          disabled={moving || selectedContainerId.length === 0}
          type="submit"
        >
          <FolderInput size={17} aria-hidden="true" />
          {moving ? "Moving..." : "Move"}
        </button>
      </form>
    </dialog>
  );
}
