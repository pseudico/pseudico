import { ModulePlaceholder } from "./ModulePlaceholder";

export function InboxPage(): React.JSX.Element {
  return (
    <ModulePlaceholder
      eyebrow="Capture"
      title="Inbox"
      summary="Inbox will hold captured tasks, notes, links, and files before they are moved into context."
      highlights={["Quick capture queue", "Triage actions", "Move to project"]}
    />
  );
}
