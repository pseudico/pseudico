export const uiPackageName = "@local-work-os/ui";

export const designSystemStatus = "pending";

export {
  ProjectForm,
  validateProjectFormValues,
  type ProjectFormErrors,
  type ProjectFormValues
} from "./forms/ProjectForm";
export {
  ContactForm,
  validateContactFormValues,
  type ContactFormErrors,
  type ContactFormProps,
  type ContactFormValues
} from "./forms/ContactForm";
export {
  buildQuickAddTaskSubmission,
  QuickAddForm,
  type BuildQuickAddTaskSubmissionInput,
  type BuildQuickAddTaskSubmissionResult,
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
  isNoteEditorDirty,
  parseNoteDraft,
  serializeNoteDraft,
  shouldAutosaveNoteEditor,
  shouldRecoverNoteDraft,
  type NoteDraftRecord,
  type NoteDraftStorage,
  type NoteEditorAutosaveOptions,
  type NoteEditorProps,
  type NoteEditorSaveMeta,
  type NoteEditorSaveResult,
  type NoteEditorValues,
  type NoteWikilinkSuggestion
} from "./forms/NoteEditor";
export {
  applyMarkdownToolbarCommand,
  getMarkdownEditorKeyCommand,
  MarkdownEditor,
  SafeMarkdownPreview,
  markdownToolbarCommands,
  type MarkdownEditorKeyCommand,
  type MarkdownEditorMode,
  type MarkdownEditorProps,
  type MarkdownEditorSelection,
  type MarkdownToolbarCommandId,
  type MarkdownToolbarCommandResult
} from "./forms/MarkdownEditor";
export {
  LinkEditor,
  type LinkEditorProps,
  type LinkEditorValues
} from "./forms/LinkEditor";
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
  SmartListEditor,
  type SmartListEditorContainerType,
  type SmartListEditorDueFilter,
  type SmartListEditorGroupBy,
  type SmartListEditorItemType,
  type SmartListEditorMetadataOption,
  type SmartListEditorProps,
  type SmartListEditorSortField,
  type SmartListEditorTaskStatus,
  type SmartListEditorValues
} from "./forms/SmartListEditor";
export {
  WorkflowEditor,
  type WorkflowEditorAction,
  type WorkflowEditorPreviewAction,
  type WorkflowEditorProps,
  type WorkflowEditorValues
} from "./forms/WorkflowEditor";

export {
  CommentThread,
  type CommentThreadComment,
  type CommentThreadProps
} from "./components/CommentThread";
export {
  ItemActionsMenu,
  ITEM_ACTIONS,
  type ItemActionHandler,
  type ItemActionId,
  type ItemActionsMenuProps
} from "./components/ItemActionsMenu";
export {
  BulkSelectionToolbar,
  type BulkSelectionActionId,
  type BulkSelectionToolbarProps
} from "./components/BulkSelectionToolbar";
export {
  ContextMenu,
  groupContextActions,
  type ContextMenuActionViewModel,
  type ContextMenuProps
} from "./components/ContextMenu";
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
  ContactFieldsEditor,
  type ContactFieldDraft,
  type ContactFieldsEditorProps,
  type ContactFieldViewModel
} from "./components/ContactFieldsEditor";
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
  ViewModeSwitcher,
  type ViewMode,
  type ViewModeSwitcherProps
} from "./components/ViewModeSwitcher";

