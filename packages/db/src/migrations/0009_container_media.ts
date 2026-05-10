export const containerMediaSql = `
create table container_media (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  container_id text not null references containers(id) on delete cascade,
  attachment_id text not null references attachments(id) on delete cascade,
  role text not null check (role in ('project_banner', 'contact_avatar')),
  thumbnail_storage_path text,
  alt_text text,
  created_at text not null,
  updated_at text not null,
  deleted_at text
);

create index idx_container_media_container on container_media(container_id, role, deleted_at);
create index idx_container_media_attachment on container_media(attachment_id);
create unique index idx_container_media_active_role on container_media(container_id, role) where deleted_at is null;
`;
