import { describe, expect, it } from "vitest";
import type { Category, ResolvedLink } from "@/lib/api/types";
import { headerLinks, isCurrentLink, topLevelCategories } from "./header-links";

const category = (_id: string, slug: string, en: string, ar: string, sortOrder: number, parentId?: string): Category => ({ _id, slug, name: { ar, en }, sortOrder, parentId });
const link = (kind: ResolvedLink["kind"], slug: string, en: string, ar = en): ResolvedLink => ({ kind, slug, label: { ar, en } });

// The target structure: Gift Boxes, Mugs & Cups, Pajamas & Sleepwear, Accessories (Jewelry, Hair, Winter), Socks & Cozy Wear.
const categories = [
  category("socks", "socks-cozy-wear", "Socks & Cozy Wear", "جوارب وملابس دافئة", 4),
  category("acc", "accessories", "Accessories", "إكسسوارات", 3),
  category("win", "winter-accessories", "Winter Accessories", "إكسسوارات شتوية", 2, "acc"),
  category("jew", "jewelry", "Jewelry", "مجوهرات", 0, "acc"),
  category("hair", "hair-accessories", "Hair Accessories", "إكسسوارات الشعر", 1, "acc"),
  category("pj", "pajamas", "Pajamas & Sleepwear", "بيجامات وملابس نوم", 2),
  category("gift", "gift-boxes", "Gift Boxes", "بوكسات الهدايا", 0),
  category("mugs", "mugs-cups", "Mugs & Cups", "مجات وأكواب", 1),
];

describe("headerLinks", () => {
  it("is generated from the category tree: Home, then the top-level categories in Staff order", () => {
    expect(headerLinks([], categories, "en", "Home").map((item) => [item.label, item.href])).toEqual([
      ["Home", "/"],
      ["Gift Boxes", "/categories/gift-boxes"],
      ["Mugs & Cups", "/categories/mugs-cups"],
      ["Pajamas & Sleepwear", "/categories/pajamas"],
      ["Accessories", "/categories/accessories"],
      ["Socks & Cozy Wear", "/categories/socks-cozy-wear"],
    ]);
  });

  it("gives each top-level category its sub-categories, in Staff order, in the visitor's language", () => {
    const links = headerLinks([], categories, "ar", "الرئيسية");
    const accessories = links.find((item) => item.href === "/categories/accessories")!;
    expect(accessories.children.map((item) => [item.label, item.href])).toEqual([
      ["مجوهرات", "/categories/jewelry"],
      ["إكسسوارات الشعر", "/categories/hair-accessories"],
      ["إكسسوارات شتوية", "/categories/winter-accessories"],
    ]);
    expect(links.find((item) => item.href === "/categories/socks-cozy-wear")!.children).toEqual([]);
  });

  it("appends the merchant's collection and page links, and never repeats a category link from the content list", () => {
    const navigation = [link("category", "mugs-cups", "Mugs"), link("collection", "for-her", "For Her"), link("page", "about", "About")];
    const labels = headerLinks(navigation, categories, "en", "Home").map((item) => item.label);
    expect(labels.slice(-2)).toEqual(["For Her", "About"]);
    expect(labels.filter((label) => label === "Mugs" || label === "Mugs & Cups")).toEqual(["Mugs & Cups"]);
  });

  it("hides a sub-category whose parent is not published (absent from the storefront list)", () => {
    const withoutAccessories = categories.filter((item) => item._id !== "acc");
    const hrefs = headerLinks([], withoutAccessories, "en", "Home").flatMap((item) => [item.href, ...item.children.map((child) => child.href)]);
    expect(hrefs).not.toContain("/categories/jewelry");
    expect(hrefs).not.toContain("/categories/accessories");
  });

  it("with no categories at all, is just Home plus any content links", () => {
    expect(headerLinks([link("page", "about", "About")], [], "en", "Home").map((item) => item.label)).toEqual(["Home", "About"]);
  });
});

describe("topLevelCategories", () => {
  it("returns only roots, sorted, without reordering the input", () => {
    const input = [...categories];
    expect(topLevelCategories(input).map((item) => item.slug)).toEqual(["gift-boxes", "mugs-cups", "pajamas", "accessories", "socks-cozy-wear"]);
    expect(input).toEqual(categories);
  });
});

describe("isCurrentLink", () => {
  const links = headerLinks([], categories, "en", "Home");
  const home = links[0]!;
  const accessories = links.find((item) => item.href === "/categories/accessories")!;
  it("marks Home only on the home page", () => {
    expect(isCurrentLink(home, "/")).toBe(true);
    expect(isCurrentLink(home, "/categories/jewelry")).toBe(false);
  });
  it("marks a parent on its own page and on any of its sub-categories' pages", () => {
    expect(isCurrentLink(accessories, "/categories/accessories")).toBe(true);
    expect(isCurrentLink(accessories, "/categories/jewelry")).toBe(true);
    expect(isCurrentLink(accessories, "/categories/pajamas")).toBe(false);
  });
});
