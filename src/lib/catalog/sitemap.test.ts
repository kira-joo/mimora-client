import { describe, expect, it } from "vitest";
import type { ResolvedLink } from "@/lib/api/types";
import { contentPageSlugs, sitemapEntries, sitemapPaths } from "./sitemap";

const link = (kind: ResolvedLink["kind"], slug: string): ResolvedLink => ({ kind, slug, label: { en: slug, ar: slug } });
const empty = { categorySlugs: [], collectionSlugs: [], brandSlugs: [], productSlugs: [], contentPageSlugs: [] };

describe("contentPageSlugs", () => {
  it("reads page links from legal, header and footer navigation, ignoring categories and collections", () => {
    const slugs = contentPageSlugs({ legalLinks: [link("page", "terms"), link("page", "privacy")], headerNavigation: [link("category", "shirts"), link("page", "about")], footerNavigation: [link("collection", "sale"), link("page", "contact")] });
    expect(slugs).toEqual(["terms", "privacy", "about", "contact"]);
  });

  it("lists a page once even when several places link to it", () => {
    expect(contentPageSlugs({ legalLinks: [link("page", "terms")], headerNavigation: [], footerNavigation: [link("page", "terms")] })).toEqual(["terms"]);
  });

  it("is empty — never a guessed list — when the store content is unavailable", () => {
    expect(contentPageSlugs(null)).toEqual([]);
    expect(contentPageSlugs(undefined)).toEqual([]);
  });

  it("does not invent legal pages that the store does not link", () => {
    const slugs = contentPageSlugs({ legalLinks: [link("page", "terms")], headerNavigation: [], footerNavigation: [] });
    for (const guessed of ["privacy", "returns", "shipping", "contact"]) expect(slugs).not.toContain(guessed);
  });
});

describe("sitemapPaths", () => {
  it("includes home, the catalogue, categories, collections, BRANDS, every product and the content pages", () => {
    const paths = sitemapPaths({ categorySlugs: ["shirts"], collectionSlugs: ["sale"], brandSlugs: ["acme"], productSlugs: ["p1", "p2"], contentPageSlugs: ["terms"] });
    expect(paths).toEqual(["", "/products", "/categories/shirts", "/collections/sale", "/brands/acme", "/products/p1", "/products/p2", "/pages/terms"]);
  });

  it("is not capped at a hundred products", () => {
    const productSlugs = Array.from({ length: 345 }, (_, index) => `p${index}`);
    expect(sitemapPaths({ ...empty, productSlugs }).filter((path) => path.startsWith("/products/"))).toHaveLength(345);
  });

  it("is just home and the catalogue for an empty store", () => {
    expect(sitemapPaths(empty)).toEqual(["", "/products"]);
  });
});

describe("sitemapEntries", () => {
  const entries = sitemapEntries(["", "/products/x"], { origin: "https://shop.example.test", locales: ["ar", "en"], defaultLocale: "ar" });

  it("writes each path at the default locale with an alternate per locale", () => {
    expect(entries[1]).toEqual({ url: "https://shop.example.test/ar/products/x", alternates: { languages: { ar: "https://shop.example.test/ar/products/x", en: "https://shop.example.test/en/products/x" } } });
  });

  it("the home entry is the locale root", () => {
    expect(entries[0]?.url).toBe("https://shop.example.test/ar");
  });
});
