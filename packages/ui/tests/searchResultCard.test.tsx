import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchResultCard } from "../src";

describe("SearchResultCard", () => {
  it("renders highlight segments without interpreting excerpt HTML", () => {
    const html = renderToStaticMarkup(
      <SearchResultCard
        result={{
          id: "search_1",
          targetId: "item_1",
          targetType: "item",
          kind: "note",
          title: "Launch <script>",
          titleHighlights: [
            { text: "Launch", match: true },
            { text: " <script>", match: false }
          ],
          body: "Unsafe excerpt",
          excerptSegments: [
            { text: "before ", match: false },
            { text: "launch", match: true },
            { text: " <img src=x onerror=alert(1)>", match: false }
          ]
        }}
      />
    );

    expect(html).toContain("<mark");
    expect(html).toContain("launch");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
  });
});
