import { describe, expect, it } from "vitest";
import { FALLBACK_STORE_LOCALES, alternateLanguages, isSupportedLocale, resolveLocaleRedirect, resolveStoreLocales, type StoreLocales } from "./store-locales";

const both: StoreLocales = { supported: ["ar", "en"], defaultLocale: "ar" };
const arabicOnly: StoreLocales = { supported: ["ar"], defaultLocale: "ar" };
const englishOnly: StoreLocales = { supported: ["en"], defaultLocale: "en" };

describe("resolveStoreLocales", () => {
  it("honours the profile's supported locales and default", () => {
    expect(resolveStoreLocales({ supportedLocales: ["en"], defaultLocale: "en" })).toEqual(englishOnly);
    expect(resolveStoreLocales({ supportedLocales: ["ar", "en"], defaultLocale: "en" })).toEqual({ supported: ["ar", "en"], defaultLocale: "en" });
  });

  it("drops locales the codebase does not ship, and duplicates", () => {
    expect(resolveStoreLocales({ supportedLocales: ["fr", "en", "en", "de"], defaultLocale: "en" })).toEqual(englishOnly);
  });

  it("falls back to every shipped locale, Arabic default, when the profile is absent or lists nothing usable", () => {
    expect(resolveStoreLocales(null)).toEqual(FALLBACK_STORE_LOCALES);
    expect(resolveStoreLocales(undefined)).toEqual(FALLBACK_STORE_LOCALES);
    expect(resolveStoreLocales({ supportedLocales: [], defaultLocale: "en" })).toEqual(FALLBACK_STORE_LOCALES);
    expect(resolveStoreLocales({ supportedLocales: ["fr"], defaultLocale: "fr" })).toEqual(FALLBACK_STORE_LOCALES);
    expect(FALLBACK_STORE_LOCALES).toEqual(both);
  });

  it("a default the store does not serve is repaired to a served locale, never trusted", () => {
    expect(resolveStoreLocales({ supportedLocales: ["en"], defaultLocale: "ar" })).toEqual(englishOnly);
    expect(resolveStoreLocales({ supportedLocales: ["ar", "en"], defaultLocale: "fr" })).toEqual(both);
    expect(resolveStoreLocales({ supportedLocales: ["en", "ar"] })).toEqual({ supported: ["en", "ar"], defaultLocale: "ar" });
  });
});

describe("isSupportedLocale", () => {
  it("is exactly membership of the served set", () => {
    expect(isSupportedLocale("en", arabicOnly)).toBe(false);
    expect(isSupportedLocale("ar", arabicOnly)).toBe(true);
    expect(isSupportedLocale(undefined, both)).toBe(false);
    expect(isSupportedLocale("fr", both)).toBe(false);
  });
});

describe("resolveLocaleRedirect", () => {
  it("sends / to the store's default locale", () => {
    expect(resolveLocaleRedirect("/", both)).toBe("/ar");
    expect(resolveLocaleRedirect("/", englishOnly)).toBe("/en");
    expect(resolveLocaleRedirect("", englishOnly)).toBe("/en");
  });

  it("sends an unsupported locale to the same path under the default", () => {
    expect(resolveLocaleRedirect("/en", arabicOnly)).toBe("/ar");
    expect(resolveLocaleRedirect("/en/products/red-shirt", arabicOnly)).toBe("/ar/products/red-shirt");
    expect(resolveLocaleRedirect("/ar/cart", englishOnly)).toBe("/en/cart");
    expect(resolveLocaleRedirect("/en/account/orders", arabicOnly)).toBe("/ar/account/orders");
  });

  it("leaves a supported locale alone", () => {
    expect(resolveLocaleRedirect("/ar", both)).toBeNull();
    expect(resolveLocaleRedirect("/en/products", both)).toBeNull();
    expect(resolveLocaleRedirect("/ar/products", arabicOnly)).toBeNull();
  });

  it("prefixes an unprefixed path with the STORE's default, not the codebase's", () => {
    expect(resolveLocaleRedirect("/products", englishOnly)).toBe("/en/products");
    expect(resolveLocaleRedirect("/products/x", both)).toBe("/ar/products/x");
  });

  it("does not mistake a path that merely starts with a locale's letters for that locale", () => {
    expect(resolveLocaleRedirect("/english-guide", arabicOnly)).toBe("/ar/english-guide");
    expect(resolveLocaleRedirect("/enx/products", arabicOnly)).toBe("/ar/enx/products");
  });

  it("is a fixed point: the destination of every redirect needs no further redirect", () => {
    for (const locales of [both, arabicOnly, englishOnly]) {
      for (const path of ["/", "/en", "/ar", "/en/products/x", "/ar/cart", "/products", "/fr/x"]) {
        const target = resolveLocaleRedirect(path, locales);
        if (target !== null) expect(resolveLocaleRedirect(target, locales)).toBeNull();
      }
    }
  });
});

describe("alternateLanguages", () => {
  it("lists every served locale", () => {
    expect(alternateLanguages("/products/x", both)).toEqual({ ar: "/ar/products/x", en: "/en/products/x" });
    expect(alternateLanguages("", both)).toEqual({ ar: "/ar", en: "/en" });
  });

  it("lists ONLY served locales — never a language the store does not offer", () => {
    expect(alternateLanguages("/pages/terms", arabicOnly)).toEqual({ ar: "/ar/pages/terms" });
    expect(Object.keys(alternateLanguages("", englishOnly))).toEqual(["en"]);
  });
});
