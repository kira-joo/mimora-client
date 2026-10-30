import type { Locale } from "@/i18n/routing";
import type { DeliveryZone, FulfilmentSettings, PaymentMethodView } from "@/lib/api/types";
import { formatNumber } from "@/lib/format/numerals";

/** The keys this helper reads — a next-intl `t` for the "common" namespace satisfies it. */
type T = (key: "deliveryLine" | "deliveryLineExact" | "returnsLine" | "paymentCOD" | "paymentWallet" | "paymentInstapay" | "paymentVodafoneCash", values?: Record<string, string | number>) => string;

/** Payment method keys are open strings (D-6); known ones get a localized name, anything else shows as configured. */
export function paymentMethodName(method: string, t: T): string {
  if (method === "COD") return t("paymentCOD");
  if (method === "WALLET_TRANSFER" || method === "WALLET") return t("paymentWallet");
  if (method === "INSTAPAY") return t("paymentInstapay");
  if (method === "VODAFONE_CASH") return t("paymentVodafoneCash");
  return method;
}

/**
 * The store's three assurances, from configuration — never typed copy
 * (design-system §13a): the delivery window from the zones' lead days, the
 * return window from fulfilment settings, the payment methods actually
 * enabled. A fact with no data behind it is omitted rather than asserted.
 * One helper for the home strip and the product page, so they cannot drift.
 */
export function storeAssurances(locale: Locale, t: T, fulfilment: FulfilmentSettings | null, zones: DeliveryZone[], paymentMethods: PaymentMethodView[]) {
  // A zone's range runs from its earliest estimate (when set) to its latest; the strip spans every zone's range.
  const days = zones.flatMap((zone) => [zone.leadDaysMin ?? zone.leadDays, zone.leadDays]).filter((value) => Number.isFinite(value));
  const min = Math.min(...days);
  const max = Math.max(...days);
  return {
    // One window ("2–2 days" reads as a typo) names the single figure instead.
    delivery: fulfilment?.deliveryEnabled && days.length > 0 ? (min === max ? t("deliveryLineExact", { n: min, days: formatNumber(locale, min) }) : t("deliveryLine", { min: formatNumber(locale, min), max: formatNumber(locale, max) })) : undefined,
    // Mimora's rule: a problem found after delivery is reported within the window (24 hours = 1 day), counted in hours.
    returns: fulfilment && fulfilment.returnWindowDays > 0 ? t("returnsLine", { hours: formatNumber(locale, fulfilment.returnWindowDays * 24) }) : undefined,
    payment: paymentMethods.length > 0 ? paymentMethods.map((method) => paymentMethodName(method.method, t)).join(locale === "ar" ? "، " : ", ") : undefined,
  };
}
