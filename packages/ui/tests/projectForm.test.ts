import { describe, expect, it } from "vitest";
import { validateProjectFormValues } from "../src";

describe("ProjectForm validation", () => {
  it("requires a non-empty project name", () => {
    expect(validateProjectFormValues({ name: "   " })).toEqual({
      name: "Project name is required."
    });
  });

  it("accepts a trimmed project name", () => {
    expect(validateProjectFormValues({ name: "  Launch Plan  " })).toEqual({});
  });
});
