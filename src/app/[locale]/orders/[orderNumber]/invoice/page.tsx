import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { InvoiceView } from "@/components/order/invoice-view";

/** Transactional and personal: dynamic, never cached, never indexed; reached by session or the guest's access token. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "common.orderDocs" });
  // The URL may carry the guest's tracking token: never index it, and never send it onward as a Referer.
  return { title: t("invoice"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

const ORDER_NUMBER = /^[A-Z]{2,5}-\d{1,12}$/;
const TOKEN = /^[A-Za-z0-9_-]{16,128}$/;

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ locale: string; orderNumber: string }>; searchParams: Promise<{ t?: string }> }) {
  const { locale, orderNumber } = await params;
  if (!isLocale(locale) || !ORDER_NUMBER.test(orderNumber)) notFound();
  setRequestLocale(locale);
  const { t } = await searchParams;
  return <InvoiceView orderNumber={orderNumber} token={t && TOKEN.test(t) ? t : undefined} />;
}
