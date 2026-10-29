"use client";

import Image from "next/image";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Price } from "@/components/ui/price";
import { Sheet } from "@/components/ui/sheet";
import { useCartUi } from "@/lib/cart/cart-ui";
import { useAddToCart } from "@/lib/cart/use-cart";
import { addToCart as addToCartEvent } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/track";
import type { CardProduct } from "@/lib/catalog/card-model";
import { optionLabel } from "@/lib/catalog/option-labels";
import { useAvailability } from "@/lib/catalog/use-availability";
import { exactVariant, invalidatedAxes, priceRange, type Selection } from "@/lib/catalog/variant-selection";
import { productHref } from "@/lib/links";
import type { Locale } from "@/i18n/routing";
import { stockStatus } from "@/lib/catalog/stock-status";
import { StockLine } from "./stock-line";
import { VariantSelector } from "./variant-selector";

/**
 * Quick Add from a product card: a bottom sheet on a phone, a centred panel on
 * desktop. Deliberately NOT a smaller product page — image, name, price, the
 * option tiles and one button.
 *
 * The rules are the product page's (same selector, same matrix — fetched LIVE
 * when the sheet opens): an unavailable value is shown, not hidden; a prior
 * choice a later one makes impossible is kept and flagged, never silently
 * switched; nothing is added until every axis has a value. Adding goes through
 * the same mutation as the product page, re-validated on the server, and the
 * shared "Added to your cart" sheet confirms.
 */
export function QuickAddSheet({ product, open, onClose }: { product: CardProduct; open: boolean; onClose(): void }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const addToCart = useAddToCart();
  const { announceAdded } = useCartUi();
  const { variants = [], isLoading } = useAvailability(product.slug, { enabled: open });
  const axisKeys = product.optionAxes.map((axis) => axis.key);
  const [selection, setSelection] = useState<Selection>({});
  // The choice just made stands; a PRIOR choice it makes impossible is the one retained and flagged (MDS §10.2).
  const [lastChanged, setLastChanged] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [failure, setFailure] = useState<string | null>(null);

  const conflicting = invalidatedAxes(selection, variants);
  const invalid = conflicting.length > 1 ? conflicting.filter((axis) => axis !== lastChanged) : conflicting;
  const variant = exactVariant(selection, axisKeys, variants);
  const range = variants.length ? priceRange(variants) : null;
  const nothingPurchasable = variants.length > 0 && !variants.some((candidate) => candidate.purchasable);
  const blocked = isLoading || nothingPurchasable || invalid.length > 0 || addToCart.isPending;

  function select(axis: string, value: string) {
    setSelection((current) => ({ ...current, [axis]: value }));
    setLastChanged(axis);
    setMissing((current) => current.filter((key) => key !== axis));
    setFailure(null);
  }

  function close() {
    onClose();
    // Start clean next time: a stale choice from a previous opening must never carry into the next.
    window.setTimeout(() => {
      setSelection({});
      setLastChanged(null);
      setMissing([]);
      setFailure(null);
    }, 300);
  }

  async function confirm() {
    const unchosen = axisKeys.filter((key) => !selection[key]);
    if (unchosen.length > 0) {
      // Never add a configurable product without the required selections — name what is missing instead.
      setMissing(unchosen);
      document.getElementById(`quick-${unchosen[0]}`)?.scrollIntoView({ block: "center" });
      return;
    }
    if (!variant) return;
    try {
      await addToCart.mutateAsync({ variantId: variant.variantId, quantity: 1 });
      track(addToCartEvent({ productId: product.id, variantId: variant.variantId, quantity: 1 }));
      announceAdded({ productSlug: product.slug, productName: product.name, optionLabel: optionLabel(product.optionAxes, variant, locale), image: product.images[0] ? { provider: "", publicId: "", secureUrl: product.images[0].src } : null, price: variant.price });
      close();
    } catch {
      // The server is the authority: it can refuse what the matrix offered (stock changed since).
      setFailure(t("addFailed"));
    }
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      side="bottom"
      title={t("quickAdd")}
      closeLabel={t("close")}
      footer={
        <button type="button" onClick={confirm} disabled={blocked} aria-describedby="quick-add-status" className="btn btn-primary min-h-[52px] w-full text-base">
          {nothingPurchasable ? t("outOfStock") : t("addToCart")}
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="media w-20 flex-none sm:w-24" style={{ aspectRatio: "4 / 5" }}>
            {product.images[0] ? <Image src={product.images[0].src} alt="" fill sizes="96px" className="object-cover" /> : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            {product.category ? <span className="t-label text-support">{product.category}</span> : null}
            <h3 className="font-medium leading-snug">{product.name}</h3>
            {variant ? <Price amount={variant.price} compareAt={variant.compareAtPrice} /> : range ? <Price amount={range.min} rangeFrom={range.min !== range.max} /> : product.price ? <Price amount={product.price} rangeFrom={product.priceIsRange} /> : null}
            <Link href={productHref(product.slug)} className="mt-1 inline-flex min-h-9 items-center text-[0.875rem] text-ink-secondary underline underline-offset-4 hover:text-ink">
              {t("viewProduct")}
            </Link>
          </div>
        </div>

        {variants.length > 0 ? (
          <VariantSelector axes={product.optionAxes} variants={variants} selection={selection} onSelect={select} invalidAxes={invalid} missingAxes={missing} idPrefix="quick" />
        ) : (
          <div className="flex flex-col gap-3" aria-busy="true">
            {product.optionAxes.map((axis) => (
              <div key={axis.key} className="h-[76px] animate-pulse bg-surface-muted motion-reduce:animate-none" />
            ))}
          </div>
        )}

        <p id="quick-add-status" className="min-h-5 text-[0.875rem]" role="status">
          {failure ? (
            <span className="font-medium text-critical">{failure}</span>
          ) : nothingPurchasable ? (
            <span className="font-medium text-critical">{t("outOfStock")}</span>
          ) : invalid.length > 0 ? (
            <span className="font-medium text-critical">{t("unavailableCombination")}</span>
          ) : variant ? (
            // Quick Add reads live availability only, so low stock is a live signal here.
            <StockLine status={stockStatus(variant, true)} />
          ) : null}
        </p>
      </div>
    </Sheet>
  );
}
