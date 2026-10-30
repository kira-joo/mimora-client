import { describe, expect, it } from "vitest";
import { CacheTag, isKnownCacheTag } from "./cache-tag";

/*
 * Pinned to the literal strings the backend publishes. If this fails, the two
 * vocabularies drifted — and the symptom of drift is content that never
 * updates, silently. Change both sides together.
 */
describe("cache-tag contract", () => {
  it("matches the tags mimora-staff emits, byte for byte", () => {
    expect(Object.values(CacheTag).sort()).toEqual(
      ["BRANDS", "CATEGORIES", "COLLECTIONS", "CONTENT", "DELIVERY_ZONES", "FULFILMENT_SETTINGS", "OPERATING_HOURS", "PAGES", "PAYMENT_SETTINGS", "PICKUP_LOCATIONS", "PRODUCTS", "PROMOTIONS", "SIZE_GUIDES", "STORE_PROFILE"].sort()
    );
  });

  it("refuses tags it does not know", () => {
    expect(isKnownCacheTag("PRODUCTS")).toBe(true);
    expect(isKnownCacheTag("products")).toBe(false);
    expect(isKnownCacheTag("THEME")).toBe(false);
  });
});
