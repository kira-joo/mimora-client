import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { formatPrice } from "../format";
import type { Locale } from "../types";
import { getDictionary } from "../i18n";

interface PriceProps {
  locale: Locale;
  /** A single resolved price, or a range shown as "from" until a variant is chosen (§4.1). */
  amount: string;
  rangeFrom?: boolean;
  compareAt?: string;
  className?: string;
}

/**
 * Price in the display face, in ink — legibility, not decoration (§4.1).
 * A compare-at price renders only when a genuine prior price exists, and in
 * Arabic on its own line beneath (§15: the inline strikethrough beside a
 * Naskh price was an open defect) — here in both locales, for consistency.
 */
export function Price({ locale, amount, rangeFrom, compareAt, className }: PriceProps) {
  const dict = getDictionary(locale);
  return (
    <span className={cn("inline-flex flex-col items-start", className)}>
      <span className="t-price whitespace-nowrap text-ink">
        {rangeFrom ? <span className="me-1 font-sans text-[0.8125rem] font-medium text-ink-muted">{dict.from}</span> : null}
        {formatPrice(locale, amount)}
      </span>
      {compareAt ? (
        <span className="tabular text-[0.8125rem] text-ink-muted line-through decoration-[1.5px]">
          <span className="sr-only">{locale === "ar" ? "السعر السابق" : "Was"} </span>
          {formatPrice(locale, compareAt)}
        </span>
      ) : null}
    </span>
  );
}
