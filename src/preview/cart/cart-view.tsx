"use client";

import Link from "next/link";
import Image from "next/image";
import { CircleAlert, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useState } from "react";
import { formatNumber, formatPrice, t } from "../format";
import { getDictionary } from "../i18n";
import { optionLabels } from "../lib/option-labels";
import { quote, type QuotedLine } from "../mock-api/quote";
import { usePreviewState } from "../state";
import type { Locale } from "../types";

/**
 * Cart (MDS §6.5, §11): lines with image, name, the selected option labels,
 * unit price, a stepper, line total and remove; promotion code; subtotal as
 * the server quotes it, and "delivery is calculated at checkout". A line that
 * can no longer be bought is surfaced explicitly with a one-tap remove and a
 * link back. Phone: the checkout button is sticky with the total above it.
 */
export function CartView({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const { lines, setQuantity, removeLine } = usePreviewState();
  const summary = quote(lines, null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);

  if (summary.lines.length === 0 && summary.unavailable.length === 0) {
    return (
      <div className="container-sf flex flex-col items-center gap-4 py-24 text-center">
        <ShoppingBag className="size-10 text-ink-muted" aria-hidden="true" />
        <h1 className="t-title">{dict.emptyCart}</h1>
        <p className="text-ink-secondary">{dict.emptyCartBody}</p>
        <Link href={`/preview/${locale}/products?sort=newest`} className="btn btn-primary mt-2">
          {dict.newest}
        </Link>
      </div>
    );
  }

  return (
    <div className="sf-cart container-sf pt-6 lg:pt-10">
      <div className="mb-6 flex flex-col gap-3">
        <h1 className="t-title">{dict.yourCart}</h1>
        <div className="rule" aria-hidden="true" />
      </div>
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <ul className="flex flex-col divide-y divide-line border-y border-line lg:col-span-7">
          {summary.unavailable.map((line) => (
            <CartLine key={line.line.lineId} line={line} locale={locale} onRemove={() => removeLine(line.line.lineId)} />
          ))}
          {summary.lines.map((line) => (
            <CartLine key={line.line.lineId} line={line} locale={locale} onQuantity={(quantity) => setQuantity(line.line.lineId, quantity)} onRemove={() => removeLine(line.line.lineId)} />
          ))}
        </ul>

        <aside className="lg:col-span-5">
          <div className="flex flex-col gap-5 bg-surface-muted p-5 lg:sticky lg:top-[calc(72px+1.5rem)] lg:p-6">
            <h2 className="t-heading">{dict.orderSummary}</h2>
            <form
              className="flex flex-col gap-1.5"
              onSubmit={(event) => {
                event.preventDefault();
                setCodeError(code.trim().length > 0);
              }}
            >
              <label htmlFor="promo" className="text-[0.875rem] font-medium">
                {dict.promoCode}
              </label>
              <div className="flex gap-2">
                <input id="promo" value={code} onChange={(event) => setCode(event.target.value)} dir="ltr" className="field uppercase" aria-invalid={codeError || undefined} aria-describedby={codeError ? "promo-error" : undefined} />
                <button type="submit" className="btn btn-secondary">
                  {dict.apply}
                </button>
              </div>
              {codeError ? (
                <p id="promo-error" className="text-[0.875rem] font-medium text-critical">
                  {dict.promoInvalid}
                </p>
              ) : null}
            </form>
            <dl className="flex flex-col gap-2 border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <dt className="text-ink-secondary">
                  {dict.subtotal} <span className="text-[0.875rem]">({dict.items(formatNumber(locale, summary.itemCount))})</span>
                </dt>
                <dd className="t-price text-[1.125rem]">{formatPrice(locale, summary.subtotal)}</dd>
              </div>
              <p className="text-[0.875rem] text-ink-muted">{dict.shippingAtCheckout}</p>
            </dl>
            <Link href={`/preview/${locale}/checkout`} className="btn btn-primary hidden w-full lg:inline-flex" aria-disabled={summary.lines.length === 0}>
              {dict.checkout}
            </Link>
          </div>
        </aside>
      </div>

      {/* Phone: the total and the checkout button, sticky at the bottom, inset within the gutters. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas px-[var(--sf-gutter)] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="mb-2 flex items-center justify-between text-[0.9375rem]">
          <span className="text-ink-secondary">{dict.subtotal}</span>
          <span className="t-price text-[1.125rem]">{formatPrice(locale, summary.subtotal)}</span>
        </div>
        <Link href={`/preview/${locale}/checkout`} className="btn btn-primary w-full">
          {dict.checkout}
        </Link>
      </div>
    </div>
  );
}

function CartLine({ line, locale, onQuantity, onRemove }: { line: QuotedLine; locale: Locale; onQuantity?(quantity: number): void; onRemove(): void }) {
  const dict = getDictionary(locale);
  const unavailable = !line.variant.purchasable;
  const href = `/preview/${locale}/products/${line.product.slug}`;
  return (
    <li className="flex gap-4 py-5">
      <Link href={href} className="media w-24 flex-none sm:w-28" style={{ aspectRatio: "4 / 5" }}>
        {line.product.images[0] ? <Image src={line.product.images[0].src} alt={t(line.product.images[0].alt, locale)} fill sizes="112px" className={unavailable ? "object-cover opacity-50" : "object-cover"} /> : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <Link href={href} className="min-w-0 font-medium leading-snug hover:underline">
            {t(line.product.name, locale)}
          </Link>
          {!unavailable ? <span className="t-price flex-none text-[1.0625rem]">{formatPrice(locale, line.lineTotal)}</span> : null}
        </div>
        <span className="text-[0.875rem] text-ink-secondary">{optionLabels(line.product, line.variant, locale)}</span>
        {unavailable ? (
          <div className="mt-1 flex flex-col items-start gap-2">
            <p className="flex items-start gap-1.5 text-[0.875rem] font-medium text-critical">
              <CircleAlert className="mt-0.5 size-4 flex-none" aria-hidden="true" />
              {dict.lineUnavailable}
            </p>
            <div className="flex gap-4">
              <button type="button" onClick={onRemove} className="inline-flex min-h-11 items-center gap-1.5 text-[0.875rem] font-semibold text-action">
                <Trash2 className="size-4" aria-hidden="true" />
                {dict.remove}
              </button>
              <Link href={href} className="inline-flex min-h-11 items-center text-[0.875rem] font-medium underline-offset-4 hover:underline">
                {dict.viewProduct}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <span className="tabular text-[0.875rem] text-ink-muted">{formatPrice(locale, line.unitPrice)}</span>
            <div className="mt-auto flex items-center justify-between gap-3 pt-2">
              <div className="flex items-center rounded-[var(--sf-radius-control)] border border-line-strong" role="group" aria-label={dict.quantity}>
                <button type="button" className="inline-flex size-11 items-center justify-center disabled:text-ink-muted" onClick={() => onQuantity?.(line.line.quantity - 1)} disabled={line.line.quantity <= 1} aria-label={dict.decrease}>
                  <Minus className="size-4" aria-hidden="true" />
                </button>
                <span className="tabular w-6 text-center font-semibold" aria-live="polite">
                  {formatNumber(locale, line.line.quantity)}
                </span>
                <button type="button" className="inline-flex size-11 items-center justify-center" onClick={() => onQuantity?.(line.line.quantity + 1)} aria-label={dict.increase}>
                  <Plus className="size-4" aria-hidden="true" />
                </button>
              </div>
              <button type="button" onClick={onRemove} className="inline-flex min-h-11 items-center gap-1.5 text-[0.875rem] text-ink-secondary hover:text-ink">
                <Trash2 className="size-4" aria-hidden="true" />
                {dict.remove}
              </button>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
