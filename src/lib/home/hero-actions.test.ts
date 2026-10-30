import { describe, expect, it } from "vitest";
import type { HomeSection } from "@/lib/api/types";
import { heroSecondaryAction } from "./hero-actions";

type Hero = Extract<HomeSection, { type: "campaignHero" }>;
type Band = Extract<HomeSection, { type: "editorialBand" }>;
type Tiles = Extract<HomeSection, { type: "categoryTiles" }>;

const name = (en: string) => ({ en, ar: en });
const hero = (slug: string | null): Hero => ({
  type: "campaignHero",
  headline: name("H"),
  image: null,
  ...(slug ? { action: { label: name("Shop"), link: { kind: "collection" as const, slug, label: name(slug) } } } : {}),
});
const band = (slug: string): Band => ({ type: "editorialBand", headline: name("Band"), collection: { slug, name: name(slug) } });
const tiles = (...slugs: string[]): Tiles => ({ type: "categoryTiles", categories: slugs.map((slug) => ({ slug, name: name(slug) })) });

describe("heroSecondaryAction", () => {
  it("leads to the band's collection when the primary action goes elsewhere", () => {
    expect(heroSecondaryAction(hero("new"), band("boxes"), tiles("mugs"))).toEqual({ name: name("boxes"), href: "/collections/boxes" });
  });

  it("falls back to the first tiled category when the band's collection is the primary destination", () => {
    expect(heroSecondaryAction(hero("boxes"), band("boxes"), tiles("gift-boxes", "mugs"))).toEqual({ name: name("gift-boxes"), href: "/categories/gift-boxes" });
  });

  it("uses the band's collection when the hero has no primary action", () => {
    expect(heroSecondaryAction(hero(null), band("boxes"), undefined)?.href).toBe("/collections/boxes");
  });

  it("is null when nothing distinct from the primary action is published", () => {
    expect(heroSecondaryAction(hero("boxes"), band("boxes"), undefined)).toBeNull();
    expect(heroSecondaryAction(hero("boxes"), undefined, undefined)).toBeNull();
  });
});
