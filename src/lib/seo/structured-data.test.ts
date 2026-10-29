import { describe, expect, it } from "vitest";
import { absoluteUrl, breadcrumbListJsonLd, offerAvailability, productJsonLd, serializeJsonLd, storeJsonLd, type OfferVariant } from "./structured-data";

const ORIGIN = "https://shop.example.test";
const variant = (overrides: Partial<OfferVariant> = {}): OfferVariant => ({ variantId: "v1", sku: "SKU-1", price: "50.00", purchasable: true, onBackorder: false, ...overrides });

describe("absoluteUrl", () => {
  it("joins origin, locale and path — and the home path is the locale root", () => {
    expect(absoluteUrl(ORIGIN, "ar", "/products/x")).toBe(`${ORIGIN}/ar/products/x`);
    expect(absoluteUrl(`${ORIGIN}/`, "en", "/")).toBe(`${ORIGIN}/en`);
  });
  it("is null without an origin", () => {
    expect(absoluteUrl(null, "en", "/")).toBeNull();
  });
});

describe("breadcrumbListJsonLd", () => {
  const trail = [{ label: "Home", href: "/" }, { label: "Shirts", href: "/categories/shirts" }, { label: "Olive shirt" }];

  it("numbers the items from 1, with absolute URLs, the current page taking its own URL", () => {
    const data = breadcrumbListJsonLd(trail, { origin: ORIGIN, locale: "en", currentPath: "/products/olive" })!;
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/en` },
      { "@type": "ListItem", position: 2, name: "Shirts", item: `${ORIGIN}/en/categories/shirts` },
      { "@type": "ListItem", position: 3, name: "Olive shirt", item: `${ORIGIN}/en/products/olive` },
    ]);
  });

  it("is omitted rather than emitted with relative or missing URLs", () => {
    expect(breadcrumbListJsonLd(trail, { origin: null, locale: "en", currentPath: "/x" })).toBeNull();
    expect(breadcrumbListJsonLd([], { origin: ORIGIN, locale: "en", currentPath: "/x" })).toBeNull();
    expect(breadcrumbListJsonLd([{ label: "", href: "/" }], { origin: ORIGIN, locale: "en", currentPath: "/x" })).toBeNull();
  });
});

describe("storeJsonLd", () => {
  it("is an OnlineStore built from the profile, leaving out what the profile does not have", () => {
    const data = storeJsonLd({ origin: ORIGIN, locale: "ar", name: "Store", phone: "+201000000000", currency: "EGP", socialUrls: ["https://social.example.test/s"], email: undefined, description: "" })!;
    expect(data).toMatchObject({ "@type": "OnlineStore", name: "Store", url: `${ORIGIN}/ar`, telephone: "+201000000000", currenciesAccepted: "EGP", sameAs: ["https://social.example.test/s"] });
    expect(data).not.toHaveProperty("email");
    expect(data).not.toHaveProperty("description");
    expect(data).not.toHaveProperty("logo");
    expect(JSON.stringify(data)).not.toContain("undefined");
  });

  it("falls back to the logo for the image, and is omitted without an origin or a name", () => {
    expect(storeJsonLd({ origin: ORIGIN, locale: "en", name: "S", logoUrl: "https://cdn.example.test/l.png" })).toMatchObject({ logo: "https://cdn.example.test/l.png", image: "https://cdn.example.test/l.png" });
    expect(storeJsonLd({ origin: null, locale: "en", name: "S" })).toBeNull();
    expect(storeJsonLd({ origin: ORIGIN, locale: "en", name: "" })).toBeNull();
  });
});

describe("offerAvailability", () => {
  it("InStock, BackOrder for a purchasable variant with nothing on hand, OutOfStock otherwise", () => {
    expect(offerAvailability({ purchasable: true, onBackorder: false })).toBe("https://schema.org/InStock");
    expect(offerAvailability({ purchasable: true, onBackorder: true })).toBe("https://schema.org/BackOrder");
    expect(offerAvailability({ purchasable: false, onBackorder: false })).toBe("https://schema.org/OutOfStock");
  });
  it("never reports a non-purchasable variant as backordered", () => {
    expect(offerAvailability({ purchasable: false, onBackorder: true })).toBe("https://schema.org/OutOfStock");
  });
});

describe("productJsonLd", () => {
  const input = { name: "Olive shirt", imageUrls: ["https://cdn.example.test/1.jpg"], currency: "EGP", url: `${ORIGIN}/en/products/olive`, variants: [variant(), variant({ variantId: "v2", sku: "SKU-2", price: "55.00", purchasable: false }), variant({ variantId: "v3", sku: "SKU-3", onBackorder: true })] };

  it("carries one Offer per variant, each with sku, url, price, priceCurrency and availability", () => {
    const { offers } = productJsonLd(input) as { offers: Array<Record<string, unknown>> };
    expect(offers).toHaveLength(3);
    expect(offers[0]).toEqual({ "@type": "Offer", sku: "SKU-1", url: `${ORIGIN}/en/products/olive`, price: "50.00", priceCurrency: "EGP", availability: "https://schema.org/InStock" });
    expect(offers[1]).toMatchObject({ sku: "SKU-2", availability: "https://schema.org/OutOfStock" });
    expect(offers[2]).toMatchObject({ sku: "SKU-3", availability: "https://schema.org/BackOrder" });
  });

  it("omits every offer when the currency is unknown — never priceCurrency undefined", () => {
    for (const currency of [undefined, "", "  "]) {
      const data = productJsonLd({ ...input, currency });
      expect(data).not.toHaveProperty("offers");
      expect(JSON.stringify(data)).not.toContain("priceCurrency");
      expect(JSON.stringify(data)).not.toContain("undefined");
    }
  });

  it("leaves url off the offers (and the product) when the deployment has no origin", () => {
    const data = productJsonLd({ ...input, url: null }) as { offers: Array<Record<string, unknown>> };
    expect(data).not.toHaveProperty("url");
    expect(data.offers[0]).not.toHaveProperty("url");
  });

  it("includes the rating only when there are reviews, and the brand only when there is one", () => {
    expect(productJsonLd({ ...input, rating: { average: 4.5, count: 0 } })).not.toHaveProperty("aggregateRating");
    expect(productJsonLd({ ...input, rating: { average: 4.5, count: 3 }, brandName: "Acme" })).toMatchObject({ aggregateRating: { ratingValue: 4.5, reviewCount: 3 }, brand: { "@type": "Brand", name: "Acme" } });
    expect(productJsonLd(input)).not.toHaveProperty("brand");
  });

  it("has no offers for a product with no variants, and no images key when there are none", () => {
    const data = productJsonLd({ ...input, variants: [], imageUrls: [] });
    expect(data).not.toHaveProperty("offers");
    expect(data).not.toHaveProperty("image");
  });
});

describe("serializeJsonLd", () => {
  it("cannot be broken out of its script tag", () => {
    const separator = String.fromCharCode(0x2028);
    const text = serializeJsonLd({ name: `</script><script>alert(1)</script>${separator}` });
    expect(text).not.toContain("</script>");
    expect(text).not.toContain("<");
    expect(text).not.toContain(separator);
    expect(JSON.parse(text).name).toBe(`</script><script>alert(1)</script>${separator}`);
  });
});
