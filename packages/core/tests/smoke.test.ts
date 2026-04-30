import { describe, expect, it } from "vitest";

import {
  corePackageName,
  createIsoTimestamp,
  createLocalId,
  localOnlyBoundary
} from "../src/index";

describe("@local-work-os/core scaffold", () => {
  it("exports the package identity and local-only boundary", () => {
    expect(corePackageName).toBe("@local-work-os/core");
    expect(localOnlyBoundary).toEqual({
      cloudSync: false,
      hostedAccounts: false,
      telemetry: false
    });
  });

  it("exports local id and timestamp helpers", () => {
    const date = new Date("2026-04-30T00:00:00.000Z");

    expect(createIsoTimestamp(date)).toBe("2026-04-30T00:00:00.000Z");
    expect(createLocalId("workspace", date, () => 0.5)).toMatch(
      /^workspace_[a-z0-9]+_[a-z0-9]+$/
    );
  });
});
