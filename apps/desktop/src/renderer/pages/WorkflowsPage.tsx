import {
  WORKFLOW_ACTION_REGISTRY,
  WORKFLOW_DEFINITION_SCHEMA_VERSION,
  WORKFLOW_TRIGGER_REGISTRY,
  createWorkflowEditorSkeletonState,
  type WorkflowDefinitionSchema
} from "@local-work-os/features/workflows/schema";

const invalidExample = {
  kind: "local-work-os.workflow",
  version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
  trigger: { type: "webhook" },
  actions: [
    {
      type: "http_request",
      url: "https://example.com/hook"
    }
  ]
};

const draftExample: WorkflowDefinitionSchema = {
  kind: "local-work-os.workflow",
  version: WORKFLOW_DEFINITION_SCHEMA_VERSION,
  trigger: { type: "manual" },
  actions: [
    {
      type: "create_task",
      containerId: "container_project_id",
      title: "Draft a follow-up task"
    }
  ]
};

export function WorkflowsPage(): React.JSX.Element {
  const invalidState = createWorkflowEditorSkeletonState({
    name: "Rejected network workflow",
    definition: invalidExample
  });
  const draftState = createWorkflowEditorSkeletonState({
    name: "Manual local follow-up",
    definition: draftExample
  });

  return (
    <main className="page workflow-page" aria-labelledby="workflows-title">
      <section className="page-header">
        <div>
          <p className="eyebrow">Automation</p>
          <h1 id="workflows-title">Workflows</h1>
          <p>
            Local-only manual workflow definitions are versioned, validated before
            enablement, and previewed before any action runs.
          </p>
        </div>
      </section>

      <section className="panel-stack" aria-label="Workflow validation skeleton">
        <WorkflowEditorSkeleton state={invalidState} />
        <WorkflowEditorSkeleton state={draftState} />
      </section>

      <section className="settings-card" aria-labelledby="workflow-registry-title">
        <h2 id="workflow-registry-title">Local registry</h2>
        <p>
          Only registered local triggers and actions can be enabled. Network,
          shell, webhook, cloud sync, and remote storage actions are rejected.
        </p>
        <div className="settings-grid compact-grid">
          <div>
            <h3>Triggers</h3>
            <ul>
              {WORKFLOW_TRIGGER_REGISTRY.map((trigger) => (
                <li key={trigger.type}>{trigger.label}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Actions</h3>
            <ul>
              {WORKFLOW_ACTION_REGISTRY.map((action) => (
                <li key={action.type}>{action.label}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

function WorkflowEditorSkeleton({
  state
}: {
  state: ReturnType<typeof createWorkflowEditorSkeletonState>;
}): React.JSX.Element {
  return (
    <article className="settings-card workflow-editor-skeleton">
      <div className="settings-card-header">
        <div>
          <h2>{state.title}</h2>
          <p>{state.schemaVersionLabel}</p>
        </div>
        <span className={state.canEnable ? "status-pill success" : "status-pill danger"}>
          {state.statusLabel}
        </span>
      </div>

      {state.issues.length > 0 ? (
        <div role="alert" className="callout danger-callout">
          <strong>Invalid workflow cannot enable</strong>
          <ul>
            {state.issues.map((issue) => (
              <li key={`${issue.path}:${issue.message}`}>
                {issue.path}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="callout success-callout">Preview is available before run.</div>
      )}

      <h3>Preview actions</h3>
      {state.actionSummaries.length === 0 ? (
        <p>No previewable local actions until validation passes.</p>
      ) : (
        <ol>
          {state.actionSummaries.map((summary) => (
            <li key={summary}>{summary}</li>
          ))}
        </ol>
      )}
    </article>
  );
}

