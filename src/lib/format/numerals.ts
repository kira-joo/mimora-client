import { moneyView, resolveLocalized, type LocalizedString } from "@kira-joo/toolkit-common";
import type { Locale } from "../../i18n/routing";

/*
 * D-10 — numerals are per locale, identifiers are not (MDS §24). `ar` renders
 * Arabic-Indic, `en` Western — except prices, which are Western everywhere (see `PRICE_LOCALE` below); SKUs, order numbers, phone numbers and tracking
 * numbers stay Western in both. ONE helper per content type, and no component
 * decides its own numeral system.
 *
 * The numbering system is pinned with a BCP 47 `-u-nu-` extension rather than
 * left to the engine: Node's ICU renders plain `ar` with Latin digits while
 * `ar-EG` renders Arabic-Indic, and a server and a browser that disagree on a
 * price is a hydration mismatch on the most important text on the page.
 */
const NUMBER_LOCALE: Record<Locale, string> = { ar: "ar-EG-u-nu-arab", en: "en-EG-u-nu-latn" };

/*
 * Prices are the one exception to D-10 (owner decision, 2026-11-26): Western digits in EVERY locale and no thousands
 * separator — "1150 ج.م.‏", "EGP 1150". Display only; amounts, the API and stored values are untouched. Still pinned
 * with `-u-nu-latn` for the same server/browser hydration reason as above.
 */
const PRICE_LOCALE: Record<Locale, string> = { ar: "ar-EG-u-nu-latn", en: "en-EG-u-nu-latn" };

/** Each locale's grouping separator, read from `Intl` rather than assumed (it is "," for both today). */
const GROUP_SEPARATOR: Record<Locale, string> = {
  ar: groupSeparator(PRICE_LOCALE.ar),
  en: groupSeparator(PRICE_LOCALE.en),
};

function groupSeparator(locale: string): string {
  return new Intl.NumberFormat(locale).formatToParts(1111111).find((part) => part.type === "group")?.value ?? "";
}

/** Drops the thousands separator from an already formatted price. The decimal separator is a different character. */
function ungrouped(locale: Locale, formatted: string): string {
  const group = GROUP_SEPARATOR[locale];
  return group ? formatted.split(group).join("") : formatted;
}

/** Money arrives as a string (never a float) and is only ever formatted here — zero arithmetic on money in this app. */
export function formatPrice(locale: Locale, amount: string, currency: string): string {
  return ungrouped(locale, moneyView(currency, PRICE_LOCALE[locale]).format(amount, { trimZeroFraction: true }));
}

/** The same amount without the currency ("90") — for a secondary figure shown beside a price that already carries it. */
export function formatAmount(locale: Locale, amount: string, currency: string): string {
  return ungrouped(locale, moneyView(currency, PRICE_LOCALE[locale]).format(amount, { trimZeroFraction: true, display: "none" }));
}

/** A price-like number with no currency (a price filter's bounds), formatted exactly like a price's figure: whole → "2500", otherwise two decimals → "2500.50". */
export function formatPriceNumber(locale: Locale, value: number): string {
  const fractionDigits = Number.isInteger(value) ? 0 : 2;
  return ungrouped(locale, new Intl.NumberFormat(PRICE_LOCALE[locale], { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(value));
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
