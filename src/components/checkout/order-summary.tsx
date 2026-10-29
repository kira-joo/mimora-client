"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { useCurrency } from "@/components/providers/store-context";
import type { Quote } from "@/lib/api/types";
import { taxLine, type TaxMode } from "@/lib/checkout/tax-label";
import { TaxAddedRow, TaxIncludesNote } from "./tax-rows";
import { formatNumber, formatPrice, localized } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";

/** Every figure is the server's quote — this view does no arithmetic (MDS §12). */
export function SummaryBody({ quote, taxMode }: { quote: Quote; taxMode: TaxMode | null }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const currency = useCurrency();
  const price = (amount: string) => formatPrice(locale, amount, currency);
  const tax = taxLine(taxMode, quote.tax);
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4">
        {quote.lines
          .filter((line) => line.available)
          .map((line) => (
            <li key={line.lineId} className="flex items-center gap-3">
              <div className="media relative w-14 flex-none overflow-visible" style={{ aspectRatio: "4 / 5" }}>
                {line.image?.secureUrl ? <Image src={line.image.secureUrl} alt="" fill sizes="56px" className="object-cover" /> : null}
                <span className="tabular absolute -end-1.5 -top-1.5 z-10 min-w-5 rounded-full bg-ink px-1 text-center text-[0.6875rem] font-semibold leading-5 text-canvas">{formatNumber(locale, line.quantity)}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[0.9375rem] font-medium">{line.productName}</span>
                <span className="text-[0.8125rem] text-ink-secondary">{line.optionLabels.map((option) => localized(option.value, locale)).join(" · ")}</span>
              </div>
              <span className="tabular flex-none text-[0.9375rem]">{price(line.lineTotal)}</span>
            </li>
          ))}
      </ul>
      <dl className="flex flex-col gap-2 border-t border-line pt-4 text-[0.9375rem]" aria-live="polite">
        <div className="flex justify-between">
          <dt className="text-ink-secondary">{t("subtotal")}</dt>
          <dd className="tabular">{price(quote.subtotal)}</dd>
        </div>
        {quote.discount !== "0" ? (
          <div className="flex justify-between text-positive">
            <dt>{quote.promotion?.name ? `${t("discount")} · ${localized(quote.promotion.name, locale)}` : t("discount")}</dt>
            <dd className="tabular">−{price(quote.discount)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="text-ink-secondary">{quote.promotion?.waivesShippingFee && quote.promotion.name ? `${t("delivery")} · ${localized(quote.promotion.name, locale)}` : t("delivery")}</dt>
          <dd className="tabular">{quote.shippingFee === null ? "—" : quote.shippingFee === "0" ? t("free") : price(quote.shippingFee)}</dd>
        </div>
        <TaxAddedRow line={tax} price={price} />
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-semibold">{t("total")}</dt>
          <dd className="t-price">{price(quote.total)}</dd>
        </div>
      </dl>
      <TaxIncludesNote line={tax} price={price} className="-mt-2" />
    </div>
  );
}

/** Phone: the summary collapses to one line showing the server's total, expandable (design-system §13b). */
export function MobileSummary({ quote, taxMode }: { quote: Quote; taxMode: TaxMode | null }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const currency = useCurrency();
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-8 border-y border-line lg:hidden">
      <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex min-h-14 w-full items-center justify-between gap-3">
        <span className="flex items-center gap-2 font-medium">
          {open ? t("hideSummary") : t("showSummary")}
          <ChevronDown className={cn("size-4 transition-transform duration-[var(--sf-duration-standard)]", open && "rotate-180")} aria-hidden="true" />
        </span>
        <span className="t-price text-[1.125rem]">{formatPrice(locale, quote.total, currency)}</span>
      </button>
      {open ? (
        <div className="pb-5">
          <SummaryBody quote={quote} taxMode={taxMode} />
        </div>
      ) : null}
    </div>
  );
}
