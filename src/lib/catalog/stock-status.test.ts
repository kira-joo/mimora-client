import { describe, expect, it } from "vitest";
import { packInfo, sharedPackInfo, stockStatus } from "./stock-status";

const v = (overrides: Partial<{ purchasable: boolean; lowStock: boolean; onBackorder: boolean; unitOfMeasure: string; unitsPerSale: number }> = {}) => ({ purchasable: true, lowStock: false, onBackorder: false, unitOfMeasure: "EACH", unitsPerSale: 1, ...overrides });

describe("stockStatus", () => {
  it("a CONTINUE_SELLING variant at zero stock is 'available to order', NOT 'in stock'", () => {
    expect(stockStatus(v({ onBackorder: true }), true)).toBe("availableToOrder");
    expect(stockStatus(v({ onBackorder: true }), false)).toBe("availableToOrder");
    expect(stockStatus(v({ onBackorder: true }), true)).not.toBe("inStock");
  });

  it("an ordinary purchasable variant is in stock", () => {
    expect(stockStatus(v(), true)).toBe("inStock");
    expect(stockStatus(v(), false)).toBe("inStock");
  });

  it("raises low stock only from live data", () => {
    expect(stockStatus(v({ lowStock: true }), true)).toBe("lowStock");
    expect(stockStatus(v({ lowStock: true }), false)).toBe("inStock");
  });

  it("a variant that cannot be bought is sold out whatever else it says", () => {
    expect(stockStatus(v({ purchasable: false, onBackorder: true, lowStock: true }), true)).toBe("soldOut");
  });
});

describe("packInfo", () => {
  it("names a pack and a box of more than one unit", () => {
    expect(packInfo(v({ unitOfMeasure: "PACK", unitsPerSale: 6 }))).toEqual({ kind: "pack", units: 6 });
    expect(packInfo(v({ unitOfMeasure: "BOX", unitsPerSale: 12 }))).toEqual({ kind: "box", units: 12 });
  });

  it("says nothing for EACH, for a single-unit pack, or for nonsense counts", () => {
    expect(packInfo(v())).toBeNull();
    expect(packInfo(v({ unitOfMeasure: "EACH", unitsPerSale: 6 }))).toBeNull();
    expect(packInfo(v({ unitOfMeasure: "PACK", unitsPerSale: 1 }))).toBeNull();
    expect(packInfo(v({ unitOfMeasure: "PACK", unitsPerSale: 0 }))).toBeNull();
    expect(packInfo(v({ unitOfMeasure: "PACK", unitsPerSale: 2.5 }))).toBeNull();
  });
});

describe("sharedPackInfo", () => {
  it("is the pack when every variant is sold the same way", () => {
    expect(sharedPackInfo([v({ unitOfMeasure: "PACK", unitsPerSale: 4 }), v({ unitOfMeasure: "PACK", unitsPerSale: 4 })])).toEqual({ kind: "pack", units: 4 });
  });

  it("is null when variants differ, or any is sold singly, or there are none", () => {
    expect(sharedPackInfo([v({ unitOfMeasure: "PACK", unitsPerSale: 4 }), v({ unitOfMeasure: "PACK", unitsPerSale: 8 })])).toBeNull();
    expect(sharedPackInfo([v({ unitOfMeasure: "PACK", unitsPerSale: 4 }), v()])).toBeNull();
    expect(sharedPackInfo([])).toBeNull();
  });
});
