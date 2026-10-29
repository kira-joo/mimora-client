import { describe, expect, it } from "vitest";
import type { Category } from "@/lib/api/types";
import { categoryChain, categoryTrail, flatTrail, productTrail } from "./breadcrumbs";

const cat = (_id: string, slug: string, en: string, parentId?: string | null): Category => ({ _id, slug, name: { en, ar: `${en}-ar` }, parentId, sortOrder: 0 });
const tree = [cat("a", "men", "Men"), cat("b", "shirts", "Shirts", "a"), cat("c", "linen-shirts", "Linen shirts", "b"), cat("z", "other", "Other")];

describe("categoryChain", () => {
  it("returns the ancestors root-first, ending with the category itself", () => {
    expect(categoryChain(tree, "c").map((category) => category._id)).toEqual(["a", "b", "c"]);
    expect(categoryChain(tree, "a").map((category) => category._id)).toEqual(["a"]);
  });

  it("is empty for no category or an unknown one", () => {
    expect(categoryChain(tree, undefined)).toEqual([]);
    expect(categoryChain(tree, "nope")).toEqual([]);
  });

  it("stops at an ancestor that is not in the list rather than inventing the rest", () => {
    // `b`'s parent `a` is unpublished (absent): the chain starts at `b`.
    expect(categoryChain(tree.filter((category) => category._id !== "a"), "c").map((category) => category._id)).toEqual(["b", "c"]);
  });

  it("cannot loop on a cycle in the data", () => {
    const loop = [cat("x", "x", "X", "y"), cat("y", "y", "Y", "x")];
    expect(categoryChain(loop, "x").length).toBeLessThanOrEqual(2);
  });
});

describe("trails", () => {
  const base = { homeLabel: "Home", locale: "en" as const, categories: tree };

  it("a product's trail carries the FULL category chain, linked, then the product unlinked", () => {
    expect(productTrail({ ...base, categoryId: "c", productName: "Olive shirt" })).toEqual([
      { label: "Home", href: "/" },
      { label: "Men", href: "/categories/men" },
      { label: "Shirts", href: "/categories/shirts" },
      { label: "Linen shirts", href: "/categories/linen-shirts" },
      { label: "Olive shirt" },
    ]);
  });

  it("a product with no category goes straight from Home", () => {
    expect(productTrail({ ...base, categoryId: undefined, productName: "Lamp" })).toEqual([{ label: "Home", href: "/" }, { label: "Lamp" }]);
  });

  it("a category's trail ends at the category itself, with no link, and links its ancestors", () => {
    const trail = categoryTrail({ ...base, category: tree[2]! });
    expect(trail.map((crumb) => crumb.label)).toEqual(["Home", "Men", "Shirts", "Linen shirts"]);
    expect(trail.at(-1)).toEqual({ label: "Linen shirts" });
    expect(trail[2]).toEqual({ label: "Shirts", href: "/categories/shirts" });
  });

  it("a root category's trail is Home › itself", () => {
    expect(categoryTrail({ ...base, category: tree[0]! })).toEqual([{ label: "Home", href: "/" }, { label: "Men" }]);
  });

  it("uses the page's locale for names", () => {
    expect(productTrail({ ...base, locale: "ar", categoryId: "a", productName: "x" })[1]?.label).toBe("Men-ar");
  });

  it("a collection or brand is flat", () => {
    expect(flatTrail({ homeLabel: "Home", current: "Linen" })).toEqual([{ label: "Home", href: "/" }, { label: "Linen" }]);
  });
});
