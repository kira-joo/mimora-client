import { describe, expect, it } from "vitest";
import type { MatrixVariant } from "../types";
import { exactVariant, invalidatedAxes, priceRange, valueState } from "./variant-selection";

const v = (id: string, colour: string, size: string, purchasable = true, price = "100.00"): MatrixVariant => ({
  variantId: id,
  sku: id,
  optionValues: [
    { key: "colour", value: colour },
    { key: "size", value: size },
  ],
  price,
  purchasable,
});

// Sparse: red only in S; blue in S and M; blue M sold out.
const matrix = [v("1", "red", "S"), v("2", "blue", "S"), v("3", "blue", "M", false)];

describe("valueState — availability is existential, never per-axis conjunction", () => {
  it("'M exists' and 'red exists' does not make red-M available", () => {
    expect(valueState("size", "M", { colour: "red" }, matrix)).toEqual({ state: "notMade" });
  });

  it("tells sold out apart from not made", () => {
    expect(valueState("size", "M", { colour: "blue" }, matrix)).toEqual({ state: "soldOut" });
  });

  it("is available when a purchasable variant carries it and fits the other choices", () => {
    expect(valueState("size", "S", { colour: "red" }, matrix)).toEqual({ state: "available" });
    expect(valueState("colour", "blue", {}, matrix)).toEqual({ state: "available" });
  });
});

describe("selection rules", () => {
  it("keeps an invalidated choice and reports it — it is never silently replaced", () => {
    expect(invalidatedAxes({ size: "M", colour: "red" }, matrix)).toEqual(["size", "colour"]);
    expect(invalidatedAxes({ size: "S", colour: "red" }, matrix)).toEqual([]);
  });

  it("resolves a variant only for a complete, purchasable selection", () => {
    expect(exactVariant({ colour: "red" }, ["colour", "size"], matrix)).toBeUndefined();
    expect(exactVariant({ colour: "blue", size: "M" }, ["colour", "size"], matrix)).toBeUndefined();
    expect(exactVariant({ colour: "blue", size: "S" }, ["colour", "size"], matrix)?.variantId).toBe("2");
  });

  it("ranges over purchasable variants", () => {
    expect(priceRange([v("a", "x", "S", true, "90.00"), v("b", "x", "M", true, "120.00"), v("c", "x", "L", false, "10.00")])).toEqual({ min: "90.00", max: "120.00" });
  });
});
