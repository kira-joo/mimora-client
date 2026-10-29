import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/i18n/routing";
import { OrderReviews } from "@/components/account/order-reviews";
import { OrderView } from "@/components/order/order-view";
import { Link } from "@/i18n/navigation";
import { ReturnRequest } from "@/components/account/return-request";
import { getFulfilmentSettings, orNull } from "@/lib/catalog/reads";
import { warnIfTaxModeUnknown } from "@/lib/checkout/tax-config";
import { taxModeOf } from "@/lib/checkout/tax-label";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: "common" });
  return { title: t("orderTitle"), robots: { index: false, follow: false } };
}

const ORDER_NUMBER = /^[A-Z]{2,5}-\d{1,12}$/;

/** An account order is the same OrderView, by session (no token), with the account-only review actions beneath it. */
export default async function Page({ params }: { params: Promise<{ locale: string; orderNumber: string }> }) {
  const { locale, orderNumber } = await params;
  if (!isLocale(locale) || !ORDER_NUMBER.test(orderNumber)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations("common");
  // The store's CURRENT tax mode labels the summary (an order does not snapshot the mode); unknown shows no tax line, logged.
  const settings = await orNull(getFulfilmentSettings, "fulfilment settings");
  warnIfTaxModeUnknown(settings, "account order");
  return (
    <>
      <div className="container-sf pt-6">
        <Link href="/account/orders" className="inline-flex min-h-11 items-center text-[0.9375rem] font-medium text-ink-secondary underline underline-offset-4 hover:text-ink">
          {t("backToOrders")}
        </Link>
      </div>
      <OrderView orderNumber={orderNumber} justPlaced={false} taxMode={taxModeOf(settings)} />
      <ReturnRequest orderNumber={orderNumber} />
      <OrderReviews orderNumber={orderNumber} />
    </>
  );
}
