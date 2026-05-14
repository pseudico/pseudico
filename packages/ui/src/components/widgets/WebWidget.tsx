import { DashboardWidget } from "../DashboardWidget";
import { validateLinkWidgetEmbedUrl } from "@local-work-os/core";

export type WebWidgetProps = {
  height?: number;
  title?: string;
  url?: string | undefined;
  networkEnabled?: boolean;
  onOpenExternal?: () => void;
};

export function WebWidget({
  height = 360,
  title = "Saved web link",
  url,
  networkEnabled = false,
  onOpenExternal
}: WebWidgetProps): React.JSX.Element {
  const validation = validateLinkWidgetEmbedUrl(url);
  const blockedReason = !validation.ok
    ? validation.reason
    : networkEnabled
      ? null
      : "Web widgets are disabled in Privacy & Network settings. Enable them only when you are ready to load remote content.";
  const safeUrl = validation.ok ? validation.normalizedUrl : null;

  return (
    <DashboardWidget
      kind="web"
      title={title}
      description="Sandboxed web widget: remote content is isolated and cannot navigate the app shell."
      emptyTitle="Web widget saved"
      emptyDescription={blockedReason ?? safeUrl ?? "Add a secure HTTP(S) URL before opening this link."}
    >
      <div className="web-widget-state">
        {blockedReason === null && safeUrl !== null ? (
          <>
            <iframe
              className="web-widget-frame"
              height={height}
              loading="lazy"
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              src={safeUrl}
              title={`${title} web widget`}
            />
            <p className="muted-text">
              Some sites block embedded display. If the widget stays blank, open
              it externally.
            </p>
          </>
        ) : (
          <p className="muted-text">{blockedReason}</p>
        )}
        {safeUrl === null ? null : onOpenExternal === undefined ? (
          <a
            className="secondary-button compact-button"
            href={safeUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open external link
          </a>
        ) : (
          <button
            className="secondary-button compact-button"
            type="button"
            onClick={onOpenExternal}
          >
            Open external link
          </button>
        )}
      </div>
    </DashboardWidget>
  );
}
