"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatNumber, localized } from "@/lib/format/numerals";
import type { ImageAsset, MatrixVariant } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";
import { BuyBox, type BuyBoxProps } from "./buy-box";
import { Gallery, type GalleryImage } from "./gallery";

/**
 * The product page's top: the gallery beside the buy box. They share ONE fact —
 * which variant is selected — because a colour-specific variant brings its own
 * photographs (`galleryOverride`). The buy box owns the selection; the gallery
 * follows it, falling back to the product's own images whenever the selected
 * variant has none (or nothing is selected yet).
 *
 * The gallery is re-keyed by the image set, so switching variant starts at the
 * first photograph instead of leaving the index pointing past the end.
 */
export function ProductHero({ productImages, productName, ...buyBox }: { productImages: ImageAsset[]; productName: string } & Omit<BuyBoxProps, "onVariantChange" | "name">) {
  const locale = useLocale() as Locale;
  const t = useTranslations("common");
  const [selected, setSelected] = useState<MatrixVariant | undefined>(undefined);

  const override = selected?.galleryOverride?.length ? selected.galleryOverride : null;
  const source = override ?? productImages;
  const images: GalleryImage[] = useMemo(
    () => source.map((image, index) => ({ src: image.secureUrl, alt: (image.alt && localized(image.alt, locale)) || (index === 0 ? productName : t("imageOf", { i: formatNumber(locale, index + 1), n: formatNumber(locale, source.length) })) })),
    [source, locale, productName, t]
  );

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <Gallery key={override ? `variant-${selected?.variantId}` : "product"} images={images} />
      </div>
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-[calc(72px+1.5rem)]">
          <BuyBox {...buyBox} name={productName} onVariantChange={setSelected} />
        </div>
      </div>
    </div>
  );
}
