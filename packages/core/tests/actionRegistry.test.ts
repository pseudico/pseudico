import { describe, expect, it } from "vitest";
import {
  ActionRegistry,
  createActionRegistry,
  normalizeActionQuery,
  type ActionDescriptor
} from "../src";

type TestContext = {
  workspaceOpen: boolean;
  calls: string[];
};

const workspaceRequired = "Open a local workspace first.";

describe("ActionRegistry", () => {
  it("normalizes queries and ranks action matches", () => {
    const registry = createActionRegistry<TestContext>([
      action("nav.today", "Today", ["plan", "due"]),
      action("nav.search", "Search", ["find", "lookup"]),
      action("quick-add", "Quick add", ["capture", "new task"])
    ]);

    expect(normalizeActionQuery("  Search   local  ")).toBe("search local");

    const matches = registry.search({
      query: "find",
      context: { workspaceOpen: true, calls: [] }
    });

    expect(matches.map((match) => match.id)).toEqual(["nav.search"]);
    expect(matches[0]?.disabledReason).toBeNull();
  });

  it("resolves disabled states from action context", () => {
    const registry = createActionRegistry<TestContext>([
      {
        ...action("quick-add", "Quick add", ["capture"]),
        disabled: (context) => !context.workspaceOpen && workspaceRequired
      }
    ]);

    expect(
      registry.search({
        query: "quick",
        context: { workspaceOpen: false, calls: [] }
      })[0]?.disabledReason
    ).toBe(workspaceRequired);
    expect(
      registry.search({
        query: "quick",
        context: { workspaceOpen: true, calls: [] }
      })[0]?.disabledReason
    ).toBeNull();
  });

  it("prevents duplicate action ids and executes through descriptors", async () => {
    const registry = new ActionRegistry<TestContext>();
    const calls: string[] = [];

    registry.register(action("nav.today", "Today", ["plan"]));

    expect(() => registry.register(action("nav.today", "Today", []))).toThrow(
      "already registered"
    );

    await registry.get("nav.today")?.execute({
      workspaceOpen: true,
      calls
    });

    expect(calls).toEqual(["nav.today"]);
  });
});

function action(
  id: string,
  title: string,
  keywords: string[]
): ActionDescriptor<TestContext> {
  return {
    id,
    title,
    group: "Navigation",
    subtitle: `Open ${title}`,
    keywords,
    execute: (context) => {
      context.calls.push(id);
    }
  };
}
