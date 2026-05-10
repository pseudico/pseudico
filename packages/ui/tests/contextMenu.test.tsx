import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContextMenu } from "../src";

describe("ContextMenu", () => {
  it("renders keyboard-openable menu semantics for trigger menus", () => {
    const html = renderToStaticMarkup(
      <ContextMenu
        label="Item actions"
        target={{ type: "item", id: "item_1", label: "Task" }}
        trigger={<span>Actions</span>}
        actions={[
          {
            id: "open",
            title: "Open",
            group: "General",
            disabledReason: null,
            danger: false
          },
          {
            id: "delete",
            title: "Delete",
            group: "Danger",
            disabledReason: "Default item cannot be deleted.",
            danger: true
          }
        ]}
      />
    );

    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('role="menu"');
    expect(html).toContain('role="menuitem"');
    expect(html).toContain("Default item cannot be deleted.");
  });
});

