import { ModulePlaceholder } from "./ModulePlaceholder";

export function SearchPage(): React.JSX.Element {
  return (
    <ModulePlaceholder
      eyebrow="Find"
      title="Search"
      summary="Search will query local indexed content without sending workspace data to a remote service."
      highlights={["Local index", "Grouped results", "Search diagnostics"]}
    />
  );
}
