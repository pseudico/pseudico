export type ParsedWikilink = {
  raw: string;
  title: string;
  start: number;
  end: number;
};

export function parseWikilinks(content: string): ParsedWikilink[] {
  const links: ParsedWikilink[] = [];
  const pattern = /\[\[([^\]\r\n]+)\]\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    const raw = match[0];
    const title = (match[1] ?? "").trim().replace(/\s+/g, " ");

    if (title.length === 0) {
      continue;
    }

    links.push({
      raw,
      title,
      start: match.index,
      end: match.index + raw.length
    });
  }

  return links;
}

export function parseUniqueWikilinkTitles(content: string): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];

  for (const link of parseWikilinks(content)) {
    const key = normalizeWikilinkTitle(link.title);

    if (!seen.has(key)) {
      seen.add(key);
      titles.push(link.title);
    }
  }

  return titles;
}

export function normalizeWikilinkTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}