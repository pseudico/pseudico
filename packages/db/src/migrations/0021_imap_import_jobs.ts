export const imapImportJobsSql = `
create table imap_import_jobs (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  account_key text not null,
  mailbox text not null,
  filter_json text not null default '{}',
  status text not null check (status in ('running', 'completed', 'failed')),
  started_at text not null,
  finished_at text,
  imported_count integer not null default 0,
  skipped_duplicate_count integer not null default 0,
  error_message text,
  created_at text not null,
  updated_at text not null
);

create table imap_imported_messages (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  account_key text not null,
  mailbox text not null,
  message_uid text not null,
  message_id text,
  item_id text references items(id) on delete set null,
  imported_at text not null,
  created_at text not null,
  updated_at text not null,
  unique (workspace_id, account_key, mailbox, message_uid)
);

create unique index idx_imap_imported_messages_message_id
  on imap_imported_messages(workspace_id, account_key, mailbox, message_id)
  where message_id is not null;
create index idx_imap_import_jobs_workspace on imap_import_jobs(workspace_id, created_at);
create index idx_imap_imported_messages_workspace on imap_imported_messages(workspace_id, imported_at);
`;
