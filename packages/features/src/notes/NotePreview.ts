const DEFAULT_PREVIEW_LENGTH = 160;
const INLINE_TAG_PATTERN = /(?:^|[^A-Za-z0-9_])@([A-Za-z0-9][A-Za-z0-9_-]*)/g;

export type GenerateNotePreviewOptions = {
  maxLength?: number;
};

export function generateNotePreview(
  content: string,
  options: GenerateNotePreviewOptions = {}
): string | null {
  const maxLength = options.maxLength ?? DEFAULT_PREVIEW_LENGTH;

  if (!Number.isInteger(maxLength) || maxLength < 4) {
    throw new Error("maxLength must be an integer greater than or equal to 4.");
  }

  const preview = stripMarkdown(content).replace(/\s+/g, " ").trim();

  if (preview.length === 0) {
    return null;
  }

  if (preview.length <= maxLength) {
    return preview;
  }

  return `${preview.slice(0, maxLength - 3).trimEnd()}...`;
}

export function extractInlineNoteTags(
  content: string | string[]
): string[] {
  const source = Array.isArray(content) ? content.join("\n") : content;
  const tags: string[] = [];
  const seen = new Set<string>();

  for (const match of source.matchAll(INLINE_TAG_PATTERN)) {
    const tag = match[1]?.toLowerCase();

    if (tag !== undefined && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }

  return tags;
}

function stripMarkdown(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[\s>]*[-*+]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^[\s>]*[-*+]\s+/gm, "")
    .replace(/^[\s>]*\d+[.)]\s+/gm, "")
    .replace(/^>\s?/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_~#]/g, " ");
}
