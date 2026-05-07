export const contactFieldsSql = `
create table contact_fields (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  container_id text not null references containers(id) on delete cascade,
  label text not null,
  value text not null,
  type text not null default 'text' check (type in ('text', 'email', 'phone', 'website', 'address', 'date', 'custom')),
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create index idx_contact_fields_container_order on contact_fields(workspace_id, container_id, deleted_at, sort_order);
create index idx_contact_fields_workspace_deleted on contact_fields(workspace_id, deleted_at);
`;
