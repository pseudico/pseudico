import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TimelineFilterPanel } from "../src";

describe("TimelineFilterPanel", () => {
  it("renders filter chips and save-view disabled state", () => {
    const html = renderToStaticMarkup(
      <TimelineFilterPanel
        values={{
          tagSlugs: "client, urgent",
          categoryIds: "category_ops",
          projectIds: "project_1",
          contactIds: "contact_1",
          statuses: ["open"],
          hideCompleted: true,
          savedViewName: ""
        }}
        onChange={() => undefined}
      />
    );

    expect(html).toContain("@client");
    expect(html).toContain("Category category_ops");
    expect(html).toContain("Project project_1");
    expect(html).toContain("Contact contact_1");
    expect(html).toContain("Status open");
    expect(html).toContain("Completed hidden");
    expect(html).toContain("Save filter as view");
    expect(html).toContain("disabled");
  });
});
