import { moneyView, resolveLocalized, type LocalizedString } from "@kira-joo/toolkit-common";
import type { Locale } from "../../i18n/routing";

/*
 * D-10 — numerals are per locale, identifiers are not (MDS §24). `ar` renders
 * Arabic-Indic, `en` Western; SKUs, order numbers, phone numbers and tracking
 * numbers stay Western in both. ONE helper per content type, and no component
 * decides its own numeral system.
 *
 * The numbering system is pinned with a BCP 47 `-u-nu-` extension rather than
 * left to the engine: Node's ICU renders plain `ar` with Latin digits while
 * `ar-EG` renders Arabic-Indic, and a server and a browser that disagree on a
 * price is a hydration mismatch on the most important text on the page.
 */
const NUMBER_LOCALE: Record<Locale, string> = { ar: "ar-EG-u-nu-arab", en: "en-EG-u-nu-latn" };

/** Money arrives as a string (never a float) and is only ever formatted here — zero arithmetic on money in this app. */
export function formatPrice(locale: Locale, amount: string, currency: string): string {
  return moneyView(currency, NUMBER_LOCALE[locale]).format(amount, { trimZeroFraction: true });
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[locale]).format(value);
}

/** A percentage such as a tax rate (`14` → "14%" / "١٤٪؜"), in the locale's numerals. Display only: never an input to arithmetic on money. */
export function formatPercent(locale: Locale, percent: number): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[locale], { style: "percent", maximumFractionDigits: 2 }).format(percent / 100);
}

export function formatDate(locale: Locale, iso: string, timeZone: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  return new Intl.DateTimeFormat(NUMBER_LOCALE[locale], { ...options, timeZone }).format(new Date(iso));
}

/** Identifiers people copy, dictate and retype — Western in every locale, and isolated so RTL never reorders them. */
export const formatSku = (sku: string) => sku;
export const formatOrderNumber = (orderNumber: string) => orderNumber;
export const formatPhone = (phone: string) => phone;
export const formatTracking = (trackingNumber: string) => trackingNumber;

/** Store content: the requested locale, falling back to the other only when it is blank. */
export function localized(value: LocalizedString | undefined | null, locale: Locale): string {
  return resolveLocalized(value ?? undefined, locale);
}
