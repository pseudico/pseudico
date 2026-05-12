import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkflowsPage } from "../../src/renderer/pages/WorkflowsPage";

describe("WorkflowsPage", () => {
  it("renders invalid workflow enablement feedback and local registry details", () => {
    const html = renderToString(<WorkflowsPage />);

    expect(html).toContain("Workflows");
    expect(html).toContain("Invalid workflow cannot enable");
    expect(html).toContain("Unsupported or non-local workflow trigger: webhook.");
    expect(html).toContain("Unsupported or non-local workflow action: http_request.");
    expect(html).toContain("Cannot enable until validation issues are fixed");
    expect(html).toContain("Ready to enable");
    expect(html).toContain("Only registered local triggers and actions can be enabled");
    expect(html).toContain("Create task");
  });
});
