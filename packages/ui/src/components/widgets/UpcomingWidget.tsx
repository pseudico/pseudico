import {
  TaskDashboardWidget,
  type DashboardTaskWidgetItem
} from "./TaskDashboardWidget";
import type { SnoozePreset } from "../SnoozeMenu";

export type UpcomingWidgetProps = {
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

export function UpcomingWidget({
  tasks,
  loading,
  error,
  onOpenTask,
  onSnoozeTask,
  onRescheduleTask
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
      {...(onSnoozeTask === undefined ? {} : { onSnoozeTask })}
      {...(onRescheduleTask === undefined ? {} : { onRescheduleTask })}
    />
  );
}
