export const uiPackageName = "@local-work-os/ui";

export const designSystemStatus = "pending";

export {
  ProjectForm,
  validateProjectFormValues,
  type ProjectFormErrors,
  type ProjectFormValues
} from "./forms/ProjectForm";
export {
  QuickAddForm,
  type QuickAddFormProps,
  type QuickAddFormValues,
  type QuickAddTargetOption
} from "./forms/QuickAddForm";
export {
  TaskQuickAdd,
  type TaskQuickAddProps,
  type TaskQuickAddValues
} from "./forms/TaskQuickAdd";
export {
  NoteEditor,
  type NoteEditorProps,
  type NoteEditorValues
} from "./forms/NoteEditor";
export {
  FileMetadataEditor,
  type FileMetadataEditorProps,
  type FileMetadataEditorValues
} from "./forms/FileMetadataEditor";
export {
  CreateListForm,
  type CreateListFormProps,
  type CreateListFormValues
} from "./forms/CreateListForm";
export {
  CreateCollectionForm,
  type CreateCollectionFormProps,
  type CreateCollectionFormValues,
  type CreateCollectionMode
} from "./forms/CreateCollectionForm";

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
export {
  TagBadge,
  type TagBadgeProps,
  type TagBadgeViewModel
} from "./components/TagBadge";
export {
  CategoryBadge,
  type CategoryBadgeProps,
  type CategoryBadgeViewModel
} from "./components/CategoryBadge";
export {
  CategoryPicker,
  type CategoryPickerOption,
  type CategoryPickerProps
} from "./components/CategoryPicker";
export {
  MetadataFilterPanel,
  type MetadataCategoryFilterOption,
  type MetadataFilterPanelProps,
  type MetadataTagFilterOption
} from "./components/MetadataFilterPanel";
export { ItemFeed, type ItemFeedProps } from "./components/ItemFeed";
export {
  getItemTypeLabel,
  ItemTypeIcon,
  type ItemTypeIconProps
} from "./components/ItemTypeIcon";
export {
  SearchResultCard,
  type SearchResultCardProps,
  type SearchResultCardViewModel
} from "./components/SearchResultCard";
export {
  GroupedResultsList,
  type GroupedResultGroupViewModel,
  type GroupedResultViewModel,
  type GroupedResultsListProps
} from "./components/GroupedResultsList";
export {
  TaskCardContent,
  type TaskCardContentProps,
  type TaskCardViewModel
} from "./components/TaskCardContent";
export {
  TodayLane,
  type TodayLaneKind,
  type TodayLaneProps
} from "./components/TodayLane";
export {
  TodayTaskCard,
  type TodayTaskCardProps,
  type TodayTaskCardViewModel
} from "./components/TodayTaskCard";
export {
  ReorderControls,
  type ReorderControlsProps
} from "./components/ReorderControls";
export {
  SnoozeMenu,
  type SnoozeMenuProps,
  type SnoozePreset
} from "./components/SnoozeMenu";
export {
  ChecklistEditor,
  type ChecklistEditorItem,
  type ChecklistEditorProps
} from "./components/ChecklistEditor";
export {
  ListCardContent,
  type ListCardContentProps,
  type ListCardItemViewModel,
  type ListCardViewModel
} from "./components/ListCardContent";
export {
  NoteCardContent,
  type NoteCardContentProps,
  type NoteCardViewModel
} from "./components/NoteCardContent";
export {
  FileCardContent,
  type FileAttachmentViewModel,
  type FileCardContentProps,
  type FileCardViewModel
} from "./components/FileCardContent";
export {
  MoveToContainerDialog,
  type MoveTargetContainer,
  type MoveToContainerDialogProps
} from "./components/MoveToContainerDialog";
export {
  MoveItemDialog,
  type MoveItemDialogProps
} from "./components/MoveItemDialog";
export {
  ConfirmDialog,
  type ConfirmDialogProps,
  type ConfirmDialogTone
} from "./components/ConfirmDialog";
export {
  ItemInspectorPanel,
  type ItemInspectorActivity,
  type ItemInspectorItem,
  type ItemInspectorProps
} from "./components/ItemInspector";
export {
  RecentActivityList,
  type RecentActivityListProps,
  type RecentActivityViewModel
} from "./components/RecentActivityList";
export {
  ProjectHealthCard,
  type ProjectHealthCardProps,
  type ProjectHealthTaskViewModel,
  type ProjectHealthViewModel
} from "./components/ProjectHealthCard";
export {
  RelatedItemsPanel,
  type RelatedItemDirection,
  type RelatedItemViewModel,
  type RelatedItemsPanelProps
} from "./components/RelatedItemsPanel";
export {
  DashboardWidget,
  type DashboardWidgetKind,
  type DashboardWidgetProps
} from "./components/DashboardWidget";
export {
  TaskDashboardWidget,
  type DashboardTaskWidgetItem,
  type TaskDashboardWidgetProps
} from "./components/widgets/TaskDashboardWidget";
export {
  TodayWidget,
  type TodayWidgetProps
} from "./components/widgets/TodayWidget";
export {
  OverdueWidget,
  type OverdueWidgetProps
} from "./components/widgets/OverdueWidget";
export {
  UpcomingWidget,
  type UpcomingWidgetProps
} from "./components/widgets/UpcomingWidget";
export {
  FavoriteProjectsWidget,
  type DashboardProjectWidgetItem,
  type FavoriteProjectsWidgetProps
} from "./components/widgets/FavoriteProjectsWidget";
export {
  RecentActivityWidget,
  type DashboardActivityWidgetItem,
  type RecentActivityWidgetProps
} from "./components/widgets/RecentActivityWidget";
export {
  ProjectHealthWidget,
  type ProjectHealthWidgetProps
} from "./components/widgets/ProjectHealthWidget";
