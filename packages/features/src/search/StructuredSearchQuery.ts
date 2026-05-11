import { isItemType, isTaskStatus } from "@local-work-os/core";
import type { SavedViewQuery, SavedViewQueryCondition } from "../savedViews";
import type { SearchResult, SearchResultKind } from "./SearchResultHydrator";

export type StructuredSearchTokenKind =
  | "type"
  | "tag"
  | "category"
  | "due"
  | "status"
  | "has"
  | "in"
  | "text";

export type StructuredSearchChip = {
  kind: StructuredSearchTokenKind;
  label: string;
  value: string;
};

export type StructuredSearchParseResult = {
  originalQuery: string;
  textQuery: string;
  chips: StructuredSearchChip[];
  savedViewQuery: SavedViewQuery;
  filters: {
    kinds?: SearchResultKind[];
    tags: string[];
    category?: string;
    due?: DueFilter;
    status?: string;
    hasFile: boolean;
    inProject?: string;
  };
};

export type DueFilter =
  | { operator: "before"; value: string }
  | { operator: "after"; value: string }
  | { operator: "on"; value: string }
  | { operator: "between"; from: string; to: string };

export type StructuredSearchSuggestion = {
  token: string;
  label: string;
  description: string;
};

const TYPE_KIND_MAP = new Map<string, SearchResultKind>([
  ["project", "project"],
  ["contact", "contact"],
  ["task", "task"],
  ["list", "list"],
  ["note", "note"],
  ["file", "file"],
  ["link", "link"],
  ["heading", "heading"],
  ["location", "location"],
  ["comment", "comment"],
  ["list_item", "list_item"],
  ["checklist", "list_item"]
]);

export class SearchQueryParser {
  parse(query: string, now: Date = new Date()): StructuredSearchParseResult {
    const words = tokenize(query);
    const text: string[] = [];
    const chips: StructuredSearchChip[] = [];
    const conditions: SavedViewQueryCondition[] = [];
    const filters: StructuredSearchParseResult["filters"] = {
      tags: [],
      hasFile: false
    };

    for (const word of words) {
      const token = parseToken(word);

      if (token === null) {
        text.push(word);
        continue;
      }

      if (token.key === "type") {
        const values = splitValues(token.value).map((value) => value.toLowerCase());
        const kinds = values.flatMap((value) => {
          const mapped = TYPE_KIND_MAP.get(value);
          return mapped === undefined ? [] : [mapped];
        });

        if (kinds.length === 0) {
          text.push(word);
          continue;
        }

        filters.kinds = [...new Set([...(filters.kinds ?? []), ...kinds])];
        chips.push({ kind: "type", label: "Type", value: kinds.join(", ") });
        addTypeConditions(kinds, conditions);
        continue;
      }

      if (token.key === "tag") {
        const tags = splitValues(token.value).map(normalizeSlug).filter(Boolean);
        if (tags.length === 0) {
          continue;
        }
        filters.tags.push(...tags);
        chips.push({ kind: "tag", label: "Tag", value: tags.join(", ") });
        conditions.push({ field: "tag", operator: tags.length === 1 ? "has" : "hasAny", value: tags.length === 1 ? tags[0]! : tags });
        continue;
      }

      if (token.key === "category") {
        const value = token.value.trim();
        if (value.length === 0) {
          continue;
        }
        filters.category = value;
        chips.push({ kind: "category", label: "Category", value });
        conditions.push({ field: "category", operator: "is", value });
        continue;
      }

      if (token.key === "due") {
        const due = parseDueFilter(token.value, now);
        if (due === null) {
          text.push(word);
          continue;
        }
        filters.due = due;
        chips.push({ kind: "due", label: "Due", value: token.value });
        conditions.push(dueToCondition(due));
        continue;
      }

      if (token.key === "status") {
        const status = token.value.trim().toLowerCase();
        if (status.length === 0) {
          continue;
        }
        filters.status = status;
        chips.push({ kind: "status", label: "Status", value: status });
        conditions.push(isTaskStatus(status) ? { field: "taskStatus", operator: "is", value: status } : { field: "status", operator: "is", value: status });
        continue;
      }

      if (token.key === "has") {
        const value = token.value.trim().toLowerCase();
        if (value !== "file" && value !== "files" && value !== "attachment") {
          text.push(word);
          continue;
        }
        filters.hasFile = true;
        chips.push({ kind: "has", label: "Has", value: "file" });
        conditions.push({ field: "attachment", operator: "has" });
        continue;
      }

      if (token.key === "in") {
        const [scope = "", ...rest] = token.value.split(":");
        if (scope.toLowerCase() !== "project" || rest.join(":").trim().length === 0) {
          text.push(word);
          continue;
        }
        const value = rest.join(":").trim();
        filters.inProject = value;
        chips.push({ kind: "in", label: "In project", value });
        conditions.push({ field: "containerType", operator: "is", value: "project" });
        conditions.push({ field: "text", operator: "contains", value });
        continue;
      }
    }

    const textQuery = text.join(" ").trim();
    if (textQuery.length > 0) {
      chips.push({ kind: "text", label: "Text", value: textQuery });
      conditions.push({ field: "text", operator: "contains", value: textQuery });
    }

    const targets = deriveTargets(filters);
    const savedViewQuery: SavedViewQuery = {
      version: 1,
      match: "all",
      conditions,
      ...(targets === undefined ? {} : { targets }),
      sort: [{ field: "updatedAt", direction: "desc" }]
    };

    return {
      originalQuery: query,
      textQuery,
      chips,
      filters: { ...filters, tags: [...new Set(filters.tags)] },
      savedViewQuery
    };
  }

