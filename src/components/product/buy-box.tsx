"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, RotateCcw, Ruler, Star, Truck, Wallet } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useLocale, useTranslations } from "next-intl";
import { Price } from "@/components/ui/price";
import { Sheet } from "@/components/ui/sheet";
import { useCurrency } from "@/components/providers/store-context";
import { useCartUi } from "@/lib/cart/cart-ui";
import type { ProductPromotion } from "@/lib/catalog/promotions";
import { useAddToCart } from "@/lib/cart/use-cart";
import { addToCart as addToCartEvent, viewItem } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import { optionLabel } from "@/lib/catalog/option-labels";
import type { SizeTable } from "@/lib/catalog/size-guide";
import { useAvailability } from "@/lib/catalog/use-availability";
import { packInfo, sharedPackInfo, stockStatus } from "@/lib/catalog/stock-status";
import { exactVariant, invalidatedAxes, priceRange, type Selection } from "@/lib/catalog/variant-selection";
import { formatNumber, formatPrice } from "@/lib/format/numerals";
import type { ImageAsset, MatrixVariant, OptionAxis } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";
import { PromotionNote } from "./promotion-note";
import { StockLine } from "./stock-line";
import { VariantSelector } from "./variant-selector";
import { WishlistButton } from "./wishlist-button";
import { MOTION } from "@/lib/motion/tokens";

export interface BuyBoxProps {
  productId: string;
  slug: string;
  name: string;
  optionAxes: OptionAxis[];
  /** The page's CACHED matrix — provisional; replaced by live availability on mount (MDS §5). */
  initialVariants: MatrixVariant[];
  rating: { average: number; count: number };
  image: ImageAsset | null;
  /** Store facts resolved on the server from configuration; absent when there is no data behind them. */
  assurances: { delivery?: string; returns?: string; payment?: string };
  sizeGuide: { title: string; description?: string; table: SizeTable } | null;
  /** The automatic promotion this product falls under — words only; the cart's quote prices it. */
  promotion?: ProductPromotion | null;
  /** The selected variant (undefined until the selection resolves one) — the gallery follows it. */
  onVariantChange?(variant: MatrixVariant | undefined): void;
}

/**
 * The decision sequence of design-system §4.2 — want it → can I get it → how
 * much → buy: name, price (a range until the selection resolves one variant),
 * the selector directly beneath, then the action with its assurances beside it.
 *
 * Availability is LIVE: the cached matrix renders first (a click never waits),
 * the no-store one replaces it, and low-stock text appears only from live
 * data. Add-to-cart re-validates on the server regardless (MDS §10.3).
 */
