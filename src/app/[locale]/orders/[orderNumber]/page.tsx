import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { OrderView } from "@/components/order/order-view";
import { getFulfilmentSettings, orNull } from "@/lib/catalog/reads";
import { warnIfTaxModeUnknown } from "@/lib/checkout/tax-config";
import { taxModeOf } from "@/lib/checkout/tax-label";

/** Transactional — dynamic, never cached; reached by session or the guest's access token (MDS §5). */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  // The URL may carry the guest's tracking token: never index it, and never send it onward as a Referer.
  return { title: t("orderTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

const ORDER_NUMBER = /^[A-Z]{2,5}-\d{1,12}$/;
const TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

export default async function OrderPage({ params, searchParams }: { params: Promise<{ locale: string; orderNumber: string }>; searchParams: Promise<{ t?: string; placed?: string }> }) {
  const { locale, orderNumber } = await params;
  if (!isLocale(locale) || !ORDER_NUMBER.test(orderNumber)) notFound();
  setRequestLocale(locale);
  const { t, placed } = await searchParams;
  // The store's CURRENT tax mode labels the summary (an order does not snapshot the mode); unknown shows no tax line, logged.
  const settings = await orNull(getFulfilmentSettings, "fulfilment settings");
  warnIfTaxModeUnknown(settings, "order");
  return <OrderView orderNumber={orderNumber} token={t && TOKEN.test(t) ? t : undefined} justPlaced={placed === "1"} taxMode={taxModeOf(settings)} />;
}
