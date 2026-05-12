import { describe, expect, it } from "vitest";
import {
  isDateExpressionCandidate,
  parseDateExpression,
  resolveDateExpression
} from "../src";

const referenceDate = new Date(2026, 4, 2, 9, 30, 0, 0); // Saturday, May 2 2026.

describe("date expression parser", () => {
  it("parses and resolves today offsets", () => {
    expect(isDateExpressionCandidate("today+3d")).toBe(true);
    expect(parseDateExpression("today+3d")).toMatchObject({
      basePath: "today",
      operations: [{ type: "offset", amount: 3, unit: "d" }]
    });
    expect(resolveDateExpression("today+3d", { referenceDate }).value).toBe("2026-05-05");
  });

  it("resolves source item date offsets", () => {
    const resolved = resolveDateExpression("item.dueAt+1w", {
      referenceDate,
      resolveBaseDate: (path) => (path === "item.dueAt" ? "2026-05-10T00:00:00.000Z" : null)
    });

    expect(resolved).toMatchObject({
      basePath: "item.dueAt",
      value: "2026-05-17"
    });
  });

  it.each([
    ["today.startOfWeek", "2026-04-27"],
    ["today.endOfWeek", "2026-05-03"],
    ["today.startOfMonth", "2026-05-01"],
    ["today.endOfMonth", "2026-05-31"]
  ])("resolves %s", (expression, expected) => {
    expect(resolveDateExpression(expression, { referenceDate }).value).toBe(expected);
  });

  it("keeps date-only math stable across daylight-saving calendar days", () => {
    expect(
      resolveDateExpression("today+1d", {
        referenceDate: new Date(2026, 3, 4, 12, 0, 0, 0)
      }).value
    ).toBe("2026-04-05");
  });

  it("rejects unresolved or malformed date expressions", () => {
    expect(() =>
      resolveDateExpression("item.dueAt+1q", {
        resolveBaseDate: () => "2026-05-10"
      })
    ).toThrow("Date expression operation is invalid");

    expect(() =>
      resolveDateExpression("item.dueAt+1d", {
        resolveBaseDate: () => null
      })
    ).toThrow("Date expression base could not be resolved");
  });
});
