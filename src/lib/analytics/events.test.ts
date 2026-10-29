import { describe, expect, it } from "vitest";
import { MAX_LIST_ITEMS, MAX_SEARCH_TERM_LENGTH, addPaymentInfo, addToCart, beginCheckout, findPii, login, purchase, removeFromCart, search, searchTerm, signUp, viewItem, viewItemList } from "./events";

const products = Array.from({ length: 30 }, (_, i) => ({ productId: `p${i}` }));

describe("event payload builders", () => {
  it("view_item_list reports the list and a capped, positioned set of ids — never more than a page", () => {
    const event = viewItemList("category:boots", products);
    expect(event.name).toBe("view_item_list");
    expect(event.params).toMatchObject({ list_id: "category:boots" });
    const items = (event.params as { items: Array<{ item_id: string; index: number }> }).items;
    expect(items).toHaveLength(MAX_LIST_ITEMS);
    expect(items[0]).toEqual({ item_id: "p0", index: 1 });
    expect(items.at(-1)).toEqual({ item_id: `p${MAX_LIST_ITEMS - 1}`, index: MAX_LIST_ITEMS });
  });

  it("item events carry ids and quantities only", () => {
    expect(viewItem("p1")).toEqual({ name: "view_item", params: { items: [{ item_id: "p1" }] } });
    expect(addToCart({ productId: "p1", variantId: "v1", quantity: 2 })).toEqual({ name: "add_to_cart", params: { items: [{ item_id: "p1", item_variant: "v1", quantity: 2 }] } });
    expect(removeFromCart({ productId: "p1", variantId: "v1", quantity: 1 })).toEqual({ name: "remove_from_cart", params: { items: [{ item_id: "p1", item_variant: "v1", quantity: 1 }] } });
  });

  it("checkout events say how far the visitor got, not what is in the cart", () => {
    expect(beginCheckout(3)).toEqual({ name: "begin_checkout", params: { item_count: 3 } });
    expect(addPaymentInfo("COD")).toEqual({ name: "add_payment_info", params: { payment_type: "COD" } });
  });

  it("purchase carries the order number and the server's confirmed total, verbatim, and nothing else", () => {
    const event = purchase({ orderNumber: "ORD-100", total: "1250.50", currency: "EGP", itemCount: 2 });
    expect(event).toEqual({ name: "purchase", params: { transaction_id: "ORD-100", value: "1250.50", currency: "EGP", item_count: 2 } });
  });

  it("sign_up and login name only the method", () => {
    expect(signUp()).toEqual({ name: "sign_up", params: { method: "phone" } });
    expect(login()).toEqual({ name: "login", params: { method: "phone" } });
  });

  it("no builder's payload contains personal data", () => {
    const events = [
      viewItemList("all", products), viewItem("p1"), addToCart({ productId: "p1", variantId: "v1", quantity: 1 }), removeFromCart({ productId: "p1", variantId: "v1", quantity: 1 }),
      beginCheckout(1), addPaymentInfo("WALLET"), purchase({ orderNumber: "ORD-1", total: "10.00", currency: "EGP", itemCount: 1 }), signUp(), login(), search("boots", 4),
    ];
    for (const event of events) expect(findPii(event.params), event.name).toEqual([]);
  });
});

describe("search term", () => {
  it("is trimmed, lower-cased and capped", () => {
    expect(searchTerm("  Leather BOOTS ")).toBe("leather boots");
    expect(searchTerm("x".repeat(500))).toHaveLength(MAX_SEARCH_TERM_LENGTH);
    expect(searchTerm("جزمة جلد")).toBe("جزمة جلد");
  });

  it("is dropped when it looks like an email or a phone number — people type their own into search", () => {
    for (const term of ["mona@example.com", "my email is a@b.co", "01001234567", "+20 100 123 4567", "٠١٠٠١٢٣٤٥٦٧".replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)), "0100-123-4567"]) {
      expect(searchTerm(term), term).toBeUndefined();
    }
    expect(searchTerm("   ")).toBeUndefined();
  });

  it("a dropped term still reports that a search happened and how many results it had", () => {
    expect(search("mona@example.com", 0)).toEqual({ name: "search", params: { result_count: 0 } });
    expect(search("boots", 12)).toEqual({ name: "search", params: { search_term: "boots", result_count: 12 } });
  });
});

describe("findPii — the guard behind the types", () => {
  it("finds personal-data keys and email-shaped values at any depth, and can fail", () => {
    expect(findPii({ email: "x" })).toEqual([".email"]);
    expect(findPii({ items: [{ item_id: "p", phone: "1" }] })).toEqual([".items.0.phone"]);
    expect(findPii({ note: "write to me@example.com" })).toEqual([".note"]);
    expect(findPii({ item_id: "p1", list_name: "Boots" })).toEqual([]);
  });
});
