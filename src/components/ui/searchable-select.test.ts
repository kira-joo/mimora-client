import { describe, expect, it } from "vitest";
import { filterOptions, foldForSearch } from "./searchable-select";

const zones = [
  { value: "Cairo", label: "القاهرة" },
  { value: "Alexandria", label: "الإسكندرية" },
  { value: "Giza", label: "الجيزة" },
  { value: "Kafr El Sheikh", label: "كفر الشيخ" },
];

describe("foldForSearch", () => {
  it("folds hamza forms, taa marbuta, alef maqsura, diacritics and case", () => {
    expect(foldForSearch("الإسكندرية")).toBe("الاسكندريه");
    expect(foldForSearch("مَصْرٌ")).toBe("مصر");
    expect(foldForSearch("  CAIRO  ")).toBe("cairo");
  });
});

describe("filterOptions", () => {
  it("returns everything for an empty query", () => {
    expect(filterOptions(zones, "  ")).toHaveLength(4);
  });
  it("matches Arabic typed loosely, with or without the article", () => {
    expect(filterOptions(zones, "اسكندريه").map((z) => z.value)).toEqual(["Alexandria"]);
    expect(filterOptions(zones, "قاهره").map((z) => z.value)).toEqual(["Cairo"]);
    expect(filterOptions(zones, "الشيخ").map((z) => z.value)).toEqual(["Kafr El Sheikh"]);
  });
  it("matches the English value too", () => {
    expect(filterOptions(zones, "giz").map((z) => z.value)).toEqual(["Giza"]);
  });
  it("returns nothing when nothing matches", () => {
    expect(filterOptions(zones, "أسوان")).toEqual([]);
  });
});
