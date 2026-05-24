import { CheckCircle2, ClipboardList, History, Play, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {
  ContactSummary,
  GuidedWorkflowExecutionSummary,
  GuidedWorkflowPreviewSummary,
  GuidedWorkflowRunHistoryEntrySummary,
  GuidedWorkflowTemplateId,
  GuidedWorkflowTemplateSummary,
  LocalWorkOsApi,
  ProjectSummary
} from "../../preload/api";
import { desktopApiClient } from "../api/desktopApiClient";
import { useWorkspaceStore } from "../state/workspaceStore";

type WorkflowsPageProps = {
  apiClient?: LocalWorkOsApi;
  initialWorkspaceId?: string;
  initialTemplates?: GuidedWorkflowTemplateSummary[];
  initialPreview?: GuidedWorkflowPreviewSummary | null;
  initialResult?: GuidedWorkflowExecutionSummary | null;
  initialRuns?: GuidedWorkflowRunHistoryEntrySummary[];
};

const DEFAULT_PROJECT_ID = "container_mpg4xp68_0703fc0zpbr";
const DEFAULT_CONTACT_ID = "container_mpg4y338_1f6bjrvu1at";

export function WorkflowsPage({
  apiClient = desktopApiClient,
  initialWorkspaceId,
  initialTemplates = [],
  initialPreview = null,
  initialResult = null,
  initialRuns = []
}: WorkflowsPageProps): React.JSX.Element {
  const { currentWorkspace } = useWorkspaceStore();
  const workspaceId = currentWorkspace?.id ?? initialWorkspaceId ?? initialPreview?.workspaceId ?? "";
  const [templates, setTemplates] = useState<GuidedWorkflowTemplateSummary[]>(initialTemplates);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [contacts, setContacts] = useState<ContactSummary[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<GuidedWorkflowTemplateId>(
    initialTemplates[0]?.id ?? "house_project_review"
  );
  const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID);
  const [contactId, setContactId] = useState(DEFAULT_CONTACT_ID);
  const [preview, setPreview] = useState<GuidedWorkflowPreviewSummary | null>(initialPreview);
  const [result, setResult] = useState<GuidedWorkflowExecutionSummary | null>(initialResult);
  const [runs, setRuns] = useState<GuidedWorkflowRunHistoryEntrySummary[]>(initialRuns);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workspaceId === "" || apiClient.workflows === undefined) {
      return;
    }

    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      const [templateResult, projectResult, contactResult, runResult] = await Promise.all([
        apiClient.workflows!.listTemplates(),
        apiClient.projects.list(workspaceId),
        apiClient.contacts.list(workspaceId),
        apiClient.workflows!.listRuns({ workspaceId, limit: 10 })
      ]);

      if (!active) {
        return;
      }

      setLoading(false);

      if (!templateResult.ok) {
        setError(templateResult.error.message);
        return;
      }

      setTemplates(templateResult.data);
      setSelectedTemplateId((current) => current ?? templateResult.data[0]?.id ?? "house_project_review");

      if (projectResult.ok) {
        setProjects(projectResult.data);
      }

      if (contactResult.ok) {
        setContacts(contactResult.data);
      }

      if (runResult.ok) {
        setRuns(runResult.data);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [apiClient, workspaceId]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? templates[0] ?? null,
    [selectedTemplateId, templates]
  );

  const selectedContactOptions =
    selectedTemplate?.fields.find((field) => field.id === "contactId" && field.kind === "contact")?.options ?? [];

  async function buildPreview(): Promise<void> {
    if (apiClient.workflows === undefined || workspaceId === "") {
      setError("Workflow API is unavailable or no workspace is open.");
      return;
    }

    setLoading(true);
    setConfirmed(false);
    setResult(null);
    setError(null);

    const response = await apiClient.workflows.preview({
      workspaceId,
      templateId: selectedTemplateId,
      projectId,
      ...(selectedTemplateId === "house_contact_follow_up" ? { contactId } : {})
    });

    setLoading(false);

    if (!response.ok) {
      setError(response.error.message);
      return;
    }

    setPreview(response.data);
  }

  async function runWorkflow(): Promise<void> {
    if (apiClient.workflows === undefined || preview === null || workspaceId === "") {
      return;
    }

    setRunning(true);
    setError(null);

    const response = await apiClient.workflows.execute({
      workspaceId,
      templateId: preview.template.id,
      projectId: preview.projectId,
      ...(preview.contactId === null ? {} : { contactId: preview.contactId }),
      confirmed: true
    });

    setRunning(false);

    if (!response.ok) {
      setError(response.error.message);
      return;
    }

    setResult(response.data);
    setConfirmed(false);
    const runResponse = await apiClient.workflows.listRuns({ workspaceId, limit: 10 });
    if (runResponse.ok) {
      setRuns(runResponse.data);
    }
  }

  return (
    <main className="page workflow-page" aria-labelledby="workflows-title">
      <section className="page-header">
        <div>
          <p className="eyebrow">Guided workflows</p>
          <h1 id="workflows-title">Workflows</h1>
          <p>
            Choose a safe local workflow, preview exactly what will be created,
            then confirm before Pseudico changes anything.
          </p>
        </div>
        <span className="status-pill success">Local only</span>
      </section>

      <section className="settings-card" aria-labelledby="workflow-beta-safety-title">
        <div className="settings-card-header">
          <div>
            <h2 id="workflow-beta-safety-title">Safe beta rules</h2>
            <p>
              Workflows do not run in the background, do not execute scripts, and
              do not contact cloud services. Preview is read-only.
            </p>
          </div>
          <ShieldCheck aria-hidden="true" />
        </div>
        <ul className="workflow-safety-list">
          <li>Predefined templates only.</li>
          <li>You must confirm before any data is changed.</li>
          <li>Created tasks and notes use the normal local services, activity log, and search index.</li>
          <li>Run history is saved in this workspace and survives restart.</li>
        </ul>
      </section>

      {workspaceId === "" ? (
        <section className="settings-card" role="status">
          Open a workspace to run guided workflows.
        </section>
      ) : null}

      {error === null ? null : (
        <section className="callout danger-callout" role="alert">
          {error}
        </section>
      )}

      <section className="workflow-grid">
        <article className="settings-card" aria-labelledby="workflow-template-title">
          <div className="settings-card-header">
            <div>
              <h2 id="workflow-template-title">1. Choose a workflow</h2>
              <p>Start with one of the household-renovation beta workflows.</p>
            </div>
            <ClipboardList aria-hidden="true" />
          </div>

          <div className="workflow-template-list">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={template.id === selectedTemplateId ? "workflow-template-card selected" : "workflow-template-card"}
                onClick={() => {
                  setSelectedTemplateId(template.id);
                  setPreview(null);
                  setResult(null);
                  setConfirmed(false);
                }}
              >
                <strong>{template.name}</strong>
                <span>{template.purpose}</span>
                <small>{template.safeSummary}</small>
              </button>
            ))}
          </div>
        </article>

        <article className="settings-card" aria-labelledby="workflow-input-title">
          <h2 id="workflow-input-title">2. Fill in the details</h2>
          <label className="field-label">
            Project
            <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
              {projects.length === 0 ? (
                <option value={projectId}>House Renovation and Fit-Out 2026</option>
              ) : (
                projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))
              )}
            </select>
          </label>

          {selectedTemplateId === "house_contact_follow_up" ? (
            <label className="field-label">
              Contact
              <select value={contactId} onChange={(event) => setContactId(event.target.value)}>
                {selectedContactOptions.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contacts.find((known) => known.id === contact.id)?.name ?? contact.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <button
            type="button"
            className="primary-action"
            onClick={() => void buildPreview()}
            disabled={loading || workspaceId === "" || selectedTemplate === null}
          >
            {loading ? "Preparing preview..." : "Preview changes"}
          </button>
        </article>
      </section>

      <section className="settings-card" aria-labelledby="workflow-preview-title">
        <div className="settings-card-header">
          <div>
            <h2 id="workflow-preview-title">3. Preview before anything changes</h2>
            <p>
              This is the exact list of work Pseudico will create or link only
              after you confirm.
            </p>
          </div>
          <CheckCircle2 aria-hidden="true" />
        </div>

        {preview === null ? (
          <p className="muted-text">Choose a workflow and select Preview changes.</p>
        ) : (
          <>
            {preview.issues.length > 0 ? (
              <div className="callout danger-callout" role="alert">
                <strong>Preview needs attention</strong>
                <ul>
                  {preview.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <ol className="workflow-preview-list">
              {preview.plannedChanges.map((change) => (
                <li key={change.id}>
                  <strong>{change.operation === "create" ? "Create" : "Link"} {change.objectType}: {change.title}</strong>
                  <span>{change.description}</span>
                  <small>
                    Project: {change.targetProjectName ?? change.targetProjectId ?? "not selected"}
                    {change.targetContactName === null ? "" : ` • Contact: ${change.targetContactName}`}
                    {change.tags.length === 0 ? "" : ` • Tags: ${change.tags.map((tag) => `@${tag}`).join(" ")}`}
                  </small>
                </li>
              ))}
            </ol>

            <label className="workflow-confirm-box">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                disabled={!preview.canRun}
              />
              I understand this will create or link the items shown above.
            </label>

            <button
              type="button"
              className="primary-action"
              onClick={() => void runWorkflow()}
              disabled={!preview.canRun || !confirmed || running}
            >
              <Play aria-hidden="true" size={16} />
              {running ? "Running workflow..." : preview.confirmationLabel}
            </button>
          </>
        )}
      </section>

      <section className="settings-card" aria-labelledby="workflow-result-title">
        <h2 id="workflow-result-title">4. Result summary</h2>
        {result === null ? (
          <p className="muted-text">Run a confirmed workflow to see what changed.</p>
        ) : (
          <div className={result.status === "completed" ? "callout success-callout" : "callout danger-callout"}>
            <strong>{result.status === "completed" ? "Workflow completed" : "Workflow failed"}</strong>
            <p>{result.summary}</p>
            {result.partialFailure ? (
              <p>Some changes may have been created before the failure. Review the links below.</p>
            ) : (
              <p>This beta workflow is transactional where possible; no partial failure was reported.</p>
            )}
            <ul>
              {result.createdLinks.map((link) => (
                <li key={`${link.targetType}:${link.targetId}`}>
                  <Link to={link.route}>{link.title}</Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="settings-card" aria-labelledby="workflow-history-title">
        <div className="settings-card-header">
          <div>
            <h2 id="workflow-history-title">Run history</h2>
            <p>Recent guided workflow runs saved in this workspace.</p>
          </div>
          <History aria-hidden="true" />
        </div>
        {runs.length === 0 ? (
          <p className="muted-text">No guided workflow runs yet.</p>
        ) : (
          <ol className="workflow-history-list">
            {runs.map((run) => (
              <li key={run.runId}>
                <strong>{run.templateName}</strong>
                <span>{run.status} • {run.completedChangeCount}/{run.plannedChangeCount} changes</span>
                <small>
                  {run.projectName ?? "Project not recorded"}
                  {run.contactName === null ? "" : ` • ${run.contactName}`} • {run.createdAt}
                </small>
                {run.errorMessage === null ? null : <em>{run.errorMessage}</em>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}
