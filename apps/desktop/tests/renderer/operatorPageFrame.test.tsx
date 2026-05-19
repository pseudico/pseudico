import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  OperatorPage,
  OperatorPageHeader,
  OperatorPanel,
  OperatorWorkbench
} from "../../src/renderer/components/OperatorPageFrame";

describe("OperatorPageFrame", () => {
  it("renders route identity and panel roles for screenshot truth gates", () => {
    const html = renderToString(
      <OperatorPage routeId="help" kind="secondary" labelledBy="help-title">
        <OperatorPageHeader
          eyebrow="Local help"
          id="help-title"
          summary="Readable local guidance."
          title="Help center and onboarding"
        />
        <OperatorWorkbench layout="primary-rail">
          <OperatorPanel role="primary">Primary work</OperatorPanel>
          <OperatorPanel role="rail">Secondary rail</OperatorPanel>
        </OperatorWorkbench>
      </OperatorPage>
    );

    expect(html).toContain('data-operator-route="help"');
    expect(html).toContain('data-operator-route-kind="secondary"');
    expect(html).toContain('data-operator-workbench-layout="primary-rail"');
    expect(html).toContain('data-operator-panel="primary"');
    expect(html).toContain('data-operator-panel="rail"');
    expect(html).toContain("Help center and onboarding");
  });
});
