import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WorkflowsPage } from "../../src/renderer/pages/WorkflowsPage";

describe("WorkflowsPage", () => {
  it("renders scaffold-only pilot status, invalid feedback, and local registry details", () => {
    const html = renderToString(<WorkflowsPage />);

    expect(html).toContain("Workflows");
    expect(html).toContain("Workflow lab — scaffold only");
    expect(html).toContain("Future / scaffold");
    expect(html).toContain("Not pilot-supported for daily automation");
    expect(html).toContain("No run UI");
    expect(html).toContain("not a pilot workflow builder");
    expect(html).toContain("No packaged create/edit workflow form is connected here");
    expect(html).toContain("Operator browsing of those records remains future work");
    expect(html).toContain("Invalid workflow cannot enable");
    expect(html).toContain("Unsupported or non-local workflow trigger: webhook.");
    expect(html).toContain("Unsupported or non-local workflow action: http_request.");
    expect(html).toContain("Cannot enable until validation issues are fixed");
    expect(html).toContain("Ready to enable");
    expect(html).toContain("Only registered local triggers and actions can be enabled");
    expect(html).toContain("{{item.title}}");
    expect(html).toContain("{{previous.targetId}}");
    expect(html).toContain("Create task");
  });
});
