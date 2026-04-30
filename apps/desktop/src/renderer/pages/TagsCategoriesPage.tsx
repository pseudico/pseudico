import { ModulePlaceholder } from "./ModulePlaceholder";

export function TagsCategoriesPage(): React.JSX.Element {
  return (
    <ModulePlaceholder
      eyebrow="Metadata"
      title="Tags & Categories"
      summary="Tags and categories will classify projects, contacts, tasks, notes, files, and links."
      highlights={["Tag browser", "Category colors", "Cross-work views"]}
    />
  );
}
