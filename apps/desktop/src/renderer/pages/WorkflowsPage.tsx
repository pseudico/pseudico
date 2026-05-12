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
      containerId: "{{item.containerId}}",
      title: "Review {{item.title}} on {{today}}",
      dueAt: "{{item.dueAt+1w}}",
      condition: {
        left: "{{item.type}}",
        op: "eq",
        right: "task"
      }
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
            Local-only workflow definitions are versioned, validated before
            enablement, can interpolate safe variables, and are previewed before
            any action runs. Completed runs keep local history, diagnostics, and
            rollback metadata for undoable activity snapshots.
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
          Action inputs may use variables like {"{{item.title}}"}, {"{{container.name}}"},
          {"{{today}}"}, {"{{today+3d}}"}, {"{{item.dueAt+1w}}"}, and
          {"{{previous.targetId}}"}; missing or invalid date variables block the preview.
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

      <section className="settings-card" aria-labelledby="workflow-history-title">
        <div className="settings-card-header">
          <div>
            <h2 id="workflow-history-title">Run history & rollback</h2>
            <p>
              Workflow runs record their trigger, action targets, captured
              activity IDs, success or failure status, and rollback state.
            </p>
          </div>
          <span className="status-pill success">Local only</span>
        </div>
        <div className="settings-grid compact-grid">
          <div>
            <h3>Diagnostics</h3>
            <ul>
              <li>Blocked previews surface the failure reason.</li>
              <li>Completed actions show target type and target ID.</li>
              <li>Runs without undoable snapshots are clearly disabled.</li>
            </ul>
          </div>
          <div>
            <h3>Rollback guardrails</h3>
            <ul>
              <li>Rollback applies undoable activity snapshots in reverse order.</li>
              <li>Conflicts are reported as partial or failed rollback.</li>
              <li>Rollback itself writes an activity-log entry.</li>
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

