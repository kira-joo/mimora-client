import { describe, expect, it } from "vitest";
import { isFiltered, normalizeAttributes, normalizeOptions, parseListing, selectedValues, toApiQuery, toggleAttribute, toggleOption, toSearch } from "./listing-query";

const lookups = {
  categories: [{ _id: "c1", slug: "shirts", name: { ar: "", en: "" }, sortOrder: 0 }],
  collections: [{ _id: "k1", slug: "washed-linen", name: { ar: "", en: "" } }],
  brands: [],
};

describe("listing query", () => {
  it("round-trips through the URL with defaults omitted", () => {
    const state = parseListing({ category: "shirts", sort: "price_asc", page: "2", minPrice: "100" });
    expect(toSearch(state)).toBe("?category=shirts&minPrice=100&sort=price_asc&page=2");
    expect(toSearch(parseListing({}))).toBe("");
  });

  it("drops anything malformed instead of forwarding it", () => {
    const state = parseListing({ sort: "random", page: "-3", minPrice: "1e9", category: "../etc" });
    expect(state).toMatchObject({ sort: "newest", page: 1, minPrice: undefined, category: undefined });
  });

  it("maps slugs to ids, and an unknown scope to null rather than to everything", () => {
    expect(toApiQuery(parseListing({ category: "shirts", collection: "washed-linen" }), lookups)).toMatchObject({ categoryId: "c1", collectionId: "k1", page: 1 });
    expect(toApiQuery(parseListing({ category: "nope" }), lookups)).toBeNull();
  });

  it("omits the default sort — newest is the backend's own order", () => {
    expect(toApiQuery(parseListing({}), lookups)).not.toHaveProperty("sort");
    expect(toApiQuery(parseListing({ sort: "price_desc" }), lookups)).toMatchObject({ sort: "price_desc" });
  });
  describe("attribute filters", () => {
    it("reads repeated attr params, sorted and unique, and writes them back the same way", () => {
      const state = parseListing({ attr: ["material:linen", "material:cotton", "material:linen", "fit:slim"] });
      expect(state.attr).toEqual(["fit:slim", "material:cotton", "material:linen"]);
      expect(toSearch(state)).toBe("?attr=fit%3Aslim&attr=material%3Acotton&attr=material%3Alinen");
      expect(parseListing(Object.fromEntries([["attr", ["fit:slim"]]])).attr).toEqual(["fit:slim"]);
    });

    it("accepts a single attr param and none at all", () => {
      expect(parseListing({ attr: "material:cotton" }).attr).toEqual(["material:cotton"]);
      expect(parseListing({}).attr).toEqual([]);
    });

    it("drops anything that is not key:value — no colon, two colons, the list separator, whitespace", () => {
      expect(normalizeAttributes(["nocolon", "a:b:c", "a|b:c", "a:b|c", "a b:c", ":x", "x:", "", undefined, "ok:fine"])).toEqual(["ok:fine"]);
    });

    it("caps how many filters one URL can carry", () => {
      const many = Array.from({ length: 60 }, (_, index) => `k${String(index).padStart(2, "0")}:v`);
      expect(normalizeAttributes(many)).toHaveLength(20);
    });

    it("sends attr to the backend as one pipe-separated value, and omits it when there is none", () => {
      expect(toApiQuery(parseListing({ attr: ["material:cotton", "material:linen"] }), lookups)).toMatchObject({ attr: "material:cotton|material:linen" });
      expect(toApiQuery(parseListing({}), lookups)).not.toHaveProperty("attr");
    });

    it("toggles one value of one key without disturbing the rest", () => {
      const start = ["fit:slim", "material:cotton"];
      expect(toggleAttribute(start, "material", "linen")).toEqual(["fit:slim", "material:cotton", "material:linen"]);
      expect(toggleAttribute(start, "material", "cotton")).toEqual(["fit:slim"]);
      expect(toggleAttribute([], "fit", "slim")).toEqual(["fit:slim"]);
    });

    it("lists the chosen values of one key only, and does not confuse a key that is a prefix of another", () => {
      const attr = ["material:cotton", "material:linen", "materials:x", "fit:slim"];
      expect(selectedValues(attr, "material")).toEqual(["cotton", "linen"]);
      expect(selectedValues(attr, "fit")).toEqual(["slim"]);
      expect(selectedValues(attr, "colour")).toEqual([]);
    });

    it("counts an attribute filter as filtering, so the view is noindex", () => {
      expect(isFiltered(parseListing({ attr: "material:cotton" }))).toBe(true);
      expect(isFiltered(parseListing({}))).toBe(false);
    });

    it("keeps attribute filters when the page changes, and a removed page resets nothing else", () => {
      const state = parseListing({ attr: "material:cotton", page: "3" });
      expect(toSearch({ ...state, page: 1 })).toBe("?attr=material%3Acotton");
    });
  });
});

describe("option filters and in-stock (plan #7)", () => {
  it("round-trips opt and inStock through the URL, sorted and unique", () => {
    const state = parseListing({ opt: ["size:m", "colour:red", "size:m"], inStock: "1" });
    expect(state.opt).toEqual(["colour:red", "size:m"]);
    expect(state.inStock).toBe(true);
    expect(toSearch(state)).toBe("?opt=colour%3Ared&opt=size%3Am&inStock=1");
    expect(toSearch(parseListing({}))).toBe("");
  });

  it("only inStock=1 turns the toggle on — anything else is off", () => {
    for (const value of ["0", "true", "yes", "", undefined]) expect(parseListing({ inStock: value }).inStock).toBe(false);
  });

  it("drops malformed option pairs instead of forwarding them", () => {
    expect(normalizeOptions(["size", ":m", "size:", "a b:m", "size:m|x", " size:l ", undefined])).toEqual(["size:l"]);
  });

  it("allows a value with a space (an option value is not always a slug)", () => {
    expect(normalizeOptions(["size:extra large"])).toEqual(["size:extra large"]);
  });

  it("toggles one value and keeps the set canonical", () => {
    expect(toggleOption([], "size", "m")).toEqual(["size:m"]);
    expect(toggleOption(["size:m"], "colour", "red")).toEqual(["colour:red", "size:m"]);
    expect(toggleOption(["size:m", "colour:red"], "size", "m")).toEqual(["colour:red"]);
    expect(selectedValues(["size:m", "size:l", "colour:red"], "size")).toEqual(["m", "l"]);
  });

  it("maps to the backend's pipe-joined opt and boolean inStock, and omits both by default", () => {
    expect(toApiQuery(parseListing({ opt: ["size:m", "size:l"], inStock: "1" }), lookups)).toMatchObject({ opt: "size:l|size:m", inStock: true });
    const plain = toApiQuery(parseListing({}), lookups)!;
    expect(plain).not.toHaveProperty("opt");
    expect(plain).not.toHaveProperty("inStock");
  });

  it("either one makes the listing filtered (dynamic, noindex)", () => {
    expect(isFiltered(parseListing({ inStock: "1" }))).toBe(true);
    expect(isFiltered(parseListing({ opt: "size:m" }))).toBe(true);
    expect(isFiltered(parseListing({}))).toBe(false);
  });
});
