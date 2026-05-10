import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TabManagementDialog } from "../src";

describe("TabManagementDialog", () => {
  it("renders template creation and local visibility controls", () => {
    const html = renderToStaticMarkup(
      <TabManagementDialog
        tabs={[
          {
            id: "tab_main",
            name: "Main",
            description: null,
            isDefault: true,
            hiddenAt: null,
            archivedAt: null
          },
          {
            id: "tab_docs",
            name: "Docs",
            description: "Reference files",
            isDefault: false,
            hiddenAt: "2026-05-10T00:00:00.000Z",
            archivedAt: null
          }
        ]}
        templates={[
          {
            id: "tab_template_documents",
            name: "Documents",
            description: "Reference docs"
          }
        ]}
        onArchiveTab={() => undefined}
        onCreateFromTemplate={() => undefined}
        onDuplicateTab={() => undefined}
        onHideTab={() => undefined}
        onShowTab={() => undefined}
      />
    );

    expect(html).toContain("Manage tabs");
    expect(html).toContain("Add Documents");
    expect(html).toContain("Hidden locally");
    expect(html).toContain("Show");
    expect(html).toContain("Duplicate");
  });
});
