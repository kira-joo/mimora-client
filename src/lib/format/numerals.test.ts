import { describe, expect, it } from "vitest";
import { formatAmount, formatNumber, formatPercent, formatPrice, formatPriceNumber, localized } from "./numerals";

describe("D-10 numerals", () => {
  it("prices in Western digits with no thousands separator in BOTH locales, keeping the currency format", () => {
    // The owner's example: ١٬١٥٠ ج.م.‏ becomes 1150 ج.م.‏ (the bidi marks the locale adds stay).
    expect(formatPrice("ar", "1150", "EGP")).toBe("\u200f1150\u00a0ج.م.\u200f");
    expect(formatPrice("ar", "1250.5", "EGP")).toBe("\u200f1250.50\u00a0ج.م.\u200f");
    expect(formatPrice("ar", "1234567", "EGP")).not.toMatch(/[٠-٩٬,]/);
    // A no-break space keeps the code and the amount on one line.
    expect(formatPrice("en", "1250.5", "EGP")).toBe("EGP\u00a01250.50");
    expect(formatPrice("en", "1200", "EGP")).toBe("EGP\u00a01200");
    expect(formatPrice("en", "90", "EGP")).toBe("EGP\u00a090");
  });

  it("formats a bare amount and a price filter bound the same way as a price's figure", () => {
    expect(formatAmount("ar", "1150", "EGP")).toBe("1150");
    expect(formatAmount("en", "12345.5", "EGP")).toBe("12345.50");
    expect(formatPriceNumber("ar", 1150)).toBe("1150");
    expect(formatPriceNumber("en", 2500.5)).toBe("2500.50");
    expect(formatPriceNumber("ar", 12000)).toBe("12000");
  });

  it("leaves every other number in the locale's own numerals", () => {
    expect(formatNumber("ar", 1150)).toBe("١٬١٥٠");
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
