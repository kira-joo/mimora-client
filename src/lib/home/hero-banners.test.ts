import { describe, expect, it, vi } from "vitest";

// Static image imports resolve to the file's metadata under Next; here each is a stand-in naming its own file.
vi.mock("../../../public/images/hero/banner-1.png", () => ({ default: { src: "/banner-1.png", width: 1981, height: 794 } }));
vi.mock("../../../public/images/hero/banner-1-en.png", () => ({ default: { src: "/banner-1-en.png", width: 2048, height: 768 } }));
vi.mock("../../../public/images/hero/banner-md-ar.png", () => ({ default: { src: "/banner-md-ar.png", width: 1024, height: 1536 } }));
vi.mock("../../../public/images/hero/banner-md-en.png", () => ({ default: { src: "/banner-md-en.png", width: 1024, height: 1536 } }));
vi.mock("../../../public/images/hero/banner-2.png", () => ({ default: { src: "/banner-2.png", width: 1672, height: 941 } }));
vi.mock("../../../public/images/hero/banner-3.png", () => ({ default: { src: "/banner-3.png", width: 1672, height: 941 } }));

import { heroBanners } from "./hero-banners";

describe("heroBanners", () => {
  it("is exactly three campaigns, the brand banner first", () => {
    expect(heroBanners("ar", []).map((banner) => banner.id)).toEqual(["brand", "gifts", "offers"]);
  });

  it("the brand banner is ONE slide whose artwork follows the language", () => {
    expect(heroBanners("ar", [])[0].image.src).toBe("/banner-1.png");
    expect(heroBanners("en", [])[0].image.src).toBe("/banner-1-en.png");
    expect(heroBanners("en", []).filter((banner) => banner.kind === "artwork")).toHaveLength(1);
  });

  it("the brand banner carries a portrait version for phones, in the same language", () => {
    const [ar] = heroBanners("ar", []);
    const [en] = heroBanners("en", []);
    expect(ar.kind === "artwork" && ar.mobileImage.src).toBe("/banner-md-ar.png");
    expect(en.kind === "artwork" && en.mobileImage.src).toBe("/banner-md-en.png");
  });

  it("the brand banner leads to the Gift Boxes category; the gift collection to All Products", () => {
    const [brand, gifts] = heroBanners("en", []);
    expect(brand.href).toBe("/categories/gift-boxes");
    expect(gifts.href).toBe("/products");
  });

  it("the offers campaign uses the store's offers collection when there is one, and never invents a route", () => {
    expect(heroBanners("en", ["curated-gift-boxes", "offers"])[2].href).toBe("/collections/offers");
    expect(heroBanners("en", ["curated-gift-boxes"])[2].href).toBe("/products");
  });

  it("puts each photograph's copy on that photograph's empty side, whatever the reading direction", () => {
    for (const locale of ["ar", "en"] as const) {
      const [, gifts, offers] = heroBanners(locale, []);
      expect(gifts.kind === "photo" && gifts.copySide).toBe("right");
      expect(offers.kind === "photo" && offers.copySide).toBe("left");
    }
  });
});
