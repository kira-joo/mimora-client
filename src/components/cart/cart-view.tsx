"use client";

import { useState } from "react";
import { CircleAlert, ShoppingBag, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCurrency } from "@/components/providers/store-context";
import { useFloatingDock } from "@/lib/hooks/use-floating-dock";
import { apiStatus } from "@/lib/api/errors";
import type { Quote, QuoteLine } from "@/lib/api/types";
import { promotionStatus } from "@/lib/cart/promotion-status";
import { taxLine, type TaxMode } from "@/lib/checkout/tax-label";
import { TaxAddedRow, TaxIncludesNote } from "@/components/checkout/tax-rows";
import { removeFromCart } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { cartCount, useApplyPromotion, useCart, useQuote, useRemoveLine, useRemovePromotion, useUpdateLine } from "@/lib/cart/use-cart";
import { formatNumber, formatPrice, localized } from "@/lib/format/numerals";
import { CartLine } from "./cart-line";
import type { Locale } from "@/i18n/routing";

/**
 * Cart (MDS §6.5, §11). Every number on it is the server's quote — this app
 * never adds anything up. Lines show image, name, the chosen options, unit
 * price, a stepper (optimistic, rolled back on refusal), line total and remove.
 * A line that can no longer be bought is surfaced with a one-tap remove and a
 * link back — never silently dropped — and checkout waits until it is resolved,
 * because placement would refuse it. Phone: total and checkout sticky below.
 *
 * When the store cannot take orders at all (no fulfilment mode, no payment
 * method, or no published terms) the Checkout button says so instead of leading
 * to a page that can only say the same — and the cart stays usable, saved.
 * Tax is labelled by the store's configured mode: an "Includes tax" note when
 * prices contain it, a "Tax" row only when it is added, nothing when unknown.
 */
