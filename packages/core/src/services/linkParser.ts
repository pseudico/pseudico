import { isSupportedLinkProtocol } from "../entities/Link";

export type ExternalLinkKind = "bare" | "markdown";

export type ExternalLinkToken = {
  raw: string;
  label: string;
  url: string;
  normalizedUrl: string;
  kind: ExternalLinkKind;
  start: number;
  end: number;
};

const MARKDOWN_LINK_PATTERN = /\[([^\]\n]{1,240})\]\(([^)\s]+)\)/g;
const BARE_URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>{}\]"']+/gi;

export function parseExternalLinks(content: string): ExternalLinkToken[] {
  const markdownLinks = parseMarkdownLinks(content);
  const occupiedRanges = markdownLinks.map((link) => ({
    start: link.start,
    end: link.end
  }));
  const bareLinks = parseBareLinks(content, occupiedRanges);

  return [...markdownLinks, ...bareLinks].sort((left, right) => left.start - right.start);
}

export function normalizeExternalLinkUrl(url: string): string | null {
  const trimmed = url.trim();

  if (trimmed.length === 0 || /\s/.test(trimmed)) {
    return null;
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let parsed: URL;

  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  if (!isSupportedLinkProtocol(parsed.protocol)) {
    return null;
  }

  if (parsed.hostname.trim().length === 0 || !parsed.hostname.includes(".")) {
    return null;
  }

  parsed.protocol = parsed.protocol.toLowerCase();
  parsed.hostname = parsed.hostname.toLowerCase();

  return parsed.href;
}

function parseMarkdownLinks(content: string): ExternalLinkToken[] {
  const links: ExternalLinkToken[] = [];

  for (const match of content.matchAll(MARKDOWN_LINK_PATTERN)) {
    const raw = match[0];
    const label = sanitizeExternalLinkLabel(match[1] ?? "");
    const url = match[2] ?? "";
    const normalizedUrl = normalizeExternalLinkUrl(url);
    const start = match.index ?? 0;

    if (label.length === 0 || normalizedUrl === null || isImageMarkdown(content, start)) {
      continue;
    }

    links.push({
      raw,
      label,
      url,
      normalizedUrl,
      kind: "markdown",
      start,
      end: start + raw.length
    });
  }

  return links;
}

function parseBareLinks(
  content: string,
  occupiedRanges: readonly { start: number; end: number }[]
): ExternalLinkToken[] {
  const links: ExternalLinkToken[] = [];

  for (const match of content.matchAll(BARE_URL_PATTERN)) {
    const matched = match[0];
    const start = match.index ?? 0;

    if (rangeOverlaps(start, start + matched.length, occupiedRanges)) {
      continue;
    }

    const trimmed = trimBareUrlPunctuation(matched);
    const normalizedUrl = normalizeExternalLinkUrl(trimmed.url);

    if (normalizedUrl === null) {
      continue;
    }

    links.push({
      raw: trimmed.url,
      label: trimmed.url,
      url: trimmed.url,
      normalizedUrl,
      kind: "bare",
      start,
      end: start + trimmed.url.length
    });
  }

  return links;
}

function sanitizeExternalLinkLabel(label: string): string {
  return label.replace(/\s+/g, " ").trim();
}

function isImageMarkdown(content: string, start: number): boolean {
  return start > 0 && content[start - 1] === "!";
}

function rangeOverlaps(
  start: number,
  end: number,
  ranges: readonly { start: number; end: number }[]
): boolean {
  return ranges.some((range) => start < range.end && end > range.start);
}

function trimBareUrlPunctuation(url: string): { url: string } {
  let trimmed = url;

  while (/[.,!?;:]$/.test(trimmed)) {
    trimmed = trimmed.slice(0, -1);
  }

  while (trimmed.endsWith(")") && countCharacter(trimmed, ")") > countCharacter(trimmed, "(")) {
    trimmed = trimmed.slice(0, -1);
  }

  return { url: trimmed };
}

function countCharacter(value: string, character: string): number {
  return [...value].filter((current) => current === character).length;
}
