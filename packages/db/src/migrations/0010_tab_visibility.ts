export const tabVisibilitySql = `
alter table container_tabs add column hidden_at text;

create index idx_container_tabs_visibility on container_tabs(container_id, hidden_at, archived_at, deleted_at, sort_order);
`;
