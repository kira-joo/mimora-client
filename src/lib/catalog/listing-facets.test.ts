import { describe, expect, it } from "vitest";
import { appliedFilterCount, clearFilters, facetClear, facetSelected, facetToggle, type FacetDef } from "./listing-facets";
import { parseListing } from "./listing-query";

const values = [{ key: "m", label: "M", count: 2 }];
const size: FacetDef = { id: "opt-size", source: "opt", axis: "size", label: "Size", mode: "multi", values };
const colour: FacetDef = { id: "opt-colour", source: "opt", axis: "colour", label: "Colour", mode: "multi", values };
const material: FacetDef = { id: "attr-material", source: "attr", axis: "material", label: "Material", mode: "multi", values };
const category: FacetDef = { id: "category", source: "category", label: "Category", mode: "single", values };
const brand: FacetDef = { id: "brand", source: "brand", label: "Brand", mode: "single", values };

describe("facet toggling", () => {
  it("adds and removes values of a multi facet without touching its neighbours", () => {
    let state = parseListing({});
    state = facetToggle(size, state, "m");
    state = facetToggle(size, state, "l");
    state = facetToggle(colour, state, "red");
    expect(state.opt).toEqual(["colour:red", "size:l", "size:m"]);
    expect(facetSelected(size, state)).toEqual(["l", "m"]);
    state = facetToggle(size, state, "m");
    expect(state.opt).toEqual(["colour:red", "size:l"]);
  });

  it("treats a single facet as a radio: choosing replaces, choosing the chosen one clears", () => {
    let state = facetToggle(category, parseListing({}), "scarves");
    expect(state.category).toBe("scarves");
    state = facetToggle(category, state, "bags");
    expect(state.category).toBe("bags");
    expect(facetToggle(category, state, "bags").category).toBeUndefined();
    expect(facetToggle(brand, parseListing({}), "mimora").brand).toBe("mimora");
  });

  it("writes attribute axes to attr, not opt", () => {
    const state = facetToggle(material, parseListing({}), "linen");
    expect(state.attr).toEqual(["material:linen"]);
    expect(state.opt).toEqual([]);
  });
});

describe("clearing", () => {
  const state = parseListing({ category: "bags", brand: "mimora", opt: ["size:m", "colour:red", "size:l"], attr: ["material:linen"], minPrice: "100", inStock: "1", q: "gift", sort: "price_asc" });

  it("clears only the one facet's own values", () => {
    expect(facetClear(size, state).opt).toEqual(["colour:red"]);
    expect(facetClear(colour, state).opt).toEqual(["size:l", "size:m"]);
    expect(facetClear(material, state).attr).toEqual([]);
    expect(facetClear(category, state).category).toBeUndefined();
    expect(facetClear(size, state).attr).toEqual(["material:linen"]);
  });

  it("counts every applied filter, the price pair once", () => {
    expect(appliedFilterCount(state)).toBe(1 + 1 + 3 + 1 + 1 + 1);
    expect(appliedFilterCount({ ...state, maxPrice: "900" })).toBe(appliedFilterCount(state));
    expect(appliedFilterCount(parseListing({}))).toBe(0);
  });

  it("clear-all keeps the search, the collection scope and the sort — and nothing else", () => {
    const cleared = clearFilters(parseListing({ collection: "eid", q: "gift", sort: "price_desc", category: "bags", opt: ["size:m"], maxPrice: "9", inStock: "1", page: "3" }));
    expect(cleared).toMatchObject({ collection: "eid", q: "gift", sort: "price_desc", opt: [], attr: [], inStock: false, page: 1 });
    expect(cleared.category).toBeUndefined();
    expect(cleared.maxPrice).toBeUndefined();
  });
});
