import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RENDERER_APPEARANCE_SETTINGS,
  ThemeProvider,
  getAppearanceClassName
} from "../../src/renderer/theme/ThemeProvider";

describe("ThemeProvider", () => {
  it("adds theme, density, and font-size classes around renderer content", () => {
    const html = renderToString(
      <ThemeProvider
        initialSettings={{
          workspaceId: "workspace_1",
          theme: "dark",
          density: "compact",
          fontSize: "large",
          updatedAt: "2026-05-10T03:20:00.000Z"
        }}
      >
        <main>Dashboard cards</main>
      </ThemeProvider>
    );

    expect(html).toContain(
      'class="appearance-root theme-dark density-compact font-large"'
    );
    expect(html).toContain("Dashboard cards");
  });

  it("uses system/comfortable/medium as the safe renderer default", () => {
    expect(getAppearanceClassName(DEFAULT_RENDERER_APPEARANCE_SETTINGS)).toBe(
      "appearance-root theme-system density-comfortable font-medium"
    );
  });
});
