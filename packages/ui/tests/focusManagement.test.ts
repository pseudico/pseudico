import { describe, expect, it } from "vitest";
import { getFocusTrapKeyCommand } from "../src";

describe("modal focus management", () => {
  it("closes modal focus scopes on Escape", () => {
    expect(
      getFocusTrapKeyCommand({
        key: "Escape",
        currentIndex: 1,
        focusableCount: 3
      })
    ).toBe("close");
  });

  it("wraps Tab and Shift+Tab at dialog boundaries", () => {
    expect(
      getFocusTrapKeyCommand({
        key: "Tab",
        currentIndex: 2,
        focusableCount: 3
      })
    ).toBe("move-first");
    expect(
      getFocusTrapKeyCommand({
        key: "Tab",
        shiftKey: true,
        currentIndex: 0,
        focusableCount: 3
      })
    ).toBe("move-last");
  });

  it("allows native tab movement inside a dialog", () => {
    expect(
      getFocusTrapKeyCommand({
        key: "Tab",
        currentIndex: 1,
        focusableCount: 3
      })
    ).toBe("none");
  });
});
