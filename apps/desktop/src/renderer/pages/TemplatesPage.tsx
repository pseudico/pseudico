import { Copy, FileText, Layers3, Play, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type {
  ContactSummary,
  LocalWorkOsApi,
  ProjectSummary,
  TemplateSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type TemplateKindFilter = "all" | TemplateSummary["kind"];

type TemplatePreview = {
  tags: string[];
  sections: string[];
  counts: {
    tabs: number;
    tasks: number;
    lists: number;
    notes: number;
    files: number;
    links: number;
    listItems: number;
    contactFields: number;
  };
};

type TemplatesPageProps = {
  apiClient?: LocalWorkOsApi;
  initialTemplates?: TemplateSummary[];
};

export function TemplatesPage({
  apiClient = desktopApiClient,
  initialTemplates = []
}: TemplatesPageProps): React.JSX.Element {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspaceStore();
  const [templates, setTemplates] = useState<TemplateSummary[]>(initialTemplates);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [kindFilter, setKindFilter] = useState<TemplateKindFilter>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialTemplates[0]?.id ?? null
  );
  const [editingTemplate, setEditingTemplate] = useState<TemplateSummary | null>(null);
  const [instantiateTemplate, setInstantiateTemplate] =
    useState<TemplateSummary | null>(null);
  const [destinationContainerId, setDestinationContainerId] = useState("");
  const [newName, setNewName] = useState("");
  const [baseDate, setBaseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [mutatingTemplateId, setMutatingTemplateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace === null) {
      return;
    }

    let active = true;
    const workspaceId = currentWorkspace.id;

    async function loadTemplates(): Promise<void> {
      setLoading(true);
      setError(null);

      const [templateResult, projectResult, contactResult] = await Promise.all([
        apiClient.templates?.listTemplates({ workspaceId }),
        apiClient.projects.list(workspaceId),
        apiClient.contacts.list(workspaceId)
      ]);

      if (!active) {
        return;
      }

      setLoading(false);

      if (templateResult === undefined) {
        setError("Template library API is unavailable.");
        return;
      }

      if (!templateResult.ok) {
        setError(templateResult.error.message);
        return;
      }

      setTemplates(templateResult.data);
      setSelectedTemplateId((current) => current ?? templateResult.data[0]?.id ?? null);

      if (projectResult.ok) {
        setProjects(projectResult.data);
      }

      if (contactResult.ok) {
        setContacts(contactResult.data);
      }
    }

    void loadTemplates();

    return () => {
      active = false;
    };
  }, [apiClient, currentWorkspace]);

  const previews = useMemo(
    () => new Map(templates.map((template) => [template.id, buildPreview(template)])),
    [templates]
  );

  const tags = useMemo(
    () =>
      [...new Set([...previews.values()].flatMap((preview) => preview.tags))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [previews]
  );

  const filteredTemplates = templates.filter((template) => {
    const preview = previews.get(template.id) ?? emptyPreview();
    const haystack = [
      template.name,
      template.description ?? "",
      template.kind,
      preview.tags.join(" "),
      preview.sections.join(" ")
    ]
      .join(" ")
      .toLocaleLowerCase();

    if (kindFilter !== "all" && template.kind !== kindFilter) {
      return false;
    }

    if (tagFilter !== "" && !preview.tags.includes(tagFilter)) {
      return false;
    }

    return query.trim() === "" || haystack.includes(query.trim().toLocaleLowerCase());
  });

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedTemplateId) ??
    filteredTemplates[0] ??
    null;
  const selectedPreview =
    selectedTemplate === null ? emptyPreview() : previews.get(selectedTemplate.id) ?? emptyPreview();

  async function updateTemplate(values: {
    templateId: string;
    name: string;
    description: string;
  }): Promise<void> {
    if (apiClient.templates === undefined) {
      setError("Template library API is unavailable.");
      return;
    }

    setMutatingTemplateId(values.templateId);
    setError(null);
    const result = await apiClient.templates.updateTemplate({
      templateId: values.templateId,
      name: values.name,
      description: values.description.trim() === "" ? null : values.description
    });
    setMutatingTemplateId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setTemplates((current) =>
      current.map((template) => (template.id === result.data.id ? result.data : template))
    );
    setEditingTemplate(null);
  }

  async function duplicateTemplate(template: TemplateSummary): Promise<void> {
    if (apiClient.templates === undefined) {
      setError("Template library API is unavailable.");
      return;
    }

    setMutatingTemplateId(template.id);
    setError(null);
    const result = await apiClient.templates.duplicateTemplate({
      templateId: template.id,
      name: `${template.name} copy`
    });
    setMutatingTemplateId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setTemplates((current) => [result.data, ...current]);
    setSelectedTemplateId(result.data.id);
  }

  async function deleteTemplate(template: TemplateSummary): Promise<void> {
    if (apiClient.templates === undefined) {
      setError("Template library API is unavailable.");
      return;
    }

    setMutatingTemplateId(template.id);
    setError(null);
    const result = await apiClient.templates.deleteTemplate({ templateId: template.id });
    setMutatingTemplateId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setTemplates((current) => current.filter((entry) => entry.id !== template.id));
    setSelectedTemplateId((current) => (current === template.id ? null : current));
  }

  async function instantiateSelectedTemplate(): Promise<void> {
    if (instantiateTemplate === null || currentWorkspace === null) {
      return;
    }

    setMutatingTemplateId(instantiateTemplate.id);
    setError(null);

    if (instantiateTemplate.kind === "list") {
      if (destinationContainerId.trim() === "") {
        setMutatingTemplateId(null);
        setError("Choose a project or contact destination for the list template.");
        return;
      }

      const title = newName.trim();
      const result = await apiClient.lists.createFromTemplate({
        templateId: instantiateTemplate.id,
        workspaceId: currentWorkspace.id,
        containerId: destinationContainerId,
        baseDate,
        ...(title === "" ? {} : { title })
      });

      setMutatingTemplateId(null);

      if (!result.ok) {
        setError(result.error.message);
        return;
      }

      setInstantiateTemplate(null);
      setDestinationContainerId("");
      navigate(
        contacts.some((contact) => contact.id === result.data.containerId)
          ? `/contacts/${result.data.containerId}`
          : `/projects/${result.data.containerId}`
      );
      return;
    }

    if (apiClient.templates === undefined) {
      setMutatingTemplateId(null);
      setError("Template library API is unavailable.");
      return;
    }

    const name = newName.trim();
    const result = await apiClient.templates.createContainerFromTemplate({
      templateId: instantiateTemplate.id,
      workspaceId: currentWorkspace.id,
      baseDate,
      ...(name === "" ? {} : { name })
    });
    setMutatingTemplateId(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setInstantiateTemplate(null);
    navigate(`/${result.data.container.type}s/${result.data.container.id}`);
  }

  return (
    <section className="page-section templates-page" aria-label="Template library manager">
      <div className="page-header split-header">
        <div>
          <p className="top-eyebrow">Template library</p>
          <h1>Local template manager</h1>
          <p>
            Manage reusable project, contact, and list templates without cloud sharing.
          </p>
        </div>
        <Link to="/projects" className="secondary-button">
          Save templates from projects
        </Link>
      </div>

      <div className="toolbar-row template-library-toolbar">
        <label>
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search templates</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search names, preview text, or tags"
          />
        </label>
        <label>
          Type
          <select
            value={kindFilter}
            onChange={(event) => setKindFilter(event.target.value as TemplateKindFilter)}
          >
            <option value="all">All types</option>
            <option value="project">Projects</option>
            <option value="contact">Contacts</option>
            <option value="list">Lists</option>
          </select>
        </label>
        <label>
          Tag
          <select value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error === null ? null : <p className="error-text">{error}</p>}

      <div className="template-manager-layout">
        <div className="template-manager-list" aria-label="Templates">
          {loading ? <p className="muted-copy">Loading templates...</p> : null}
          {!loading && filteredTemplates.length === 0 ? (
            <p className="muted-copy">No templates match the current filters.</p>
          ) : null}
          {filteredTemplates.map((template) => {
            const preview = previews.get(template.id) ?? emptyPreview();
            const selected = selectedTemplate?.id === template.id;

            return (
              <button
                type="button"
                className={selected ? "template-manager-row selected" : "template-manager-row"}
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
              >
                <TemplateKindIcon kind={template.kind} />
                <span>
                  <strong>{template.name}</strong>
                  <small>
                    {formatKind(template.kind)} · {previewLabel(preview)}
                  </small>
                </span>
              </button>
            );
          })}
        </div>

        <TemplatePreviewPanel
          template={selectedTemplate}
          preview={selectedPreview}
          busy={selectedTemplate !== null && mutatingTemplateId === selectedTemplate.id}
          onEdit={setEditingTemplate}
          onDuplicate={duplicateTemplate}
          onDelete={deleteTemplate}
          onInstantiate={(template) => {
            setInstantiateTemplate(template);
            setNewName("");
            setBaseDate(new Date().toISOString().slice(0, 10));
            setDestinationContainerId(projects[0]?.id ?? contacts[0]?.id ?? "");
          }}
        />
      </div>

      <EditTemplateDialog
        template={editingTemplate}
        submitting={editingTemplate !== null && mutatingTemplateId === editingTemplate.id}
        onClose={() => setEditingTemplate(null)}
        onSubmit={updateTemplate}
      />

      <dialog className="project-dialog" open={instantiateTemplate !== null}>
        <form
          className="stacked-form"
          onSubmit={(event) => {
            event.preventDefault();
            void instantiateSelectedTemplate();
          }}
        >
          <div className="project-dialog-header">
            <div>
              <p className="top-eyebrow">Instantiate template</p>
              <h3>{instantiateTemplate?.name ?? "Template"}</h3>
            </div>
            <button
              type="button"
              className="secondary-button compact-button"
              onClick={() => setInstantiateTemplate(null)}
            >
              Close
            </button>
          </div>
          <label>
            Name
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Leave blank to use the template name"
            />
          </label>
          {instantiateTemplate?.kind === "list" ? (
            <label>
              Destination
              <select
                value={destinationContainerId}
                onChange={(event) => setDestinationContainerId(event.target.value)}
              >
                {[...projects, ...contacts].map((container) => (
                  <option key={container.id} value={container.id}>
                    {container.type === "project" ? "Project" : "Contact"} · {container.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            Base date
            <input
              type="date"
              value={baseDate}
              onChange={(event) => setBaseDate(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="primary-button"
            disabled={instantiateTemplate !== null && mutatingTemplateId === instantiateTemplate.id}
          >
            {instantiateTemplate !== null && mutatingTemplateId === instantiateTemplate.id
              ? "Creating..."
              : "Create from template"}
          </button>
        </form>
      </dialog>
    </section>
  );
}

function TemplatePreviewPanel({
  template,
  preview,
  busy,
  onEdit,
  onDuplicate,
  onDelete,
  onInstantiate
}: {
  template: TemplateSummary | null;
  preview: TemplatePreview;
  busy: boolean;
  onEdit: (template: TemplateSummary) => void;
  onDuplicate: (template: TemplateSummary) => void | Promise<void>;
  onDelete: (template: TemplateSummary) => void | Promise<void>;
  onInstantiate: (template: TemplateSummary) => void;
}): React.JSX.Element {
  if (template === null) {
    return (
      <aside className="template-preview-panel">
        <p className="muted-copy">Select a template to preview its local contents.</p>
      </aside>
    );
  }

  return (
    <aside className="template-preview-panel">
      <div className="template-preview-heading">
        <div>
          <p className="top-eyebrow">{formatKind(template.kind)} template</p>
          <h2>{template.name}</h2>
          <p>{template.description ?? "No description saved."}</p>
        </div>
        <TemplateKindIcon kind={template.kind} />
      </div>

      <div className="template-count-grid">
        {Object.entries(preview.counts)
          .filter(([, count]) => count > 0)
          .map(([label, count]) => (
            <span key={label}>
              <strong>{count}</strong>
              <small>{formatCountLabel(label)}</small>
            </span>
          ))}
      </div>

      {preview.tags.length === 0 ? null : (
        <div className="template-tag-list" aria-label="Template tags">
          {preview.tags.map((tag) => (
            <span key={tag}>@{tag}</span>
          ))}
        </div>
      )}

      <div>
        <h3>Preview</h3>
        <ul className="template-preview-list">
          {preview.sections.slice(0, 10).map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </div>

      <div className="template-action-row">
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          onClick={() => onInstantiate(template)}
        >
          <Play size={16} aria-hidden="true" />
          Use
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={() => onEdit(template)}
        >
          Edit
        </button>
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={() => void onDuplicate(template)}
        >
          <Copy size={16} aria-hidden="true" />
          Duplicate
        </button>
        <button
          type="button"
          className="danger-button"
          disabled={busy}
          onClick={() => void onDelete(template)}
        >
          <Trash2 size={16} aria-hidden="true" />
          Delete
        </button>
      </div>
    </aside>
  );
}

function EditTemplateDialog({
  template,
  submitting,
  onClose,
  onSubmit
}: {
  template: TemplateSummary | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    templateId: string;
    name: string;
    description: string;
  }) => void | Promise<void>;
}): React.JSX.Element {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");

  useEffect(() => {
    setName(template?.name ?? "");
    setDescription(template?.description ?? "");
  }, [template]);

  return (
    <dialog className="project-dialog" open={template !== null}>
      <form
        className="stacked-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (template !== null) {
            void onSubmit({ templateId: template.id, name, description });
          }
        }}
      >
        <div className="project-dialog-header">
          <div>
            <p className="top-eyebrow">Edit template</p>
            <h3>{template?.name ?? "Template"}</h3>
          </div>
          <button type="button" className="secondary-button compact-button" onClick={onClose}>
            Close
          </button>
        </div>
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
          />
        </label>
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? "Saving..." : "Save template"}
        </button>
      </form>
    </dialog>
  );
}

function TemplateKindIcon({
  kind
}: {
  kind: TemplateSummary["kind"];
}): React.JSX.Element {
  if (kind === "list") {
    return <FileText size={20} aria-hidden="true" />;
  }

  return <Layers3 size={20} aria-hidden="true" />;
}

function buildPreview(template: TemplateSummary): TemplatePreview {
  try {
    const parsed = JSON.parse(template.templateJson) as TemplateJsonShape;
    const tags = new Set<string>();
    const sections: string[] = [];
    const counts = emptyPreview().counts;

    if (parsed.kind === "list" && parsed.list !== undefined) {
      collectTags(parsed.list.tags, tags);
      counts.lists = 1;
      counts.listItems = parsed.list.items?.length ?? 0;
      sections.push(parsed.list.title ?? template.name);
      for (const item of parsed.list.items ?? []) {
        collectTags(item.tags, tags);
        sections.push(`Checklist item: ${item.title}`);
      }
    } else if (parsed.container !== undefined) {
      collectTags(parsed.container.tags, tags);
      counts.tabs = parsed.container.tabs?.length ?? 0;
      counts.contactFields = parsed.container.contactFields?.length ?? 0;
      sections.push(parsed.container.name ?? template.name);
      for (const tab of parsed.container.tabs ?? []) {
        sections.push(`Tab: ${tab.name}`);
      }
      for (const item of parsed.container.items ?? []) {
        collectTags(item.tags, tags);
        if (item.type === "task") counts.tasks += 1;
        if (item.type === "list") {
          counts.lists += 1;
          counts.listItems += item.list?.items?.length ?? 0;
        }
        if (item.type === "note") counts.notes += 1;
        if (item.type === "file") counts.files += 1;
        if (item.type === "link") counts.links += 1;
        sections.push(`${formatKind(item.type ?? "item")}: ${item.title ?? "Untitled"}`);
      }
    }

    return {
      tags: [...tags].sort((a, b) => a.localeCompare(b)),
      sections: sections.length === 0 ? [template.name] : sections,
      counts
    };
  } catch {
    return {
      ...emptyPreview(),
      sections: ["Template preview could not parse the saved JSON."]
    };
  }
}

type TemplateJsonShape = {
  kind?: string;
  list?: {
    title?: string;
    tags?: TemplateTag[];
    items?: Array<{ title?: string; tags?: TemplateTag[] }>;
  };
  container?: {
    name?: string;
    tags?: TemplateTag[];
    contactFields?: unknown[];
    tabs?: Array<{ name?: string }>;
    items?: Array<{
      type?: string;
      title?: string;
      tags?: TemplateTag[];
      list?: { items?: unknown[] };
    }>;
  };
};

type TemplateTag = {
  name?: string;
};

function collectTags(tags: TemplateTag[] | undefined, target: Set<string>): void {
  for (const tag of tags ?? []) {
    if (typeof tag.name === "string" && tag.name.trim() !== "") {
      target.add(tag.name);
    }
  }
}

function emptyPreview(): TemplatePreview {
  return {
    tags: [],
    sections: [],
    counts: {
      tabs: 0,
      tasks: 0,
      lists: 0,
      notes: 0,
      files: 0,
      links: 0,
      listItems: 0,
      contactFields: 0
    }
  };
}

function previewLabel(preview: TemplatePreview): string {
  const parts = Object.entries(preview.counts)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${formatCountLabel(label)}`);

  return parts.length === 0 ? "empty preview" : parts.slice(0, 2).join(", ");
}

function formatKind(kind: string): string {
  return kind.slice(0, 1).toUpperCase() + kind.slice(1);
}

function formatCountLabel(label: string): string {
  return label.replace(/([A-Z])/g, " $1").toLocaleLowerCase();
}
