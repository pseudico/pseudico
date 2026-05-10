import {
  TaskDashboardWidget,
  type DashboardTaskWidgetItem
} from "./TaskDashboardWidget";
import type { SnoozePreset } from "../SnoozeMenu";

export type TodayWidgetProps = {
  tasks: readonly DashboardTaskWidgetItem[];
  loading?: boolean;
  error?: string | null;
  onOpenTask?: (task: DashboardTaskWidgetItem) => void;
  onSnoozeTask?: (
    task: DashboardTaskWidgetItem,
    preset: SnoozePreset
  ) => Promise<void> | void;
  onRescheduleTask?: (
    task: DashboardTaskWidgetItem,
    dueAt: string | null
  ) => Promise<void> | void;
};

export function TodayWidget({
  tasks,
  loading,
  error,
  onOpenTask,
  onSnoozeTask,
  onRescheduleTask
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
      {...(onSnoozeTask === undefined ? {} : { onSnoozeTask })}
      {...(onRescheduleTask === undefined ? {} : { onRescheduleTask })}
    />
  );
}
