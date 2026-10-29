"use client";

import { useState } from "react";
import type { Locale, Product } from "../types";
import { BuyBox } from "./buy-box";
import { Gallery } from "./gallery";

/** Gallery first, then the buy box — side by side from lg, the buy box sticky beside a long gallery. */
export function ProductDetail({ product, locale }: { product: Product; locale: Locale }) {
  const [activeSrc, setActiveSrc] = useState<string | undefined>(undefined);
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <Gallery images={product.images} locale={locale} activeSrc={activeSrc} />
      </div>
      <div className="lg:col-span-5">
        <div className="lg:sticky lg:top-[calc(72px+1.5rem)]">
          <BuyBox product={product} locale={locale} onImage={setActiveSrc} />
        </div>
      </div>
    </div>
  );
}
