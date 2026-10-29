import { CartView } from "../../../../preview/cart/cart-view";
import type { Locale } from "../../../../preview/types";

/** Cart (MDS §6.5) — the preview's seeded cart, re-quoted on every change. */
export default async function PreviewCart({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  return <CartView locale={locale} />;
}
