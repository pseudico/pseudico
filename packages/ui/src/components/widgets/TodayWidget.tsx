import {
  TaskDashboardWidget,
  type DashboardTaskWidgetItem
} from "./TaskDashboardWidget";

export type TodayWidgetProps = {
  tasks: readonly DashboardTaskWidgetItem[];
  loading?: boolean;
  error?: string | null;
  onOpenTask?: (task: DashboardTaskWidgetItem) => void;
};

export function TodayWidget({
  tasks,
  loading,
  error,
  onOpenTask
}: TodayWidgetProps): React.JSX.Element {
  return (
    <TaskDashboardWidget
      description="Open tasks due in the current local day."
      emptyDescription="Tasks dated for today will appear here."
      emptyTitle="Nothing due today"
      error={error ?? null}
      kind="today"
      loading={loading ?? false}
      tasks={tasks}
      title="Today"
      {...(onOpenTask === undefined ? {} : { onOpenTask })}
    />
  );
}
