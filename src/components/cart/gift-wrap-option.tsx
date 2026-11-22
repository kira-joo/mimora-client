"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { useCurrency } from "@/components/providers/store-context";
import { useSetGiftWrap } from "@/lib/cart/use-cart";
import { formatPrice } from "@/lib/format/numerals";
import type { Quote } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";

/**
 * Gift box & wrapping — one checkbox, shown in the cart and at checkout whenever the store offers it (Staff →
 * Fulfilment settings). Ticking it records the choice on the cart; the backend prices it and the refetched quote adds
 * it to the total. This component never computes a price: the fee shown is the quote's.
 */
export function GiftWrapOption({ giftWrap, className }: { giftWrap: Quote["giftWrap"] | undefined; className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const currency = useCurrency();
  const setGiftWrap = useSetGiftWrap();
  // The customer's latest click shows at once (the save, then the quote refetch, take a moment); a failed save drops
  // it, and from then on the box shows what the quote — the server — says is chosen.
  const [choice, setChoice] = useState<boolean | null>(null);
  const checked = choice ?? giftWrap?.selected === true;

  if (!giftWrap?.available || !giftWrap.fee) return null;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-card border p-3.5 transition-colors duration-[var(--sf-duration-fast)]",
        checked ? "border-action bg-blush-soft" : "border-line bg-surface hover:border-line-strong",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={setGiftWrap.isPending}
        onChange={(event) => {
          const next = event.target.checked;
          setChoice(next);
          setGiftWrap.mutate(next, { onError: () => setChoice(null) });
        }}
        className="mt-0.5 size-5 flex-none accent-[var(--sf-action)]"
      />
      <Gift className="mt-0.5 size-5 flex-none text-action-ink" strokeWidth={1.6} aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-[0.9375rem] font-semibold text-ink">{t("giftWrapLabel")}</span>
          <span className="tabular text-[0.9375rem] font-semibold text-action-ink">+{formatPrice(locale, giftWrap.fee, currency)}</span>
        </span>
        <span className="text-[0.8125rem] leading-snug text-ink-secondary">{t("giftWrapHint")}</span>
      </span>
    </label>
  );
}
