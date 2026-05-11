export const commentsSql = `
create table if not exists comments (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  target_type text not null,
  target_id text not null,
  body text not null,
  author_label text,
  sort_order integer not null default 0,
  created_at text not null,
  updated_at text not null,
  edited_at text,
  deleted_at text,
  constraint ck_comments_target_type check (target_type in ('container', 'item', 'list_item')),
  constraint ck_comments_sort_order check (sort_order >= 0)
);

create index if not exists idx_comments_target_order
  on comments(workspace_id, target_type, target_id, deleted_at, sort_order);

create index if not exists idx_comments_workspace_updated
  on comments(workspace_id, updated_at);
`;
