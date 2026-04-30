import { ModulePlaceholder } from "./ModulePlaceholder";

export function TodayPage(): React.JSX.Element {
  return (
    <ModulePlaceholder
      eyebrow="Planning"
      title="Today"
      summary="Daily planning will show due, overdue, and manually planned work from the local database."
      highlights={["Due today", "Overdue backlog", "Tomorrow planning"]}
    />
  );
}
