export const containerTemplatesSql = `
create table templates_next (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  kind text not null default 'list' check (kind in ('list', 'project', 'contact')),
  name text not null,
  description text,
  source_type text not null default 'list' check (source_type in ('list', 'project', 'contact')),
  source_id text,
  template_json text not null,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

insert into templates_next (
  id,
  workspace_id,
  kind,
  name,
  description,
  source_type,
  source_id,
  template_json,
  created_at,
  updated_at,
  deleted_at
)
select
  id,
  workspace_id,
  kind,
  name,
  description,
  source_type,
  source_id,
  template_json,
  created_at,
  updated_at,
  deleted_at
from templates;

drop table templates;
alter table templates_next rename to templates;

create index idx_templates_workspace_kind on templates(workspace_id, kind, deleted_at, updated_at);
create index idx_templates_source on templates(workspace_id, source_type, source_id);
`;
