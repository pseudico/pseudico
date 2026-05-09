import { describe, expect, it } from "vitest";
import {
  APP_SHORTCUT_IDS,
  createShortcutRegistry,
  defaultShortcutDescriptors,
  getShortcutEventTargetKind,
  matchesShortcutBinding,
  normalizeShortcutKey
} from "../src";

describe("ShortcutRegistry", () => {
  it("matches default primary shortcuts by ctrl or command key", () => {
    const registry = createShortcutRegistry(defaultShortcutDescriptors);

    expect(
      registry.match({ key: "k", ctrlKey: true, metaKey: false })?.id
    ).toBe(APP_SHORTCUT_IDS.openCommandPalette);
    expect(
      registry.match({ key: "K", ctrlKey: false, metaKey: true })?.id
    ).toBe(APP_SHORTCUT_IDS.openCommandPalette);
    expect(
      registry.match({ key: "n", ctrlKey: true, shiftKey: true })?.id
    ).toBe(APP_SHORTCUT_IDS.quickNote);
  });

  it("does not trigger global shortcuts from editable targets", () => {
    const registry = createShortcutRegistry(defaultShortcutDescriptors);
    const inputTarget = { tagName: "input", isContentEditable: false };

    expect(getShortcutEventTargetKind(inputTarget)).toBe("editable");
    expect(
      registry.match({ key: "n", ctrlKey: true, target: inputTarget })
    ).toBeNull();
  });

  it("keeps editor and list shortcuts scoped to editing contexts", () => {
    const registry = createShortcutRegistry(defaultShortcutDescriptors);

    expect(
      registry.match(
        { key: "s", ctrlKey: true, target: { tagName: "textarea" } },
        { scope: "editor" }
      )?.id
    ).toBe(APP_SHORTCUT_IDS.save);
    expect(
      registry.match(
        { key: "Tab", shiftKey: true, target: { tagName: "input" } },
        { scope: "list-editor" }
      )?.id
    ).toBe(APP_SHORTCUT_IDS.listOutdent);
    expect(
      registry.match({ key: "Tab", shiftKey: true }, { scope: "global" })
    ).toBeNull();
  });

  it("normalizes shortcut keys and binding comparisons", () => {
    expect(normalizeShortcutKey("ArrowDown")).toBe("down");
    expect(normalizeShortcutKey("Esc")).toBe("escape");
    expect(
      matchesShortcutBinding(
        { key: "ArrowDown", altKey: true },
        { key: "down", alt: true }
      )
    ).toBe(true);
  });
});
