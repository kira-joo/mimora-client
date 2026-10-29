"use client";

import { Package } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import { useCurrency, useStore } from "@/components/providers/store-context";
import { useOrders } from "@/lib/account/use-account";
import type { OrderStatus, PaymentStatus } from "@/lib/api/types";
import { formatDate, formatNumber, formatOrderNumber, formatPrice } from "@/lib/format/numerals";
import { useStatusLabel } from "@/lib/order/use-order-labels";
import type { Locale } from "@/i18n/routing";
import { EmptyState, ErrorState, ListSkeleton, PageHeading, SignedIn } from "./states";

const STATUS_TONE: Record<OrderStatus, string> = { PLACED: "text-ink", CONFIRMED: "text-ink", PROCESSING: "text-ink", READY_FOR_PICKUP: "text-positive", SHIPPED: "text-ink", IN_TRANSIT: "text-ink", DELIVERED: "text-positive", COLLECTED: "text-positive", CANCELLED: "text-critical" };
const PAYMENT_TONE: Record<PaymentStatus, string> = { NOT_REQUIRED: "text-ink-secondary", AWAITING_PAYMENT: "text-caution", SUBMITTED: "text-ink", VERIFIED: "text-positive", REJECTED: "text-critical", REFUNDED: "text-ink-secondary" };

/** The customer's orders. Order status and payment status are two separate signals (MDS §14). There is no total, so "show more" while a page came back full. */
export function OrdersList() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const statusLabel = useStatusLabel();
  const currency = useCurrency();
  const { timeZone } = useStore();
  const orders = useOrders();
  const rows = orders.data?.pages.flat() ?? [];

  return (
    <SignedIn>
      {() => (
        <>
          <PageHeading title={t("ordersTitle")} />
          {orders.isLoading ? (
            <ListSkeleton />
          ) : orders.isError && !rows.length ? (
            <ErrorState onRetry={() => orders.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState icon={<Package className="size-10" />} title={t("ordersEmptyTitle")} body={t("ordersEmptyBody")} action={{ href: "/products", label: t("startShopping") }} />
          ) : (
            <>
              <ul className="flex flex-col divide-y divide-line border-y border-line">
                {rows.map((order) => (
                  <li key={order.orderId}>
                    <Link href={`/account/orders/${order.orderNumber}`} aria-label={t("viewOrder", { number: order.orderNumber })} className="grid min-h-11 gap-x-6 gap-y-2 py-5 hover:bg-surface-muted sm:grid-cols-[1fr_auto] sm:px-3">
                      <span className="flex flex-col gap-1">
                        <bdi dir="ltr" className="code self-start font-semibold">
                          {formatOrderNumber(order.orderNumber)}
                        </bdi>
                        <span className="text-[0.875rem] text-ink-muted">
                          {t("orderPlacedOn", { date: formatDate(locale, order.placedAt, timeZone) })} · {t("itemCount", { n: order.itemCount, count: formatNumber(locale, order.itemCount) })}
                        </span>
                      </span>
                      <span className="flex flex-col gap-1 sm:items-end">
                        <span className="tabular t-price">{formatPrice(locale, order.total, currency)}</span>
                        <span className="flex flex-wrap gap-x-3 text-[0.875rem] font-medium">
                          <span className={cn(STATUS_TONE[order.status])}>{statusLabel(order.status)}</span>
                          <span aria-hidden="true" className="text-ink-muted">
                            ·
                          </span>
                          <span className={cn(PAYMENT_TONE[order.paymentStatus])}>{t(`payment_${order.paymentStatus}`)}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {orders.hasNextPage ? (
                <button type="button" className="btn btn-secondary mt-6" disabled={orders.isFetchingNextPage} onClick={() => orders.fetchNextPage()}>
                  {orders.isFetchingNextPage ? t("loading") : t("loadMore")}
                </button>
              ) : null}
              {orders.isError ? <ErrorState onRetry={() => orders.fetchNextPage()} /> : null}
            </>
          )}
        </>
      )}
    </SignedIn>
  );
}
