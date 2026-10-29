import type { Address, DeliveryAddress, DeliveryZone, FulfilmentSettings, PaymentMethodView, PickupLocation } from "@/lib/api/types";

/*
 * Checkout rules that are presentation, not business: which choices exist and
 * what is still missing before the server is asked. The server validates
 * everything again and its answer wins (MDS §12).
 */
export type Mode = "DELIVERY" | "PICKUP";

/** Modes that are off are filtered out entirely, never shown disabled (MDS §18). */
export function availableModes(settings: FulfilmentSettings | null, pickupLocations: PickupLocation[]): Mode[] {
  if (!settings) return [];
  const modes: Mode[] = [];
  if (settings.deliveryEnabled) modes.push("DELIVERY");
  if (settings.pickupEnabled && pickupLocations.length > 0) modes.push("PICKUP");
  return modes;
}

export interface CheckoutDraft {
  contact: { name: string; phone: string; email: string };
  mode?: Mode;
  address: Omit<DeliveryAddress, "recipientName" | "phone"> & { recipientName?: string; phone?: string };
  pickupLocationId?: string;
  paymentMethod?: string;
  termsAccepted: boolean;
}

export type CheckoutErrors = Partial<Record<"name" | "phone" | "email" | "governorate" | "city" | "addressLine1" | "pickupLocationId" | "paymentMethod" | "terms" | "mode", string>>;

const PHONE = /^\+?[0-9][0-9 -]{6,18}[0-9]$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What is missing locally — so the customer hears it before a round trip. Messages are keys; the view words them. */
export function missingFields(draft: CheckoutDraft, options: { guest: boolean; zones: DeliveryZone[]; requireTerms: boolean }): Record<keyof CheckoutErrors, string | undefined> {
  const errors: Record<string, string | undefined> = {};
  if (options.guest) {
    // In the form's order — phone first (D-9) — so the first error is the first field.
    if (!draft.contact.phone.trim()) errors.phone = "required";
    else if (!PHONE.test(draft.contact.phone.trim())) errors.phone = "phoneInvalid";
    if (!draft.contact.name.trim()) errors.name = "required";
    if (draft.contact.email.trim() && !EMAIL.test(draft.contact.email.trim())) errors.email = "emailInvalid";
  }
  if (!draft.mode) errors.mode = "required";
  if (draft.mode === "DELIVERY") {
    if (!draft.address.governorate.trim()) errors.governorate = "required";
    if (!draft.address.city.trim()) errors.city = "required";
    if (!draft.address.addressLine1.trim()) errors.addressLine1 = "required";
  }
  if (draft.mode === "PICKUP" && !draft.pickupLocationId) errors.pickupLocationId = "required";
  if (!draft.paymentMethod) errors.paymentMethod = "required";
  if (options.requireTerms && !draft.termsAccepted) errors.terms = "termsRequired";
  return errors as Record<keyof CheckoutErrors, string | undefined>;
}

/** The fulfilment draft the cart should carry, or null while it is incomplete — sent only once it can be quoted. */
export function fulfilmentDraft(draft: CheckoutDraft, fallback: { name: string; phone: string }) {
  if (draft.mode === "PICKUP") return draft.pickupLocationId ? { mode: "PICKUP" as const, pickupLocationId: draft.pickupLocationId } : null;
  if (draft.mode === "DELIVERY") {
    const { governorate, city, addressLine1, addressLine2, postalCode } = draft.address;
    const recipientName = (draft.address.recipientName || fallback.name).trim();
    const phone = (draft.address.phone || fallback.phone).trim();
    if (!governorate.trim() || !city.trim() || !addressLine1.trim() || !recipientName || !phone) return null;
    return { mode: "DELIVERY" as const, address: { recipientName, phone, governorate: governorate.trim(), city: city.trim(), addressLine1: addressLine1.trim(), ...(addressLine2?.trim() ? { addressLine2: addressLine2.trim() } : {}), ...(postalCode?.trim() ? { postalCode: postalCode.trim() } : {}) } };
  }
  return null;
}

/** Payment methods in the merchant's order; a single one is the choice (MDS §13). */
export function sortedMethods(methods: PaymentMethodView[]): PaymentMethodView[] {
  return [...methods].sort((a, b) => a.order - b.order);
}

/**
 * Whether the store can take an order at all right now: some fulfilment mode,
 * some payment method, and a published terms page to accept (D-13). The same
 * three conditions the checkout page stops on — one function, so the cart's
 * Checkout button and the checkout screen can never disagree about it.
 */
export function canTakeOrders(config: { settings: FulfilmentSettings | null; pickupLocations: PickupLocation[]; paymentMethods: PaymentMethodView[]; termsPublished: boolean }): boolean {
  return availableModes(config.settings, config.pickupLocations).length > 0 && config.paymentMethods.length > 0 && config.termsPublished;
}

type SavedAddress = Pick<Address, "recipientName" | "phone" | "addressLine1" | "addressLine2" | "city" | "governorate" | "postalCode">;

/**
 * A saved address as the checkout form's address draft. The governorate field
 * is a select over the delivery zones (value = the zone's English name — what
 * the quote matches on), so a saved governorate is mapped to the zone it names
 * (by either locale's name, ignoring case); one that matches no zone is left
 * EMPTY for the customer to choose, rather than put into a select that cannot
 * show it and would then submit something different from what is displayed.
 */
export function addressToDraft(address: SavedAddress, zones: DeliveryZone[]): CheckoutDraft["address"] {
  const wanted = address.governorate.trim().toLowerCase();
  const zone = zones.find((candidate) => [candidate.name.en, candidate.name.ar].some((name) => name?.trim().toLowerCase() === wanted));
  return {
    recipientName: address.recipientName,
    phone: address.phone,
    governorate: zones.length > 0 ? (zone?.name.en ?? "") : address.governorate,
    city: address.city,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? "",
    ...(address.postalCode ? { postalCode: address.postalCode } : {}),
  };
}

const norm = (value: string | undefined) => (value ?? "").trim().toLowerCase();

/** Whether the form currently holds exactly this saved address (so the picker can show it as chosen, and show "different address" once the customer edits it). */
export function matchesSaved(draft: CheckoutDraft["address"], saved: SavedAddress, zones: DeliveryZone[]): boolean {
  const asDraft = addressToDraft(saved, zones);
  return norm(draft.governorate) === norm(asDraft.governorate) && norm(draft.city) === norm(asDraft.city) && norm(draft.addressLine1) === norm(asDraft.addressLine1) && norm(draft.addressLine2) === norm(asDraft.addressLine2);
}
