import type { ListItemStatus } from "@local-work-os/core";

export type ParsedBulkListItem = {
  title: string;
  status: ListItemStatus;
  depth: number;
};

const CHECKED_PATTERN = /^[-*]?\s*\[[xX]\]\s+/;
const UNCHECKED_PATTERN = /^[-*]?\s*\[\s\]\s+/;
const BULLET_PATTERN = /^[-*]\s+/;
const NUMBERED_PATTERN = /^\d+[.)]\s+/;

export function parseBulkListItems(text: string): ParsedBulkListItem[] {
  return text
    .split(/\r?\n/)
    .map(parseLine)
    .filter((item): item is ParsedBulkListItem => item !== null);
}

function parseLine(line: string): ParsedBulkListItem | null {
  const leadingWhitespace = line.match(/^[\t ]*/)?.[0] ?? "";
  const depth = Math.floor(countIndentColumns(leadingWhitespace) / 2);
  const trimmed = line.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const status: ListItemStatus = CHECKED_PATTERN.test(trimmed) ? "done" : "open";
  const title = trimmed
    .replace(CHECKED_PATTERN, "")
    .replace(UNCHECKED_PATTERN, "")
    .replace(BULLET_PATTERN, "")
    .replace(NUMBERED_PATTERN, "")
    .trim();

  if (title.length === 0) {
    return null;
  }

  return { title, status, depth };
}

function countIndentColumns(value: string): number {
  return Array.from(value).reduce(
    (columns, character) => columns + (character === "\t" ? 2 : 1),
    0
  );
}
