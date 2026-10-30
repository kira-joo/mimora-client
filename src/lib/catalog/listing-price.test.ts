import { describe, expect, it } from "vitest";
import { boundToPosition, niceStep, positionToBound, priceProblem, sliderScale } from "./listing-price";

describe("price slider scale", () => {
  it("widens the facet range to whole steps so both ends stay reachable", () => {
    expect(sliderScale({ min: "125.50", max: "1180" })).toEqual({ min: 120, max: 1180, step: 10 });
    expect(sliderScale({ min: "90", max: "95" })).toEqual({ min: 90, max: 95, step: 1 });
  });

  it("has no scale when there is no range to choose within", () => {
    expect(sliderScale(undefined)).toBeNull();
    expect(sliderScale({ min: "100" })).toBeNull();
    expect(sliderScale({ min: "100", max: "100" })).toBeNull();
    expect(sliderScale({ min: "abc", max: "100" })).toBeNull();
  });

  it("steps coarser as the span widens", () => {
    expect([50, 400, 1500, 8000, 50000].map(niceStep)).toEqual([1, 5, 10, 50, 100]);
  });
});

describe("thumb position <-> filter bound", () => {
  const scale = { min: 100, max: 1000, step: 10 };

  it("treats the track's ends as no bound — so a fractional facet end is never rounded into the URL", () => {
    expect(positionToBound(100, scale, "min")).toBeUndefined();
    expect(positionToBound(1000, scale, "max")).toBeUndefined();
    expect(positionToBound(450, scale, "min")).toBe("450");
    expect(positionToBound(450, scale, "max")).toBe("450");
    // The max thumb at the min end is a real (very low) cap, not "no bound".
    expect(positionToBound(100, scale, "max")).toBe("100");
  });

  it("places an absent bound on its end and clamps a bound outside the track", () => {
    expect(boundToPosition(undefined, scale, "min")).toBe(100);
    expect(boundToPosition(undefined, scale, "max")).toBe(1000);
    expect(boundToPosition("450", scale, "min")).toBe(450);
    expect(boundToPosition("5", scale, "min")).toBe(100);
    expect(boundToPosition("5000", scale, "max")).toBe(1000);
    expect(boundToPosition("junk", scale, "max")).toBe(1000);
  });
});

describe("price problems", () => {
  it("accepts empty, whole and two-decimal prices in order", () => {
    expect(priceProblem("", "")).toBeNull();
    expect(priceProblem("100", "")).toBeNull();
    expect(priceProblem("", "450.50")).toBeNull();
    expect(priceProblem("450", "450")).toBeNull();
  });

  it("rejects a malformed price, and a lowest price above the highest", () => {
    expect(priceProblem("1e3", "")).toBe("format");
    expect(priceProblem("12.345", "")).toBe("format");
    expect(priceProblem("", "-4")).toBe("format");
    expect(priceProblem("500", "450.99")).toBe("order");
    expect(priceProblem("450.10", "450.09")).toBe("order");
  });
});
