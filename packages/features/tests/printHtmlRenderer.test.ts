import { describe, expect, it } from "vitest";
import { PrintHtmlRenderer, type PrintableItem } from "../src";

const baseItem = {
  id: "item_1",
  workspaceId: "workspace_1",
  containerId: "container_1",
  containerTabId: null,
  type: "note",
  title: "Launch note",
  body: "Summary body",
  categoryId: null,
  status: "active",
  sortOrder: 100,
  pinned: false,
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
  completedAt: null,
  archivedAt: null,
  deletedAt: null
};

describe("PrintHtmlRenderer", () => {
  it("renders a stable print-safe HTML document for selected content", () => {
    const html = new PrintHtmlRenderer().render({
      title: "Selected work",
      subtitle: "Personal Work",
      sourceLabel: "2 selected items",
      generatedAt: "2026-05-02T01:02:03.000Z",
      items: [
        {
          item: baseItem,
          tags: ["launch"],
          note: {
            itemId: "item_1",
            workspaceId: "workspace_1",
            content: "# Plan\n- Confirm venue\n- Email client",
            format: "markdown",
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z"
          }
        },
        {
          item: {
            ...baseItem,
            id: "item_2",
            type: "link",
            title: "Reference link"
          },
          tags: [],
          link: {
            itemId: "item_2",
            workspaceId: "workspace_1",
            url: "https://example.test/reference",
            normalizedUrl: "https://example.test/reference",
            title: "Reference",
            description: "Useful background",
            domain: "example.test",
            faviconPath: null,
            previewImagePath: null,
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z"
          }
        }
      ] satisfies PrintableItem[]
    });

    expect(compact(html)).toMatchInlineSnapshot(`"<!doctype html> <html lang="en"> <head> <meta charset="utf-8"> <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:"> <title>Selected work</title> <style> :root { color-scheme: light; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; } body { margin: 0; color: #25231f; background: #fff; } main { max-width: 840px; margin: 0 auto; padding: 32px; } header.print-header { border-bottom: 2px solid #dfddd4; margin-bottom: 24px; padding-bottom: 16px; } .eyebrow { color: #6d6a62; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; } h1 { margin: 4px 0 8px; font-size: 30px; } h2 { border-bottom: 1px solid #ebe9e1; margin: 22px 0 10px; padding-bottom: 6px; font-size: 20px; } h3 { margin: 14px 0 8px; font-size: 16px; } article { break-inside: avoid; margin-bottom: 22px; } dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 12px; margin: 10px 0; } dt { color: #6d6a62; font-weight: 700; } dd { margin: 0; } .markdown, .body { white-space: normal; } .markdown p, .body p { margin: 8px 0; } .markdown ul { margin: 8px 0 8px 22px; padding: 0; } .tag-list { color: #245c55; } .list-row { margin-left: calc(var(--depth, 0) * 18px); } .empty-state { color: #6d6a62; font-style: italic; } @media print { main { padding: 16mm; } button { display: none; } } </style> </head> <body> <main> <header class="print-header"> <p class="eyebrow">Local Work OS print/PDF</p> <h1>Selected work</h1> <p>Personal Work · 2 selected items · Generated 2026-05-02T01:02:03.000Z</p> </header> <article data-item-id="item_1" data-item-type="note"> <h2>Launch note</h2> <dl><dt>Type</dt><dd>note</dd><dt>Status</dt><dd>active</dd><dt>Created</dt><dd>2026-05-01T00:00:00.000Z</dd><dt>Updated</dt><dd>2026-05-01T00:00:00.000Z</dd></dl> <p class="tag-list">@launch</p> <section class="body"><h3>Summary</h3><p>Summary body</p></section> <section class="markdown"><h3>Note</h3><h3>Plan</h3><ul><li>Confirm venue</li><li>Email client</li></ul></section> </article> <article data-item-id="item_2" data-item-type="link"> <h2>Reference link</h2> <dl><dt>Type</dt><dd>link</dd><dt>Status</dt><dd>active</dd><dt>Created</dt><dd>2026-05-01T00:00:00.000Z</dd><dt>Updated</dt><dd>2026-05-01T00:00:00.000Z</dd></dl> <section class="body"><h3>Summary</h3><p>Summary body</p></section> <section><h3>Link</h3><dl><dt>URL</dt><dd>https://example.test/reference</dd><dt>Description</dt><dd>Useful background</dd></dl></section> </article> </main> </body> </html>"`);
  });

  it("escapes note Markdown instead of allowing active HTML", () => {
    const html = new PrintHtmlRenderer().render({
      title: "Unsafe note",
      subtitle: "Personal Work",
      sourceLabel: "1 selected item",
      generatedAt: "2026-05-02T01:02:03.000Z",
      items: [
        {
          item: baseItem,
          tags: [],
          note: {
            itemId: "item_1",
            workspaceId: "workspace_1",
            content: "<script>alert(1)</script>\n[jump](javascript:alert(1))",
            format: "markdown",
            createdAt: "2026-05-01T00:00:00.000Z",
            updatedAt: "2026-05-01T00:00:00.000Z"
          }
        }
      ] satisfies PrintableItem[]
    });

    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("href=\"javascript:alert(1)\"");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
