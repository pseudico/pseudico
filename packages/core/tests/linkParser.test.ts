import { describe, expect, it } from "vitest";
import { normalizeExternalLinkUrl, parseExternalLinks } from "../src";

describe("linkParser", () => {
  it("detects safe bare HTTP, HTTPS, and www URLs", () => {
    const links = parseExternalLinks(
      "Read https://Example.com/a?b=1, then http://docs.example.test and www.example.org/path."
    );

    expect(links.map((link) => ({
      label: link.label,
      normalizedUrl: link.normalizedUrl,
      kind: link.kind
    }))).toEqual([
      {
        label: "https://Example.com/a?b=1",
        normalizedUrl: "https://example.com/a?b=1",
        kind: "bare"
      },
      {
        label: "http://docs.example.test",
        normalizedUrl: "http://docs.example.test/",
        kind: "bare"
      },
      {
        label: "www.example.org/path",
        normalizedUrl: "https://www.example.org/path",
        kind: "bare"
      }
    ]);
  });

  it("detects safe Markdown links without duplicating the URL", () => {
    const links = parseExternalLinks(
      "Open [Docs](https://docs.example.com/start) today."
    );

    expect(links).toMatchObject([
      {
        label: "Docs",
        url: "https://docs.example.com/start",
        normalizedUrl: "https://docs.example.com/start",
        kind: "markdown"
      }
    ]);
  });

  it("rejects unsafe or non-web protocols", () => {
    expect(normalizeExternalLinkUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeExternalLinkUrl("file:///C:/secret.txt")).toBeNull();
    expect(normalizeExternalLinkUrl("mailto:test@example.com")).toBeNull();
    expect(parseExternalLinks("[bad](javascript:alert(1)) ftp://example.com")).toEqual([]);
  });
});
