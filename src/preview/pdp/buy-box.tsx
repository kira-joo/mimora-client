"use client";

import { Check, Minus, Plus, RotateCcw, Ruler, Star, Truck, Wallet } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { formatNumber, formatPrice, formatSku, t } from "../format";
import { getDictionary } from "../i18n";
import { exactVariant, invalidatedAxes, priceRange, type Selection } from "../lib/variant-selection";
import { store } from "../fixtures/catalog";
import { usePreviewState } from "../state";
import type { Locale, Product } from "../types";
import { Price } from "../components/price";
import { Sheet } from "../components/sheet";
import { VariantSelector } from "./variant-selector";

interface BuyBoxProps {
  product: Product;
  locale: Locale;
  /** Reports the photograph of the chosen colour, so the gallery can swap to it. */
  onImage?(src: string | undefined): void;
}

/**
 * The decision sequence of §4.2 — want it → can I get it → how much → buy:
 * name, price (a range until the selection resolves one variant), the
 * selector directly beneath, then the action with its assurances beside it.
 */
export function BuyBox({ product, locale, onImage }: BuyBoxProps) {
  const dict = getDictionary(locale);
  const reduce = useReducedMotion();
  const { addLine } = usePreviewState();
  const axisKeys = product.optionAxes.map((axis) => axis.key);
  const [selection, setSelection] = useState<Selection>({});
  // The choice just made stands; a PRIOR choice it makes impossible is the one retained and asked to be replaced (MDS §10.2).
  const [lastChanged, setLastChanged] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [sizeGuide, setSizeGuide] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonVisible, setButtonVisible] = useState(true);

  const conflicting = invalidatedAxes(selection, product.variants);
  const invalid = conflicting.length > 1 ? conflicting.filter((axis) => axis !== lastChanged) : conflicting;
  const variant = axisKeys.length === 0 ? product.variants.find((candidate) => candidate.purchasable) : exactVariant(selection, axisKeys, product.variants);
  const range = priceRange(product.variants);
  const nothingPurchasable = !product.variants.some((candidate) => candidate.purchasable);
  const hasSizeAxis = product.optionAxes.some((axis) => axis.key === "size" || axis.key === "waist");

  // §4.3: once the primary button has scrolled up out of view, a slim sticky bar carries it. Measured on
  // scroll rather than by IntersectionObserver, which only reports crossings and misses a fast jump past it.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const el = buttonRef.current;
        if (el) setButtonVisible(el.getBoundingClientRect().bottom > 0);
      });
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  function select(axis: string, value: string) {
    const next = { ...selection, [axis]: value };
    setSelection(next);
    setLastChanged(axis);
    setMissing((current) => current.filter((key) => key !== axis));
    const colourAxis = product.optionAxes.find((candidate) => candidate.values.some((v) => v.swatch));
    if (colourAxis && axis === colourAxis.key) onImage?.(colourAxis.values.find((v) => v.value === value)?.image);
  }

  function addToCart() {
    const unchosen = axisKeys.filter((key) => !selection[key]);
    if (unchosen.length > 0) {
      setMissing(unchosen);
      document.getElementById(`axis-${unchosen[0]}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      return;
    }
    if (!variant) return;
    // Immediate and optimistic (§4.3); the server re-validates at add-to-cart in production.
    addLine(product.slug, variant.variantId, quantity);
    setConfirmed(true);
    window.setTimeout(() => setConfirmed(false), 1800);
  }

  const blocked = nothingPurchasable || invalid.length > 0;
  const price = variant ? variant.price : range.min;
  const isRange = !variant && range.min !== range.max;
  const compareAt = variant?.compareAtPrice ?? (product.variants.every((candidate) => candidate.compareAtPrice) ? product.variants[0]?.compareAtPrice : undefined);
  const lowStock = variant?.lowStock;
  const buttonLabel = nothingPurchasable ? dict.outOfStock : confirmed ? dict.added : dict.addToCart;

  const button = (sticky: boolean) => (
    <button
      ref={sticky ? undefined : buttonRef}
      type="button"
      onClick={addToCart}
      disabled={blocked}
      aria-describedby={sticky ? undefined : "buy-status"}
      className={`btn btn-primary relative w-full overflow-hidden ${sticky ? "min-h-12" : "min-h-[52px] text-base"}`}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={buttonLabel}
          className="inline-flex items-center gap-2"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {confirmed ? <Check className="size-4" aria-hidden="true" /> : null}
          {buttonLabel}
        </motion.span>
      </AnimatePresence>
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="t-title text-balance">{t(product.name, locale)}</h1>
        {product.rating ? (
          <p className="flex items-center gap-1.5 text-[0.875rem] text-ink-secondary">
            <Star className="size-4 fill-current text-caution" aria-hidden="true" />
            <span className="tabular">{formatNumber(locale, product.rating.average)}</span>
            <span aria-hidden="true">·</span>
            {dict.reviews(formatNumber(locale, product.rating.count))}
          </p>
        ) : null}
        <Price locale={locale} amount={price} rangeFrom={isRange} compareAt={compareAt} />
      </div>

      {product.optionAxes.length > 0 ? (
        <div className="flex flex-col gap-3">
          <VariantSelector locale={locale} axes={product.optionAxes} variants={product.variants} selection={selection} onSelect={select} invalidAxes={invalid} missingAxes={missing} />
          {hasSizeAxis ? (
            <button type="button" onClick={() => setSizeGuide(true)} className="inline-flex min-h-11 items-center gap-2 self-start text-[0.9375rem] font-medium text-action underline-offset-4 hover:underline">
              <Ruler className="size-4" aria-hidden="true" />
              {dict.sizeGuide}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex items-stretch gap-3">
          <Stepper locale={locale} value={quantity} onChange={setQuantity} />
          <div className="flex-1">{button(false)}</div>
        </div>
        <p id="buy-status" className="min-h-5 text-[0.875rem]" role="status">
          {variant ? (
            lowStock ? (
              <span className="font-medium text-caution">{dict.lowStock}</span>
            ) : (
              <span className="text-positive">{dict.inStock}</span>
            )
          ) : nothingPurchasable ? (
            <span className="font-medium text-critical">{dict.outOfStock}</span>
          ) : invalid.length > 0 ? (
            <span className="font-medium text-critical">{dict.unavailableCombination}</span>
          ) : null}
          {variant && variant.sku ? <span className="code ms-2 text-ink-muted">{formatSku(variant.sku)}</span> : null}
        </p>
        {/* Trust signals beside the button, not in the footer (§4.3). */}
        <ul className="flex flex-col gap-2 border-t border-line pt-4 text-[0.875rem] text-ink-secondary">
          <li className="flex items-center gap-2.5">
            <Truck className="size-4 flex-none text-support" aria-hidden="true" />
            {dict.deliveryLine(formatNumber(locale, store.deliveryDays.min), formatNumber(locale, store.deliveryDays.max))}
          </li>
          <li className="flex items-center gap-2.5">
            <RotateCcw className="size-4 flex-none text-support" aria-hidden="true" />
            {dict.returnsLine(formatNumber(locale, store.returnDays))}
          </li>
          <li className="flex items-center gap-2.5">
            <Wallet className="size-4 flex-none text-support" aria-hidden="true" />
            {dict.paymentLine}
          </li>
        </ul>
      </div>

      {/* §13b sticky bar: phone only, inset within the gutters, clears the safe area, carries the resolved price and the button. */}
      <AnimatePresence>
        {!buttonVisible ? (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas px-[var(--sf-gutter)] pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[var(--sf-elevation-sheet)] lg:hidden"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[0.875rem] font-medium">{t(product.name, locale)}</span>
                <span className="t-price text-[1.0625rem]">
                  {isRange ? <span className="me-1 font-sans text-[0.75rem] font-medium text-ink-muted">{dict.from}</span> : null}
                  {formatPrice(locale, price)}
                </span>
              </div>
              <div className="w-[52%] flex-none">{button(true)}</div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Sheet open={sizeGuide} onClose={() => setSizeGuide(false)} side="bottom" title={dict.sizeGuide} closeLabel={dict.close}>
        <SizeGuide locale={locale} />
      </Sheet>
    </div>
  );
}

function Stepper({ locale, value, onChange }: { locale: Locale; value: number; onChange(value: number): void }) {
  const dict = getDictionary(locale);
  return (
    <div className="flex flex-none items-center rounded-[var(--sf-radius-control)] border border-line-strong" role="group" aria-label={dict.quantity}>
      <button type="button" className="inline-flex size-12 items-center justify-center disabled:text-ink-muted" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label={dict.decrease}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="tabular w-6 text-center font-semibold" aria-live="polite">
        {formatNumber(locale, value)}
      </span>
      <button type="button" className="inline-flex size-12 items-center justify-center" onClick={() => onChange(value + 1)} aria-label={dict.increase}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/** A size guide in a dialog, never a separate page (§4.2): leaving the product to find a measurement is where sessions die. */
function SizeGuide({ locale }: { locale: Locale }) {
  const rows = [
    ["S", 96, 72],
    ["M", 102, 74],
    ["L", 108, 76],
    ["XL", 114, 78],
    ["XXL", 120, 80],
  ] as const;
  const head = locale === "ar" ? ["المقاس", "محيط الصدر (سم)", "الطول (سم)"] : ["Size", "Chest (cm)", "Length (cm)"];
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9375rem] text-ink-secondary">
        {locale === "ar" ? "قِس صدرك عند أعرض نقطة، والقميص من أعلى الكتف حتى الحافة." : "Measure your chest at its widest, and the shirt from the top of the shoulder to the hem."}
      </p>
      <table className="w-full border-collapse text-[0.9375rem]">
        <thead>
          <tr className="border-b border-line-strong text-start">
            {head.map((cell) => (
              <th key={cell} scope="col" className="py-2 text-start font-semibold">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {rows.map(([size, chest, length]) => (
            <tr key={size} className="border-b border-line">
              <th scope="row" className="py-2.5 text-start font-medium">
                {size}
              </th>
              <td className="py-2.5">{formatNumber(locale, chest)}</td>
              <td className="py-2.5">{formatNumber(locale, length)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

