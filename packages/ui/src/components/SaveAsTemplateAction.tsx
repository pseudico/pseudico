import { ClipboardCopy } from "lucide-react";

export type SaveAsTemplateActionProps = {
  itemTitle: string;
  disabled?: boolean;
  onSave?: () => Promise<boolean | void> | boolean | void;
};

export function SaveAsTemplateAction({
  itemTitle,
  disabled = false,
  onSave
}: SaveAsTemplateActionProps): React.JSX.Element {
  return (
    <button
      className="secondary-button compact-button save-as-template-action"
      disabled={disabled}
      type="button"
      onClick={() => {
        void onSave?.();
      }}
    >
      <ClipboardCopy size={15} aria-hidden="true" />
      Save as template
      <span className="sr-only"> for {itemTitle}</span>
    </button>
  );
}
