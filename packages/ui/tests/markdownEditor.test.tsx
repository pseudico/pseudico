import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  applyMarkdownToolbarCommand,
  getMarkdownEditorKeyCommand,
  MarkdownEditor,
  SafeMarkdownPreview,
  markdownToolbarCommands
} from "../src";

describe("MarkdownEditor", () => {
  it("renders toolbar commands and edit/preview/split mode controls", () => {
    const html = renderToStaticMarkup(
      <MarkdownEditor
        value="# Decision\n\nConfirm **brief**"
        onChange={() => undefined}
        onSaveShortcut={() => undefined}
      />
    );

    expect(markdownToolbarCommands.map((command) => command.id)).toEqual([
      "heading",
      "bold",
      "italic",
      "bullet",
      "link",
      "code",
      "quote"
    ]);
    expect(html).toContain("Markdown formatting toolbar");
    expect(html).toContain("Heading");
    expect(html).toContain("Bold");
    expect(html).toContain("Italic");
    expect(html).toContain("Bulleted list");
    expect(html).toContain("Link");
    expect(html).toContain("Code");
    expect(html).toContain("Quote");
    expect(html).toContain("Edit");
    expect(html).toContain("Preview");
    expect(html).toContain("Split");
    expect(html).toContain("Ctrl/Cmd+Enter saves");
    expect(html).toContain("data-markdown-mode=\"edit\"");
  });

  it("renders split preview safely without raw HTML injection", () => {
    const html = renderToStaticMarkup(
      <MarkdownEditor
        mode="split"
        value="# Decision\n\n- Confirm [brief](https://example.com)\n\n> Keep <script>alert(1)</script>"
        onChange={() => undefined}
      />
    );

    expect(html).toContain("data-markdown-mode=\"split\"");
    expect(html).toContain("Markdown preview");
    expect(html).toContain("Decision");
    expect(html).toContain("Confirm brief");
    expect(html).toContain("Keep &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("applies inline toolbar commands around selected text", () => {
    expect(
      applyMarkdownToolbarCommand(
        { value: "Confirm brief", selectionStart: 8, selectionEnd: 13 },
        "bold"
      )
    ).toEqual({
      value: "Confirm **brief**",
      selectionStart: 10,
      selectionEnd: 15
    });

    expect(
      applyMarkdownToolbarCommand(
        { value: "Read docs", selectionStart: 5, selectionEnd: 9 },
        "link"
      )
    ).toEqual({
      value: "Read [docs](https://example.com)",
      selectionStart: 6,
      selectionEnd: 10
    });
  });

  it("toggles line-level toolbar prefixes", () => {
    expect(
      applyMarkdownToolbarCommand(
        { value: "Decision", selectionStart: 0, selectionEnd: 8 },
        "heading"
      ).value
    ).toBe("## Decision");

    expect(
      applyMarkdownToolbarCommand(
        { value: "- Decision", selectionStart: 3, selectionEnd: 11 },
        "bullet"
      ).value
    ).toBe("Decision");

    expect(
      applyMarkdownToolbarCommand(
        { value: "Note\nDecision", selectionStart: 6, selectionEnd: 14 },
        "quote"
      ).value
    ).toBe("Note\n> Decision");
  });

  it("maps keyboard shortcuts without executing browser APIs", () => {
    expect(getMarkdownEditorKeyCommand({ ctrlKey: true, key: "Enter" })).toBe("save");
    expect(getMarkdownEditorKeyCommand({ metaKey: true, key: "b" })).toBe("bold");
    expect(getMarkdownEditorKeyCommand({ ctrlKey: true, key: "I" })).toBe("italic");
    expect(getMarkdownEditorKeyCommand({ ctrlKey: true, key: "k" })).toBe("link");
    expect(getMarkdownEditorKeyCommand({ ctrlKey: true, key: "e" })).toBe("code");
    expect(getMarkdownEditorKeyCommand({ ctrlKey: true, altKey: true, key: "b" })).toBe("none");
  });

  it("renders standalone safe previews for empty and formatted content", () => {
    expect(renderToStaticMarkup(<SafeMarkdownPreview content="" />)).toContain(
      "Nothing to preview yet."
    );

    const html = renderToStaticMarkup(
      <SafeMarkdownPreview content="```const value = '<safe>';```" />
    );

    expect(html).toContain("safe-markdown-code-block");
    expect(html).toContain("&lt;safe&gt;");
  });
});
