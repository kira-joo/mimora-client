import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { mayHaveCart } from "@/lib/session/cookies";
import { isLocale } from "@/i18n/routing";
import { CartView } from "@/components/cart/cart-view";
import { getFulfilmentSettings, getPage, getPaymentMethods, getPickupLocations, orNull } from "@/lib/catalog/reads";
import { canTakeOrders } from "@/lib/checkout/checkout-model";
import { warnIfTaxModeUnknown } from "@/lib/checkout/tax-config";
import { taxModeOf } from "@/lib/checkout/tax-label";

/** Transactional — never cached (MDS §5). The page is a shell; the cart and its quote are fetched live through the BFF. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  return { title: t("yourCart"), robots: { index: false } };
}

/**
 * The cart also needs two facts about the STORE, read here on the server: whether
 * it can take an order at all (a fulfilment mode, a payment method and published
 * terms — the same three checkout stops on, so the Checkout button never leads
 * to a dead page), and how tax is configured (so the summary labels it right).
 */
export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const [settings, pickupLocations, paymentMethods, terms] = await Promise.all([
    orNull(getFulfilmentSettings, "fulfilment settings"),
    orNull(getPickupLocations, "pickup locations"),
    orNull(getPaymentMethods, "payment methods"),
    orNull(() => getPage("terms"), "terms page"),
  ]);
  warnIfTaxModeUnknown(settings, "cart");
  const canCheckout = canTakeOrders({ settings, pickupLocations: pickupLocations ?? [], paymentMethods: paymentMethods ?? [], termsPublished: Boolean(terms) });
  return <CartView mayHaveCart={await mayHaveCart()} canCheckout={canCheckout} taxMode={taxModeOf(settings)} />;
}
