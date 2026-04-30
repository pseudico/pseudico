import { ModulePlaceholder } from "./ModulePlaceholder";

export function WorkspaceHomePage(): React.JSX.Element {
  return (
    <ModulePlaceholder
      eyebrow="Workspace"
      title="Workspace Home"
      summary="The opened local workspace, health summary, and maintenance entry points will land here."
      highlights={[
        "Workspace folder status",
        "Database health",
        "Recent local activity"
      ]}
    />
  );
}
