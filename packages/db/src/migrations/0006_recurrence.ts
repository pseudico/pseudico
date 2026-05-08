export const recurrenceSql = `
create table recurrence_rules (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  task_item_id text not null references task_details(item_id) on delete cascade,
  frequency text not null check (frequency in ('daily', 'weekly')),
  interval integer not null default 1 check (interval >= 1),
  weekdays_json text,
  anchor_at text not null,
  next_occurrence_at text not null,
  status text not null default 'active' check (status in ('active', 'cleared')),
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create unique index idx_recurrence_rules_active_task on recurrence_rules(task_item_id) where deleted_at is null and status = 'active';
create index idx_recurrence_rules_workspace_next on recurrence_rules(workspace_id, status, next_occurrence_at, deleted_at);
`;
