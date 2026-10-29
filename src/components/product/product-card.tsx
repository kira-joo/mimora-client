"use client";

import Image from "next/image";
import { Check, CircleAlert, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState, type ElementType } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Link } from "@/i18n/navigation";
import { Price } from "@/components/ui/price";
import { catalogApi } from "@/lib/api/session-client";
import { CatalogEndpoints } from "@/lib/api/session.endpoints";
import { useCartUi } from "@/lib/cart/cart-ui";
import { useAddToCart } from "@/lib/cart/use-cart";
import { addToCart as addToCartEvent } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { CardProduct } from "@/lib/catalog/card-model";
import { formatNumber } from "@/lib/format/numerals";
import { productHref } from "@/lib/links";
import type { Locale } from "@/i18n/routing";
import { QuickAddSheet } from "./quick-add-sheet";
import { PromotionNote } from "./promotion-note";
import { WishlistButton } from "./wishlist-button";

const HOVER = "[@media(hover:hover)_and_(pointer:fine)]";

interface ProductCardProps {
  product: CardProduct;
  sizes?: string;
  /** Render as a list item (in a grid list) or a plain element (in a rail). */
  as?: "div" | "li";
  /**
   * In a grid, the card spans four rows of its parent with `subgrid`, so the
   * image, thumbnails, details and actions line up across every card in a row.
   *
   * The card itself must never be a size container (`@container`): container
   * queries imply layout containment, and a grid with layout containment
   * cannot be a subgrid — `grid-template-rows: subgrid` silently computes to
   * `none`. The actions row is the container instead.
   */
  subgrid?: boolean;
  priority?: boolean;
}

/**
 * The product card — the approved baseline (design preview, 2026-10): one
 * large swipeable photograph with the product's own thumbnails beneath (always
 * present, so every card has the same rhythm), category, name, price, a
 * prominent Add to cart and a separate wishlist toggle — on a phone the heart
 * rides on the photograph and Add to cart takes the card's full width.
 *
 * Add to cart opens Quick Add when the product needs a choice and adds directly
 * when it does not; either way the server re-validates (MDS §10.3) against
 * LIVE availability — the card never sells from cached stock.
 */
