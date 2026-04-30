import { ModulePlaceholder } from "./ModulePlaceholder";

export function CollectionsPage(): React.JSX.Element {
  return (
    <ModulePlaceholder
      eyebrow="Saved views"
      title="Collections"
      summary="Collections will group local work by saved filters, tags, keywords, and metadata."
      highlights={["Tag collections", "Keyword views", "Grouped results"]}
    />
  );
}
