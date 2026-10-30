import { selectedValues, toggleAttribute, toggleOption, type ListingState } from "./listing-query";

/*
 * One description of every choice-style facet the listing offers, whatever the
 * state field behind it: the category, the brand, a size/colour axis, or one of
 * the merchant's own attribute axes. The UI renders them all the same way; this
 * module is the only place that knows which URL field each one writes.
 *
 * Plain data on purpose — the server builds the list and hands it to the client.
 */
export type FacetSource = "category" | "brand" | "opt" | "attr";

export interface FacetValue {
  key: string;
  label: string;
  count: number;
}

export interface FacetDef {
  /** Unique across the list: `category`, `brand`, `opt-<axis>`, `attr-<axis>`. */
  id: string;
  source: FacetSource;
  /** The axis key for `opt` and `attr`. */
  axis?: string;
  label: string;
  /** `single`: one value or none (a radio group). `multi`: any number (OR within the axis). */
  mode: "single" | "multi";
  values: FacetValue[];
}

/** The value keys of this facet that the state selects. */
export function facetSelected(def: FacetDef, state: ListingState): string[] {
  switch (def.source) {
    case "category":
      return state.category ? [state.category] : [];
    case "brand":
      return state.brand ? [state.brand] : [];
    case "opt":
      return selectedValues(state.opt, def.axis ?? "");
    case "attr":
      return selectedValues(state.attr, def.axis ?? "");
  }
}

/** The state after the customer toggles one value: a radio replaces (and picking the chosen one again clears); a checkbox adds or removes. */
export function facetToggle(def: FacetDef, state: ListingState, key: string): ListingState {
  switch (def.source) {
    case "category":
      return { ...state, category: state.category === key ? undefined : key };
    case "brand":
      return { ...state, brand: state.brand === key ? undefined : key };
    case "opt":
      return { ...state, opt: toggleOption(state.opt, def.axis ?? "", key) };
    case "attr":
      return { ...state, attr: toggleAttribute(state.attr, def.axis ?? "", key) };
  }
}

/** The state with every value of this facet cleared. */
export function facetClear(def: FacetDef, state: ListingState): ListingState {
  const chosen = new Set(facetSelected(def, state));
  switch (def.source) {
    case "category":
      return { ...state, category: undefined };
    case "brand":
      return { ...state, brand: undefined };
    case "opt":
      return { ...state, opt: state.opt.filter((pair) => !chosen.has(pair.slice(pair.indexOf(":") + 1)) || !pair.startsWith(`${def.axis}:`)) };
    case "attr":
      return { ...state, attr: state.attr.filter((pair) => !chosen.has(pair.slice(pair.indexOf(":") + 1)) || !pair.startsWith(`${def.axis}:`)) };
  }
}

/** How many filters of the whole listing are applied: each chosen value, the price pair as one, and availability. */
export function appliedFilterCount(state: ListingState): number {
  return (state.category ? 1 : 0) + (state.brand ? 1 : 0) + state.opt.length + state.attr.length + (state.minPrice || state.maxPrice ? 1 : 0) + (state.inStock ? 1 : 0);
}

/** The state with every facet filter cleared, keeping what is not a filter: the search, the collection scope and the sort. */
export function clearFilters(state: ListingState): ListingState {
  return { sort: state.sort, page: 1, q: state.q, collection: state.collection, attr: [], opt: [], inStock: false };
}
