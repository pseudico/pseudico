import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SmartListEditor } from "../src";

describe("SmartListEditor", () => {
  it("renders full visual criteria controls", () => {
    const html = renderToStaticMarkup(
      <SmartListEditor
        categoryOptions={[{ id: "category_1", label: "Client", value: "category_1" }]}
        projectOptions={[{ id: "container_1", label: "Launch Plan", value: "container_1" }]}
        tagOptions={[{ id: "tag_1", label: "@client", value: "client" }]}
        onPreview={() => undefined}
        onSave={() => undefined}
      />
    );

    expect(html).toContain("Specific containers");
    expect(html).toContain("Launch Plan");
    expect(html).toContain("Generic status");
    expect(html).toContain("Text contains");
    expect(html).toContain("Attachments");
    expect(html).toContain("Pinned");
    expect(html).toContain("Archived");
    expect(html).toContain("Group by");
    expect(html).toContain("Sort field");
    expect(html).toContain("Preview");
  });

  it("disables save until a smart-list name is present", () => {
    const html = renderToStaticMarkup(
      <SmartListEditor onPreview={vi.fn()} onSave={vi.fn()} />
    );

    expect(html).toContain("disabled=\"\"");
    expect(html).toContain("Save smart list");
  });
});
