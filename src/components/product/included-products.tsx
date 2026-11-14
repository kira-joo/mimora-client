"use client";

import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { useState } from "react";
import { StoreImage } from "@/components/ui/store-image";
import { Link } from "@/i18n/navigation";
import type { ImageAsset } from "@/lib/api/types";
import { productHref } from "@/lib/links";

export interface IncludedProductCard {
  slug: string;
  /** Already localized. */
  name: string;
  /** Already formatted ("× 2"); absent when one is included. */
  quantity?: string;
  images: ImageAsset[];
  /** One accessible name per image ("Image 2 of 3: Pink Bow Mug"), already localized — computed by the server page, because a function cannot cross into a Client Component. */
  imageLabels: string[];
}

/**
 * "What's inside?" — the products a box contains, each a link to its own page, with its own images browsable in
 * place. The data is the included products' live records, so a renamed or re-photographed item shows here as it is.
 */
export function IncludedProducts({ heading, cards }: { heading: string; cards: IncludedProductCard[] }) {
  return (
    <section className="mt-[var(--sf-section)]" aria-labelledby="included-products-heading">
      <h2 id="included-products-heading" className="t-title mb-3">
        {heading}
      </h2>
      <div className="rule mb-6" aria-hidden="true" />
      <ul className="grid grid-cols-2 gap-x-2.5 gap-y-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-5">
        {cards.map((card) => (
          <IncludedCard key={card.slug} card={card} />
        ))}
      </ul>
    </section>
  );
}

function IncludedCard({ card }: { card: IncludedProductCard }) {
  const [shown, setShown] = useState(0);
  const image = card.images[shown] ?? card.images[0];
  return (
    <li className="flex flex-col gap-2">
      <Link href={productHref(card.slug)} className="group relative block overflow-hidden rounded-[var(--sf-radius-card,var(--sf-radius-control))]">
        <StoreImage image={image} alt={card.name} ratio="4 / 5" sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw" imageClassName="transition-transform duration-[var(--sf-duration-slow,var(--sf-duration-fast))] ease-standard group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        {card.quantity ? <span className="tabular absolute end-2 top-2 rounded-full bg-canvas/90 px-2 py-0.5 text-[0.8125rem] font-semibold text-ink">{card.quantity}</span> : null}
      </Link>
      {card.images.length > 1 ? (
        <div className="flex flex-wrap gap-1.5">
          {card.images.map((thumb, index) => (
            <button
              key={thumb.publicId}
              type="button"
              aria-pressed={index === shown}
              aria-label={card.imageLabels[index] ?? card.name}
              onClick={() => setShown(index)}
              className={cn("size-11 overflow-hidden rounded-[var(--sf-radius-control)] border", index === shown ? "border-ink shadow-[inset_0_0_0_1px_var(--sf-ink)]" : "border-line hover:border-ink")}
            >
              <StoreImage image={thumb} alt="" ratio="1 / 1" sizes="44px" />
            </button>
          ))}
        </div>
      ) : null}
      <Link href={productHref(card.slug)} className="text-[0.9375rem] font-medium text-ink underline-offset-4 hover:underline">
        {card.name}
      </Link>
    </li>
  );
}
