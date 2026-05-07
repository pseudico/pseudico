import { Contact, Plus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ContactForm,
  EmptyState,
  ErrorState,
  renderLoadableState,
  type ContactFormValues
} from "@local-work-os/ui";
import type { ContactSummary, LocalWorkOsApi } from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type ContactsPageProps = {
  apiClient?: LocalWorkOsApi;
  initialContacts?: ContactSummary[];
};

export function ContactsPage({
  apiClient = desktopApiClient,
  initialContacts = []
}: ContactsPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [contacts, setContacts] = useState<ContactSummary[]>(initialContacts);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace === null) {
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadContacts(): Promise<void> {
      setLoading(true);
      setError(null);

      const result = await apiClient.contacts.list(workspaceId);

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setContacts(result.data);
    }

    void loadContacts();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace]);

  async function createContact(values: ContactFormValues): Promise<void> {
    if (currentWorkspace === null) {
      setError("Open a workspace before creating contacts.");
      return;
    }

    setCreating(true);
    setError(null);

    const result = await apiClient.contacts.create({
      workspaceId: currentWorkspace.id,
      name: values.name,
      description: values.description.length === 0 ? null : values.description,
      color: values.color,
      isFavorite: values.isFavorite
    });

    setCreating(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setCreateOpen(false);
    setContacts((current) => [result.data.contact, ...current]);
    navigate(`/contacts/${result.data.contact.id}`);
  }

  if (currentWorkspace === null) {
    return (
      <section className="projects-page">
        <div className="page-heading">
          <p className="top-eyebrow">Contact containers</p>
          <h2>Contacts</h2>
          <p>Open or create a local workspace before adding contacts.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="projects-page">
      <div className="page-heading page-heading-actions">
        <div>
          <p className="top-eyebrow">Contact containers</p>
          <h2>Contacts</h2>
          <p>
            Contact pages collect local profile fields, follow-ups, notes, and
            relationship context.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={18} aria-hidden="true" />
          New contact
        </button>
      </div>

      {error === null ? null : <ErrorState error={error} title="Contacts error" />}

      <dialog className="project-dialog" open={createOpen}>
        <div className="project-dialog-header">
          <div>
            <p className="top-eyebrow">Create contact</p>
            <h3>New contact</h3>
          </div>
          <button
            type="button"
            className="secondary-button compact-button"
            onClick={() => setCreateOpen(false)}
          >
            Close
          </button>
        </div>
        <ContactForm submitting={creating} onSubmit={createContact} />
      </dialog>

      <div className="project-list-panel" aria-busy={loading}>
        {renderLoadableState({
          loading,
          loadingLabel: "Loading contacts..."
        }) ??
        (contacts.length === 0 ? (
          <ContactsEmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="project-list" aria-label="Contacts">
            {contacts.map((contact) => (
              <ContactListRow key={contact.id} contact={contact} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactsEmptyState({
  onCreate
}: {
  onCreate: () => void;
}): React.JSX.Element {
  return (
    <EmptyState
      action={
        <button type="button" className="secondary-button" onClick={onCreate}>
          <Plus size={17} aria-hidden="true" />
          Create contact
        </button>
      }
      description="Create the first local contact container before adding profile fields and follow-up work."
      icon={<Contact size={28} aria-hidden="true" />}
      title="No contacts yet"
    />
  );
}

function ContactListRow({
  contact
}: {
  contact: ContactSummary;
}): React.JSX.Element {
  return (
    <Link className="project-list-row" to={`/contacts/${contact.id}`}>
      <span
        className="project-list-color"
        style={{ backgroundColor: contact.color ?? "#2c6b8f" }}
        aria-hidden="true"
      />
      <span className="project-list-main">
        <strong>{contact.name}</strong>
        <span>{contact.description ?? "No description"}</span>
      </span>
      <span className="project-list-meta">
        {contact.isFavorite ? <Star size={16} aria-label="Pinned" /> : null}
        <span>{contact.status}</span>
      </span>
    </Link>
  );
}
