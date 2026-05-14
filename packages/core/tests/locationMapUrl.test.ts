import { describe, expect, it } from "vitest";
import { buildLocationMapUrl, normalizeLocationViewportZoom } from "../src";

describe("location map URL helpers", () => {
  it("builds explicit external map URLs for coordinates with saved viewport", () => {
    expect(
      buildLocationMapUrl({
        latitude: -33.86882,
        longitude: 151.20929,
        viewportCenterLat: -33.86,
        viewportCenterLng: 151.2,
        viewportZoom: 12
      })
    ).toBe("https://www.openstreetmap.org/?mlat=-33.86882&mlon=151.20929#map=12/-33.86/151.2");
  });

  it("builds address search URLs and clamps viewport zoom", () => {
    expect(
      buildLocationMapUrl({ address: "Sydney Opera House", viewportZoom: 99 })
    ).toBe("https://www.openstreetmap.org/search?query=Sydney%20Opera%20House");
    expect(normalizeLocationViewportZoom(0)).toBe(1);
    expect(normalizeLocationViewportZoom(99)).toBe(20);
  });
});
