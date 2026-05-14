export type LinkRecord = {
  itemId: string;
  workspaceId: string;
  url: string;
  normalizedUrl: string;
  title: string | null;
  description: string | null;
  domain: string | null;
  faviconPath: string | null;
  previewImagePath: string | null;
  renderAsWidget: boolean;
  widgetHeight: number;
  widgetWarningAcceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LinkProtocol = "http:" | "https:";

export const DEFAULT_LINK_WIDGET_HEIGHT = 360;
export const MIN_LINK_WIDGET_HEIGHT = 180;
export const MAX_LINK_WIDGET_HEIGHT = 720;

export function isSupportedLinkProtocol(
  protocol: string
): protocol is LinkProtocol {
  return protocol === "http:" || protocol === "https:";
}

export type LinkWidgetUrlValidationResult =
  | {
      ok: true;
      normalizedUrl: string;
      hostname: string;
    }
  | {
      ok: false;
      reason: string;
    };

export function normalizeLinkWidgetHeight(height: number): number {
  if (!Number.isInteger(height)) {
    throw new Error("widgetHeight must be an integer.");
  }

  if (height < MIN_LINK_WIDGET_HEIGHT || height > MAX_LINK_WIDGET_HEIGHT) {
    throw new Error(
      `widgetHeight must be between ${MIN_LINK_WIDGET_HEIGHT} and ${MAX_LINK_WIDGET_HEIGHT}.`
    );
  }

  return height;
}

export function validateLinkWidgetEmbedUrl(
  value: string | null | undefined
): LinkWidgetUrlValidationResult {
  if (value === undefined || value === null || value.trim().length === 0) {
    return {
      ok: false,
      reason: "Add an HTTP(S) URL before enabling a web widget."
    };
  }

  let parsed: URL;

  try {
    parsed = new URL(value.trim());
  } catch {
    return {
      ok: false,
      reason: "Web widgets require an absolute HTTP(S) URL."
    };
  }

  if (!isSupportedLinkProtocol(parsed.protocol)) {
    return {
      ok: false,
      reason: "Web widgets can only load HTTP or HTTPS URLs."
    };
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return {
      ok: false,
      reason: "Web widget URLs must not include credentials."
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isBlockedWidgetHostname(hostname)) {
    return {
      ok: false,
      reason: "Web widgets cannot target localhost or private network addresses."
    };
  }

  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = hostname;

  return {
    ok: true,
    normalizedUrl: parsed.href,
    hostname
  };
}

function isBlockedWidgetHostname(hostname: string): boolean {
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    (hostname.includes(":") && (hostname.startsWith("fc") || hostname.startsWith("fd")))
  ) {
    return true;
  }

  if (/^127\./.test(hostname) || /^10\./.test(hostname) || /^192\.168\./.test(hostname)) {
    return true;
  }

  const private172 = /^172\.(\d{1,2})\./.exec(hostname);

  if (private172 !== null) {
    const secondOctet = Number(private172[1]);
    return secondOctet >= 16 && secondOctet <= 31;
  }

  return false;
}