export function CartView({ mayHaveCart = true, canCheckout = true, taxMode = null }: { mayHaveCart?: boolean; canCheckout?: boolean; taxMode?: TaxMode | null }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const currency = useCurrency();
  const dock = useFloatingDock();
  const cart = useCart();
  const quote = useQuote(true);
  const updateLine = useUpdateLine();
  const removeLine = useRemoveLine();
  const price = (amount: string) => formatPrice(locale, amount, currency);

  // A visitor with no cart cookie and no session has nothing to load: the empty state is the first paint.
  if (!mayHaveCart && cart.isLoading) return <EmptyCart />;
  if (cart.isLoading) return <CartSkeleton />;
  // An empty cart is known from the cart alone — never flash the skeleton while its (empty) quote is still in flight.
  if (cart.data && cart.data.lines.length === 0) return <EmptyCart />;
  if (quote.isLoading && !quote.data) return <CartSkeleton />;

  if (cart.isError || quote.isError) {
    return (
      <div className="container-sf flex flex-col items-center gap-4 py-24 text-center" role="alert">
        <h1 className="t-title">{t("cartUnavailableTitle")}</h1>
        <p className="text-ink-secondary">{t("cartUnavailableBody")}</p>
        <button type="button" className="btn btn-secondary" onClick={() => (cart.refetch(), quote.refetch())}>
          {t("tryAgain")}
        </button>
      </div>
    );
  }

  const lines = quote.data?.lines ?? [];
  if (!cart.data?.lines.length || lines.length === 0) return <EmptyCart />;

  const q = quote.data!;
  const quantityOf = (line: QuoteLine) => cart.data?.lines.find((candidate) => candidate.lineId === line.lineId)?.quantity ?? line.quantity;
  const unavailable = lines.filter((line) => !line.available);
  const available = lines.filter((line) => line.available);
  const blocked = q.hasUnavailableLines || available.length === 0;
  const tax = taxLine(taxMode, q.tax);

  return (
    <div className="sf-cart container-sf pt-6 lg:pt-10">
      <div className="mb-6 flex flex-col gap-3">
        <h1 className="t-title">{t("yourCart")}</h1>
        <div className="rule" aria-hidden="true" />
      </div>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <ul className="flex flex-col divide-y divide-line border-y border-line lg:col-span-7" aria-busy={quote.isFetching || undefined}>
          {[...unavailable, ...available].map((line) => (
            <CartLine
              key={line.lineId}
              line={line}
              quantity={quantityOf(line)}
              price={price}
              onQuantity={(quantity) => updateLine.mutate({ lineId: line.lineId, quantity })}
              onRemove={() => removeLine.mutate({ lineId: line.lineId }, { onSuccess: () => track(removeFromCart({ productId: line.productId, variantId: line.variantId, quantity: quantityOf(line) })) })}
            />
          ))}
        </ul>

        <aside className="lg:col-span-5">
          <div className="flex flex-col gap-5 bg-surface-muted p-5 lg:sticky lg:top-[calc(72px+1.5rem)] lg:p-6">
            <h2 className="t-heading">{t("orderSummary")}</h2>
            <PromotionForm applied={cart.data.appliedPromotionCode} promotion={q.promotion} />
            <dl className="flex flex-col gap-2 border-t border-line pt-4" aria-live="polite">
              <div className="flex items-center justify-between">
                <dt className="text-ink-secondary">
                  {t("subtotal")} <span className="text-[0.875rem]">({t("items", { n: formatNumber(locale, cartCount(cart.data)) })})</span>
                </dt>
                <dd className="t-price text-[1.125rem]">{price(q.subtotal)}</dd>
              </div>
              {q.discount !== "0" ? (
                <div className="flex items-center justify-between text-positive">
                  <dt>{q.promotion?.name ? `${t("discount")} · ${localized(q.promotion.name, locale)}` : t("discount")}</dt>
                  <dd className="tabular font-semibold">−{price(q.discount)}</dd>
                </div>
              ) : null}
              <TaxAddedRow line={tax} price={price} className="items-center" />
            </dl>
            <TaxIncludesNote line={tax} price={price} className="-mt-3" />
            <p className="-mt-3 text-[0.875rem] text-ink-muted">{t("shippingAtCheckout")}</p>
            {blocked && q.hasUnavailableLines ? (
              <p className="flex items-start gap-1.5 text-[0.875rem] font-medium text-critical" role="status">
                <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
                {t("resolveUnavailable")}
              </p>
            ) : null}
            {!canCheckout ? <StoreClosedNotice /> : null}
            <CheckoutLink blocked={blocked} storeClosed={!canCheckout} className="hidden w-full lg:inline-flex" />
          </div>
        </aside>
      </div>

      <div ref={dock} className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas px-[var(--sf-gutter)] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mb-2 flex items-center justify-between text-[0.9375rem]">
          <span className="text-ink-secondary">{t("subtotal")}</span>
          <span className="t-price text-[1.125rem]">{price(q.subtotal)}</span>
        </div>
        <CheckoutLink blocked={blocked} storeClosed={!canCheckout} compact className="w-full" />
      </div>
    </div>
  );
}

function EmptyCart() {
  const t = useTranslations("common");
  return (
    <div className="container-sf flex flex-col items-center gap-4 py-24 text-center">
      <ShoppingBag className="size-10 text-ink-muted" aria-hidden="true" />
      <h1 className="t-title">{t("emptyCart")}</h1>
      <p className="text-ink-secondary">{t("emptyCartBody")}</p>
      <Link href="/products" className="btn btn-primary mt-2">
        {t("startShopping")}
      </Link>
    </div>
  );
}

const STORE_CLOSED_ID = "store-closed";

/** Why Checkout is unavailable when the whole store cannot take orders — in the order summary, at every width. */
function StoreClosedNotice() {
  const t = useTranslations("common");
  return (
    <div id={STORE_CLOSED_ID} role="status" className="flex items-start gap-1.5 border border-line-strong bg-surface p-3 text-[0.875rem]">
      <CircleAlert className="mt-0.5 size-4 flex-none text-caution" aria-hidden="true" />
      <span>
        <span className="block font-semibold">{t("cannotOrderTitle")}</span>
        <span className="block text-ink-secondary">{t("cannotOrderBody")}</span>
      </span>
    </div>
  );
}

