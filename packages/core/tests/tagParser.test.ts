import { describe, expect, it } from "vitest";
import {
  normalizeTagName,
  parseInlineTagSlugs,
  parseInlineTags,
  slugifyTagName
} from "../src";

describe("tag parser", () => {
  it("parses unique inline tags with hyphenated words", () => {
    expect(
      parseInlineTags("Call @Ops about @multi-word-with-hyphens and @ops.")
    ).toEqual([
      {
        raw: "@Ops",
        name: "ops",
        slug: "ops",
        start: 5,
        end: 9
      },
      {
        raw: "@multi-word-with-hyphens",
        name: "multi-word-with-hyphens",
        slug: "multi-word-with-hyphens",
        start: 16,
        end: 40
      }
    ]);
  });

  it("ignores email addresses, trailing hyphens, underscores, and duplicates", () => {
    expect(
      parseInlineTagSlugs(
        "email ada@example.com @valid-tag @valid-tag @_skip @skip_ @skip-"
      )
    ).toEqual(["valid-tag"]);
  });

  it("normalizes manual tag names to display name and slug", () => {
    expect(normalizeTagName(" @Phone Call ")).toBe("Phone-Call");
    expect(slugifyTagName(" @Phone Call ")).toBe("phone-call");
    expect(() => normalizeTagName("@bad/tag")).toThrow(
      "Tag name must contain only letters, numbers, and hyphens."
    );
  });
});
