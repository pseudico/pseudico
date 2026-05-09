import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CommandPalette,
  getCommandPaletteKey,
  getNextCommandPaletteIndex,
  type CommandPaletteAction
} from "../src";

describe("CommandPalette", () => {
  it("renders matching commands with disabled state and shortcuts", () => {
    const html = renderToStaticMarkup(
      <CommandPalette
        actions={[
          action("nav.today", "Today", null, "Ctrl+1"),
          action("quick-add", "Quick add", "Open a local workspace first.")
        ]}
        activeActionId="nav.today"
        open
        query="to"
        onClose={() => undefined}
        onExecute={() => undefined}
        onHighlight={() => undefined}
        onQueryChange={() => undefined}
      />
    );

    expect(html).toContain("Command palette");
    expect(html).toContain("Run a command");
    expect(html).toContain("Today");
    expect(html).toContain("Ctrl+1");
    expect(html).toContain("Quick add");
    expect(html).toContain("Open a local workspace first.");
    expect(html).toContain("aria-selected=\"true\"");
    expect(html).toContain("disabled=\"\"");
  });

  it("maps keyboard inputs to palette commands", () => {
    expect(getCommandPaletteKey("Escape")).toBe("close");
    expect(getCommandPaletteKey("Enter")).toBe("execute");
    expect(getCommandPaletteKey("ArrowDown")).toBe("next");
    expect(getCommandPaletteKey("ArrowUp")).toBe("previous");
    expect(getCommandPaletteKey("a")).toBe("none");
  });

  it("wraps highlighted command indexes for keyboard navigation", () => {
    expect(
      getNextCommandPaletteIndex({
        actionCount: 3,
        currentIndex: 2,
        direction: "next"
      })
    ).toBe(0);
    expect(
      getNextCommandPaletteIndex({
        actionCount: 3,
        currentIndex: 0,
        direction: "previous"
      })
    ).toBe(2);
    expect(
      getNextCommandPaletteIndex({
        actionCount: 0,
        currentIndex: 0,
        direction: "next"
      })
    ).toBeNull();
  });
});

function action(
  id: string,
  title: string,
  disabledReason: string | null,
  shortcutLabel?: string
): CommandPaletteAction {
  const viewModel: CommandPaletteAction = {
    id,
    title,
    group: "Navigation",
    subtitle: `Open ${title}`,
    disabledReason
  };

  if (shortcutLabel !== undefined) {
    viewModel.shortcut = {
      key: shortcutLabel,
      label: shortcutLabel
    };
  }

  return viewModel;
}
