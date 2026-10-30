import { Reveal } from "@/components/ui/reveal";
import type { CardProduct } from "@/lib/catalog/card-model";
import { MOTION } from "@/lib/motion/tokens";
import { GiftCard } from "./gift-card";

/**
 * Phone: one big card per view — swipe, snap, and a sliver of the next as the cue.
 * Tablet: two and a bit. Desktop: a 4-up grid, no scroll.
 *
 * `contain: paint` on the scroller is load-bearing: without it, in RTL, Chrome
 * counted the rail's scrolled-away cards as page overflow once they had revealed.
 */
export function ProductRail({ items }: { items: CardProduct[] }) {
  return (
    <ul className="-mx-[var(--sf-gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-[var(--sf-gutter)] px-[var(--sf-gutter)] pb-3 [scrollbar-width:none] max-lg:[contain:paint] lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0">
      {items.map((product, index) => (
        <li key={product.slug} className="w-[calc(100%-2.5rem)] flex-none snap-start sm:w-[calc((100%-0.75rem)/2.15)] md:w-[calc((100%-1.5rem)/3.1)] lg:w-auto">
          <Reveal className="h-full" delay={Math.min(index, 5) * MOTION.stagger}>
            <GiftCard product={product} sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 90vw" />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
