import { describe, expect, it } from "vitest";
import type { HomeSection, ImageAsset } from "@/lib/api/types";
import { buildHeroSlides } from "./hero-slides";

type Hero = Extract<HomeSection, { type: "campaignHero" }>;
type Tiles = Extract<HomeSection, { type: "categoryTiles" }>;

const image = (url: string): ImageAsset => ({ provider: "x", publicId: url, secureUrl: url, format: "jpg", width: 100, height: 100 });
const hero: Hero = { type: "campaignHero", headline: { en: "H", ar: "H" }, image: image("/a.jpg"), action: { label: { en: "Shop", ar: "تسوق" }, link: { kind: "collection", slug: "boxes", label: { en: "Boxes", ar: "بوكسات" } } } };
const tile = (slug: string, url: string | null) => ({ slug, name: { en: slug, ar: slug }, image: url ? image(url) : undefined });
const tiles = (...categories: Tiles["categories"]): Tiles => ({ type: "categoryTiles", categories });

describe("buildHeroSlides", () => {
  it("starts with the campaign image, captioned by the hero action's link", () => {
    const [first] = buildHeroSlides(hero, undefined, "en");
    expect(first).toMatchObject({ src: "/a.jpg", caption: { label: "Boxes", href: "/collections/boxes" } });
  });

  it("adds each category photograph, linking to its own category", () => {
    const slides = buildHeroSlides(hero, tiles(tile("mugs", "/b.jpg"), tile("pajamas", "/c.jpg")), "en");
    expect(slides.map((slide) => slide.src)).toEqual(["/a.jpg", "/b.jpg", "/c.jpg"]);
    expect(slides[2].caption).toEqual({ label: "pajamas", href: "/categories/pajamas" });
  });

  it("skips a photograph that duplicates an earlier slide", () => {
    const slides = buildHeroSlides(hero, tiles(tile("boxes", "/a.jpg"), tile("mugs", "/b.jpg"), tile("more", "/b.jpg")), "en");
    expect(slides.map((slide) => slide.src)).toEqual(["/a.jpg", "/b.jpg"]);
  });

  it("skips categories without an image and caps the showcase", () => {
    const many = tiles(tile("a", null), tile("b", "/1.jpg"), tile("c", "/2.jpg"), tile("d", "/3.jpg"), tile("e", "/4.jpg"));
    expect(buildHeroSlides(hero, many, "en")).toHaveLength(4);
  });

  it("works with no hero image, and with the locale's labels", () => {
    const slides = buildHeroSlides({ ...hero, image: null }, tiles(tile("mugs", "/b.jpg")), "ar");
    expect(slides).toHaveLength(1);
    expect(buildHeroSlides(hero, undefined, "ar")[0].caption?.label).toBe("بوكسات");
  });
});
