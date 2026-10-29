import { describe, expect, it } from "vitest";
import type { FulfilmentSettings } from "@/lib/api/types";
import { addressToDraft, availableModes, canTakeOrders, fulfilmentDraft, matchesSaved, missingFields, type CheckoutDraft } from "./checkout-model";

const settings = (deliveryEnabled: boolean, pickupEnabled: boolean) => ({ deliveryEnabled, pickupEnabled }) as FulfilmentSettings;
const pickup = [{ _id: "p1", name: { ar: "", en: "" }, address: { ar: "", en: "" }, order: 0 }];
const draft = (overrides: Partial<CheckoutDraft> = {}): CheckoutDraft => ({
  contact: { name: "Mona", phone: "01012345678", email: "" },
  mode: "DELIVERY",
  address: { governorate: "Cairo", city: "Maadi", addressLine1: "9 Road 233" },
  paymentMethod: "COD",
  termsAccepted: true,
  ...overrides,
});

describe("fulfilment capabilities — every combination, including none (MDS §18)", () => {
  it("filters a mode that is off out entirely", () => {
    expect(availableModes(settings(true, true), pickup)).toEqual(["DELIVERY", "PICKUP"]);
    expect(availableModes(settings(true, false), pickup)).toEqual(["DELIVERY"]);
    expect(availableModes(settings(false, true), pickup)).toEqual(["PICKUP"]);
  });

  it("treats pickup with no locations as off, not as a chooser with nothing in it", () => {
    expect(availableModes(settings(false, true), [])).toEqual([]);
  });

  it("yields nothing at all when nothing is enabled or settings are missing — the designed degenerate state", () => {
    expect(availableModes(settings(false, false), pickup)).toEqual([]);
    expect(availableModes(null, pickup)).toEqual([]);
  });
});

describe("what is missing before the server is asked", () => {
  it("names each missing field for a guest", () => {
    const errors = missingFields(draft({ contact: { name: "", phone: "abc", email: "x@" } }), { guest: true, zones: [], requireTerms: true });
    expect(errors).toMatchObject({ name: "required", phone: "phoneInvalid", email: "emailInvalid" });
  });

  it("does not ask a signed-in customer for contact details", () => {
    expect(missingFields(draft({ contact: { name: "", phone: "", email: "" } }), { guest: false, zones: [], requireTerms: true })).toEqual({});
  });

  it("requires the unticked terms acceptance (D-13)", () => {
    expect(missingFields(draft({ termsAccepted: false }), { guest: false, zones: [], requireTerms: true }).terms).toBe("termsRequired");
  });
});

describe("the fulfilment draft", () => {
  it("is sent only once it can be quoted, with the contact as the default recipient", () => {
    expect(fulfilmentDraft(draft({ address: { governorate: "Cairo", city: "", addressLine1: "x" } }), { name: "Mona", phone: "010" })).toBeNull();
    expect(fulfilmentDraft(draft(), { name: "Mona", phone: "01012345678" })).toEqual({ mode: "DELIVERY", address: { recipientName: "Mona", phone: "01012345678", governorate: "Cairo", city: "Maadi", addressLine1: "9 Road 233" } });
    expect(fulfilmentDraft(draft({ mode: "PICKUP", pickupLocationId: "p1" }), { name: "", phone: "" })).toEqual({ mode: "PICKUP", pickupLocationId: "p1" });
  });
});

describe("whether the store can take an order at all (the cart's Checkout button, and checkout itself)", () => {
  const methods = [{ method: "COD", order: 0, requiresProof: false }];
  const ok = { settings: settings(true, false), pickupLocations: pickup, paymentMethods: methods, termsPublished: true };

  it("can when a mode, a payment method and published terms all exist", () => {
    expect(canTakeOrders(ok)).toBe(true);
  });

  it("cannot with nothing enabled, no payment method, no terms, or no settings — each alone is enough", () => {
    expect(canTakeOrders({ ...ok, settings: settings(false, false) })).toBe(false);
    expect(canTakeOrders({ ...ok, settings: settings(false, true), pickupLocations: [] })).toBe(false);
    expect(canTakeOrders({ ...ok, paymentMethods: [] })).toBe(false);
    expect(canTakeOrders({ ...ok, termsPublished: false })).toBe(false);
    expect(canTakeOrders({ ...ok, settings: null })).toBe(false);
  });
});

describe("saved addresses at checkout", () => {
  const zones = [
    { _id: "z1", name: { en: "Cairo", ar: "القاهرة" }, areas: [], fee: "50", leadDays: 1, order: 0 },
    { _id: "z2", name: { en: "Giza", ar: "الجيزة" }, areas: [], fee: "60", leadDays: 2, order: 1 },
  ];
  const home = { recipientName: "Mona", phone: "01012345678", addressLine1: "9 Road 233", addressLine2: "Flat 4", city: "Maadi", governorate: "cairo", postalCode: "11431" };

  it("prefills every field, mapping the governorate onto the zone it names", () => {
    expect(addressToDraft(home, zones)).toEqual({ recipientName: "Mona", phone: "01012345678", governorate: "Cairo", city: "Maadi", addressLine1: "9 Road 233", addressLine2: "Flat 4", postalCode: "11431" });
  });

  it("matches the zone by its Arabic name too", () => {
    expect(addressToDraft({ ...home, governorate: "الجيزة" }, zones).governorate).toBe("Giza");
  });

  it("leaves the governorate empty when it matches no zone, rather than putting a value the select cannot show", () => {
    expect(addressToDraft({ ...home, governorate: "Atlantis" }, zones).governorate).toBe("");
  });

  it("keeps the saved governorate as typed when the store has no zones (a free-text field)", () => {
    expect(addressToDraft(home, []).governorate).toBe("cairo");
  });

  it("omits an empty postal code and a missing second line", () => {
    const draftAddress = addressToDraft({ ...home, addressLine2: undefined, postalCode: undefined }, zones);
    expect(draftAddress).not.toHaveProperty("postalCode");
    expect(draftAddress.addressLine2).toBe("");
  });

  it("recognises the form as holding a saved address — and stops recognising it the moment the customer edits it", () => {
    const filled = addressToDraft(home, zones);
    expect(matchesSaved(filled, home, zones)).toBe(true);
    expect(matchesSaved({ ...filled, addressLine1: "10 Other St" }, home, zones)).toBe(false);
    expect(matchesSaved({ ...filled, city: "Nasr City" }, home, zones)).toBe(false);
  });

  it("an empty form matches no saved address", () => {
    expect(matchesSaved({ governorate: "", city: "", addressLine1: "", addressLine2: "" }, home, zones)).toBe(false);
  });

  it("a prefilled address is quotable — the draft it produces satisfies the fulfilment draft", () => {
    const sent = fulfilmentDraft(draft({ address: addressToDraft(home, zones) }), { name: "", phone: "" });
    expect(sent).toMatchObject({ mode: "DELIVERY", address: { recipientName: "Mona", phone: "01012345678", governorate: "Cairo", city: "Maadi", addressLine1: "9 Road 233", postalCode: "11431" } });
  });
});