export {
  ContainerTabSummaryCards,
  type ContainerTabSummaryCardViewModel,
  type ContainerTabSummaryCardsProps,
  type TabSummaryPreviewViewModel
} from "./components/ContainerTabSummaryCards";
export {
  TabManagementDialog,
  type TabManagementDialogProps,
  type TabManagementTabViewModel,
  type TabTemplateOption
} from "./components/TabManagementDialog";
export {
  LoadMoreList,
  type LoadMoreListProps
} from "./components/LoadMoreList";
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
  focusFirstFocusableElement,
  getFocusableElements,
  getFocusTrapKeyCommand,
  handleModalFocusKeyDown,
  modalFocusableSelector,
  useModalFocusManagement,
  type FocusTrapKeyCommand
} from "./components/focusManagement";
export {
  CommandPalette,
  getCommandPaletteKey,
  getNextCommandPaletteIndex,
  type CommandPaletteAction,
  type CommandPaletteKey,
  type CommandPaletteProps
} from "./components/CommandPalette";
export {
  QuickStartMenu,
  type QuickStartMenuAction,
  type QuickStartMenuProps
} from "./components/QuickStartMenu";
export {
  GroupedResultsList,
  type GroupedResultGroupViewModel,
  type GroupedResultViewModel,
  type GroupedResultsListProps
} from "./components/GroupedResultsList";
export {
  DateRangeInput,
  type DateRangeInputProps
} from "./components/DateRangeInput";
export {
  TaskCardContent,
  TaskDetailsRow,
  type TaskCardStatus,
  type TaskCardContentProps,
  type TaskCardViewModel
} from "./components/TaskCardContent";
export {
  TodayLane,
  type TodayLaneKind,
  type TodayLaneProps
} from "./components/TodayLane";
export {
  DailyPlannerEditor,
  buildDailyPlannerSubmission,
  getDailyPlannerKeyCommand,
  type DailyPlannerDraft,
  type DailyPlannerEditorProps,
  type DailyPlannerKey,
  type DailyPlannerLane,
  type DailyPlannerSubmission
} from "./components/DailyPlannerEditor";
export {
  TimelineFilterPanel,
  type TimelineFilterPanelProps,
  type TimelineFilterPanelValues
} from "./components/TimelineFilterPanel";
export {
  TimelineView,
  type TimelineViewGroup,
  type TimelineViewItem,
  type TimelineViewProps
} from "./components/TimelineView";
export {
  MonthCalendar,
  type MonthCalendarDay,
  type MonthCalendarItem,
  type MonthCalendarProps
} from "./components/MonthCalendar";
export {
  CalendarDayView,
  CalendarWeekView,
  type CalendarDayViewProps,
  type CalendarRescheduleDrop,
  type CalendarScheduleDay,
  type CalendarScheduleItem,
  type CalendarWeekViewProps
} from "./components/CalendarWeekDay";
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
  AppTabStrip,
  type AppTabStripProps,
  type AppTabStripTab
} from "./components/AppTabStrip";
export {
  SnoozeMenu,
  type SnoozeMenuProps,
  type SnoozePreset
} from "./components/SnoozeMenu";
export {
  ReminderPicker,
  type ReminderPickerProps,
  type ReminderPickerValue
} from "./components/ReminderPicker";
export {
  RecurrencePicker,
  type RecurrencePickerFrequency,
  type RecurrencePickerProps,
  type RecurrencePickerValue
} from "./components/RecurrencePicker";
export {
  ChecklistEditor,
  type ChecklistBulkAction,
  type ChecklistEditorItem,
  type ChecklistMoveTarget,
  type ChecklistEditorProps
} from "./components/ChecklistEditor";
export {
  ListCardContent,
  type ListCardContentProps,
  type ListCardItemViewModel,
  type ListCardViewModel
} from "./components/ListCardContent";
export {
  KanbanBoard,
  type KanbanBoardProps,
  type KanbanCardViewModel,
  type KanbanColumnViewModel
} from "./components/KanbanBoard";
export {
  PipelineView,
  type PipelineViewProps
} from "./components/PipelineView";
export {
  PipelineStageColumn,
  type PipelineStageColumnProps
} from "./components/PipelineStageColumn";
export {
  SaveAsTemplateAction,
  type SaveAsTemplateActionProps
} from "./components/SaveAsTemplateAction";
export {
  TemplateLibrary,
  type TemplateLibraryItem,
  type TemplateLibraryProps
} from "./components/TemplateLibrary";
export {
  CreateFromTemplateDialog,
  type CreateFromTemplateDialogProps,
  type CreateFromTemplateDialogValues
} from "./forms/CreateFromTemplateDialog";
export {
  NoteCardContent,
  type NoteCardContentProps,
  type NoteCardViewModel,
  type WikilinkTargetViewModel,
  type WikilinkViewModel
} from "./components/NoteCardContent";
export {
  FileCardContent,
  type FileAttachmentViewModel,
  type FileCardContentProps,
  type FileCardViewModel
} from "./components/FileCardContent";
export {
  FileVersionHistory,
  type FileVersionHistoryProps,
  type FileVersionViewModel
} from "./components/FileVersionHistory";
export {
  LinkCardContent,
  type LinkCardContentProps,
  type LinkCardViewModel
} from "./components/LinkCardContent";
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
  type InspectorAttachmentViewModel,
  type InspectorCategoryChangeHandler,
  type InspectorCategoryOption,
  type InspectorCommentViewModel,
  type InspectorDateChangeHandler,
  type InspectorTagAddHandler,
  type InspectorTagRemoveHandler,
  type InspectorTargetChangeHandler,
  type InspectorTargetViewModel,
  type ItemInspectorProps
} from "./components/ItemInspector";
export {
  ContainerMediaPreview,
  type ContainerMediaPreviewProps,
  type ContainerMediaVariant,
  type ContainerMediaViewModel
} from "./components/ContainerMediaPreview";
export {
  RecentActivityList,
  type RecentActivityListProps,
  type RecentActivityViewModel
} from "./components/RecentActivityList";
export {
  FollowUpSummaryCard,
  type FollowUpSummaryCardProps,
  type FollowUpSummaryViewModel,
  type FollowUpTaskViewModel
} from "./components/FollowUpSummaryCard";
export {
  ContactTimeline,
  type ContactTimelineEntryViewModel,
  type ContactTimelineFilterValue,
  type ContactTimelineProps
} from "./components/ContactTimeline";
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
  RelatedContentGraphPanel,
  type RelatedContentEdgeViewModel,
  type RelatedContentEndpointType,
  type RelatedContentEndpointViewModel,
  type RelatedContentGraphPanelProps,
  type RelatedContentGraphViewModel,
  type RelatedContentNodeViewModel,
  type RelatedContentRelationType,
  type RelatedContentTargetOption
} from "./components/RelatedContentGraphPanel";
export {
  RelatedContactsPanel,
  type RelatedActivityViewModel,
  type RelatedContactOption,
  type RelatedContactViewModel,
  type RelatedContactsPanelProps
} from "./components/RelatedContactsPanel";
export {
  RelatedProjectsPanel,
  type RelatedProjectOption,
  type RelatedProjectViewModel,
  type RelatedProjectsPanelProps
} from "./components/RelatedProjectsPanel";
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
  type DashboardFavoriteWidgetItem,
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
export {
  EmptyState,
  type EmptyStateProps
} from "./components/EmptyState";
export {
  ErrorState,
  formatUserError,
  type ErrorStateProps,
  type UserErrorLike
} from "./components/ErrorState";
export {
  renderLoadableState,
  type LoadableState
} from "./components/LoadableState";
export {
  Toast,
  ToastViewport,
  type ToastProps,
  type ToastTone,
  type ToastViewModel,
  type ToastViewportProps
} from "./components/Toast";
