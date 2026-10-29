import { describe, expect, it } from "vitest";
import { selectRelated } from "./related";

const item = (slug: string, purchasableVariantCount = 1) => ({ slug, listing: { purchasableVariantCount } });

describe("selectRelated", () => {
  it("never offers the product being viewed", () => {
    expect(selectRelated([item("self"), item("a"), item("b")], "self").map((candidate) => candidate.slug)).toEqual(["a", "b"]);
  });

  it("caps the list at four by default, and honours another count", () => {
    const many = ["a", "b", "c", "d", "e", "f"].map((slug) => item(slug));
    expect(selectRelated(many, "x")).toHaveLength(4);
    expect(selectRelated(many, "x", 2)).toHaveLength(2);
  });

  it("puts purchasable products before sold-out ones, keeping order within each group", () => {
    const list = [item("sold-1", 0), item("a"), item("sold-2", 0), item("b")];
    expect(selectRelated(list, "x").map((candidate) => candidate.slug)).toEqual(["a", "b", "sold-1", "sold-2"]);
  });

  it("still shows sold-out products when they are all there is", () => {
    expect(selectRelated([item("s", 0)], "x").map((candidate) => candidate.slug)).toEqual(["s"]);
  });

  it("drops duplicates, keeping the first", () => {
    expect(selectRelated([item("a"), item("a"), item("b")], "x").map((candidate) => candidate.slug)).toEqual(["a", "b"]);
  });

  it("is empty when there is nothing else in the category", () => {
    expect(selectRelated([item("self")], "self")).toEqual([]);
    expect(selectRelated([], "self")).toEqual([]);
  });
});
