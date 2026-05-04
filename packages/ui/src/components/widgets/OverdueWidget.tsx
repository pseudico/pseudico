import {
  TaskDashboardWidget,
  type DashboardTaskWidgetItem
} from "./TaskDashboardWidget";

export type OverdueWidgetProps = {
  tasks: readonly DashboardTaskWidgetItem[];
  loading?: boolean;
  error?: string | null;
  onOpenTask?: (task: DashboardTaskWidgetItem) => void;
};

export function OverdueWidget({
  tasks,
  loading,
  error,
  onOpenTask
}: OverdueWidgetProps): React.JSX.Element {
  return (
    <TaskDashboardWidget
      description="Open tasks that are past their due date."
      emptyDescription="Recent overdue tasks will appear here."
      emptyTitle="No overdue tasks"
      error={error ?? null}
      kind="overdue"
      loading={loading ?? false}
      tasks={tasks}
      title="Overdue"
      {...(onOpenTask === undefined ? {} : { onOpenTask })}
    />
  );
}
