export const workflowRunRollbackSql = `
alter table workflow_runs add column rollback_status text check (rollback_status is null or rollback_status in ('completed', 'partial', 'failed', 'not_available'));
alter table workflow_runs add column rollback_activity_ids_json text;
alter table workflow_runs add column rollback_error_message text;
alter table workflow_runs add column rollback_started_at text;
alter table workflow_runs add column rollback_completed_at text;
`;
