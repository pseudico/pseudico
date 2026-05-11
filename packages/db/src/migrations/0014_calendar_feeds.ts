export const calendarFeedsSql = `
create table calendar_sources (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  source_type text not null check (source_type in ('file', 'network')),
  source_path text,
  source_url text,
  network_enabled integer not null default 0 check (network_enabled in (0, 1)),
  read_only integer not null default 1 check (read_only in (0, 1)),
  imported_at text not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  unique (workspace_id, name)
);

create table calendar_events (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  source_id text not null references calendar_sources(id) on delete cascade,
  external_uid text not null,
  title text not null,
  description text,
  location text,
  start_at text not null,
  end_at text not null,
  all_day integer not null default 0 check (all_day in (0, 1)),
  timezone text,
  raw_json text not null default '{}',
  created_at text not null,
  updated_at text not null,
  deleted_at text,
  unique (source_id, external_uid)
);

create index idx_calendar_sources_workspace on calendar_sources(workspace_id, deleted_at);
create index idx_calendar_events_workspace_range on calendar_events(workspace_id, start_at, end_at);
create index idx_calendar_events_source on calendar_events(source_id);
`;
