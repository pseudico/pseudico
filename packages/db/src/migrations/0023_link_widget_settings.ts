export const linkWidgetSettingsSql = `
alter table links add column render_as_widget integer not null default 0 check (render_as_widget in (0, 1));
alter table links add column widget_height integer not null default 360 check (widget_height >= 180 and widget_height <= 720);
alter table links add column widget_warning_accepted_at text;
`;
