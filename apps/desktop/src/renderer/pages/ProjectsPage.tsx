import { ModulePlaceholder } from "./ModulePlaceholder";

export function ProjectsPage(): React.JSX.Element {
  return (
    <ModulePlaceholder
      eyebrow="Containers"
      title="Projects"
      summary="Projects will become local containers for mixed tasks, notes, lists, files, and links."
      highlights={["Project list", "Mixed item feed", "Project health"]}
    />
  );
}
