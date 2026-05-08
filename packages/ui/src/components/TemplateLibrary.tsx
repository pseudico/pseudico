export type TemplateLibraryItem = {
  id: string;
  kind: "project" | "contact";
  name: string;
  description: string | null;
  updatedAt: string;
};

export type TemplateLibraryProps = {
  templates: TemplateLibraryItem[];
  kind: "project" | "contact";
  creatingTemplate?: boolean;
  applyingTemplateId?: string | null;
  onCreateTemplate?: () => void;
  onApplyTemplate: (template: TemplateLibraryItem) => void;
};

export function TemplateLibrary({
  templates,
  kind,
  creatingTemplate = false,
  applyingTemplateId = null,
  onCreateTemplate,
  onApplyTemplate
}: TemplateLibraryProps): React.JSX.Element {
  const label = kind === "project" ? "Project" : "Contact";

  return (
    <section className="template-library" aria-label={`${label} template library`}>
      <div className="template-library-header">
        <div>
          <p className="top-eyebrow">Template library</p>
          <h3>{label} templates</h3>
          <p>Create repeatable local {kind} structures with tabs and relative dates.</p>
        </div>
        {onCreateTemplate === undefined ? null : (
          <button
            type="button"
            className="secondary-button compact-button"
            disabled={creatingTemplate}
            onClick={onCreateTemplate}
          >
            {creatingTemplate ? "Saving..." : `Save selected ${kind}`}
          </button>
        )}
      </div>
      {templates.length === 0 ? (
        <p className="muted-copy">No {kind} templates saved yet.</p>
      ) : (
        <div className="template-library-list">
          {templates.map((template) => (
            <article className="template-library-row" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <p>{template.description ?? `Reusable ${kind} template`}</p>
              </div>
              <button
                type="button"
                className="secondary-button compact-button"
                disabled={applyingTemplateId === template.id}
                onClick={() => onApplyTemplate(template)}
              >
                {applyingTemplateId === template.id ? "Creating..." : "Use template"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
