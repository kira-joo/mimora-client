"use client";

import Image from "next/image";
import { CircleAlert, Minus, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { QuoteLine } from "@/lib/api/types";
import { formatNumber, localized } from "@/lib/format/numerals";
import { productHref } from "@/lib/links";
import type { Locale } from "@/i18n/routing";

/**
 * One cart line, as the server quoted it — shared by the cart page and the cart drawer so the two can never
 * disagree about what a line shows or does. Image, name, the chosen options, unit price, a stepper, the line
 * total and remove; a line that can no longer be bought shows a one-tap remove and a link back instead.
 * `quantity` is the cart's (optimistic) count, which can be ahead of the quote while a change is in flight.
 */
export function CartLine({ line, quantity, price, onQuantity, onRemove, compact = false }: { line: QuoteLine; quantity: number; price(amount: string): string; onQuantity(quantity: number): void; onRemove(): void; compact?: boolean }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const href = productHref(line.productSlug);
  const options = line.optionLabels.map((option) => `${localized(option.axis, locale)}: ${localized(option.value, locale)}`).join(" · ");
  return (
    <li className={compact ? "flex gap-3 py-4" : "flex gap-4 py-5"}>
      <Link href={href} className={compact ? "media w-20 flex-none" : "media w-24 flex-none sm:w-28"} style={{ aspectRatio: "4 / 5" }} tabIndex={-1} aria-hidden="true">
        {line.image?.secureUrl ? <Image src={line.image.secureUrl} alt="" fill sizes={compact ? "80px" : "112px"} className={line.available ? "object-cover" : "object-cover opacity-50"} /> : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="min-w-0 font-medium leading-snug hover:underline">
            {line.productName}
          </Link>
          {line.available ? <span className="t-price flex-none text-[1.0625rem]">{price(line.lineTotal)}</span> : null}
        </div>
        {options ? <span className="text-[0.875rem] text-ink-secondary">{options}</span> : null}
        {!line.available ? (
          <div className="mt-1 flex flex-col items-start gap-2">
            <p className="flex items-start gap-1.5 text-[0.875rem] font-medium text-critical">
              <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
              {line.unavailableReason === "INSUFFICIENT_STOCK" ? t("lineUnavailable") : t("lineNoLongerSold")}
            </p>
            <div className="flex gap-4">
              <button type="button" onClick={onRemove} className="inline-flex min-h-11 items-center gap-1.5 text-[0.875rem] font-semibold text-action">
                <Trash2 className="size-4" aria-hidden="true" />
                {t("remove")}
              </button>
              <Link href={href} className="inline-flex min-h-11 items-center text-[0.875rem] font-medium underline-offset-4 hover:underline">
                {t("viewProduct")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <span className="tabular text-[0.875rem] text-ink-muted">{price(line.unitPrice)}</span>
            <div className="mt-auto flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center rounded-[var(--sf-radius-control)] border border-line-strong" role="group" aria-label={`${t("quantity")} — ${line.productName}`}>
                <button type="button" className="inline-flex size-11 items-center justify-center disabled:text-ink-muted" onClick={() => onQuantity(quantity - 1)} disabled={quantity <= 1} aria-label={t("decrease")}>
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <span className="tabular w-6 text-center font-semibold" aria-live="polite">
                  {formatNumber(locale, quantity)}
                </span>
                <button type="button" className="inline-flex size-11 items-center justify-center disabled:text-ink-muted" onClick={() => onQuantity(quantity + 1)} disabled={quantity >= 99} aria-label={t("increase")}>
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
              <button type="button" onClick={onRemove} className="inline-flex min-h-11 items-center gap-1.5 text-[0.875rem] text-ink-secondary hover:text-ink" aria-label={`${t("remove")} — ${line.productName}`}>
                <Trash2 className="size-4" aria-hidden="true" />
                {t("remove")}
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
