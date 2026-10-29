"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/sheet";
import { useCurrency } from "@/components/providers/store-context";
import { useCartUi } from "@/lib/cart/cart-ui";
import { useQuote } from "@/lib/cart/use-cart";
import { formatPrice } from "@/lib/format/numerals";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import type { Locale } from "@/i18n/routing";

/**
 * design-system §13b: add-to-cart confirms in a sheet — not a page, not a toast
 * — with the line just added, the cart subtotal AS THE SERVER QUOTED IT, and two
 * actions. A bottom sheet on a phone; a panel from the reading-end edge on
 * desktop. Shared by the product page and Quick Add.
 */
export function AddedSheet() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const currency = useCurrency();
  const { lastAdded, clearLastAdded } = useCartUi();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const quote = useQuote(Boolean(lastAdded));

  return (
    <Sheet
      open={Boolean(lastAdded)}
      onClose={clearLastAdded}
      side={desktop ? "end" : "bottom"}
      title={t("added")}
      closeLabel={t("close")}
      footer={
        <div className="flex flex-col gap-2">
          <Link href="/cart" className="btn btn-primary w-full" onClick={clearLastAdded}>
            {t("viewCartAndCheckout")}
          </Link>
          <button type="button" className="btn btn-secondary w-full" onClick={clearLastAdded}>
            {t("keepShopping")}
          </button>
        </div>
      }
    >
      {lastAdded ? (
        <div className="flex flex-col gap-5">
          <div className="flex gap-4">
            <div className="media w-20 flex-none" style={{ aspectRatio: "4 / 5" }}>
              {lastAdded.image?.secureUrl ? <Image src={lastAdded.image.secureUrl} alt="" fill sizes="80px" className="object-cover" /> : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[0.875rem] font-medium text-positive">
                <Check className="size-4" aria-hidden="true" />
                {t("added")}
              </span>
              <span className="font-medium">{lastAdded.productName}</span>
              {lastAdded.optionLabel ? <span className="text-[0.875rem] text-ink-secondary">{lastAdded.optionLabel}</span> : null}
              <span className="t-price mt-1 text-[1.125rem]">{formatPrice(locale, lastAdded.price, currency)}</span>
            </div>
          </div>
          {quote.data ? (
            <div className="flex items-center justify-between border-t border-line pt-4" aria-live="polite">
              <span className="text-ink-secondary">{t("subtotal")}</span>
              <span className="t-price text-[1.125rem]">{formatPrice(locale, quote.data.subtotal, currency)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </Sheet>
  );
}
