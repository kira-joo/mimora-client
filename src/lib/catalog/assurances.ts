import type { Locale } from "@/i18n/routing";
import type { DeliveryZone, FulfilmentSettings, PaymentMethodView } from "@/lib/api/types";
import { formatNumber } from "@/lib/format/numerals";

/** The keys this helper reads — a next-intl `t` for the "common" namespace satisfies it. */
type T = (key: "deliveryLine" | "deliveryLineExact" | "returnsLine" | "paymentCOD" | "paymentWallet" | "paymentInstapay", values?: Record<string, string | number>) => string;

/** Payment method keys are open strings (D-6); known ones get a localized name, anything else shows as configured. */
export function paymentMethodName(method: string, t: T): string {
  if (method === "COD") return t("paymentCOD");
  if (method === "WALLET_TRANSFER" || method === "WALLET") return t("paymentWallet");
  if (method === "INSTAPAY") return t("paymentInstapay");
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
  const days = zones.map((zone) => zone.leadDays).filter((value) => Number.isFinite(value));
  const min = Math.min(...days);
  const max = Math.max(...days);
  return {
    // One window ("2–2 days" reads as a typo) names the single figure instead.
    delivery: fulfilment?.deliveryEnabled && days.length > 0 ? (min === max ? t("deliveryLineExact", { n: min, days: formatNumber(locale, min) }) : t("deliveryLine", { min: formatNumber(locale, min), max: formatNumber(locale, max) })) : undefined,
    returns: fulfilment && fulfilment.returnWindowDays > 0 ? t("returnsLine", { days: formatNumber(locale, fulfilment.returnWindowDays) }) : undefined,
    payment: paymentMethods.length > 0 ? paymentMethods.map((method) => paymentMethodName(method.method, t)).join(locale === "ar" ? "، " : ", ") : undefined,
  };
}
