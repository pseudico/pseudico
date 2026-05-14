import { describe, expect, it } from "vitest";
import {
  requiredFollowUpSeeds,
  requiredMapKeys,
  requiredSmokeTags,
  validateCoverageMap
} from "../../../scripts/check-test-coverage-map.mjs";

describe("test coverage map", () => {
  it("documents every required feature family, smoke tag, and follow-up seed", () => {
    const result = validateCoverageMap();

    expect(result.failures).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.summary.mapKeys).toBe(requiredMapKeys.length);
    expect(result.summary.smokeTags).toBe(requiredSmokeTags.length);
    expect(result.summary.followUpSeeds).toBe(requiredFollowUpSeeds.length);
  });
});
