"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { t } from "../format";
import { getDictionary } from "../i18n";
import { findCategory } from "../fixtures/catalog";
import { exactVariant, invalidatedAxes, priceRange, type Selection } from "../lib/variant-selection";
import { usePreviewState } from "../state";
import type { Locale, Product } from "../types";
import { VariantSelector } from "../pdp/variant-selector";
import { Price } from "./price";
import { Sheet } from "./sheet";

interface QuickAddSheetProps {
  product: Product;
  locale: Locale;
  open: boolean;
  onClose(): void;
}

/**
 * Quick add from a product card: a bottom sheet on a phone, a centred panel on
 * desktop (`Sheet`'s "bottom" side). Deliberately NOT a smaller product page:
 * image, name, price, the option tiles and one button — no quantity, gallery,
 * reviews or assurances, all of which stay on the product page one tap away.
 *
 * The rules are the product page's, because it is the same selector over the
 * same matrix: an unavailable value is shown, not hidden; a prior choice a
 * later one makes impossible is kept and flagged, never silently switched; and
 * nothing is added until every axis has a value. Adding goes through the same
 * `addLine` as the product page, so the existing "Added to your cart" sheet
 * (line, subtotal, Checkout / Keep shopping) is the confirmation — no second
 * confirmation to build, and in production no new API: it is the same
 * add-to-cart mutation, re-validated server-side.
 */
export function QuickAddSheet({ product, locale, open, onClose }: QuickAddSheetProps) {
  const dict = getDictionary(locale);
  const { addLine } = usePreviewState();
  const axisKeys = product.optionAxes.map((axis) => axis.key);
  const [selection, setSelection] = useState<Selection>({});
  // The choice just made stands; a PRIOR choice it makes impossible is the one retained and flagged (MDS §10.2).
  const [lastChanged, setLastChanged] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const conflicting = invalidatedAxes(selection, product.variants);
  const invalid = conflicting.length > 1 ? conflicting.filter((axis) => axis !== lastChanged) : conflicting;
  const variant = axisKeys.length === 0 ? product.variants.find((candidate) => candidate.purchasable) : exactVariant(selection, axisKeys, product.variants);
  const range = priceRange(product.variants);
  const nothingPurchasable = !product.variants.some((candidate) => candidate.purchasable);
  const category = findCategory(product.categorySlug);

  const price = variant ? variant.price : range.min;
  const isRange = !variant && range.min !== range.max;
  const compareAt = variant?.compareAtPrice ?? (product.variants.every((candidate) => candidate.compareAtPrice) ? product.variants[0]?.compareAtPrice : undefined);
  const blocked = nothingPurchasable || invalid.length > 0;

  function select(axis: string, value: string) {
    setSelection((current) => ({ ...current, [axis]: value }));
    setLastChanged(axis);
    setMissing((current) => current.filter((key) => key !== axis));
  }

  function close() {
    onClose();
    // Start clean next time: a stale choice from a previous opening must never carry into the next.
    window.setTimeout(() => {
      setSelection({});
      setLastChanged(null);
      setMissing([]);
    }, 300);
  }

  function confirm() {
    const unchosen = axisKeys.filter((key) => !selection[key]);
    if (unchosen.length > 0) {
      // Never add a configurable product without the required selections — name what is missing instead.
      setMissing(unchosen);
      document.getElementById(`axis-${unchosen[0]}`)?.scrollIntoView({ block: "center" });
      return;
    }
    if (!variant) return;
    addLine(product.slug, variant.variantId, 1);
    close();
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      side="bottom"
      title={dict.quickAdd}
      closeLabel={dict.close}
      footer={
        <button type="button" onClick={confirm} disabled={blocked} aria-describedby="quick-add-status" className="btn btn-primary min-h-[52px] w-full text-base">
          {nothingPurchasable ? dict.outOfStock : dict.addToCart}
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex gap-4">
          <div className="media w-20 flex-none sm:w-24" style={{ aspectRatio: "4 / 5" }}>
            {product.images[0] ? <Image src={product.images[0].src} alt="" fill sizes="96px" className="object-cover" /> : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
            {category ? <span className="t-label text-support">{t(category.name, locale)}</span> : null}
            <h3 className="font-medium leading-snug">{t(product.name, locale)}</h3>
            <Price locale={locale} amount={price} rangeFrom={isRange} compareAt={compareAt} />
            <Link href={`/preview/${locale}/products/${product.slug}`} className="mt-1 inline-flex min-h-9 items-center text-[0.875rem] text-ink-secondary underline underline-offset-4 hover:text-ink">
              {dict.viewProduct}
            </Link>
          </div>
        </div>

        <VariantSelector locale={locale} axes={product.optionAxes} variants={product.variants} selection={selection} onSelect={select} invalidAxes={invalid} missingAxes={missing} />

        <p id="quick-add-status" className="min-h-5 text-[0.875rem]" role="status">
          {nothingPurchasable ? (
            <span className="font-medium text-critical">{dict.outOfStock}</span>
          ) : invalid.length > 0 ? (
            <span className="font-medium text-critical">{dict.unavailableCombination}</span>
          ) : variant?.lowStock ? (
            <span className="font-medium text-caution">{dict.lowStock}</span>
          ) : variant ? (
            <span className="text-positive">{dict.inStock}</span>
          ) : null}
        </p>
      </div>
    </Sheet>
  );
}
