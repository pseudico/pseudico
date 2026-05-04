import { ArrowDown, ArrowUp } from "lucide-react";

export type ReorderControlsProps = {
  label: string;
  busy?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => Promise<void> | void;
  onMoveDown?: () => Promise<void> | void;
};

export function ReorderControls({
  label,
  busy = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown
}: ReorderControlsProps): React.JSX.Element {
  return (
    <div className="reorder-controls" aria-label={label}>
      <button
        aria-label="Move up"
        className="icon-button"
        disabled={busy || !canMoveUp}
        title="Move up"
        type="button"
        onClick={() => {
          void onMoveUp?.();
        }}
      >
        <ArrowUp size={15} aria-hidden="true" />
      </button>
      <button
        aria-label="Move down"
        className="icon-button"
        disabled={busy || !canMoveDown}
        title="Move down"
        type="button"
        onClick={() => {
          void onMoveDown?.();
        }}
      >
        <ArrowDown size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
