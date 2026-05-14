import type { ActivityActorType } from "@local-work-os/core";
import type { LinkWithItemRecord } from "@local-work-os/db";
import type { NetworkFeatureId } from "../privacy";
import { type LinkMutationResult, type LinkService } from "./LinkService";

export type LinkMetadataFetcherInit = {
  redirect: "manual";
  signal: AbortSignal;
};

export type LinkMetadataFetchResponse = {
  ok: boolean;
  status: number;
  url?: string;
  headers: {
    get(name: string): string | null;
  };
  text(): Promise<string>;
};

export type LinkMetadataFetcher = (
  url: string,
  init: LinkMetadataFetcherInit
) => Promise<LinkMetadataFetchResponse>;

export type LinkMetadataNetworkGuard = {
  assertFeatureAllowed(
    workspaceId: string,
    featureId: NetworkFeatureId
  ): void;
};

export type FetchedLinkMetadata = {
  title: string | null;
  description: string | null;
  faviconUrl: string | null;
  previewImageUrl: string | null;
};

export type FetchAndApplyLinkMetadataInput = {
  itemId: string;
  workspaceId: string;
  actorType?: ActivityActorType;
};

export type FetchAndApplyLinkMetadataResult = {
  before: LinkWithItemRecord;
  metadata: FetchedLinkMetadata;
  link: LinkMutationResult;
  sourceUrl: string;
};

export type LinkMetadataServiceOptions = {
  fetcher: LinkMetadataFetcher;
  linkService: Pick<
    LinkService,
    "getLinkByItemId" | "normaliseUrl" | "updateLink"
  >;
  networkFeatureGuard: LinkMetadataNetworkGuard;
  timeoutMs?: number;
  maxHtmlBytes?: number;
};

const DEFAULT_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_HTML_BYTES = 512 * 1024;

export class LinkMetadataService {
  readonly module = "linkMetadata";

  private readonly fetcher: LinkMetadataFetcher;
  private readonly linkService: Pick<
    LinkService,
    "getLinkByItemId" | "normaliseUrl" | "updateLink"
  >;
  private readonly maxHtmlBytes: number;
  private readonly networkFeatureGuard: LinkMetadataNetworkGuard;
  private readonly timeoutMs: number;

  constructor(options: LinkMetadataServiceOptions) {
    this.fetcher = options.fetcher;
    this.linkService = options.linkService;
    this.networkFeatureGuard = options.networkFeatureGuard;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxHtmlBytes = options.maxHtmlBytes ?? DEFAULT_MAX_HTML_BYTES;
  }

  async fetchAndApply(
    input: FetchAndApplyLinkMetadataInput
  ): Promise<FetchAndApplyLinkMetadataResult> {
    validateNonEmptyString(input.workspaceId, "workspaceId");
    validateNonEmptyString(input.itemId, "itemId");
    this.networkFeatureGuard.assertFeatureAllowed(
      input.workspaceId,
      "metadataFetch"
    );

    const before = this.linkService.getLinkByItemId(input.itemId);

    if (before === null) {
      throw new Error(`Link was not found: ${input.itemId}.`);
    }

    if (before.item.workspaceId !== input.workspaceId) {
      throw new Error("Link workspaceId must match the current workspace.");
    }

    const sourceUrl = assertFetchableLinkMetadataUrl(
      this.linkService.normaliseUrl(before.link.normalizedUrl)
    );
    const html = await this.fetchHtml(sourceUrl);
    const metadata = parseLinkMetadataHtml(html, sourceUrl);
    const patch = toUpdatePatch(metadata);

    if (Object.keys(patch).length === 0) {
      throw new Error("No supported link metadata was found.");
    }

    const link = await this.linkService.updateLink({
      itemId: input.itemId,
      ...(input.actorType === undefined ? {} : { actorType: input.actorType }),
      ...patch
    });

    return {
      before,
      metadata,
      link,
      sourceUrl
    };
  }

