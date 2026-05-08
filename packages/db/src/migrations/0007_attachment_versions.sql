create table if not exists attachment_versions (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  attachment_id text not null references attachments(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  original_name text not null,
  stored_name text not null,
  size_bytes integer not null check (size_bytes >= 0),
  checksum text not null,
  storage_path text not null,
  note text,
  created_at text not null,
  deleted_at text,
  unique (attachment_id, version_number),
  unique (workspace_id, storage_path)
);

create index if not exists idx_attachment_versions_attachment
  on attachment_versions(attachment_id, version_number);

create index if not exists idx_attachment_versions_workspace
  on attachment_versions(workspace_id, created_at);
