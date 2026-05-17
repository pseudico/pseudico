import { describe, expect, it } from "vitest";
import { getVisibleToasts } from "../../src/renderer/shell/toastStore";
import type { ToastViewModel } from "@local-work-os/ui";

function toast(id: string): ToastViewModel {
  return {
    id,
    message: `Message ${id}`,
    title: `Toast ${id}`,
    tone: "info"
  };
}

describe("toastStore", () => {
  it("groups older toasts so the viewport stays out of the operator's work", () => {
    const visible = getVisibleToasts([
      toast("1"),
      toast("2"),
      toast("3"),
      toast("4")
    ]);

    expect(visible).toHaveLength(3);
    expect(visible[0]).toMatchObject({
      id: "toast-overflow-summary",
      message: "2 earlier updates will clear automatically.",
      title: "More updates"
    });
    expect(visible.slice(1).map((item) => item.id)).toEqual(["3", "4"]);
  });

  it("does not add grouping chrome when only a small number of toasts is visible", () => {
    const visible = getVisibleToasts([toast("1"), toast("2")]);

    expect(visible.map((item) => item.id)).toEqual(["1", "2"]);
  });
});
