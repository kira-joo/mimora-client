"use client";

import Link from "next/link";
import Image from "next/image";
import { Check, Heart, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState, type ElementType } from "react";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { getDictionary } from "../i18n";
import { formatNumber, t } from "../format";
import { priceRange } from "../lib/variant-selection";
import { findCategory, PREVIEW_TODAY } from "../fixtures/catalog";
import { usePreviewState } from "../state";
import type { Locale, Product } from "../types";
import { Price } from "./price";
import { QuickAddSheet } from "./quick-add-sheet";

const HOVER = "[@media(hover:hover)_and_(pointer:fine)]";
const NEW_FOR_DAYS = 10;

interface ProductCardProps {
  product: Product;
  locale: Locale;
  sizes?: string;
  /** Render as a list item (in a grid list) or a plain element (in a rail). */
  as?: "div" | "li";
  /**
   * In a grid, the card spans four rows of its parent with `subgrid`, so the
   * image, thumbnails, details and actions line up across every card in a row
   * — a two-line name never pushes one card's buttons below its neighbour's.
   *
   * The card itself must never be a size container (`@container`): container
   * queries imply layout containment, and a grid with layout containment
   * cannot be a subgrid — `grid-template-rows: subgrid` silently computes to
   * `none`. The actions row is the container instead.
   */
  subgrid?: boolean;
}

/**
 * The product card — a blend of two references, inside the approved direction:
 *
 *   ┌ framed surface ─────────────┐
 *   │ photograph (4:5, swipeable) │  badge top-start, position top-end
 *   │ thumbnails (real images)    │  only when the product has more than one
 *   │ category · name · price     │
 *   │ [ Add to cart ] [ ♡ ]       │
 *   └─────────────────────────────┘
 *
 * Square corners and hairlines are kept from the design system (§13: media
 * and cards at radius 0) rather than the references' large radii; the
 * distinct image area comes from the framed surface instead.
 *
 * The main image and the thumbnails are one state: a thumbnail scrolls the
 * strip to its image, and swiping the strip moves the selected thumbnail. The
 * strip is a native horizontal scroll-snap, so a vertical swipe still scrolls
 * the page. Add to cart opens Quick Add when the product needs a choice and
 * adds directly when it does not; the "Added to your cart" sheet confirms.
 */
