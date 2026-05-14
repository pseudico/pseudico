create table location_details (
  item_id text primary key references items(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  address text,
  latitude real check (latitude is null or (latitude >= -90 and latitude <= 90)),
  longitude real check (longitude is null or (longitude >= -180 and longitude <= 180)),
  viewport_center_lat real check (viewport_center_lat is null or (viewport_center_lat >= -90 and viewport_center_lat <= 90)),
  viewport_center_lng real check (viewport_center_lng is null or (viewport_center_lng >= -180 and viewport_center_lng <= 180)),
  viewport_zoom integer not null default 14 check (viewport_zoom >= 1 and viewport_zoom <= 20),
  created_at text not null,
  updated_at text not null,
  check (address is not null or (latitude is not null and longitude is not null))
);

create index idx_location_details_workspace on location_details(workspace_id);