export function ProductCard({ product, sizes = "(min-width: 1536px) 22vw, (min-width: 768px) 30vw, 46vw", as = "div", subgrid = false, priority }: ProductCardProps) {
  const Tag: ElementType = as;
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const queryClient = useQueryClient();
  const addToCart = useAddToCart();
  const { announceAdded } = useCartUi();
  const [index, setIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [failed, setFailed] = useState(false);
  const strip = useRef<HTMLDivElement>(null);
  // While a thumbnail's smooth scroll is under way, the slides it passes are not selections.
  const target = useRef<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const images = product.images;
  const href = productHref(product.slug);
  const configurable = product.optionAxes.length > 0;
  const busy = addToCart.isPending;
  const actionLabel = product.soldOut ? t("outOfStock") : failed ? t("addFailed") : justAdded ? t("added") : t("addToCart");
  const shortLabel = product.soldOut ? t("outOfStock") : justAdded ? "✓" : t("addShort");
  const badge = product.badge ? { soldOut: { label: t("outOfStock"), tone: "text-critical" }, sale: { label: t("badgeSale"), tone: "text-action" }, new: { label: t("badgeNew"), tone: "text-support" } }[product.badge] : null;

  function show(next: number) {
    const el = strip.current;
    if (!el) return;
    setIndex(next);
    if (Math.round(Math.abs(el.scrollLeft) / el.clientWidth) === next) return;
    target.current = next;
    const rtl = getComputedStyle(el).direction === "rtl";
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: (rtl ? -1 : 1) * next * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
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

  async function onAdd() {
    if (busy) return;
    if (configurable) {
      setSheetOpen(true);
      return;
    }
    setFailed(false);
    try {
      // No choice to make: the one purchasable variant, from LIVE availability.
      const variants = await queryClient.fetchQuery({ queryKey: ["availability", product.slug], queryFn: () => catalogApi().request(CatalogEndpoints.availability, { params: { slug: product.slug } }).then((response) => response.variants), staleTime: 0 });
      const variant = variants.find((candidate) => candidate.purchasable);
      if (!variant) throw new Error("sold out");
      await addToCart.mutateAsync({ variantId: variant.variantId, quantity: 1 });
      track(addToCartEvent({ productId: product.id, variantId: variant.variantId, quantity: 1 }));
      announceAdded({ productSlug: product.slug, productName: product.name, optionLabel: "", image: images[0] ? { provider: "", publicId: "", secureUrl: images[0].src } : null, price: variant.price });
      setJustAdded(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setJustAdded(false), 1400);
    } catch {
      setFailed(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setFailed(false), 2400);
    }
  }

  return (
    <Tag className={cn("sf-card group flex min-w-0 flex-col border border-line bg-surface p-2 sm:p-2.5", subgrid ? "row-span-4 grid grid-cols-[minmax(0,1fr)] grid-rows-subgrid gap-y-0" : "h-full")}>
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
          {images.map((image, i) => (
            <Link key={image.src} href={href} tabIndex={-1} aria-hidden="true" className="relative h-full w-full flex-none snap-center">
              <Image
                src={image.src}
                alt=""
                fill
                sizes={sizes}
                // Above the fold, the first photograph is the LCP element: load it eagerly, first (Next 16: `priority` alone no longer does).
                loading={priority && i === 0 ? "eager" : undefined}
                fetchPriority={priority && i === 0 ? "high" : undefined}
                className={cn("object-cover [filter:saturate(0.97)_contrast(1.03)] transition-[transform,opacity] duration-[var(--sf-duration-slow)] ease-standard", `${HOVER}:group-hover:scale-[1.03]`, product.soldOut && "opacity-70")}
              />
            </Link>
          ))}
        </div>
        {badge ? <span className={cn("t-label pointer-events-none absolute start-2 top-2 bg-canvas px-2 py-0.5", badge.tone)}>{badge.label}</span> : null}
        {images.length > 1 ? (
          // On a phone the top-end corner is the heart's; the thumbnails below already show which image is up.
          <span className="tabular pointer-events-none absolute end-2 top-2 bg-canvas px-1.5 text-[0.75rem] text-ink-secondary max-md:hidden" aria-hidden="true">
            {formatNumber(locale, index + 1)}/{formatNumber(locale, images.length)}
          </span>
        ) : null}
        <WishlistButton productId={product.id} productName={product.name} variant="overlay" />
      </div>

      {/*
       * 2 — thumbnails: the product's own photographs only. Always present, so every card has the same rhythm; a
       * single photograph is its own selected thumbnail (choosing it is a no-op — `show` skips a scroll to where the
       * strip already is).
       */}
      <div className="pt-2">
        <ul className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]" aria-label={t("gallery")}>
          {images.map((image, i) => (
            <li key={image.src} className="flex-none">
              <button
                type="button"
                onClick={() => show(i)}
                aria-label={`${t("imageOf", { i: formatNumber(locale, i + 1), n: formatNumber(locale, images.length) })}${image.alt ? ` — ${image.alt}` : ""}`}
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
        {product.category ? <span className="t-label text-support">{product.category}</span> : null}
        <h3 className="text-[0.9375rem] font-medium leading-snug md:text-base">
          {/*
           * A 44px target around a 21px line: the padding is cancelled by an equal negative margin, so the details
           * block keeps its height. `relative` paints the padding above the (non-interactive) price beneath it; the
           * bottom reaches further than the top because the top stops at the thumbnail row's own padding.
           */}
          <Link href={href} className={cn("relative -mt-2.5 -mb-3.5 block pt-2.5 pb-3.5 text-ink underline-offset-4 decoration-[1.5px] decoration-line-strong outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus", `${HOVER}:hover:underline`)}>
            <span className="line-clamp-2">{product.name}</span>
          </Link>
        </h3>
        {product.price ? <Price amount={product.price} rangeFrom={product.priceIsRange} compareAt={product.compareAt} /> : null}
        {/* Icon AND text — the signal never rests on colour alone. */}
        {product.lowStock ? (
          <span className="inline-flex items-center gap-1 text-[0.8125rem] font-medium text-caution">
            <CircleAlert className="size-3.5 flex-none" aria-hidden="true" />
            {t("lowStock")}
          </span>
        ) : null}
        {product.promotion ? <PromotionNote promotion={product.promotion} /> : null}
      </div>

      {/*
       * 4 — actions. Phone: Add to cart alone, full width (the heart is on the photograph). Tablet and up: beside a
       * separate wishlist toggle. Outside a subgrid, pinned to the card's foot so a rail's buttons share one line.
       */}
      <div className={cn("@container flex items-end gap-2 pt-2.5 md:px-0.5 md:pt-3 md:pb-0.5", !subgrid && "mt-auto")}>
        <button
          type="button"
          onClick={onAdd}
          // Not disabled while busy — a disabled button loses focus, which the sheet would then fail to restore.
          disabled={product.soldOut}
          aria-busy={busy || undefined}
          aria-haspopup={configurable ? "dialog" : undefined}
          aria-label={`${actionLabel} — ${product.name}`}
          className={cn("btn btn-primary @container min-h-11 min-w-0 flex-1 gap-1.5 whitespace-nowrap px-3 text-[0.875rem] @max-[162px]:px-2 active:scale-[0.98]", justAdded && "bg-positive hover:bg-positive")}
        >
          {/*
           * The button is its own size container, so the label follows the room the button actually has — full width
           * on a phone, beside the heart above. The short label takes over first, then the icon gives way; a sold-out
           * card carries no icon at all.
           */}
          {product.soldOut ? null : justAdded ? <Check className="size-4 flex-none @max-[72px]:hidden" aria-hidden="true" /> : <ShoppingBag className="size-4 flex-none @max-[72px]:hidden" aria-hidden="true" />}
          <span className="truncate @max-[112px]:hidden" aria-hidden="true">
            {actionLabel}
          </span>
          <span className="hidden truncate @max-[112px]:inline" aria-hidden="true">
            {shortLabel}
          </span>
        </button>
        <WishlistButton productId={product.id} productName={product.name} variant="row" />
      </div>
      <span className="sr-only" role="status">
        {failed ? t("addFailed") : ""}
      </span>

      {configurable ? <QuickAddSheet product={product} open={sheetOpen} onClose={() => setSheetOpen(false)} /> : null}
    </Tag>
  );
}