  private async fetchHtml(sourceUrl: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetcher(sourceUrl, {
        redirect: "manual",
        signal: controller.signal
      });

      if (response.url !== undefined) {
        assertFetchableLinkMetadataUrl(response.url);
      }

      if (!response.ok) {
        if (response.status >= 300 && response.status < 400) {
          throw new Error("Metadata fetch redirects are not followed.");
        }

        throw new Error(
          `Metadata fetch failed with HTTP status ${response.status}.`
        );
      }

      const contentLength = Number(response.headers.get("content-length"));

      if (
        Number.isFinite(contentLength) &&
        contentLength > this.maxHtmlBytes
      ) {
        throw new Error("Metadata response is too large.");
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (
        contentType.trim().length > 0 &&
        !contentType.toLowerCase().includes("text/html") &&
        !contentType.toLowerCase().includes("application/xhtml+xml")
      ) {
        throw new Error("Metadata response must be an HTML document.");
      }

      return (await response.text()).slice(0, this.maxHtmlBytes);
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error("Metadata fetch timed out.");
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function assertFetchableLinkMetadataUrl(url: string): string {
  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Metadata fetch URL must be valid.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Metadata fetch URL must use HTTP or HTTPS.");
  }

  if (parsed.username.length > 0 || parsed.password.length > 0) {
    throw new Error("Metadata fetch URL must not include credentials.");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isBlockedHostname(hostname)) {
    throw new Error(
      "Metadata fetch URL must not target localhost or private network addresses."
    );
  }

  return parsed.href;
}

export function parseLinkMetadataHtml(
  html: string,
  sourceUrl: string
): FetchedLinkMetadata {
  const source = new URL(sourceUrl);
  const title =
    findMetaContent(html, ["property", "og:title"]) ??
    findMetaContent(html, ["name", "twitter:title"]) ??
    findTitle(html);
  const description =
    findMetaContent(html, ["name", "description"]) ??
    findMetaContent(html, ["property", "og:description"]) ??
    findMetaContent(html, ["name", "twitter:description"]);
  const previewImageUrl = resolveOptionalMetadataUrl(
    findMetaContent(html, ["property", "og:image"]) ??
      findMetaContent(html, ["name", "twitter:image"]),
    source
  );
  const faviconUrl = resolveOptionalMetadataUrl(findIconHref(html), source);

  return {
    title: clampMetadataText(title, 200),
    description: clampMetadataText(description, 500),
    faviconUrl,
    previewImageUrl
  };
}

function toUpdatePatch(
  metadata: FetchedLinkMetadata
): {
  title?: string | null;
  description?: string | null;
  faviconPath?: string | null;
  previewImagePath?: string | null;
} {
  return {
    ...(metadata.title === null ? {} : { title: metadata.title }),
    ...(metadata.description === null
      ? {}
      : { description: metadata.description }),
    ...(metadata.faviconUrl === null ? {} : { faviconPath: metadata.faviconUrl }),
    ...(metadata.previewImageUrl === null
      ? {}
      : { previewImagePath: metadata.previewImageUrl })
  };
}

function findTitle(html: string): string | null {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return match?.[1] === undefined ? null : decodeHtml(match[1]);
}

function findMetaContent(
  html: string,
  selector: readonly [attribute: string, value: string]
): string | null {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = parseAttributes(match[0]);
    const selectorValue = attrs[selector[0]]?.toLowerCase();

    if (selectorValue === selector[1].toLowerCase()) {
      return attrs.content === undefined ? null : decodeHtml(attrs.content);
    }
  }

  return null;
}

function findIconHref(html: string): string | null {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = parseAttributes(match[0]);
    const rel = attrs.rel?.toLowerCase() ?? "";

    if (
      rel
        .split(/\s+/)
        .some((token) => token === "icon" || token === "shortcut icon" || token === "apple-touch-icon")
    ) {
      return attrs.href === undefined ? null : decodeHtml(attrs.href);
    }
  }

  return null;
}

function parseAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};

  for (const match of tag.matchAll(
    /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g
  )) {
    const key = match[1]?.toLowerCase();

    if (key !== undefined) {
      attrs[key] = match[2] ?? match[3] ?? match[4] ?? "";
    }
  }

  return attrs;
}

function resolveOptionalMetadataUrl(
  value: string | null,
  source: URL
): string | null {
  const trimmed = value?.trim();

  if (trimmed === undefined || trimmed.length === 0) {
    return null;
  }

  try {
    return assertFetchableLinkMetadataUrl(new URL(trimmed, source).href);
  } catch {
    return null;
  }
}

function clampMetadataText(value: string | null, maxLength: number): string | null {
  const trimmed = value?.replace(/\s+/g, " ").trim();

  if (trimmed === undefined || trimmed.length === 0) {
    return null;
  }

  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'");
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.replace(/^\[/, "").replace(/\]$/, "");

  if (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "0.0.0.0" ||
    normalized === "::" ||
    normalized === "::1"
  ) {
    return true;
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(normalized)) {
    const parts = normalized.split(".").map((part) => Number(part));
    const [first = 0, second = 0] = parts;

    return (
      parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255) ||
      first === 0 ||
      first === 10 ||
      first === 127 ||
      (first === 100 && second >= 64 && second <= 127) ||
      (first === 169 && second === 254) ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  if (normalized.includes(":")) {
    return (
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe80") ||
      normalized === "::ffff:127.0.0.1"
    );
  }

  return false;
}

function validateNonEmptyString(value: string, fieldName: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}
