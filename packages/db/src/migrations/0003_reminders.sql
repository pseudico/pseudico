create table reminder_policies (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  task_item_id text not null references task_details(item_id) on delete cascade,
  mode text not null check (mode in ('absolute', 'relative')),
  lead_minutes integer check (lead_minutes is null or lead_minutes >= 0),
  trigger_at text not null,
  status text not null default 'active' check (status in ('active', 'cleared')),
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table reminder_events (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  policy_id text not null references reminder_policies(id) on delete cascade,
  task_item_id text not null references task_details(item_id) on delete cascade,
  scheduled_for_at text not null,
  fired_at text,
  dismissed_at text,
  snoozed_until text,
  status text not null default 'scheduled' check (status in ('scheduled', 'fired', 'dismissed', 'snoozed', 'cancelled')),
  created_at text not null,
  updated_at text not null
);

create unique index idx_reminder_policies_active_task on reminder_policies(task_item_id) where deleted_at is null and status = 'active';
create index idx_reminder_policies_workspace_task on reminder_policies(workspace_id, task_item_id, deleted_at);
create index idx_reminder_events_policy_status on reminder_events(policy_id, status, scheduled_for_at);
create index idx_reminder_events_due on reminder_events(workspace_id, status, scheduled_for_at, snoozed_until);
