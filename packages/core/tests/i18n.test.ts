import {
  createTranslator,
  formatLocalizedDateTime,
  formatLocalizedNumber,
  interpolateMessage,
  t,
  translate
} from "../src";
import { describe, expect, it } from "vitest";

describe("i18n scaffold", () => {
  it("returns English resource strings through the default translator", () => {
    expect(t("app.brand.title")).toBe("Local Work OS");
    expect(t("nav.settings.title")).toBe("Settings");
  });

  it("falls back to the key when a translation is missing", () => {
    expect(t("missing.future.translation")).toBe("missing.future.translation");
    expect(translate("missing.future.translation", {}, {}, "missing:")).toBe(
      "missing:missing.future.translation"
    );
  });

  it("interpolates values without replacing unknown placeholders", () => {
    expect(interpolateMessage("Hello {name}, {count} item(s), {missing}", {
      count: 3,
      name: "Ada"
    })).toBe("Hello Ada, 3 item(s), {missing}");
  });

  it("creates locale-specific format helpers for future localization work", () => {
    const translator = createTranslator({ locale: "en" });

    expect(translator.locale).toBe("en");
    expect(formatLocalizedDateTime("2026-05-14T09:30:00.000Z")).toContain("2026");
    expect(formatLocalizedNumber(12345.67)).toContain("12");
  });
});
