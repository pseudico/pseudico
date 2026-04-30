import { ModulePlaceholder } from "./ModulePlaceholder";

export function DashboardPage(): React.JSX.Element {
  return (
    <ModulePlaceholder
      eyebrow="Overview"
      title="Dashboard"
      summary="Dashboard will show local summaries for active projects, deadlines, saved views, and recent activity."
      highlights={["Workspace overview", "Project status", "Recent activity"]}
    />
  );
}
