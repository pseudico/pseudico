import { describe, expect, it } from "vitest";
import {
  createSequentialSortOrders,
  encodeDragPayload,
  moveIdBeforeTarget,
  parseDragPayload
} from "../src";

describe("drag/drop payload helpers", () => {
  it("encodes and parses typed item payloads", () => {
    const encoded = encodeDragPayload({
      type: "item",
      itemId: "item_1",
      containerId: "container_1",
      containerTabId: null
    });

    expect(parseDragPayload(encoded)).toEqual({
      type: "item",
      itemId: "item_1",
      containerId: "container_1",
      containerTabId: null
    });
    expect(parseDragPayload("{not-json")).toBeNull();
  });

  it("moves ids before a target and creates stable sort orders", () => {
    const ids = moveIdBeforeTarget(["a", "b", "c"], "c", "a");

    expect(ids).toEqual(["c", "a", "b"]);
    expect(createSequentialSortOrders(ids)).toEqual([
      { id: "c", sortOrder: 1024 },
      { id: "a", sortOrder: 2048 },
      { id: "b", sortOrder: 3072 }
    ]);
  });
});
