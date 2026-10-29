import { moneyView } from "@kira-joo/toolkit-common";
import type { Locale, LocalizedString } from "./types";

/*
 * D-10 through one helper per content type (MDS §24): `ar` renders
 * Arabic-Indic, `en` Western; SKUs, order numbers and phone numbers stay
 * Western in both. No component decides its own numerals.
 */

const MONEY_LOCALE: Record<Locale, string> = { ar: "ar-EG", en: "en-EG" };

export function formatPrice(locale: Locale, amount: string, currency = "EGP"): string {
  return moneyView(currency, MONEY_LOCALE[locale]).format(amount, { trimZeroFraction: true });
}

export function formatNumber(locale: Locale, value: number): string {
  return new Intl.NumberFormat(MONEY_LOCALE[locale]).format(value);
}

/** Identifiers people copy and retype: Western digits in every locale. */
export const formatSku = (sku: string) => sku;
export const formatOrderNumber = (orderNumber: string) => orderNumber;
export const formatPhone = (phone: string) => phone;

export function t(value: LocalizedString | undefined, locale: Locale): string {
  if (!value) return "";
  return value[locale] || value[locale === "ar" ? "en" : "ar"];
}
