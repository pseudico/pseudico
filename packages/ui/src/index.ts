export const uiPackageName = "@local-work-os/ui";

export const designSystemStatus = "pending";

export {
  ProjectForm,
  validateProjectFormValues,
  type ProjectFormErrors,
  type ProjectFormValues
} from "./forms/ProjectForm";

export {
  ItemActionsMenu,
  ITEM_ACTIONS,
  type ItemActionHandler,
  type ItemActionId,
  type ItemActionsMenuProps
} from "./components/ItemActionsMenu";
export {
  UniversalItemCard,
  type UniversalItemCardProps,
  type UniversalItemMetadata,
  type UniversalItemViewModel
} from "./components/ItemCard";
export { ItemFeed, type ItemFeedProps } from "./components/ItemFeed";
export {
  getItemTypeLabel,
  ItemTypeIcon,
  type ItemTypeIconProps
} from "./components/ItemTypeIcon";
