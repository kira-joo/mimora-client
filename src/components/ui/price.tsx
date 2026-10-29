import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { formatPrice } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";
import { useCurrency } from "@/components/providers/store-context";

interface PriceProps {
  /** A money string from the backend — formatted, never computed (MDS §24). */
  amount: string;
  /** A product whose variants differ in price shows "from" until a variant is chosen (MDS §10.4). */
  rangeFrom?: boolean;
  compareAt?: string;
  className?: string;
}

/**
 * Price in the display face, in ink — legibility, not decoration (design-system §4.1).
 * A compare-at price renders only when a genuine prior price exists, on its own
 * line beneath (§15: the inline strikethrough beside a Naskh price was a defect).
 */
export function Price({ amount, rangeFrom, compareAt, className }: PriceProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const currency = useCurrency();
  return (
    <span className={cn("inline-flex flex-col items-start", className)}>
      <span className="t-price whitespace-nowrap text-ink">
        {rangeFrom ? <span className="me-1 font-sans text-[0.8125rem] font-medium text-ink-muted">{t("from")}</span> : null}
        {formatPrice(locale, amount, currency)}
      </span>
      {compareAt ? (
        <span className="tabular text-[0.8125rem] text-ink-muted line-through decoration-[1.5px]">
          <span className="sr-only">{t("was")} </span>
          {formatPrice(locale, compareAt, currency)}
        </span>
      ) : null}
    </span>
  );
}
