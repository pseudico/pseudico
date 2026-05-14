import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  HelpArticleView,
  HelpNavigation,
  OnboardingChecklist
} from "../src";

const article = {
  id: "getting-started",
  title: "Getting started",
  summary: "Open a local workspace.",
  category: "Start",
  body: "# Getting started\n\n- Open **workspace**\n\n> Keep <script>alert(1)</script>",
  relatedRoutes: ["/workspace"]
};

describe("HelpCenter components", () => {
  it("renders help navigation grouped by category with selected state", () => {
    const html = renderToStaticMarkup(
      <HelpNavigation
        articles={[
          article,
          {
            ...article,
            id: "keyboard-commands",
            title: "Keyboard",
            category: "Reference"
          }
        ]}
        selectedArticleId="keyboard-commands"
        onSelectArticle={() => undefined}
      />
    );

    expect(html).toContain("Help center topics");
    expect(html).toContain("Start");
    expect(html).toContain("Reference");
    expect(html).toContain("aria-current=\"page\"");
  });

  it("renders Markdown help safely and exposes related routes", () => {
    const html = renderToStaticMarkup(<HelpArticleView article={article} />);

    expect(html).toContain("Getting started");
    expect(html).toContain("Open workspace");
    expect(html).toContain("Keep &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("/workspace");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  it("renders onboarding checklist items with help actions", () => {
    const html = renderToStaticMarkup(
      <OnboardingChecklist
        completedItemIds={["open-workspace"]}
        items={[
          {
            id: "open-workspace",
            title: "Open workspace",
            description: "Choose a local folder.",
            helpArticleId: "getting-started"
          }
        ]}
        onOpenHelp={() => undefined}
      />
    );

    expect(html).toContain("Onboarding checklist");
    expect(html).toContain("Open workspace");
    expect(html).toContain("Read help");
    expect(html).toContain("data-complete=\"true\"");
  });
});
