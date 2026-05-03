export type ParsedInlineTag = {
  raw: string;
  name: string;
  slug: string;
  start: number;
  end: number;
};

const INLINE_TAG_PATTERN = /(?:^|[^A-Za-z0-9_])@([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)(?![A-Za-z0-9_-])/g;

export function parseInlineTags(input: string | string[]): ParsedInlineTag[] {
  const source = Array.isArray(input) ? input.join("\n") : input;
  const parsed: ParsedInlineTag[] = [];
  const seen = new Set<string>();

  for (const match of source.matchAll(INLINE_TAG_PATTERN)) {
    const token = match[1];

    if (token === undefined || match.index === undefined) {
      continue;
    }

    const slug = slugifyTagName(token);

    if (slug === null || seen.has(slug)) {
      continue;
    }

    const atOffset = match[0].lastIndexOf("@");
    const start = match.index + atOffset;
    seen.add(slug);
    parsed.push({
      raw: `@${token}`,
      name: slug,
      slug,
      start,
      end: start + token.length + 1
    });
  }

  return parsed;
}

export function parseInlineTagSlugs(input: string | string[]): string[] {
  return parseInlineTags(input).map((tag) => tag.slug);
}

export function normalizeTagName(name: string): string {
  const withoutPrefix = name.trim().replace(/^@+/, "");
  const normalized = withoutPrefix.replace(/\s+/g, "-").replace(/-+/g, "-");

  if (normalized.length === 0) {
    throw new Error("Tag name must be a non-empty string.");
  }

  const slug = slugifyTagName(normalized);

  if (slug === null) {
    throw new Error("Tag name must contain only letters, numbers, and hyphens.");
  }

  return normalized;
}

export function slugifyTagName(name: string): string | null {
  const slug = name
    .trim()
    .replace(/^@+/, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
    return null;
  }

  return slug;
}
