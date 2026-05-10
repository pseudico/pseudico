import { describe, expect, it } from "vitest";
import {
  normalizeWikilinkTitle,
  parseUniqueWikilinkTitles,
  parseWikilinks
} from "../src";

describe("wikilink parser", () => {
  it("parses trimmed titles with source offsets", () => {
    expect(parseWikilinks("Discuss [[ Client A ]] and [[Launch Plan]].")).toEqual([
      {
        raw: "[[ Client A ]]",
        title: "Client A",
        start: 8,
        end: 22
      },
      {
        raw: "[[Launch Plan]]",
        title: "Launch Plan",
        start: 27,
        end: 42
      }
    ]);
  });

  it("deduplicates titles by normalized spelling", () => {
    expect(parseUniqueWikilinkTitles("[[Client A]] [[ client   a ]] [[Brief]]")).toEqual([
      "Client A",
      "Brief"
    ]);
  });

  it("ignores empty or multiline wikilinks", () => {
    expect(parseWikilinks("[[ ]] [[Line\nbreak]] [[Valid]]")).toEqual([
      {
        raw: "[[Valid]]",
        title: "Valid",
        start: 21,
        end: 30
      }
    ]);
  });

  it("normalizes title whitespace and case", () => {
    expect(normalizeWikilinkTitle("  CLIENT   A  ")).toBe("client a");
  });
});