create table if not exists workflow_definitions (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null default 'manual' check (trigger_type = 'manual'),
  status text not null default 'enabled' check (status in ('enabled', 'disabled')),
  actions_json text not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table if not exists workflow_runs (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  workflow_definition_id text references workflow_definitions(id) on delete set null,
  trigger_type text not null default 'manual' check (trigger_type = 'manual'),
  status text not null check (status in ('running', 'completed', 'failed')),
  preview_json text not null,
  action_results_json text not null default '[]',
  error_message text,
  started_at text not null,
  completed_at text,
  created_at text not null
);

create index if not exists idx_workflow_definitions_workspace_status
  on workflow_definitions(workspace_id, status, deleted_at, updated_at);

create index if not exists idx_workflow_runs_workspace_created
  on workflow_runs(workspace_id, created_at);

create index if not exists idx_workflow_runs_definition_created
  on workflow_runs(workflow_definition_id, created_at);
