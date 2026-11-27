import { describe, expect, it } from "vitest";
import type { HomeSection } from "@/lib/api/types";
import { HOME_RAIL_LIMIT, railHref, railQuery } from "./rail-query";

const collections = [{ _id: "col1", slug: "curated-gift-boxes" }];
const categories = [{ _id: "cat1", slug: "pajamas" }];
const name = { ar: "ع", en: "E" };
type Rail = Extract<HomeSection, { type: "productRail" }>;

describe("home rail query — one read for every source, at most 10 products", () => {
  it("a category rail reads that category (manual order: no sort), capped at 10", () => {
    const section: Rail = { type: "productRail", source: "category", category: { slug: "pajamas", name } };
    expect(railQuery(section, collections, categories)).toEqual({ limit: 10, categoryId: "cat1" });
    expect(HOME_RAIL_LIMIT).toBe(10);
  });

  it("a collection rail and a collection story read the collection in manual order", () => {
    expect(railQuery({ type: "productRail", source: "collection", collection: { slug: "curated-gift-boxes", name } }, collections, categories)).toEqual({ limit: 10, collectionId: "col1" });
    expect(railQuery({ type: "collectionStory", collection: { slug: "curated-gift-boxes", name } } as HomeSection, collections, categories)).toEqual({ limit: 10, collectionId: "col1" });
  });

  it("a newest rail asks for newest explicitly", () => {
    expect(railQuery({ type: "productRail", source: "newest" }, collections, categories)).toEqual({ limit: 10, sort: "newest" });
  });

  it("an unknown slug is skipped, never widened to the whole catalog; other section types read nothing", () => {
    expect(railQuery({ type: "productRail", source: "category", category: { slug: "gone", name } }, collections, categories)).toBeNull();
    expect(railQuery({ type: "productRail", source: "collection", collection: { slug: "gone", name } }, collections, categories)).toBeNull();
    expect(railQuery({ type: "assuranceStrip" }, collections, categories)).toBeNull();
  });

  it("View All opens the full listing of the same products", () => {
    expect(railHref({ type: "productRail", source: "category", category: { slug: "pajamas", name } })).toBe("/categories/pajamas");
    expect(railHref({ type: "productRail", source: "collection", collection: { slug: "curated-gift-boxes", name } })).toBe("/collections/curated-gift-boxes");
    expect(railHref({ type: "productRail", source: "newest" })).toBe("/products?sort=newest");
  });
});
