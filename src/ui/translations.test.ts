import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { defaultLanguage, isTranslationKey, translate } from "./translations";

describe("UI translations", () => {
  it("defines every translation key used by the HTML in both languages", () => {
    const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    const keys = [...html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map((match) => match[1]);
    expect(keys.length).toBeGreaterThan(20);
    for (const key of keys) {
      expect(isTranslationKey(key ?? "")).toBe(true);
      if (key && isTranslationKey(key)) {
        expect(translate("en", key)).not.toBe("");
        expect(translate("de", key)).not.toBe("");
      }
    }
  });

  it("keeps the snappy deck facts in English in the German interface", () => {
    expect(defaultLanguage).toBe("de");
    expect(translate("de", "figures")).toBe("figures");
    expect(translate("de", "choices")).toBe("choices");
    expect(translate("de", "pocketSet")).toBe("Pocket Set");
  });
});