export function ProductCard({ product, locale, sizes = "(min-width: 1536px) 22vw, (min-width: 768px) 30vw, 46vw", as = "div", subgrid = false }: ProductCardProps) {
  const Tag: ElementType = as;
  const dict = getDictionary(locale);
  const { addLine, wishlist, toggleWishlist } = usePreviewState();
  const [index, setIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  // While a thumbnail's smooth scroll is under way, the slides it passes are not selections.
  const target = useRef<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const images = product.images;
  const href = `/preview/${locale}/products/${product.slug}`;
  const name = t(product.name, locale);
  const range = priceRange(product.variants);
  const anyPurchasable = product.variants.some((variant) => variant.purchasable);
  const compareAt = product.variants.length > 0 && product.variants.every((variant) => variant.compareAtPrice) ? product.variants[0]!.compareAtPrice : undefined;
  const lowStock = product.variants.length === 1 && product.variants[0]!.lowStock;
  const isNew = (Date.parse(PREVIEW_TODAY) - Date.parse(product.addedAt)) / 86_400_000 <= NEW_FOR_DAYS;
  const category = findCategory(product.categorySlug);
  const configurable = product.optionAxes.length > 0;
  const saved = wishlist.includes(product.slug);
  const wishlistLabel = saved ? dict.wishlistRemove(name) : dict.wishlistAdd(name);

  // One badge at most, by what matters most to the decision — all derived from real data, no invented "best seller".
  const badge = !anyPurchasable
    ? { label: dict.outOfStock, tone: "text-critical" }
    : compareAt
      ? { label: dict.badgeSale, tone: "text-action" }
      : lowStock
        ? {
            label: dict.lowStock,
            short: dict.badgeLowStockShort,
            tone: "text-caution"
          }
        : isNew
          ? { label: dict.badgeNew, tone: "text-support" }
          : null;

  const actionLabel = !anyPurchasable ? dict.outOfStock : justAdded ? dict.added : dict.addToCart;
  const shortLabel = !anyPurchasable ? dict.outOfStock : justAdded ? "✓" : dict.addShort;

  function show(next: number) {
    const el = strip.current;
    if (!el) return;
    setIndex(next);
    if (Math.round(Math.abs(el.scrollLeft) / el.clientWidth) === next) return;
    target.current = next;
    const rtl = getComputedStyle(el).direction === "rtl";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({
      left: (rtl ? -1 : 1) * next * el.clientWidth,
      behavior: reduce ? "auto" : "smooth"
    });
  }

  function onScroll() {
    const el = strip.current;
    if (!el || el.clientWidth === 0) return;
    const next = Math.round(Math.abs(el.scrollLeft) / el.clientWidth);
    if (target.current !== null) {
      if (next === target.current) target.current = null;
      return;
    }
    if (next !== index) setIndex(next);
  }

  function addToCart() {
    if (configurable) {
      setSheetOpen(true);
      return;
    }
    const variant = product.variants.find((candidate) => candidate.purchasable);
    if (!variant) return;
    addLine(product.slug, variant.variantId, 1);
    setJustAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setJustAdded(false), 1400);
  }

  return (
    <Tag
      className={cn(
        "sf-card group flex min-w-0 flex-col border border-line bg-surface p-2 sm:p-2.5",
        subgrid ? "row-span-4 grid grid-cols-[minmax(0,1fr)] grid-rows-subgrid gap-y-0" : "h-full"
      )}
    >
      {/* 1 — the photograph. Slides link to the product but leave the tab order to the name link below. */}
      <div className="relative">
        <div
          ref={strip}
          onScroll={onScroll}
          // A swipe that interrupts a thumbnail's scroll hands control back to the strip.
          onPointerDown={() => (target.current = null)}
          onTouchStart={() => (target.current = null)}
          onWheel={() => (target.current = null)}
          className="media flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [contain:paint] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ aspectRatio: "4 / 5" }}
        >
          {images.map((image) => (
            <Link key={image.src} href={href} tabIndex={-1} aria-hidden="true" className="relative h-full w-full flex-none snap-center">
              <Image
                src={image.src}
                alt=""
                fill
                sizes={sizes}
                className={cn(
                  "object-cover [filter:saturate(0.97)_contrast(1.03)] transition-[transform,opacity] duration-[var(--sf-duration-slow)] ease-standard",
                  `${HOVER}:group-hover:scale-[1.03]`,
                  !anyPurchasable && "opacity-70"
                )}
              />
            </Link>
          ))}
        </div>
        {/* On a phone the badge shares the image's top edge with the heart, so a long one takes its short form. */}
        {badge ? (
          <span className={cn("t-label pointer-events-none absolute start-2 top-2 bg-canvas px-2 py-0.5", badge.tone)}>
            {"short" in badge ? (
              <>
                <span className="max-md:hidden">{badge.label}</span>
                <span className="md:hidden">{badge.short}</span>
              </>
            ) : (
              badge.label
            )}
          </span>
        ) : null}
        {images.length > 1 ? (
          // On a phone the top-end corner is the heart's; the thumbnails below already show which image is up.
          <span className="tabular pointer-events-none absolute end-2 top-2 bg-canvas px-1.5 text-[0.75rem] text-ink-secondary max-md:hidden" aria-hidden="true">
            {formatNumber(locale, index + 1)}/{formatNumber(locale, images.length)}
          </span>
        ) : null}
        {/*
         * Phone: the wishlist rides on the photograph so Add to cart can take the card's full width. A 44px hit area
         * in the corner, a 32px canvas chip inside it — the same ground-aware surface as the badge, so it reads on
         * light and dark photographs alike. Tablet and up keep it beside Add to cart.
         */}
        <button
          type="button"
          onClick={() => toggleWishlist(product.slug)}
          aria-pressed={saved}
          aria-label={wishlistLabel}
          className="group/heart absolute end-0 top-0 flex size-11 items-start justify-end p-1.5 outline-none md:hidden"
        >
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full bg-canvas/90 shadow-[0_1px_3px_rgb(0_0_0/0.18)] backdrop-blur-sm transition-transform duration-[var(--sf-duration-fast)] group-active/heart:scale-90 group-focus-visible/heart:outline-2 group-focus-visible/heart:outline-offset-2 group-focus-visible/heart:outline-focus",
              saved ? "text-action" : "text-ink"
            )}
          >
            <Heart className={cn("size-4", saved && "fill-current")} aria-hidden="true" />
          </span>
        </button>
      </div>

      {/*
       * 2 — thumbnails: the product's own photographs only. Always present, so every card has the same rhythm; a
       * single photograph is its own selected thumbnail (choosing it is a no-op — `show` skips a scroll to where the
       * strip already is).
       */}
      <div className="pt-2">
        <ul className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]" aria-label={dict.gallery}>
          {images.map((image, i) => (
            <li key={image.src} className="flex-none">
              <button
                type="button"
                onClick={() => show(i)}
                aria-label={`${dict.imageOf(formatNumber(locale, i + 1), formatNumber(locale, images.length))} — ${t(image.alt, locale)}`}
                aria-pressed={i === index}
                className={cn(
                  "relative block w-11 overflow-hidden border outline-offset-2 transition-[border-color,opacity] duration-[var(--sf-duration-fast)] focus-visible:outline-2 focus-visible:outline-focus",
                  i === index ? "border-ink shadow-[inset_0_0_0_1px_var(--sf-ink)]" : "border-line opacity-70 hover:opacity-100"
                )}
                style={{ aspectRatio: "4 / 5" }}
              >
                <Image src={image.src} alt="" fill sizes="44px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* 3 — details. */}
      <div className="flex flex-col gap-1 px-0.5 pt-2.5">
        {category ? <span className="t-label text-support">{t(category.name, locale)}</span> : null}
        <h3 className="text-[0.9375rem] font-medium leading-snug md:text-base">
          <Link
            href={href}
            className={cn(
              "line-clamp-2 text-ink underline-offset-4 decoration-[1.5px] decoration-line-strong outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus",
              `${HOVER}:hover:underline`
            )}
          >
            {name}
          </Link>
        </h3>
        <Price locale={locale} amount={range.min} rangeFrom={range.min !== range.max} compareAt={compareAt} />
      </div>

      {/*
       * 4 — actions. Phone: Add to cart alone, full width (the heart is on the photograph). Tablet and up: beside a
       * separate wishlist toggle. Outside a subgrid, pinned to the card's foot so a rail's buttons share one line.
       */}
      <div className={cn("@container flex items-end gap-2 pt-2.5 md:px-0.5 md:pt-3 md:pb-0.5", !subgrid && "mt-auto")}>
        <button
          type="button"
          onClick={addToCart}
          disabled={!anyPurchasable}
          aria-haspopup={configurable ? "dialog" : undefined}
          aria-label={`${actionLabel} — ${name}`}
          className={cn(
            "btn btn-primary @container min-h-11 min-w-0 flex-1 gap-1.5 whitespace-nowrap px-3 text-[0.875rem] @max-[162px]:px-2 active:scale-[0.98]",
            justAdded && "bg-positive hover:bg-positive"
          )}
        >
          {/*
           * The button is its own size container, so the label follows the room the button actually has — full width
           * on a phone, beside the heart above. The short label takes over first, then the icon gives way; a sold-out
           * card carries no icon at all.
           */}
          {!anyPurchasable ? null : justAdded ? (
            <Check className="size-4 flex-none @max-[72px]:hidden" aria-hidden="true" />
          ) : (
            <ShoppingBag className="size-4 flex-none @max-[72px]:hidden" aria-hidden="true" />
          )}
          <span className="truncate @max-[112px]:hidden" aria-hidden="true">
            {actionLabel}
          </span>
          <span className="hidden truncate @max-[112px]:inline" aria-hidden="true">
            {shortLabel}
          </span>
        </button>
        <button
          type="button"
          onClick={() => toggleWishlist(product.slug)}
          aria-pressed={saved}
          aria-label={wishlistLabel}
          className={cn(
            "inline-flex size-11 flex-none max-md:hidden items-center justify-center rounded-[var(--sf-radius-control)] border transition-[border-color,color,transform] duration-[var(--sf-duration-fast)] active:scale-90",
            saved ? "border-action text-action" : "border-line-strong text-ink-secondary hover:border-ink hover:text-ink"
          )}
        >
          <Heart className={cn("size-[18px]", saved && "fill-current")} aria-hidden="true" />
        </button>
      </div>

      {configurable ? <QuickAddSheet product={product} locale={locale} open={sheetOpen} onClose={() => setSheetOpen(false)} /> : null}
    </Tag>
  );
}
