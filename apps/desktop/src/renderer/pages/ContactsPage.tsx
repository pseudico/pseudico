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
import type {
  ContactLibraryGroupingMode,
  ContactSummary,
  ContainerGroupingViewModelSummary,
  LocalWorkOsApi,
  TemplateSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type ContactsPageProps = {
  apiClient?: LocalWorkOsApi;
  initialContacts?: ContactSummary[];
};

type ContainerVisibilityFilter = "active" | "archived";
type ContactLifecycleAction = "archive" | "complete" | "restore";

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
  const [libraryGrouping, setLibraryGrouping] =
    useState<ContactLibraryGroupingMode>("company");
  const [groupingView, setGroupingView] =
    useState<ContainerGroupingViewModelSummary | null>(null);
  const [savingGrouping, setSavingGrouping] = useState(false);
  const [templateSavingId, setTemplateSavingId] = useState<string | null>(null);
  const [cloningContactId, setCloningContactId] = useState<string | null>(null);
  const [transitioningContactId, setTransitioningContactId] = useState<string | null>(null);
  const [visibilityFilter, setVisibilityFilter] = useState<ContainerVisibilityFilter>("active");
  const [pendingLifecycle, setPendingLifecycle] = useState<{
    contact: ContactSummary;
    action: ContactLifecycleAction;
  } | null>(null);
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

      const result = await apiClient.contacts.list(
        visibilityFilter === "archived"
          ? { workspaceId, includeArchived: true }
          : workspaceId
      );

      if (!active) {
        return;
      }

      setLoading(false);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setContacts(filterContactsByVisibility(result.data, visibilityFilter));
      if (apiClient.templates !== undefined) {
        const templateResult = await apiClient.templates.listTemplates({
          workspaceId,
          kind: "contact"
        });

        if (active && templateResult.ok) {
          setTemplates(templateResult.data);
        }
      }

      const groupingResult = await apiClient.containers.getGrouping({
        workspaceId,
        containerType: "contact",
        mode: libraryGrouping,
        includeArchived: visibilityFilter === "archived"
      });

      if (active && groupingResult.ok) {
        setGroupingView(groupingResult.data);
        setLibraryGrouping(groupingResult.data.mode as ContactLibraryGroupingMode);
      }
    }

    void loadContacts();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace, libraryGrouping, visibilityFilter]);

  async function changeLibraryGrouping(mode: ContactLibraryGroupingMode): Promise<void> {
    if (currentWorkspace === null) {
      return;
    }

    setLibraryGrouping(mode);
    setSavingGrouping(true);
    setError(null);

    const result = await apiClient.containers.updateGroupingPreferences({
      workspaceId: currentWorkspace.id,
      containerType: "contact",
      mode,
      collapsedGroupKeys: []
    });

    setSavingGrouping(false);

    if (!result.ok) {
      setError(result.error.message);
    }
  }

  async function toggleContactGroup(groupKey: string): Promise<void> {
    if (currentWorkspace === null || groupingView === null) {
      return;
    }

    const currentKeys = new Set(groupingView.preferences.collapsedGroupKeys);

    if (currentKeys.has(groupKey)) {
      currentKeys.delete(groupKey);
    } else {
      currentKeys.add(groupKey);
    }

    const collapsedGroupKeys = [...currentKeys].sort();
    setGroupingView({
      ...groupingView,
      preferences: {
        ...groupingView.preferences,
        collapsedGroupKeys
      },
      groups: groupingView.groups.map((group) =>
        group.key === groupKey ? { ...group, collapsed: !group.collapsed } : group
      )
    });

    const result = await apiClient.containers.updateGroupingPreferences({
      workspaceId: currentWorkspace.id,
      containerType: "contact",
      collapsedGroupKeys
    });

    if (!result.ok) {
      setError(result.error.message);
    }
  }

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

  async function confirmContactLifecycle(): Promise<void> {
    if (pendingLifecycle === null) {
      return;
    }

    const { contact, action } = pendingLifecycle;
    setTransitioningContactId(contact.id);
    setError(null);

    if (action === "archive" && apiClient.contacts.archive === undefined) {
      setTransitioningContactId(null);
      setError("Contact archive is unavailable.");
      return;
    }

    if (action === "complete" && apiClient.contacts.complete === undefined) {
      setTransitioningContactId(null);
      setError("Contact complete is unavailable.");
      return;
    }

    if (action === "restore" && apiClient.contacts.restore === undefined) {
      setTransitioningContactId(null);
      setError("Contact restore is unavailable.");
      return;
    }

    const result =
      action === "archive"
        ? await apiClient.contacts.archive!({
            contactId: contact.id,
            confirmOpenTasks: true
          })
        : action === "complete"
          ? await apiClient.contacts.complete!({
              contactId: contact.id,
              confirmOpenTasks: true
            })
          : await apiClient.contacts.restore!({ contactId: contact.id });

    setTransitioningContactId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setPendingLifecycle(null);
    setContacts((current) =>
      applyContactLifecycleResult(current, result.data, action, visibilityFilter)
    );
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

      <LifecycleDialog
        action={pendingLifecycle?.action ?? null}
        containerName={pendingLifecycle?.contact.name ?? ""}
        submitting={transitioningContactId !== null}
        onClose={() => setPendingLifecycle(null)}
        onConfirm={confirmContactLifecycle}
      />

      <TemplateLibrary
        kind="contact"
        templates={templates.map(toTemplateLibraryItem)}
        applyingTemplateId={applyingTemplateId}
        onApplyTemplate={(template) =>
          setSelectedTemplate(templates.find((entry) => entry.id === template.id) ?? null)
        }
      />

      <div className="project-board-toolbar" aria-label="Contact list controls">
        <div>
          <strong>Contact lifecycle</strong>
          <p>Archive completed relationships without losing local history.</p>
        </div>
        <label>
          View
          <select
            value={visibilityFilter}
            onChange={(event) =>
              setVisibilityFilter(event.currentTarget.value as ContainerVisibilityFilter)
            }
          >
            <option value="active">Active contacts</option>
            <option value="archived">Archived contacts</option>
          </select>
        </label>
        <label>
          Library grouping
          <select
            value={libraryGrouping}
            disabled={savingGrouping}
            onChange={(event) =>
              void changeLibraryGrouping(event.currentTarget.value as ContactLibraryGroupingMode)
            }
          >
            <option value="none">No grouping</option>
            <option value="company">Company</option>
            <option value="label">Label</option>
            <option value="tag">Tag</option>
            <option value="category">Category</option>
          </select>
        </label>
      </div>

      <div className="project-list-panel" aria-busy={loading}>
        {renderLoadableState({
          loading,
          loadingLabel: "Loading contacts..."
        }) ??
        (contacts.length === 0 ? (
          <ContactsEmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <GroupedContactList
            contacts={contacts}
            groupingView={groupingView}
            savingTemplateId={templateSavingId}
            cloningContactId={cloningContactId}
            transitioningContactId={transitioningContactId}
            visibilityFilter={visibilityFilter}
            onSaveTemplate={saveContactAsTemplate}
            onClone={cloneContact}
            onLifecycle={(entry, action) => setPendingLifecycle({ contact: entry, action })}
            onToggleGroup={(groupKey) => void toggleContactGroup(groupKey)}
          />
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

function GroupedContactList({
  contacts,
  groupingView,
  savingTemplateId,
  cloningContactId,
  transitioningContactId,
  visibilityFilter,
  onSaveTemplate,
  onClone,
  onLifecycle,
  onToggleGroup
}: {
  contacts: ContactSummary[];
  groupingView: ContainerGroupingViewModelSummary | null;
  savingTemplateId: string | null;
  cloningContactId: string | null;
  transitioningContactId: string | null;
  visibilityFilter: ContainerVisibilityFilter;
  onSaveTemplate: (contact: ContactSummary) => void;
  onClone: (contact: ContactSummary) => void;
  onLifecycle: (contact: ContactSummary, action: ContactLifecycleAction) => void;
  onToggleGroup: (groupKey: string) => void;
}): React.JSX.Element {
  const groups =
    groupingView?.groups.map((group) => ({
      key: group.key,
      label: group.label,
      count: group.count,
      collapsed: group.collapsed,
      contacts: group.targets
        .filter((target) => target.type === "contact")
        .map(toContactSummaryFromGroupingTarget)
    })) ?? [
      {
        key: "all",
        label: "All contacts",
        count: contacts.length,
        collapsed: false,
        contacts
      }
    ];

  return (
    <div className="grouped-results-list" aria-label="Grouped contacts">
      {groups.map((group) => (
        <section className="grouped-results-group" key={group.key}>
          <button
            type="button"
            className="grouped-results-heading"
            aria-expanded={!group.collapsed}
            onClick={() => onToggleGroup(group.key)}
          >
            <span>
              <h3>{group.label}</h3>
              <span>
                {group.count} contact{group.count === 1 ? "" : "s"}
              </span>
            </span>
          </button>
          {group.collapsed ? null : (
            <div className="project-list grouped-result-items">
              {group.contacts.map((contact) => (
                <ContactListRow
                  key={`${group.key}:${contact.id}`}
                  contact={contact}
                  savingTemplate={savingTemplateId === contact.id}
                  cloning={cloningContactId === contact.id}
                  transitioning={transitioningContactId === contact.id}
                  visibilityFilter={visibilityFilter}
                  onSaveTemplate={onSaveTemplate}
                  onClone={onClone}
                  onLifecycle={onLifecycle}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function ContactListRow({
  contact,
  savingTemplate,
  cloning,
  transitioning,
  visibilityFilter,
  onSaveTemplate,
  onClone,
  onLifecycle
}: {
  contact: ContactSummary;
  savingTemplate: boolean;
  cloning: boolean;
  transitioning: boolean;
  visibilityFilter: ContainerVisibilityFilter;
  onSaveTemplate: (contact: ContactSummary) => void;
  onClone: (contact: ContactSummary) => void;
  onLifecycle: (contact: ContactSummary, action: ContactLifecycleAction) => void;
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
        {visibilityFilter === "archived" ? (
          <button
            type="button"
            className="secondary-button compact-button"
            disabled={transitioning}
            onClick={() => onLifecycle(contact, "restore")}
          >
            {transitioning ? "Restoring..." : "Restore"}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="secondary-button compact-button"
              disabled={transitioning || contact.status === "completed"}
              onClick={() => onLifecycle(contact, "complete")}
            >
              {transitioning ? "Updating..." : "Complete"}
            </button>
            <button
              type="button"
              className="secondary-button compact-button"
              disabled={transitioning}
              onClick={() => onLifecycle(contact, "archive")}
            >
              {transitioning ? "Archiving..." : "Archive"}
            </button>
          </>
        )}
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

function LifecycleDialog({
  action,
  containerName,
  submitting,
  onClose,
  onConfirm
}: {
  action: ContactLifecycleAction | null;
  containerName: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}): React.JSX.Element | null {
  if (action === null) {
    return null;
  }

  const title =
    action === "archive"
      ? "Archive contact"
      : action === "complete"
        ? "Complete contact"
        : "Restore contact";
  const confirmLabel =
    action === "archive" ? "Archive" : action === "complete" ? "Complete" : "Restore";

  return (
    <dialog className="project-dialog" open>
      <div className="project-dialog-header">
        <div>
          <p className="top-eyebrow">Container lifecycle</p>
          <h3>{title}</h3>
        </div>
        <button
          type="button"
          className="secondary-button compact-button"
          onClick={onClose}
          disabled={submitting}
        >
          Close
        </button>
      </div>
      <p>
        {confirmLabel} "{containerName}"? Open tasks, if present, stay attached to
        this contact so history remains restorable.
      </p>
      <div className="form-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onClose}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          onClick={onConfirm}
          disabled={submitting}
        >
          {submitting ? `${confirmLabel}...` : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

function filterContactsByVisibility(
  contacts: ContactSummary[],
  visibilityFilter: ContainerVisibilityFilter
): ContactSummary[] {
  return visibilityFilter === "archived"
    ? contacts.filter((contact) => contact.archivedAt !== null)
    : contacts.filter((contact) => contact.archivedAt === null);
}

function applyContactLifecycleResult(
  contacts: ContactSummary[],
  updated: ContactSummary,
  action: ContactLifecycleAction,
  visibilityFilter: ContainerVisibilityFilter
): ContactSummary[] {
  if (
    (action === "archive" && visibilityFilter === "active") ||
    (action === "restore" && visibilityFilter === "archived")
  ) {
    return contacts.filter((contact) => contact.id !== updated.id);
  }

  return contacts.map((contact) => (contact.id === updated.id ? updated : contact));
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

function toContactSummaryFromGroupingTarget(
  target: ContainerGroupingViewModelSummary["groups"][number]["targets"][number]
): ContactSummary {
  return {
    id: target.id,
    workspaceId: target.workspaceId,
    type: "contact",
    name: target.name,
    slug: target.slug,
    description: target.description,
    status: target.status as ContactSummary["status"],
    categoryId: target.categoryId,
    color: target.color,
    isFavorite: target.isFavorite,
    sortOrder: target.sortOrder,
    createdAt: target.createdAt,
    updatedAt: target.updatedAt,
    archivedAt: target.archivedAt,
    deletedAt: target.deletedAt
  };
}
