import type { Address, DeliveryZone, Localized } from "@/lib/api/types";
import { localized } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";

/** Orders per request; a page that comes back full means there may be more (the backend returns no total). */
export const ORDERS_PAGE_SIZE = 10;

/** The next `offset`, or undefined when the last page was short — the list has ended. */
export function nextOffset(pageLength: number, pageSize: number, offset: number): number | undefined {
  return pageLength >= pageSize ? offset + pageLength : undefined;
}

export interface AddressForm {
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  governorate: string;
  postalCode: string;
  isDefault: boolean;
}

export const EMPTY_ADDRESS: AddressForm = { label: "", recipientName: "", phone: "", addressLine1: "", addressLine2: "", city: "", governorate: "", postalCode: "", isDefault: false };

/** The saved address as form state — optional fields become empty strings so inputs stay controlled. */
export function addressToForm(address: Address): AddressForm {
  return {
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2 ?? "",
    city: address.city,
    governorate: address.governorate,
    postalCode: address.postalCode ?? "",
    isDefault: address.isDefault,
  };
}

/** Form state as the backend DTO: trimmed, and an empty optional field is omitted rather than sent as "". */
export function formToAddressBody(form: AddressForm) {
  const trim = (value: string) => value.trim();
  const optional = (value: string) => (trim(value) ? trim(value) : undefined);
  return {
    label: trim(form.label),
    recipientName: trim(form.recipientName),
    phone: trim(form.phone),
    addressLine1: trim(form.addressLine1),
    addressLine2: optional(form.addressLine2),
    city: trim(form.city),
    governorate: trim(form.governorate),
    postalCode: optional(form.postalCode),
    isDefault: form.isDefault,
  };
}

/** Same permissive shape the checkout accepts (the backend only requires non-empty). */
const PHONE = /^\+?[0-9][0-9 -]{6,18}[0-9]$/;

/** Client-side floor before the server's own validation: required fields still empty, and a phone that is not a number. */
export function addressProblems(form: AddressForm): Partial<Record<keyof AddressForm, "required" | "phoneInvalid">> {
  const problems: Partial<Record<keyof AddressForm, "required" | "phoneInvalid">> = {};
  for (const key of ["label", "recipientName", "phone", "addressLine1", "city", "governorate"] as const) if (!form[key].trim()) problems[key] = "required";
  if (!problems.phone && !PHONE.test(form.phone.trim())) problems.phone = "phoneInvalid";
  return problems;
}

/**
 * Governorate choices from the delivery zones: the VALUE is the zone's English
 * name (the quote matches on it), the label is localized. A saved governorate
 * that is no longer a zone stays selectable so editing never silently changes it.
 */
export function governorateOptions(zones: Pick<DeliveryZone, "name">[], locale: Locale, current?: string): Array<{ value: string; label: string }> {
  const options = zones.map((zone) => ({ value: (zone.name as Localized).en, label: localized(zone.name, locale) }));
  if (current && !options.some((option) => option.value === current)) options.unshift({ value: current, label: current });
  return options;
}

/** Order lines the customer can review: only those the backend identifies with a product. */
export function reviewableProducts<T extends { productId?: string | null; productName: string }>(lines: T[]): Array<{ productId: string; productName: string }> {
  const seen = new Map<string, string>();
  for (const line of lines) if (line.productId && !seen.has(line.productId)) seen.set(line.productId, line.productName);
  return [...seen].map(([productId, productName]) => ({ productId, productName }));
}
