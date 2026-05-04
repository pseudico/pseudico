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
  createdAt: string;
  updatedAt: string;
};

export type LinkProtocol = "http:" | "https:";

export function isSupportedLinkProtocol(
  protocol: string
): protocol is LinkProtocol {
  return protocol === "http:" || protocol === "https:";
}
