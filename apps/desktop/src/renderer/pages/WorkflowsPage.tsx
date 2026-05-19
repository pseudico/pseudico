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
    <main className="page workflow-page" data-space-budget-surface="workflow-lab" aria-labelledby="workflows-title">
      <section className="page-header">
        <div>
          <p className="eyebrow">Workflow lab — scaffold only</p>
          <h1 id="workflows-title">Workflows</h1>
          <p>
            Internal pilot status: workflow services, validation, preview
            models, run history, and loop guards exist for maintainers, but this
            screen is not a primary-operator create, edit, run, or history
            workflow loop yet.
          </p>
        </div>
        <span className="status-pill danger">Future / scaffold</span>
      </section>

      <section className="settings-card" aria-labelledby="workflow-pilot-status-title">
        <div className="settings-card-header">
          <div>
            <h2 id="workflow-pilot-status-title">Not pilot-supported for daily automation</h2>
            <p>
              For the internal pilot, use Today, project/contact tasks, lists,
              templates, and manual review rather than expecting Workflows to
              automate operator work.
            </p>
          </div>
          <span className="status-pill danger">No run UI</span>
        </div>
        <div className="settings-grid compact-grid">
          <div>
            <h3>What is safe to trust now</h3>
            <ul>
              <li>Schema validation rejects unsupported or non-local actions.</li>
              <li>Service tests cover preview, activity, search, and loop guards.</li>
              <li>This page documents the local registry for maintainer review.</li>
            </ul>
          </div>
          <div>
            <h3>What is not ready for operators</h3>
            <ul>
              <li>No packaged create/edit workflow form is connected here.</li>
              <li>No operator-facing run button or run-history browser is exposed.</li>
              <li>No scheduling, cloud automation, webhooks, or team workflows are in scope.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="panel-stack" aria-label="Workflow validation examples">
        <WorkflowEditorSkeleton state={invalidState} />
        <WorkflowEditorSkeleton state={draftState} />
      </section>

      <section className="settings-card" aria-labelledby="workflow-registry-title">
        <h2 id="workflow-registry-title">Local registry</h2>
        <p>
          This registry is maintainer evidence, not a pilot workflow builder.
          Only registered local triggers and actions can be enabled by the
          service layer. Network, shell, webhook, cloud sync, and remote storage
          actions are rejected. Action inputs may use variables like{" "}
          {"{{item.title}}"}, {"{{container.name}}"}, {"{{today}}"},{" "}
          {"{{today+3d}}"}, {"{{item.dueAt+1w}}"}, and {"{{previous.targetId}}"};
          missing or invalid date variables block the service preview.
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
              The service foundation can record trigger, action target,
              activity, status, and rollback metadata, but the packaged pilot UI
              does not expose a normal run-history browser yet.
            </p>
          </div>
          <span className="status-pill success">Local only</span>
        </div>
        <div className="settings-grid compact-grid">
          <div>
            <h3>Diagnostics</h3>
            <ul>
              <li>Service previews surface blocked-action failure reasons.</li>
              <li>Service run records include target type and target ID.</li>
              <li>Operator browsing of those records remains future work.</li>
            </ul>
          </div>
          <div>
            <h3>Rollback guardrails</h3>
            <ul>
              <li>Rollback applies undoable activity snapshots in reverse order.</li>
              <li>Conflicts are reported as partial or failed rollback.</li>
              <li>Rollback itself writes an activity-log entry in service tests.</li>
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
        <div className="callout success-callout">
          Service preview would be available before a future operator run UI.
        </div>
      )}

      <h3>Service preview actions</h3>
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

