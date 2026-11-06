import { describe, expect, it } from "vitest";
import { tabBarRoute } from "./tab-bar";

describe("tabBarRoute", () => {
  it("maps each page to its tab", () => {
    expect(tabBarRoute("/")).toBe("home");
    expect(tabBarRoute("/categories/jewelry")).toBe("categories");
    expect(tabBarRoute("/products")).toBe("shop");
    expect(tabBarRoute("/account/wishlist")).toBe("wishlist");
    expect(tabBarRoute("/account")).toBe("account");
    expect(tabBarRoute("/account/orders")).toBe("account");
  });
  it("leaves unrelated pages without a current tab", () => {
    for (const path of ["/collections/for-her", "/search", "/pages/faq", "/products/stitch-mug", "/cart", "/checkout"]) expect(tabBarRoute(path)).toBeNull();
  });
});
