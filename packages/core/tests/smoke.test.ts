import { describe, expect, it } from "vitest";

import { corePackageName, localOnlyBoundary } from "../src/index";

describe("@local-work-os/core scaffold", () => {
  it("exports the package identity and local-only boundary", () => {
    expect(corePackageName).toBe("@local-work-os/core");
    expect(localOnlyBoundary).toEqual({
      cloudSync: false,
      hostedAccounts: false,
      telemetry: false
    });
  });
});
