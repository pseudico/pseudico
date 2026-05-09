import { describe, expect, it } from "vitest";

import {
  createInspectorTargetKey,
  inspectorTargetToTaggingTargetType,
  isInspectorTarget,
  isInspectorTargetType
} from "../src";

describe("inspector targets", () => {
  it("validates supported local object targets", () => {
    expect(isInspectorTargetType("container")).toBe(true);
    expect(isInspectorTargetType("item")).toBe(true);
    expect(isInspectorTargetType("list_item")).toBe(true);
    expect(isInspectorTargetType("workspace")).toBe(false);
  });

  it("creates stable target keys and tag-compatible target types", () => {
    const target = { type: "list_item" as const, id: "list_item_1" };

    expect(isInspectorTarget(target)).toBe(true);
    expect(createInspectorTargetKey(target)).toBe("list_item:list_item_1");
    expect(inspectorTargetToTaggingTargetType(target)).toBe("list_item");
    expect(isInspectorTarget({ type: "item", id: "" })).toBe(false);
  });
});
