import { getTranslations } from "next-intl/server";
import type { CardProduct } from "@/lib/catalog/card-model";
import { GiftCard } from "./gift-card";
import { RailScroller } from "./rail-scroller";

/**
 * The one product row every home section uses — collection, category or newest, and the collection story's products.
 * Always a horizontal rail: one big card and a sliver of the next on a phone, two and a bit on a tablet, three and a
 * bit on a small laptop, four and a bit on desktop — the sliver is the cue that it scrolls. Swipe or trackpad, plus
 * arrows from `lg`. The card is the storefront's own (GiftCard: image, name, price, favourite, add to cart).
 */
export async function ProductRail({ items }: { items: CardProduct[] }) {
  const t = await getTranslations("common");
  return (
    <RailScroller previousLabel={t("railPrevious")} nextLabel={t("railNext")}>
      {items.map((product) => (
        <li key={product.slug} className="w-[calc(100%-2.5rem)] flex-none snap-start sm:w-[calc((100%-0.75rem)/2.15)] md:w-[calc((100%-1.5rem)/3.1)] lg:w-[calc((100%-3.75rem)/4.25)]">
          {/* No scroll-reveal on cards: a card scrolled in sideways never crosses the page viewport's edge, so it would stay invisible. */}
          <GiftCard product={product} sizes="(min-width: 1024px) 23vw, (min-width: 640px) 45vw, 90vw" />
        </li>
      ))}
    </RailScroller>
  );
}
