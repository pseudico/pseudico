import { DashboardWidget } from "../DashboardWidget";

export type WebWidgetProps = {
  title?: string;
  url?: string | undefined;
  networkEnabled?: boolean;
};

export function WebWidget({ title = "Saved web link", url, networkEnabled = false }: WebWidgetProps): React.JSX.Element {
  const safeUrl = parseSafeUrl(url);
  const blockedReason = safeUrl === null
    ? "Add an http(s) URL in widget settings before opening this link."
    : networkEnabled
      ? null
      : "Offline mode: external web content is not embedded. Open the link explicitly when you are ready.";

  return (
    <DashboardWidget kind="web" title={title} description="Security-first web widget: no embedded remote content." emptyTitle="Web widget saved" emptyDescription={blockedReason ?? safeUrl ?? "Add a secure http(s) URL before opening this link."}>
      <div className="web-widget-state">
        {blockedReason === null ? <a className="secondary-button compact-button" href={safeUrl ?? undefined} target="_blank" rel="noreferrer">Open external link</a> : <p className="muted-text">{blockedReason}</p>}
      </div>
    </DashboardWidget>
  );
}

function parseSafeUrl(value: string | undefined): string | null {
  if (value === undefined || value.trim().length === 0) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

