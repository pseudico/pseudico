export const workflowItemCreatedTriggerSql = `
pragma foreign_keys = off;

create table if not exists workflow_definitions_next (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null default 'manual' check (trigger_type in ('manual', 'item_created')),
  status text not null default 'enabled' check (status in ('enabled', 'disabled')),
  actions_json text not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

insert into workflow_definitions_next (
  id, workspace_id, name, description, trigger_type, status, actions_json, created_at, updated_at, deleted_at
)
select id, workspace_id, name, description, trigger_type, status, actions_json, created_at, updated_at, deleted_at
from workflow_definitions;

drop table workflow_definitions;
alter table workflow_definitions_next rename to workflow_definitions;

create table if not exists workflow_runs_next (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  workflow_definition_id text references workflow_definitions(id) on delete set null,
  trigger_type text not null default 'manual' check (trigger_type in ('manual', 'item_created')),
  status text not null check (status in ('running', 'completed', 'failed')),
  preview_json text not null,
  action_results_json text not null default '[]',
  error_message text,
  started_at text not null,
  completed_at text,
  created_at text not null
);

insert into workflow_runs_next (
  id, workspace_id, workflow_definition_id, trigger_type, status, preview_json,
  action_results_json, error_message, started_at, completed_at, created_at
)
select id, workspace_id, workflow_definition_id, trigger_type, status, preview_json,
  action_results_json, error_message, started_at, completed_at, created_at
from workflow_runs;

drop table workflow_runs;
alter table workflow_runs_next rename to workflow_runs;

create index if not exists idx_workflow_definitions_workspace_status
  on workflow_definitions(workspace_id, status, deleted_at, updated_at);

create index if not exists idx_workflow_definitions_workspace_trigger
  on workflow_definitions(workspace_id, trigger_type, status, deleted_at, updated_at);

create index if not exists idx_workflow_runs_workspace_created
  on workflow_runs(workspace_id, created_at);

create index if not exists idx_workflow_runs_definition_created
  on workflow_runs(workflow_definition_id, created_at);

pragma foreign_keys = on;
`;
