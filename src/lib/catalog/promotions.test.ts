import { describe, expect, it } from "vitest";
import type { ActivePromotion } from "@/lib/api/types";
import { promotionFor, promotionReaches, toPromotionBadges } from "./promotions";

const scope = (overrides: Partial<ActivePromotion["scope"]> = {}): ActivePromotion["scope"] => ({ all: false, categoryIds: [], collectionIds: [], productIds: [], variantRestricted: false, ...overrides });
const promo = (id: string, en: string, overrides: Partial<ActivePromotion> = {}): ActivePromotion => ({ _id: id, name: { en, ar: `${en}-ar` }, description: { en: "", ar: "" }, type: "PERCENT", scope: scope({ all: true }), ...overrides });
const minSpend = (amount: string) => `over ${amount}`;

describe("toPromotionBadges", () => {
  it("names each promotion in the page's locale", () => {
    expect(toPromotionBadges([promo("1", "Summer")], "en", minSpend)[0]?.name).toBe("Summer");
    expect(toPromotionBadges([promo("1", "Summer")], "ar", minSpend)[0]?.name).toBe("Summer-ar");
  });

  it("adds a condition only for a real minimum spend — zero and absent say nothing", () => {
    const [withMin, zero, none] = toPromotionBadges([promo("1", "A", { minSubtotal: "200" }), promo("2", "B", { minSubtotal: "0.00" }), promo("3", "C")], "en", minSpend);
    expect(withMin?.condition).toBe("over 200");
    expect(zero?.condition).toBeUndefined();
    expect(none?.condition).toBeUndefined();
  });

  it("drops a promotion that has no name in either locale", () => {
    expect(toPromotionBadges([promo("1", "", { name: { en: "", ar: "" } })], "en", minSpend)).toEqual([]);
  });
});

describe("promotionReaches", () => {
  const target = { productId: "p1", categoryId: "c1", collectionIds: ["k1"] };

  it("an unscoped promotion reaches everything", () => {
    expect(promotionReaches(scope({ all: true }), target)).toBe(true);
  });

  it("any one of product, category or collection is enough", () => {
    expect(promotionReaches(scope({ productIds: ["p1"] }), target)).toBe(true);
    expect(promotionReaches(scope({ categoryIds: ["c1"] }), target)).toBe(true);
    expect(promotionReaches(scope({ collectionIds: ["k1"] }), target)).toBe(true);
  });

  it("a scoped promotion does NOT reach a product outside its scope", () => {
    expect(promotionReaches(scope({ categoryIds: ["other"], productIds: ["other"] }), target)).toBe(false);
    expect(promotionReaches(scope({ categoryIds: ["c1"] }), { productId: "p9" })).toBe(false);
  });

  it("a variant-only promotion earns no product badge", () => {
    expect(promotionReaches(scope({ variantRestricted: true }), target)).toBe(false);
  });

  it("a variant-restricted promotion that also names this category still reaches it", () => {
    expect(promotionReaches(scope({ variantRestricted: true, categoryIds: ["c1"] }), target)).toBe(true);
  });
});

describe("promotionFor", () => {
  const badges = toPromotionBadges([promo("1", "Store-wide"), promo("2", "Shirts", { scope: scope({ categoryIds: ["c1"] }), minSubtotal: "100" }), promo("3", "Shoes", { scope: scope({ categoryIds: ["c2"] }) })], "en", minSpend);

  it("prefers the promotion aimed at this product over the store-wide one", () => {
    expect(promotionFor(badges, { productId: "p", categoryId: "c1" })).toEqual({ name: "Shirts", condition: "over 100" });
  });

  it("falls back to the store-wide promotion", () => {
    expect(promotionFor(badges, { productId: "p", categoryId: "zzz" })).toEqual({ name: "Store-wide" });
  });

  it("is null when nothing reaches the product", () => {
    expect(promotionFor(badges.filter((badge) => !badge.scope.all), { productId: "p", categoryId: "zzz" })).toBeNull();
    expect(promotionFor([], { productId: "p" })).toBeNull();
  });

  it("never carries a price — only a name and a condition", () => {
    const keys = Object.keys(promotionFor(badges, { productId: "p", categoryId: "c1" })!);
    expect(keys.sort()).toEqual(["condition", "name"]);
  });
});
