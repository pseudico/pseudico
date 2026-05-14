import { describe, expect, it } from "vitest";
import {
  requiredGapIds,
  validateLocalParityQaReport
} from "../../../scripts/check-local-parity-qa.mjs";
import { requiredMapKeys, requiredSmokeTags } from "../../../scripts/check-test-coverage-map.mjs";

describe("local parity QA report", () => {
  it("logs every feature family, smoke tag, and release-hardening gap", () => {
    const result = validateLocalParityQaReport();

    expect(result.failures).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.summary.mapKeys).toBe(requiredMapKeys.length);
    expect(result.summary.smokeTags).toBe(requiredSmokeTags.length);
    expect(result.summary.gapIds).toBe(requiredGapIds.length);
  });
});
