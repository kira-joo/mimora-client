import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/api/types";
import { toCardProduct } from "./card-model";
import type { PromotionBadge } from "./promotions";

const product = (overrides: Partial<Product> = {}, purchasableVariantCount = 2): Product => ({
  _id: "p1",
  name: { en: "Shirt", ar: "قميص" },
  slug: "shirt",
  categoryId: "c1",
  collectionIds: [],
  images: [],
  optionAxes: [],
  attributes: [],
  listing: { purchasableVariantCount },
  ratingsSummary: { average: 0, count: 0 },
  createdAt: "2020-01-01T00:00:00.000Z",
  ...overrides,
});
const badge = (overrides: Partial<PromotionBadge> = {}): PromotionBadge => ({ id: "x", name: "Summer", scope: { all: true, categoryIds: [], collectionIds: [], productIds: [], variantRestricted: false }, ...overrides });
const NOW = Date.parse("2026-10-23T00:00:00Z");

describe("toCardProduct — automatic promotions", () => {
  it("carries the promotion that reaches the product: a name and a condition, nothing priced", () => {
    const card = toCardProduct(product(), "en", [], NOW, [badge({ condition: "On orders over 100" })]);
    expect(card.promotion).toEqual({ name: "Summer", condition: "On orders over 100" });
    expect(card.price).toBeUndefined();
  });

  it("carries none when there are no promotions, or none reaches this product", () => {
    expect(toCardProduct(product(), "en", [], NOW).promotion).toBeUndefined();
    const elsewhere = badge({ scope: { all: false, categoryIds: ["other"], collectionIds: [], productIds: [], variantRestricted: false } });
    expect(toCardProduct(product(), "en", [], NOW, [elsewhere]).promotion).toBeUndefined();
  });

  it("a sold-out product advertises nothing it cannot sell", () => {
    const card = toCardProduct(product({}, 0), "en", [], NOW, [badge()]);
    expect(card.soldOut).toBe(true);
    expect(card.promotion).toBeUndefined();
  });
});

describe("toCardProduct — low-stock signal (plan #19)", () => {
  const withListing = (listing: Partial<Product["listing"]>, count = 2) => product({ listing: { purchasableVariantCount: count, ...listing } }, count);

  it("carries the signal when the listing says low stock", () => {
    expect(toCardProduct(withListing({ lowStock: true }), "en", [], NOW).lowStock).toBe(true);
  });

  it("carries nothing when the listing says plenty, or says nothing", () => {
    expect(toCardProduct(withListing({ lowStock: false }), "en", [], NOW).lowStock).toBeUndefined();
    expect(toCardProduct(withListing({}), "en", [], NOW).lowStock).toBeUndefined();
  });

  it("a sold-out product is sold out, not 'a few left'", () => {
    const card = toCardProduct(withListing({ lowStock: true }, 0), "en", [], NOW);
    expect(card.soldOut).toBe(true);
    expect(card.lowStock).toBeUndefined();
  });
});
