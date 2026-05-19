import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContactMaintenanceSpaceBudgetFixturePage } from "../../src/renderer/pages/ContactMaintenanceSpaceBudgetFixturePage";

describe("PSE-238 contacts and maintenance space-budget fixture", () => {
  it("renders contact work containers and maintenance safety surfaces with long data", () => {
    const html = renderToString(<ContactMaintenanceSpaceBudgetFixturePage />);

    expect(html).toContain("Contacts and maintenance space budgets");
    expect(html).toContain("Contact work room");
    expect(html).toContain("Contact mixed content feed");
    expect(html).toContain("Profile and linked work");
    expect(html).toContain("Follow-up context");
    expect(html).toContain("Backup &amp; restore");
    expect(html).toContain("Restore into new workspace");
    expect(html).toContain("Trash");
    expect(html).toContain("Workflow lab");
    expect(html).toContain("Regional operations sponsor for the sustainable facilities transition program");
    expect(html).toContain("northstar-facilities-restoration-evidence-packet-final-reviewed-with-attachments.pdf");
    expect(html).toContain("Pseudico Restores");
    expect(html).toContain("data-space-budget-surface=\"contact-detail\"");
    expect(html).toContain("data-space-budget-surface=\"contact-workbench\"");
    expect(html).toContain("data-space-budget-surface=\"maintenance-settings\"");
    expect(html).toContain("data-space-budget-surface=\"maintenance-trash\"");
    expect(html).toContain("data-space-budget-surface=\"workflow-lab\"");
  });
});