  getSuggestions(query: string): StructuredSearchSuggestion[] {
    const active = query.split(/\s+/).at(-1)?.toLowerCase() ?? "";
    return STRUCTURED_SEARCH_SUGGESTIONS.filter((suggestion) =>
      suggestion.token.toLowerCase().startsWith(active)
    ).slice(0, 8);
  }
}

export const STRUCTURED_SEARCH_SUGGESTIONS: StructuredSearchSuggestion[] = [
  { token: "type:task", label: "Tasks", description: "Limit results to tasks." },
  { token: "type:note", label: "Notes", description: "Limit results to notes." },
  { token: "type:file", label: "Files", description: "Limit results to file attachments." },
  { token: "tag:call", label: "Tag", description: "Match a tag slug, e.g. tag:call." },
  { token: "category:work", label: "Category", description: "Match category name or slug." },
  { token: "due:<+7d", label: "Due soon", description: "Due before seven days from today." },
  { token: "status:open", label: "Status", description: "Match task or item status." },
  { token: "has:file", label: "Has file", description: "Show file results or items with attachments." },
  { token: "in:project:launch", label: "Project", description: "Find work in a project by title text." }
];

export function filterStructuredSearchResults(
  results: SearchResult[],
  parsed: StructuredSearchParseResult
): SearchResult[] {
  return results.filter((result) => {
    const filters = parsed.filters;
    if (filters.kinds !== undefined && !filters.kinds.includes(result.kind)) return false;
    if (filters.tags.length > 0 && !filters.tags.every((tag) => result.tags.includes(tag))) return false;
    if (filters.category !== undefined && (result.category ?? "").toLowerCase() !== filters.category.toLowerCase()) return false;
    if (filters.status !== undefined && !matchesStatus(result, filters.status)) return false;
    if (filters.due !== undefined && !matchesDue(result.dueAt, filters.due)) return false;
    if (filters.hasFile && result.kind !== "file") return false;
    if (filters.inProject !== undefined) {
      const needle = filters.inProject.toLowerCase();
      if (result.containerTitle?.toLowerCase().includes(needle) !== true) return false;
    }
    return true;
  });
}