export function BuyBox({ productId, slug, name, optionAxes, initialVariants, rating, image, assurances, sizeGuide, promotion, onVariantChange }: BuyBoxProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const currency = useCurrency();
  const reduce = useReducedMotion();
  const addToCart = useAddToCart();
  const { announceAdded } = useCartUi();
  // Viewing a product page is `view_item` — once per product, however the variant selection then changes.
  useEffect(() => {
    track(viewItem(productId));
  }, [productId]);
  const { variants = initialVariants, isLive } = useAvailability(slug, { initial: initialVariants });
  const axisKeys = optionAxes.map((axis) => axis.key);
  const [selection, setSelection] = useState<Selection>({});
  // The choice just made stands; a PRIOR choice it makes impossible is the one retained and asked to be replaced (MDS §10.2).
  const [lastChanged, setLastChanged] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonVisible, setButtonVisible] = useState(true);

  const conflicting = invalidatedAxes(selection, variants);
  const invalid = conflicting.length > 1 ? conflicting.filter((axis) => axis !== lastChanged) : conflicting;
  const variant = axisKeys.length === 0 ? variants.find((candidate) => candidate.purchasable) : exactVariant(selection, axisKeys, variants);
  const range = priceRange(variants);
  const selectedId = variant?.variantId;
  useEffect(() => {
    onVariantChange?.(variant);
    // Keyed on the id: the live matrix replacing the cached one must not re-announce an unchanged selection.
  }, [selectedId]);
  const nothingPurchasable = variants.length > 0 && !variants.some((candidate) => candidate.purchasable);

  // design-system §4.3: once the primary button scrolls out of view, a slim sticky bar carries it (phone only).
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
    setSelection((current) => ({ ...current, [axis]: value }));
    setLastChanged(axis);
    setMissing((current) => current.filter((key) => key !== axis));
    setFailure(null);
  }

  async function onAdd() {
    if (addToCart.isPending) return;
    const unchosen = axisKeys.filter((key) => !selection[key]);
    if (unchosen.length > 0) {
      setMissing(unchosen);
      document.getElementById(`axis-${unchosen[0]}`)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      return;
    }
    if (!variant) return;
    setFailure(null);
    try {
      await addToCart.mutateAsync({ variantId: variant.variantId, quantity });
      track(addToCartEvent({ productId, variantId: variant.variantId, quantity }));
      announceAdded({ productSlug: slug, productName: name, optionLabel: optionLabel(optionAxes, variant, locale), image: variant.galleryOverride?.[0] ?? image, price: variant.price });
      setConfirmed(true);
      window.setTimeout(() => setConfirmed(false), 1800);
    } catch {
      // The server is the authority — it can refuse what the matrix offered (stock moved since the page was cached).
      setFailure(t("addFailed"));
    }
  }

  // Not disabled while the add is in flight: a disabled button drops focus to <body>, and the sheet would then
  // return focus there on close. Busy is announced, and a repeat press is ignored instead.
  const blocked = nothingPurchasable || invalid.length > 0;
  const price = variant ? variant.price : range.min;
  const isRange = !variant && range.min !== range.max;
  const compareAt = variant?.compareAtPrice ?? (variants.length > 0 && variants.every((candidate) => candidate.compareAtPrice) ? variants[0]?.compareAtPrice : undefined);
  const pack = variant ? packInfo(variant) : sharedPackInfo(variants);
  const buttonLabel = nothingPurchasable ? t("outOfStock") : confirmed ? t("added") : t("addToCart");

  const button = (sticky: boolean) => (
    <button
      ref={sticky ? undefined : buttonRef}
      type="button"
      onClick={onAdd}
      disabled={blocked}
      aria-busy={addToCart.isPending || undefined}
      aria-describedby={sticky ? undefined : "buy-status"}
      className={`btn btn-primary relative w-full overflow-hidden ${sticky ? "min-h-12" : "min-h-[52px] text-base"}`}
    >
      <AnimatePresence initial={false} mode="wait">
        <motion.span key={buttonLabel} className="inline-flex items-center gap-2" initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? undefined : { opacity: 0, y: -6 }} transition={{ duration: MOTION.fast }}>
          {confirmed ? <Check className="size-4" aria-hidden="true" /> : null}
          {buttonLabel}
        </motion.span>
      </AnimatePresence>
    </button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="t-title text-balance">{name}</h1>
        {rating.count > 0 ? (
          <a href="#reviews" className="flex items-center gap-1.5 self-start text-[0.875rem] text-ink-secondary hover:text-ink">
            <Star className="size-4 fill-current text-caution" aria-hidden="true" />
            <span className="tabular">{formatNumber(locale, rating.average)}</span>
            <span aria-hidden="true">·</span>
            {t("reviews", { n: formatNumber(locale, rating.count) })}
          </a>
        ) : null}
        {variants.length > 0 ? <Price amount={price} rangeFrom={isRange} compareAt={compareAt} /> : null}
        {pack ? <p className="text-[0.9375rem] text-ink-secondary">{pack.kind === "pack" ? t("packOf", { n: formatNumber(locale, pack.units) }) : t("boxOf", { n: formatNumber(locale, pack.units) })}</p> : null}
        {promotion ? <PromotionNote promotion={promotion} size="page" /> : null}
      </div>

      {optionAxes.length > 0 ? (
        <div className="flex flex-col gap-3">
          <VariantSelector axes={optionAxes} variants={variants} selection={selection} onSelect={select} invalidAxes={invalid} missingAxes={missing} />
          {sizeGuide ? (
            <button type="button" onClick={() => setSizeGuideOpen(true)} className="inline-flex min-h-11 items-center gap-2 self-start text-[0.9375rem] font-medium text-action underline-offset-4 hover:underline">
              <Ruler className="size-4" aria-hidden="true" />
              {t("sizeGuide")}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <div className="flex items-stretch gap-3">
          <Stepper value={quantity} onChange={setQuantity} />
          <div className="flex-1">{button(false)}</div>
        </div>
        <p id="buy-status" className="min-h-5 text-[0.875rem]" role="status">
          {failure ? (
            <span className="font-medium text-critical">{failure}</span>
          ) : nothingPurchasable ? (
            <span className="font-medium text-critical">{t("outOfStock")}</span>
          ) : invalid.length > 0 ? (
            <span className="font-medium text-critical">{t("unavailableCombination")}</span>
          ) : variant ? (
            <StockLine status={stockStatus(variant, isLive)} />
          ) : null}
        </p>
        <WishlistButton productId={productId} productName={name} variant="labelled" />
        {/* Trust signals beside the button, not in the footer (design-system §4.3) — each one from configuration. */}
        {assurances.delivery || assurances.returns || assurances.payment ? (
          <ul className="flex flex-col gap-2 border-t border-line pt-4 text-[0.875rem] text-ink-secondary">
            {assurances.delivery ? (
              <li className="flex items-center gap-2.5">
                <Truck className="size-4 flex-none text-support" aria-hidden="true" />
                {assurances.delivery}
              </li>
            ) : null}
            {assurances.returns ? (
              <li className="flex items-center gap-2.5">
                <RotateCcw className="size-4 flex-none text-support" aria-hidden="true" />
                {assurances.returns}
              </li>
            ) : null}
            {assurances.payment ? (
              <li className="flex items-center gap-2.5">
                <Wallet className="size-4 flex-none text-support" aria-hidden="true" />
                {assurances.payment}
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      {/* design-system §13b sticky bar: phone only, clears the safe area, carries the resolved price and the button. */}
      <AnimatePresence>
        {!buttonVisible ? (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-canvas px-[var(--sf-gutter)] pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[var(--sf-elevation-sheet)] lg:hidden"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ duration: MOTION.standard, ease: MOTION.easeStandard }}
          >
            <div className="flex items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[0.875rem] font-medium">{name}</span>
                {variants.length > 0 ? (
                  <span className="t-price text-[1.0625rem]">
                    {isRange ? <span className="me-1 font-sans text-[0.75rem] font-medium text-ink-muted">{t("from")}</span> : null}
                    {formatPrice(locale, price, currency)}
                  </span>
                ) : null}
              </div>
              <div className="w-[52%] flex-none">{button(true)}</div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {sizeGuide ? (
        <Sheet open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} side="bottom" title={sizeGuide.title || t("sizeGuide")} closeLabel={t("close")}>
          <div className="flex flex-col gap-4">
            {sizeGuide.description ? <p className="text-[0.9375rem] text-ink-secondary">{sizeGuide.description}</p> : null}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.9375rem]">
                <thead>
                  <tr className="border-b border-line-strong">
                    {sizeGuide.table.headers.map((header) => (
                      <th key={header} scope="col" className="py-2 pe-3 text-start font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="tabular">
                  {sizeGuide.table.rows.map((row, r) => (
                    <tr key={r} className="border-b border-line">
                      {row.map((value, c) =>
                        c === 0 ? (
                          <th key={c} scope="row" className="py-2.5 pe-3 text-start font-medium">
                            {value}
                          </th>
                        ) : (
                          <td key={c} className="py-2.5 pe-3">
                            {value}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange(value: number): void }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  return (
    <div className="flex flex-none items-center rounded-[var(--sf-radius-control)] border border-line-strong" role="group" aria-label={t("quantity")}>
      <button type="button" className="inline-flex size-12 items-center justify-center disabled:text-ink-muted" onClick={() => onChange(Math.max(1, value - 1))} disabled={value <= 1} aria-label={t("decrease")}>
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="tabular w-6 text-center font-semibold" aria-live="polite">
        {formatNumber(locale, value)}
      </span>
      <button type="button" className="inline-flex size-12 items-center justify-center" onClick={() => onChange(Math.min(99, value + 1))} aria-label={t("increase")}>
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
