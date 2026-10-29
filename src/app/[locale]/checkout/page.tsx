import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { mayHaveCart } from "@/lib/session/cookies";
import { isLocale, type Locale } from "@/i18n/routing";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { getDeliveryZones, getFulfilmentSettings, getOperatingHours, getPage, getPaymentMethods, getPickupLocations, orNull } from "@/lib/catalog/reads";
import { buildHoursView } from "@/lib/catalog/operating-hours";
import { storeTimeZone } from "@/lib/config/startup-check";
import { warnIfTaxModeUnknown } from "@/lib/checkout/tax-config";
import { localized } from "@/lib/format/numerals";

/** Transactional — dynamic and never cached (MDS §5). Guests allowed (MDS §7). */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  return { title: t("checkout"), robots: { index: false } };
}

/**
 * Store configuration for checkout is read here, on the server: which
 * fulfilment modes exist, the zones and pickup points, the enabled payment
 * methods, and the CURRENT terms version — the one the order will record
 * (D-13), and the weekly hours resolved in the STORE'S time zone — this page is
 * dynamic, so unlike the footer it can say how today stands. The cart and its
 * quote are live in the view.
 */
export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  setRequestLocale(locale);

  const [settings, zones, pickupLocations, paymentMethods, terms, returns, hours] = await Promise.all([
    orNull(getFulfilmentSettings, "fulfilment settings"),
    orNull(getDeliveryZones, "delivery zones"),
    orNull(getPickupLocations, "pickup locations"),
    orNull(getPaymentMethods, "payment methods"),
    orNull(() => getPage("terms"), "terms page"),
    orNull(() => getPage("returns"), "returns page"),
    orNull(getOperatingHours, "operating hours"),
  ]);
  warnIfTaxModeUnknown(settings, "checkout");
  const t = await getTranslations({ locale, namespace: "common" });

  return (
    <CheckoutView
      mayHaveCart={await mayHaveCart()}
      config={{
        settings,
        zones: zones ?? [],
        pickupLocations: pickupLocations ?? [],
        paymentMethods: paymentMethods ?? [],
        terms: terms ? { version: terms.version, title: localized(terms.title, locale), body: localized(terms.content, locale) } : null,
        returns: returns ? { title: localized(returns.title, locale), body: localized(returns.content, locale) } : null,
        hours: buildHoursView(hours, { locale, timeZone: storeTimeZone(), now: new Date(), closedLabel: t("hoursClosed"), showToday: true }),
      }}
    />
  );
}
