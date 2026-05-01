import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../src/renderer/App";

describe("desktop app launch smoke", () => {
  it("renders the launch route and welcome surface", () => {
    const html = renderToString(
      <MemoryRouter initialEntries={["/welcome"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(html).toContain("Local Work OS");
    expect(html).toContain("Create workspace");
    expect(html).toContain("Open workspace");
    expect(html).toContain("Waiting for workspace");
  });
});
