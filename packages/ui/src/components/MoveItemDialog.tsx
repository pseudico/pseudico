import {
  MoveToContainerDialog,
  type MoveTargetContainer,
  type MoveToContainerDialogProps
} from "./MoveToContainerDialog";

export type MoveItemDialogProps = MoveToContainerDialogProps;

export function MoveItemDialog(
  props: MoveItemDialogProps
): React.JSX.Element {
  return <MoveToContainerDialog {...props} />;
}

export type { MoveTargetContainer };
