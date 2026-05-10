import { Contact, Plus, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ContactForm,
  CreateFromTemplateDialog,
  EmptyState,
  ErrorState,
  TemplateLibrary,
  renderLoadableState,
  type ContactFormValues,
  type TemplateLibraryItem
} from "@local-work-os/ui";
import type { ContactSummary, LocalWorkOsApi, TemplateSummary } from "../../preload/api";
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
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templateSavingId, setTemplateSavingId] = useState<string | null>(null);
  const [cloningContactId, setCloningContactId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateSummary | null>(null);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);
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
      if (apiClient.templates !== undefined) {
        const templateResult = await apiClient.templates.listTemplates({
          workspaceId,
          kind: "contact"
        });

        if (active && templateResult.ok) {
          setTemplates(templateResult.data);
        }
      }
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

  async function saveContactAsTemplate(contact: ContactSummary): Promise<void> {
    setTemplateSavingId(contact.id);
    setError(null);

    if (apiClient.templates === undefined) {
      setError("Template library is unavailable.");
      return;
    }

    const result = await apiClient.templates.saveContainerAsTemplate({
      containerId: contact.id,
      name: `${contact.name} template`
    });

    setTemplateSavingId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setTemplates((current) => [result.data, ...current]);
  }

  async function cloneContact(contact: ContactSummary): Promise<void> {
    setCloningContactId(contact.id);
    setError(null);

    if (apiClient.contacts.clone === undefined) {
      setCloningContactId(null);
      setError("Contact duplicate is unavailable.");
      return;
    }

    const result = await apiClient.contacts.clone({
      contactId: contact.id
    });

    setCloningContactId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setContacts((current) => [result.data, ...current]);
    navigate(`/contacts/${result.data.id}`);
  }

  async function createContactFromTemplate(values: { name: string; baseDate: string }): Promise<void> {
    if (currentWorkspace === null || selectedTemplate === null) {
      return;
    }

    setApplyingTemplateId(selectedTemplate.id);
    setError(null);

    if (apiClient.templates === undefined) {
      setError("Template library is unavailable.");
      return;
    }

    const result = await apiClient.templates.createContainerFromTemplate({
      templateId: selectedTemplate.id,
      workspaceId: currentWorkspace.id,
      baseDate: values.baseDate,
      ...(values.name.trim().length === 0 ? {} : { name: values.name })
    });

    setApplyingTemplateId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    const contact = result.data.container;

    if (contact.type === "contact") {
      setSelectedTemplate(null);
      setContacts((current) => [contact, ...current]);
      navigate(`/contacts/${contact.id}`);
    }
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
        <Link className="secondary-button" to="/contact-labels">
          Browse labels
        </Link>
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

      <CreateFromTemplateDialog
        open={selectedTemplate !== null}
        templateName={selectedTemplate?.name ?? "Template"}
        submitting={applyingTemplateId !== null}
        onClose={() => setSelectedTemplate(null)}
        onSubmit={createContactFromTemplate}
      />

      <TemplateLibrary
        kind="contact"
        templates={templates.map(toTemplateLibraryItem)}
        applyingTemplateId={applyingTemplateId}
        onApplyTemplate={(template) =>
          setSelectedTemplate(templates.find((entry) => entry.id === template.id) ?? null)
        }
      />

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
              <ContactListRow
                key={contact.id}
                contact={contact}
                savingTemplate={templateSavingId === contact.id}
                cloning={cloningContactId === contact.id}
                onSaveTemplate={saveContactAsTemplate}
                onClone={cloneContact}
              />
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
  contact,
  savingTemplate,
  cloning,
  onSaveTemplate,
  onClone
}: {
  contact: ContactSummary;
  savingTemplate: boolean;
  cloning: boolean;
  onSaveTemplate: (contact: ContactSummary) => void;
  onClone: (contact: ContactSummary) => void;
}): React.JSX.Element {
  return (
    <div className="project-list-row">
      <Link className="project-list-main" to={`/contacts/${contact.id}`}>
        <span
          className="project-list-color"
          style={{ backgroundColor: contact.color ?? "#2c6b8f" }}
          aria-hidden="true"
        />
        <span>
          <strong>{contact.name}</strong>
          <span>{contact.description ?? "No description"}</span>
        </span>
      </Link>
      <span className="project-list-meta">
        {contact.isFavorite ? <Star size={16} aria-label="Pinned" /> : null}
        <span>{contact.status}</span>
        <button
          type="button"
          className="secondary-button compact-button"
          disabled={cloning}
          onClick={() => onClone(contact)}
        >
          {cloning ? "Duplicating..." : "Duplicate"}
        </button>
        <button
          type="button"
          className="secondary-button compact-button"
          disabled={savingTemplate}
          onClick={() => onSaveTemplate(contact)}
        >
          {savingTemplate ? "Saving..." : "Save as template"}
        </button>
      </span>
    </div>
  );
}

function toTemplateLibraryItem(template: TemplateSummary): TemplateLibraryItem {
  return {
    id: template.id,
    kind: "contact",
    name: template.name,
    description: template.description,
    updatedAt: template.updatedAt
  };
}
