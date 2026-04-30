export const initialSchemaSql = `
create table workspaces (
  id text primary key,
  name text not null,
  schema_version integer not null default 1,
  created_at text not null,
  updated_at text not null
);

create table app_settings (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  setting_key text not null,
  value_json text not null,
  created_at text not null,
  updated_at text not null,
  unique (workspace_id, setting_key)
);

create table categories (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  color text not null,
  description text,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  unique (workspace_id, slug)
);

create table containers (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  type text not null check (type in ('inbox', 'project', 'contact')),
  name text not null,
  slug text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'waiting', 'completed', 'archived')),
  category_id text references categories(id) on delete set null,
  color text,
  is_favorite integer not null default 0 check (is_favorite in (0, 1)),
  is_system integer not null default 0 check (is_system in (0, 1)),
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text,
  unique (workspace_id, slug)
);

create table container_tabs (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  container_id text not null references containers(id) on delete cascade,
  name text not null default 'Main',
  description text,
  sort_order integer not null default 0,
  is_default integer not null default 0 check (is_default in (0, 1)),
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);

create table items (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  container_id text not null references containers(id) on delete cascade,
  container_tab_id text references container_tabs(id) on delete set null,
  type text not null check (type in ('task', 'list', 'note', 'file', 'link', 'heading', 'location', 'comment')),
  title text not null,
  body text,
  category_id text references categories(id) on delete set null,
  status text not null default 'active',
  sort_order integer not null default 0,
  pinned integer not null default 0 check (pinned in (0, 1)),
  created_at text not null,
  updated_at text not null,
  completed_at text,
  archived_at text,
  deleted_at text
);

create table task_details (
  item_id text primary key references items(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  task_status text not null default 'open' check (task_status in ('open', 'done', 'waiting', 'cancelled')),
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

create table list_details (
  item_id text primary key references items(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  display_mode text not null default 'checklist' check (display_mode in ('checklist', 'pipeline')),
  show_completed integer not null default 1 check (show_completed in (0, 1)),
  progress_mode text not null default 'count' check (progress_mode in ('count', 'manual', 'none')),
  created_at text not null,
  updated_at text not null
);

create table list_items (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  list_item_parent_id text references list_items(id) on delete set null,
  list_id text not null references list_details(item_id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'open' check (status in ('open', 'done', 'waiting', 'cancelled')),
  depth integer not null default 0 check (depth >= 0),
  sort_order integer not null default 0,
  start_at text,
  due_at text,
  completed_at text,
  created_at text not null,
  updated_at text not null,
  archived_at text,
  deleted_at text
);

create table note_details (
  item_id text primary key references items(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  format text not null default 'markdown',
  content text not null default '',
  preview text,
  created_at text not null,
  updated_at text not null
);

create table links (
  item_id text primary key references items(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  url text not null,
  normalized_url text,
  title text,
  description text,
  domain text,
  favicon_path text,
  preview_image_path text,
  created_at text not null,
  updated_at text not null
);

create table attachments (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  item_id text not null references items(id) on delete cascade,
  original_name text not null,
  stored_name text not null,
  mime_type text,
  size_bytes integer not null check (size_bytes >= 0),
  checksum text,
  storage_path text not null,
  description text,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  unique (workspace_id, storage_path)
);

create table tags (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  unique (workspace_id, slug)
);

create table taggings (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  tag_id text not null references tags(id) on delete cascade,
  target_type text not null check (target_type in ('container', 'item', 'list_item')),
  target_id text not null,
  source text not null default 'manual' check (source in ('inline', 'manual', 'imported')),
  created_at text not null,
  deleted_at text
);

create table relationships (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  source_type text not null check (source_type in ('container', 'item', 'list_item')),
  source_id text not null,
  target_type text not null check (target_type in ('container', 'item', 'list_item', 'url', 'file')),
  target_id text not null,
  relation_type text not null check (relation_type in ('related', 'depends_on', 'blocked_by', 'references', 'belongs_to', 'follow_up_for')),
  label text,
  created_at text not null,
  deleted_at text
);

create table saved_views (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  type text not null check (type in ('collection', 'smart_list', 'dashboard_widget', 'search')),
  name text not null,
  description text,
  query_json text not null default '{}',
  display_json text not null default '{}',
  is_favorite integer not null default 0 check (is_favorite in (0, 1)),
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table dashboards (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  is_default integer not null default 0 check (is_default in (0, 1)),
  layout_json text not null default '{}',
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table dashboard_widgets (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  dashboard_id text not null references dashboards(id) on delete cascade,
  type text not null check (type in ('saved_view', 'today', 'upcoming', 'overdue', 'favorites', 'recent_activity', 'project_health')),
  title text,
  saved_view_id text references saved_views(id) on delete set null,
  config_json text not null default '{}',
  position_json text not null default '{}',
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create table daily_plans (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  plan_date text not null,
  created_at text not null,
  updated_at text not null,
  unique (workspace_id, plan_date)
);

create table daily_plan_items (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  daily_plan_id text not null references daily_plans(id) on delete cascade,
  item_type text not null check (item_type in ('task', 'item', 'list_item')),
  item_id text not null,
  lane text not null check (lane in ('today', 'tomorrow', 'backlog')),
  sort_order integer not null default 0,
  added_manually integer not null default 0 check (added_manually in (0, 1)),
  created_at text not null,
  updated_at text not null,
  unique (daily_plan_id, item_type, item_id, lane)
);

create table activity_log (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  actor_type text not null check (actor_type in ('local_user', 'system', 'importer')),
  action text not null,
  target_type text not null,
  target_id text not null,
  before_json text,
  after_json text,
  created_at text not null
);

create table search_index (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  target_type text not null check (target_type in ('workspace', 'container', 'item', 'list_item', 'attachment', 'saved_view', 'dashboard')),
  target_id text not null,
  title text not null default '',
  body text not null default '',
  tags text not null default '',
  category text,
  metadata_json text not null default '{}',
  is_deleted integer not null default 0 check (is_deleted in (0, 1)),
  updated_at text not null,
  unique (workspace_id, target_type, target_id)
);

create index idx_app_settings_workspace on app_settings(workspace_id);
create index idx_categories_workspace_deleted on categories(workspace_id, deleted_at);
create index idx_containers_workspace_type on containers(workspace_id, type);
create index idx_containers_workspace_status on containers(workspace_id, status, deleted_at);
create index idx_containers_category on containers(category_id);
create index idx_container_tabs_container on container_tabs(container_id, sort_order);
create unique index idx_container_tabs_one_default on container_tabs(container_id) where is_default = 1 and deleted_at is null;
create index idx_items_workspace_type on items(workspace_id, type);
create index idx_items_container_order on items(container_id, container_tab_id, sort_order);
create index idx_items_status_dates on items(workspace_id, status, deleted_at);
create index idx_items_category on items(category_id);
create index idx_task_details_due on task_details(workspace_id, due_at, task_status);
create index idx_task_details_status on task_details(workspace_id, task_status);
create index idx_list_items_list_order on list_items(list_id, sort_order);
create index idx_list_items_due on list_items(workspace_id, due_at, status);
create index idx_links_workspace_domain on links(workspace_id, domain);
create index idx_attachments_workspace_item on attachments(workspace_id, item_id);
create index idx_attachments_checksum on attachments(workspace_id, checksum);
create index idx_tags_workspace_deleted on tags(workspace_id, deleted_at);
create index idx_taggings_target on taggings(workspace_id, target_type, target_id);
create unique index idx_taggings_active_unique on taggings(tag_id, target_type, target_id) where deleted_at is null;
create index idx_relationships_source on relationships(workspace_id, source_type, source_id);
create index idx_relationships_target on relationships(workspace_id, target_type, target_id);
create index idx_saved_views_workspace_type on saved_views(workspace_id, type, deleted_at);
create index idx_dashboards_workspace_default on dashboards(workspace_id, is_default);
create unique index idx_dashboards_one_default on dashboards(workspace_id) where is_default = 1 and deleted_at is null;
create index idx_dashboard_widgets_dashboard_order on dashboard_widgets(dashboard_id, sort_order);
create index idx_daily_plan_items_plan_order on daily_plan_items(daily_plan_id, lane, sort_order);
create index idx_activity_log_workspace_created on activity_log(workspace_id, created_at);
create index idx_activity_log_target on activity_log(workspace_id, target_type, target_id);
create index idx_search_index_workspace_updated on search_index(workspace_id, updated_at);
create index idx_search_index_target on search_index(workspace_id, target_type, target_id);
`;
