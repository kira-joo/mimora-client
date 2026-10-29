import { describe, expect, it } from "vitest";
import { addressToForm, formToAddressBody, governorateOptions, addressProblems, nextOffset, reviewableProducts, EMPTY_ADDRESS } from "./account-model";

describe("nextOffset", () => {
  it("continues while a page comes back full", () => expect(nextOffset(10, 10, 0)).toBe(10));
  it("accumulates the offset", () => expect(nextOffset(10, 10, 20)).toBe(30));
  it("ends on a short page", () => expect(nextOffset(4, 10, 10)).toBeUndefined());
  it("ends on an empty page", () => expect(nextOffset(0, 10, 10)).toBeUndefined());
});

describe("address form", () => {
  it("omits empty optional fields and trims the rest", () => {
    const body = formToAddressBody({ ...EMPTY_ADDRESS, label: " Home ", recipientName: "A", phone: "010", addressLine1: " 1 St ", city: "Cairo", governorate: "Cairo", addressLine2: "  ", postalCode: "" });
    expect(body.label).toBe("Home");
    expect(body.addressLine1).toBe("1 St");
    expect(body.addressLine2).toBeUndefined();
    expect(body.postalCode).toBeUndefined();
  });
  it("round-trips a saved address", () => {
    const form = addressToForm({ _id: "1", label: "Work", recipientName: "B", phone: "011", addressLine1: "x", city: "c", governorate: "g", isDefault: true });
    expect(form.addressLine2).toBe("");
    expect(form.isDefault).toBe(true);
  });
  it("flags required fields still empty", () => {
    expect(Object.keys(addressProblems({ ...EMPTY_ADDRESS, label: "a" }))).toEqual(["recipientName", "phone", "addressLine1", "city", "governorate"]);
  });
  it("flags a phone that is not a number, accepts a valid one", () => {
    const ok = { ...EMPTY_ADDRESS, label: "a", recipientName: "b", phone: "01012345678", addressLine1: "d", city: "e", governorate: "f" };
    expect(addressProblems(ok)).toEqual({});
    expect(addressProblems({ ...ok, phone: "bad" })).toEqual({ phone: "phoneInvalid" });
  });
});

describe("governorateOptions", () => {
  const zones = [{ name: { ar: "القاهرة", en: "Cairo" } }, { name: { ar: "الجيزة", en: "Giza" } }];
  it("uses the English name as the value and localizes the label", () => {
    expect(governorateOptions(zones, "ar")).toEqual([{ value: "Cairo", label: "القاهرة" }, { value: "Giza", label: "الجيزة" }]);
    expect(governorateOptions(zones, "en")[1]).toEqual({ value: "Giza", label: "Giza" });
  });
  it("keeps a saved governorate that is no longer a zone", () => {
    expect(governorateOptions(zones, "en", "Luxor")[0]).toEqual({ value: "Luxor", label: "Luxor" });
    expect(governorateOptions(zones, "en", "Cairo")).toHaveLength(2);
  });
});

describe("reviewableProducts", () => {
  it("ignores lines without a product id and de-duplicates", () => {
    expect(reviewableProducts([{ productName: "a" }, { productId: "p1", productName: "b" }, { productId: "p1", productName: "b2" }])).toEqual([{ productId: "p1", productName: "b" }]);
  });
});
