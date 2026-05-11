export const dashboardWidgetLayoutTypesSql = `

alter table dashboard_widgets rename to dashboard_widgets_old;

create table dashboard_widgets (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  dashboard_id text not null references dashboards(id) on delete cascade,
  type text not null check (type in ('saved_view', 'today', 'upcoming', 'overdue', 'favorites', 'recent_activity', 'project_health', 'timeline', 'calendar')),
  title text,
  saved_view_id text references saved_views(id) on delete set null,
  config_json text not null default '{}',
  position_json text not null default '{}',
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

insert into dashboard_widgets (
  id, workspace_id, dashboard_id, type, title, saved_view_id, config_json,
  position_json, sort_order, created_at, updated_at, deleted_at
)
select
  id, workspace_id, dashboard_id, type, title, saved_view_id, config_json,
  position_json, sort_order, created_at, updated_at, deleted_at
from dashboard_widgets_old;

drop table dashboard_widgets_old;
create index idx_dashboard_widgets_dashboard_order on dashboard_widgets(dashboard_id, sort_order);
`;
