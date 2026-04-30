import { ModulePlaceholder } from "./ModulePlaceholder";

export function ContactsPage(): React.JSX.Element {
  return (
    <ModulePlaceholder
      eyebrow="Local CRM"
      title="Contacts"
      summary="Contacts will track client context, related projects, follow-ups, and local interaction history."
      highlights={["Contact profiles", "Related projects", "Follow-up work"]}
    />
  );
}