/**
 * Checkout is a link only when it leads somewhere. Blocked (an unavailable line) and store-closed (nothing to fulfil
 * with, pay with or accept) are both a disabled button; the closed one is described by the notice, and on the phone's
 * sticky bar (`compact`) names the reason itself, since the notice may be scrolled away.
 */
function CheckoutLink({ blocked, storeClosed, compact = false, className }: { blocked: boolean; storeClosed: boolean; compact?: boolean; className: string }) {
  const t = useTranslations("common");
  if (storeClosed) {
    return (
      <button type="button" disabled aria-describedby={STORE_CLOSED_ID} className={`btn btn-primary ${className} ${compact ? "py-2 text-center leading-snug" : ""}`}>
        {compact ? t("cannotOrderTitle") : t("checkout")}
      </button>
    );
  }
  if (blocked) {
    return (
      <button type="button" disabled className={`btn btn-primary ${className}`}>
        {t("checkout")}
      </button>
    );
  }
  return (
    <Link href="/checkout" className={`btn btn-primary ${className}`}>
      {t("checkout")}
    </Link>
  );
}

/** Applies a code; a code the server accepts but the quote does not honour is said plainly, not left looking applied. */
function PromotionForm({ applied, promotion }: { applied?: string; promotion?: Quote["promotion"] }) {
  const t = useTranslations("common");
  const locale = useLocale() as Locale;
  const status = promotionStatus(applied, promotion);
  const effective = status === "applied";
  const superseded = status === "superseded";
  const apply = useApplyPromotion();
  const remove = useRemovePromotion();
  const [code, setCode] = useState("");
  const invalid = apply.isError ? (apiStatus(apply.error) === 429 ? t("tooManyAttempts") : t("promoInvalid")) : null;

  if (applied) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 rounded-[var(--sf-radius-control)] border border-line-strong bg-surface px-3 py-2">
          <span className="code font-semibold">{applied}</span>
          <button type="button" onClick={() => remove.mutate()} className="inline-flex size-9 items-center justify-center" aria-label={t("removePromo", { code: applied })}>
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <p className={`text-[0.875rem] ${effective ? "text-positive" : "font-medium text-caution"}`} role="status">
          {effective ? t("promoApplied") : superseded ? t("promoSuperseded", { name: promotion?.name ? localized(promotion.name, locale) : "" }) : t("promoNotApplicable")}
        </p>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.trim()) apply.mutate(code.trim());
      }}
    >
      <label htmlFor="promo" className="text-[0.875rem] font-medium">
        {t("promoCode")}
      </label>
      <div className="flex gap-2">
        <input id="promo" value={code} onChange={(event) => setCode(event.target.value)} dir="ltr" autoCapitalize="characters" className="field uppercase" aria-invalid={invalid ? true : undefined} aria-describedby={invalid ? "promo-error" : undefined} />
        <button type="submit" className="btn btn-secondary" disabled={apply.isPending}>
          {t("apply")}
        </button>
      </div>
      {invalid ? (
        <p id="promo-error" className="text-[0.875rem] font-medium text-critical" role="alert">
          {invalid}
        </p>
      ) : null}
    </form>
  );
}

/** Matches the final layout so nothing shifts when the quote arrives (MDS §15). */
function CartSkeleton() {
  return (
    <div className="container-sf pt-6 lg:pt-10" aria-busy="true">
      <div className="mb-6 h-12 w-48 animate-pulse bg-surface-muted motion-reduce:animate-none" />
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="w-24 flex-none animate-pulse bg-surface-muted motion-reduce:animate-none sm:w-28" style={{ aspectRatio: "4 / 5" }} />
              <div className="flex flex-1 flex-col gap-2">
                <div className="h-5 w-3/4 animate-pulse bg-surface-muted motion-reduce:animate-none" />
                <div className="h-4 w-1/3 animate-pulse bg-surface-muted motion-reduce:animate-none" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-64 animate-pulse bg-surface-muted motion-reduce:animate-none lg:col-span-5" />
      </div>
    </div>
  );
}
