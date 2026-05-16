import { describe, expect, it } from "vitest";
import {
  getHelpArticle,
  getHelpArticlesForRoute,
  helpArticles,
  onboardingChecklist
} from "../src/help";

describe("help content", () => {
  it("provides local Markdown articles for onboarding, workflows, and commands", () => {
    expect(helpArticles.length).toBeGreaterThanOrEqual(5);
    expect(helpArticles.map((article) => article.id)).toContain("keyboard-commands");
    expect(helpArticles.map((article) => article.id)).toContain("release-readiness");
    expect(helpArticles.map((article) => article.id)).toContain("operator-runbook");
    expect(getHelpArticle("getting-started").body).toContain("# Getting started");
    expect(getHelpArticle("keyboard-commands").body).toContain("Ctrl/Cmd+K");
    expect(getHelpArticle("operator-runbook").body).toContain("Restore into a fresh workspace");
    expect(getHelpArticle("release-readiness").body).toContain("local-only");
  });

  it("maps contextual routes to help articles", () => {
    expect(getHelpArticlesForRoute("/inbox")[0]?.id).toBe("capture-and-triage");
    expect(getHelpArticlesForRoute("/projects/project_1").map((article) => article.id)).toContain(
      "projects-contacts"
    );
    expect(getHelpArticlesForRoute("/settings").map((article) => article.id)).toContain(
      "release-readiness"
    );
    expect(getHelpArticlesForRoute("/settings").map((article) => article.id)).toContain(
      "operator-runbook"
    );
    expect(getHelpArticlesForRoute("/unknown")[0]?.id).toBe("getting-started");
  });

  it("keeps onboarding steps linked to existing help articles", () => {
    const articleIds = new Set(helpArticles.map((article) => article.id));

    expect(onboardingChecklist).toHaveLength(4);
    for (const item of onboardingChecklist) {
      expect(articleIds.has(item.helpArticleId)).toBe(true);
    }
  });
});
