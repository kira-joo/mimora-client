"use client";

import { Check, CircleAlert } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Sheet } from "@/components/ui/sheet";
import { useCurrency } from "@/components/providers/store-context";
import type { QuoteLine } from "@/lib/api/types";
import { removeFromCart } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { useCartUi } from "@/lib/cart/cart-ui";
import { cartCount, useCart, useQuote, useRemoveLine, useUpdateLine } from "@/lib/cart/use-cart";
import { formatNumber, formatPrice } from "@/lib/format/numerals";
import type { Locale } from "@/i18n/routing";
import { CartLine } from "./cart-line";

/**
 * The cart drawer that opens on add-to-cart. It shows the WHOLE cart — every line the server holds, each with its
 * stepper and remove — under a one-line confirmation of what was just added, and the subtotal as the server quoted
 * it. It used to render only the line just added beside the full-cart subtotal, which read as "the cart kept only
 * my last item" (2026-10-30). Lines come from the quote (prices) and quantities from the cart (optimistic), exactly
 * as on the cart page, through the same <CartLine>. Opens from the reading-end edge at every width.
 */
export function AddedSheet() {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const currency = useCurrency();
  const { lastAdded, clearLastAdded } = useCartUi();
  const open = Boolean(lastAdded);
  const cart = useCart();
  const quote = useQuote(open);
  const updateLine = useUpdateLine();
  const removeLine = useRemoveLine();
  const price = (amount: string) => formatPrice(locale, amount, currency);

  const count = cartCount(cart.data);
  const cartLines = cart.data?.lines ?? [];
  // A line removed optimistically leaves the quote before the re-quote arrives; quantities are the cart's.
  const lines = (quote.data?.lines ?? []).filter((line) => cartLines.some((candidate) => candidate.lineId === line.lineId));
  const quantityOf = (line: QuoteLine) => cartLines.find((candidate) => candidate.lineId === line.lineId)?.quantity ?? line.quantity;
  const empty = cart.data !== undefined && cartLines.length === 0;
  const blocked = Boolean(quote.data?.hasUnavailableLines);

  return (
    <Sheet
      open={open}
      onClose={clearLastAdded}
      side="end"
      title={count > 0 ? `${t("yourCart")} (${formatNumber(locale, count)})` : t("yourCart")}
      closeLabel={t("close")}
      footer={
        empty ? (
          <Link href="/products" className="btn btn-primary w-full" onClick={clearLastAdded}>
            {t("startShopping")}
          </Link>
        ) : (
          <div className="flex flex-col gap-3">
            {quote.data ? (
              <div className="flex items-center justify-between" aria-live="polite">
                <span className="text-ink-secondary">
                  {t("subtotal")} <span className="text-[0.875rem]">({t("items", { n: formatNumber(locale, count) })})</span>
                </span>
                <span className="t-price text-[1.125rem]">{price(quote.data.subtotal)}</span>
              </div>
            ) : (
              <div className="h-7" aria-hidden="true" />
            )}
            <p className="-mt-2 text-[0.8125rem] text-ink-muted">{t("shippingAtCheckout")}</p>
            <Link href="/cart" className="btn btn-primary w-full" onClick={clearLastAdded}>
              {t("viewCartAndCheckout")}
            </Link>
            <button type="button" className="btn btn-secondary w-full" onClick={clearLastAdded}>
              {t("keepShopping")}
            </button>
          </div>
        )
      }
    >
      {lastAdded ? (
        <p className="flex items-center gap-2 rounded-[var(--sf-radius-control)] bg-surface-muted px-3 py-2.5 text-[0.875rem]" role="status">
          <Check className="size-4 flex-none text-positive" aria-hidden="true" />
          <span className="min-w-0">
            <span className="font-semibold">{t("added")}</span>
            <span className="text-ink-secondary"> · {lastAdded.productName}{lastAdded.optionLabel ? ` · ${lastAdded.optionLabel}` : ""}</span>
          </span>
        </p>
      ) : null}

      {empty ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center">
          <p className="t-heading">{t("emptyCart")}</p>
          <p className="text-ink-secondary">{t("emptyCartBody")}</p>
        </div>
      ) : lines.length === 0 ? (
        <ul className="mt-2 flex flex-col divide-y divide-line" aria-busy="true">
          {Array.from({ length: Math.max(1, cartLines.length) }, (_, index) => (
            <li key={index} className="flex gap-3 py-4">
              <div className="media w-20 flex-none" style={{ aspectRatio: "4 / 5" }} />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <div className="h-4 w-3/4 rounded bg-surface-muted" />
                <div className="h-4 w-1/3 rounded bg-surface-muted" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="mt-2 flex flex-col divide-y divide-line" aria-busy={quote.isFetching || undefined}>
            {lines.map((line) => (
              <CartLine
                key={line.lineId}
                compact
                line={line}
                quantity={quantityOf(line)}
                price={price}
                onQuantity={(quantity) => updateLine.mutate({ lineId: line.lineId, quantity })}
                onRemove={() => removeLine.mutate({ lineId: line.lineId }, { onSuccess: () => track(removeFromCart({ productId: line.productId, variantId: line.variantId, quantity: quantityOf(line) })) })}
              />
            ))}
          </ul>
          {blocked ? (
            <p className="mt-3 flex items-start gap-1.5 text-[0.875rem] font-medium text-critical" role="status">
              <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
              {t("resolveUnavailable")}
            </p>
          ) : null}
        </>
      )}
    </Sheet>
  );
}
