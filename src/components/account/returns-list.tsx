"use client";

import { Undo2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import { useStore } from "@/components/providers/store-context";
import { useReturns } from "@/lib/account/use-account";
import type { ReturnListItem } from "@/lib/api/types";
import { formatDate, formatNumber, formatOrderNumber } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";
import { EmptyState, ErrorState, ListSkeleton, PageHeading, SignedIn } from "./states";

const TONE: Record<ReturnListItem["status"], string> = { REQUESTED: "text-ink", APPROVED: "text-positive", REJECTED: "text-critical", REFUNDED: "text-positive" };

export function ReturnsList() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const { timeZone } = useStore();
  const returns = useReturns();
  const rows = returns.data ?? [];
  return (
    <SignedIn>
      {() => (
        <>
          <PageHeading title={t("returnsListTitle")} />
          {returns.isLoading ? (
            <ListSkeleton />
          ) : returns.isError ? (
            <ErrorState onRetry={() => returns.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState icon={<Undo2 className="size-10" />} title={t("returnsEmptyTitle")} body={t("returnsEmptyBody")} action={{ href: "/account/orders", label: t("accOrders") }} />
          ) : (
            <ul className="flex flex-col divide-y divide-line border-y border-line">
              {rows.map((item) => (
                <li key={item.returnId} className="grid gap-x-6 gap-y-2 py-5 sm:grid-cols-[1fr_auto]">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold">
                      <span className="sr-only">{t("returnNumber")}: </span>
                      <bdi dir="ltr" className="code">
                        {item.returnNumber}
                      </bdi>
                    </p>
                    <p className="text-[0.875rem] text-ink-secondary">
                      {t("orderNumber")}:{" "}
                      <Link href={`/account/orders/${item.orderNumber}`} className="underline underline-offset-4">
                        <bdi dir="ltr" className="code">
                          {formatOrderNumber(item.orderNumber)}
                        </bdi>
                      </Link>
                    </p>
                    <p className="text-[0.875rem] text-ink-muted">
                      {t("returnRequestedOn", { date: formatDate(locale, item.requestedAt, timeZone) })} · {t("itemCount", { n: item.lineCount, count: formatNumber(locale, item.lineCount) })}
                    </p>
                  </div>
                  <p className={cn("text-[0.9375rem] font-semibold sm:text-end", TONE[item.status])}>
                    <span className="sr-only">{t("returnStatus")}: </span>
                    {t(`return_${item.status}`)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </SignedIn>
  );
}
