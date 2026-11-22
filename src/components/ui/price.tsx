import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { formatAmount, formatPrice } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";
import { useCurrency } from "@/components/providers/store-context";

interface PriceProps {
  /** A money string from the backend — formatted, never computed (MDS §24). */
  amount: string;
  /** A product whose variants differ in price shows "from" until a variant is chosen (MDS §10.4). */
  rangeFrom?: boolean;
  compareAt?: string;
  /**
   * Product cards (owner decision, 2026-11-22): the compare-at price sits beside the price, small and raised to its top
   * edge, so a sale card is no taller than any other. Elsewhere it stays on its own line beneath.
   */
  inline?: boolean;
  className?: string;
}

/**
 * Price in the display face, in ink — legibility, not decoration (design-system §4.1).
 * A compare-at price renders only when a genuine prior price exists, on its own
 * line beneath (§15: the inline strikethrough beside a Naskh price was a defect) — or, with `inline`, beside it.
 */
export function Price({ amount, rangeFrom, compareAt, inline, className }: PriceProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const currency = useCurrency();
  return (
    <span className={cn(inline ? "inline-flex flex-wrap items-baseline gap-x-2" : "inline-flex flex-col items-start", className)}>
      {/* On a sale card the price takes the action colour (text-safe `action-ink`), matching the card's sale badge. */}
      <span className={cn("t-price whitespace-nowrap", inline && compareAt ? "text-action-ink" : "text-ink")}>
        {rangeFrom ? <span className="me-1 font-sans text-[0.8125rem] font-medium text-ink-muted">{t("from")}</span> : null}
        {formatPrice(locale, amount, currency)}
      </span>
      {compareAt && inline ? (
        // Product cards — the common store pattern: the old figure on the SAME line, baseline-aligned, smaller, grey and
        // struck; the currency is already beside the price. Screen readers hear the full "was 90 EGP".
        <span className="tabular whitespace-nowrap text-[0.875rem] text-ink-muted line-through decoration-1">
          <span className="sr-only">
            {t("was")} {formatPrice(locale, compareAt, currency)}
          </span>
          <span aria-hidden="true">{formatAmount(locale, compareAt, currency)}</span>
        </span>
      ) : compareAt ? (
        <span className="tabular text-[0.8125rem] text-ink-muted line-through decoration-[1.5px]">
          <span className="sr-only">{t("was")} </span>
          {formatPrice(locale, compareAt, currency)}
        </span>
      ) : null}
    </span>
  );
}