function tokenize(query: string): string[] {
  return query.match(/"[^"]+"|'[^']+'|\S+/g)?.map((word) => stripQuotes(word.trim())).filter(Boolean) ?? [];
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseToken(word: string): { key: string; value: string } | null {
  const index = word.indexOf(":");
  if (index <= 0) return null;
  const key = word.slice(0, index).toLowerCase();
  if (!["type", "tag", "category", "due", "status", "has", "in"].includes(key)) return null;
  return { key, value: word.slice(index + 1) };
}

function splitValues(value: string): string[] {
  return value.split(",").map((entry) => entry.trim()).filter(Boolean);
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/^@/, "").replace(/\s+/g, "-");
}

function addTypeConditions(kinds: SearchResultKind[], conditions: SavedViewQueryCondition[]): void {
  const itemTypes = kinds.filter((kind) => isItemType(kind));
  const containerTypes = kinds.filter((kind) => ["project", "contact", "inbox"].includes(kind));
  if (itemTypes.length > 0) conditions.push({ field: "itemType", operator: itemTypes.length === 1 ? "is" : "in", value: itemTypes.length === 1 ? itemTypes[0]! : itemTypes });
  if (containerTypes.length > 0) conditions.push({ field: "containerType", operator: containerTypes.length === 1 ? "is" : "in", value: containerTypes.length === 1 ? containerTypes[0]! : containerTypes });
}

function deriveTargets(filters: StructuredSearchParseResult["filters"]): Array<"container" | "item"> | undefined {
  if (filters.kinds === undefined) return undefined;
  const targets = new Set<"container" | "item">();
  for (const kind of filters.kinds) {
    if (["project", "contact", "inbox"].includes(kind)) targets.add("container");
    else targets.add("item");
  }
  return [...targets];
}

function parseDueFilter(raw: string, now: Date): DueFilter | null {
  const value = raw.trim();
  if (value.length === 0) return null;
  if (value.includes("..")) {
    const [fromRaw, toRaw] = value.split("..");
    const from = parseDateOperand(fromRaw ?? "", now);
    const to = parseDateOperand(toRaw ?? "", now);
    return from === null || to === null ? null : { operator: "between", from, to };
  }
  const operator = value.startsWith("<") ? "before" : value.startsWith(">") ? "after" : "on";
  const operand = operator === "on" ? value : value.slice(1);
  const parsed = parseDateOperand(operand, now);
  return parsed === null ? null : { operator, value: parsed };
}

function parseDateOperand(raw: string, now: Date): string | null {
  const value = raw.trim().toLowerCase();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (value === "today") return toDateStart(base);
  if (value === "tomorrow") return toDateStart(addDays(base, 1));
  const rel = /^\+([0-9]+)d$/.exec(value);
  if (rel !== null) return toDateStart(addDays(base, Number(rel[1])));
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00.000Z`;
  return null;
}

function dueToCondition(due: DueFilter): Extract<SavedViewQueryCondition, { field: "dueDate" }> {
  if (due.operator === "between") return { field: "dueDate", operator: "between", value: { from: due.from, to: due.to } };
  return { field: "dueDate", operator: due.operator, value: due.value };
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toDateStart(date: Date): string {
  return date.toISOString().slice(0, 10) + "T00:00:00.000Z";
}

function matchesStatus(result: SearchResult, status: string): boolean {
  return result.taskStatus?.toLowerCase() === status || result.status?.toLowerCase() === status;
}

function matchesDue(dueAt: string | null, filter: DueFilter): boolean {
  if (dueAt === null) return false;
  if (filter.operator === "between") return dueAt >= filter.from && dueAt <= filter.to;
  if (filter.operator === "before") return dueAt < filter.value;
  if (filter.operator === "after") return dueAt > filter.value;
  return dueAt.slice(0, 10) === filter.value.slice(0, 10);
}
