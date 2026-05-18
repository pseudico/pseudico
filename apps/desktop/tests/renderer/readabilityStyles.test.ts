import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const styles = readFileSync(
  resolve(testDirectory, "../../src/renderer/styles.css"),
  "utf8"
);

describe("primary-operator readability styles", () => {
  it("raises default font and hit-target sizing without changing appearance classes", () => {
    expect(styles).toContain("--operator-control-min-height: 46px");
    expect(styles).toContain("font-size: calc(17px * var(--appearance-font-scale))");
    expect(styles).toContain(".appearance-root.density-compact");
    expect(styles).toContain("--operator-control-min-height: 40px");
    expect(styles).toContain(".appearance-root.font-large");
    expect(styles).toContain("--operator-control-min-height: 50px");
  });

  it("targets the required primary work surfaces for readable cards and inputs", () => {
    expect(styles).toContain(".search-control");
    expect(styles).toContain(".quick-add-form input");
    expect(styles).toContain(".universal-item-card");
    expect(styles).toContain(".search-result-card");
    expect(styles).toContain(".today-task-card");
    expect(styles).toContain(".dashboard-widget-row");
    expect(styles).toContain(".daily-planner-lane-input textarea");
    expect(styles).toContain(".appearance-settings-form select");
    expect(styles).toContain(".backup-list-row");
  });

  it("keeps long operator titles wrapping on core headings", () => {
    expect(styles).toContain(".project-detail-header h2");
    expect(styles).toContain(".today-page-heading h2");
    expect(styles).toContain("overflow-wrap: anywhere");
  });

  it("defines shared space-budget primitive minimums and 1280px fallback rules", () => {
    expect(styles).toContain(".space-budget-command-input");
    expect(styles).toContain("minmax(420px, 1fr)");
    expect(styles).toContain(".space-budget-capture-panel textarea");
    expect(styles).toContain("min-height: 140px");
    expect(styles).toContain(".space-budget-responsive-frame");
    expect(styles).toContain("@media (max-width: 1280px)");
    expect(styles).toContain(".space-budget-timeline-row");
    expect(styles).toContain("grid-template-columns: minmax(300px, 330px) minmax(520px, 1fr)");
  });

  it("keeps the persistent shell command and Quick Add above operator space budgets", () => {
    expect(styles).toContain(".top-actions[data-space-budget-surface=\"app-shell\"]");
    expect(styles).toContain("grid-template-columns: minmax(420px, 1fr) auto auto auto auto");
    expect(styles).toContain(".shell-command-search");
    expect(styles).toContain("min-width: min(100%, 420px)");
    expect(styles).toContain(".quick-start-dialog");
    expect(styles).toContain("width: min(860px, calc(100vw - 48px))");
    expect(styles).toContain(".quick-add-form textarea");
    expect(styles).toContain("min-height: 140px");
  });

  it("keeps Today planning controls above the SBUX row and capture budgets", () => {
    expect(styles).toContain(".daily-planner-lane-input textarea");
    expect(styles).toContain("min-height: 142px");
    expect(styles).toContain(".daily-planner-feedback");
    expect(styles).toContain(".today-lane-grid .today-lane[data-today-lane=\"today\"]");
    expect(styles).toContain("flex: 1.25 1 420px");
    expect(styles).toContain(".today-task-card");
    expect(styles).toContain("min-height: 72px");
  });

  it("collapses navigation chrome at 1280px before shrinking command/search", () => {
    expect(styles).toContain("@media (max-width: 1280px)");
    expect(styles).toContain("grid-template-columns: 72px minmax(0, 1fr)");
    expect(styles).toContain(".nav-item span");
    expect(styles).toContain("display: none");
    expect(styles).toContain("grid-template-columns: minmax(420px, 1fr) auto auto auto");
    expect(styles).toContain(".navigation-controls");
  });
});
