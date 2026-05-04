import {
  TaskDashboardWidget,
  type DashboardTaskWidgetItem
} from "./TaskDashboardWidget";

export type UpcomingWidgetProps = {
  tasks: readonly DashboardTaskWidgetItem[];
  loading?: boolean;
  error?: string | null;
  onOpenTask?: (task: DashboardTaskWidgetItem) => void;
};

export function UpcomingWidget({
  tasks,
  loading,
  error,
  onOpenTask
}: UpcomingWidgetProps): React.JSX.Element {
  return (
    <TaskDashboardWidget
      description="Open tasks due after today in the upcoming window."
      emptyDescription="Upcoming dated tasks will appear here."
      emptyTitle="Nothing upcoming"
      error={error ?? null}
      kind="upcoming"
      loading={loading ?? false}
      tasks={tasks}
      title="Upcoming"
      {...(onOpenTask === undefined ? {} : { onOpenTask })}
    />
  );
}
