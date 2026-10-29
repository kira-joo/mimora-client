import { Reveal } from "@/components/ui/reveal";
import { ProductCard } from "@/components/product/product-card";
import type { CardProduct } from "@/lib/catalog/card-model";
import { MOTION } from "@/lib/motion/tokens";

/**
 * Phone: horizontal scroll-snap showing 2.2 cards — the partial card is the
 * scroll cue. Desktop: a 4-up grid, no scroll (design-system §13a).
 *
 * `contain: paint` on the scroller is load-bearing: without it, in RTL, Chrome
 * counted the rail's scrolled-away cards as page overflow once they had
 * revealed — the page panned sideways at 375 (measured in the design preview).
 */
export function ProductRail({ items }: { items: CardProduct[] }) {
  return (
    <ul className="-mx-[var(--sf-gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-[var(--sf-gutter)] px-[var(--sf-gutter)] pb-2 [scrollbar-width:none] max-lg:[contain:paint] lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0">
      {items.map((product, index) => (
        <li key={product.slug} className="w-[calc((100%-1.5rem)/2.2)] flex-none snap-start md:w-[calc((100%-2.25rem)/3.2)] lg:w-auto">
          <Reveal className="h-full" delay={Math.min(index, 5) * MOTION.stagger}>
            <ProductCard product={product} sizes="(min-width: 1024px) 25vw, 45vw" />
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
