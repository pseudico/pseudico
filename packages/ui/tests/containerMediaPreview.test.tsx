import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContainerMediaPreview } from "../src";

describe("ContainerMediaPreview", () => {
  it("renders image media with change and remove actions", () => {
    const html = renderToStaticMarkup(
      <ContainerMediaPreview
        variant="banner"
        title="Launch"
        media={{
          previewDataUrl: "data:image/png;base64,abc",
          altText: "Launch banner",
          originalName: "banner.png",
          exists: true,
          thumbnailExists: true
        }}
      />
    );

    expect(html).toContain('alt="Launch banner"');
    expect(html).toContain("Change banner");
    expect(html).toContain("Remove");
  });

  it("shows missing-file state when local storage is unavailable", () => {
    const html = renderToStaticMarkup(
      <ContainerMediaPreview
        variant="avatar"
        title="Ada Lovelace"
        media={{
          previewDataUrl: null,
          altText: null,
          originalName: "ada.png",
          exists: false,
          thumbnailExists: false
        }}
      />
    );

    expect(html).toContain("AL");
    expect(html).toContain("missing from local attachment storage");
  });
});
