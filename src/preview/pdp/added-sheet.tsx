"use client";

import Link from "next/link";
import Image from "next/image";
import { Check } from "lucide-react";
import { useMediaQuery } from "../lib/use-media-query";
import { formatPrice, t } from "../format";
import { getDictionary } from "../i18n";
import { quote } from "../mock-api/quote";
import { usePreviewState } from "../state";
import type { Locale } from "../types";
import { Sheet } from "../components/sheet";
import { optionLabels } from "../lib/option-labels";

/**
 * §13b: add-to-cart confirms in a sheet — not a page, not a toast — with the
 * line just added, the cart subtotal as the server returned it, and two
 * actions. A bottom sheet on a phone; a panel from the reading-end edge on
 * desktop.
 */
export function AddedSheet({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const { lines, lastAdded, clearLastAdded } = usePreviewState();
  const desktop = useMediaQuery("(min-width: 1024px)");
  const summary = quote(lines, null);
  const added = lastAdded ? quote([lastAdded], null).lines[0] : undefined;

  return (
    <Sheet
      open={!!lastAdded}
      onClose={clearLastAdded}
      side={desktop ? "end" : "bottom"}
      title={dict.added}
      closeLabel={dict.close}
      footer={
        <div className="flex flex-col gap-2">
          <Link href={`/preview/${locale}/checkout`} className="btn btn-primary w-full" onClick={clearLastAdded}>
            {dict.checkout}
          </Link>
          <button type="button" className="btn btn-secondary w-full" onClick={clearLastAdded}>
            {dict.keepShopping}
          </button>
        </div>
      }
    >
      {added ? (
        <div className="flex flex-col gap-5">
          <div className="flex gap-4">
            <div className="media w-20 flex-none" style={{ aspectRatio: "4 / 5" }}>
              {added.product.images[0] ? <Image src={added.product.images[0].src} alt="" fill sizes="80px" className="object-cover" /> : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-1.5 text-[0.875rem] font-medium text-positive">
                <Check className="size-4" aria-hidden="true" />
                {dict.added}
              </span>
              <span className="font-medium">{t(added.product.name, locale)}</span>
              <span className="text-[0.875rem] text-ink-secondary">{optionLabels(added.product, added.variant, locale)}</span>
              <span className="t-price mt-1 text-[1.125rem]">{formatPrice(locale, added.unitPrice)}</span>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-ink-secondary">{dict.subtotal}</span>
            <span className="t-price text-[1.125rem]">{formatPrice(locale, summary.subtotal)}</span>
          </div>
        </div>
      ) : null}
    </Sheet>
  );
}
