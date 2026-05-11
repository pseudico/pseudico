export const reminderTargetsSql = `
create table reminder_policies_v2 (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  target_type text not null default 'item' check (target_type in ('item', 'list_item')),
  target_id text not null,
  task_item_id text not null,
  anchor text not null default 'due' check (anchor in ('due', 'start')),
  mode text not null check (mode in ('absolute', 'relative')),
  lead_minutes integer check (lead_minutes is null or lead_minutes >= 0),
  trigger_at text not null,
  status text not null default 'active' check (status in ('active', 'cleared')),
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table reminder_events_v2 (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  policy_id text not null references reminder_policies_v2(id) on delete cascade,
  target_type text not null default 'item' check (target_type in ('item', 'list_item')),
  target_id text not null,
  task_item_id text not null,
  scheduled_for_at text not null,
  fired_at text,
  dismissed_at text,
  snoozed_until text,
  status text not null default 'scheduled' check (status in ('scheduled', 'fired', 'dismissed', 'snoozed', 'cancelled')),
  created_at text not null,
  updated_at text not null
);

insert into reminder_policies_v2 (
  id,
  workspace_id,
  target_type,
  target_id,
  task_item_id,
  anchor,
  mode,
  lead_minutes,
  trigger_at,
  status,
  created_at,
  updated_at,
  deleted_at
)
select
  id,
  workspace_id,
  'item',
  task_item_id,
  task_item_id,
  'due',
  mode,
  lead_minutes,
  trigger_at,
  status,
  created_at,
  updated_at,
  deleted_at
from reminder_policies;

insert into reminder_events_v2 (
  id,
  workspace_id,
  policy_id,
  target_type,
  target_id,
  task_item_id,
  scheduled_for_at,
  fired_at,
  dismissed_at,
  snoozed_until,
  status,
  created_at,
  updated_at
)
select
  e.id,
  e.workspace_id,
  e.policy_id,
  'item',
  e.task_item_id,
  e.task_item_id,
  e.scheduled_for_at,
  e.fired_at,
  e.dismissed_at,
  e.snoozed_until,
  e.status,
  e.created_at,
  e.updated_at
from reminder_events e;

drop table reminder_events;
drop table reminder_policies;

alter table reminder_policies_v2 rename to reminder_policies;
alter table reminder_events_v2 rename to reminder_events;

create unique index idx_reminder_policies_active_task on reminder_policies(target_type, target_id) where deleted_at is null and status = 'active';
create index idx_reminder_policies_workspace_task on reminder_policies(workspace_id, target_type, target_id, deleted_at);
create index idx_reminder_events_policy_status on reminder_events(policy_id, status, scheduled_for_at);
create index idx_reminder_events_due on reminder_events(workspace_id, status, scheduled_for_at, snoozed_until);
create index idx_reminder_events_target on reminder_events(workspace_id, target_type, target_id, status);
`;
