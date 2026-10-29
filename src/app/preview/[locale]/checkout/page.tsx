import { CheckoutView } from "../../../../preview/checkout/checkout-view";
import type { Locale } from "../../../../preview/types";

/** Checkout (MDS §6.6) — one page, five sections, guest by default. */
export default async function PreviewCheckout({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <CheckoutView locale={locale} />;
}
