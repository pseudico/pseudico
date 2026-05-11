export const reviewTaskStatusesSql = `
create table task_details_new (
  item_id text primary key references items(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  task_status text not null default 'open' check (task_status in ('open', 'done', 'waiting', 'someday', 'deferred', 'cancelled')),
  priority integer check (priority is null or (priority >= 0 and priority <= 5)),
  start_at text,
  due_at text,
  all_day integer not null default 1 check (all_day in (0, 1)),
  timezone text,
  reminder_policy_id text,
  recurrence_rule_id text,
  completed_at text,
  created_at text not null,
  updated_at text not null
);

insert into task_details_new (
  item_id,
  workspace_id,
  task_status,
  priority,
  start_at,
  due_at,
  all_day,
  timezone,
  reminder_policy_id,
  recurrence_rule_id,
  completed_at,
  created_at,
  updated_at
)
select
  item_id,
  workspace_id,
  task_status,
  priority,
  start_at,
  due_at,
  all_day,
  timezone,
  reminder_policy_id,
  recurrence_rule_id,
  completed_at,
  created_at,
  updated_at
from task_details;

drop table task_details;
alter table task_details_new rename to task_details;

create index idx_task_details_due on task_details(workspace_id, due_at, task_status);
create index idx_task_details_status on task_details(workspace_id, task_status);
`;
