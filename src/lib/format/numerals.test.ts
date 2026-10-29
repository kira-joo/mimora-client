import { describe, expect, it } from "vitest";
import { formatNumber, formatPercent, formatPrice, localized } from "./numerals";

describe("D-10 numerals", () => {
  it("prices in Arabic-Indic for ar and Western for en, from a string amount", () => {
    expect(formatPrice("ar", "1250.5", "EGP")).toContain("١٬٢٥٠");
    // A no-break space keeps the code and the amount on one line.
    expect(formatPrice("en", "1250.5", "EGP")).toBe("EGP\u00a01,250.50");
    expect(formatPrice("en", "1200", "EGP")).toBe("EGP\u00a01,200");
  });

  it("pins the numbering system rather than trusting the engine's default for plain `ar`", () => {
    expect(formatNumber("ar", 16)).toBe("١٦");
    expect(formatNumber("en", 16)).toBe("16");
  });

  it("renders a tax rate in the locale's numerals", () => {
    expect(formatPercent("en", 14)).toBe("14%");
    expect(formatPercent("ar", 14)).toContain("١٤");
    expect(formatPercent("en", 5.5)).toBe("5.5%");
  });

  it("falls back to the other locale only when the requested one is blank", () => {
    expect(localized({ ar: "قميص", en: "Shirt" }, "en")).toBe("Shirt");
    expect(localized({ ar: "", en: "Shirt" }, "ar")).toBe("Shirt");
    expect(localized(undefined, "ar")).toBe("");
  });
});
