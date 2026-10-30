import { Cake, Flower2, Gift, Heart, House, PartyPopper, Sparkles, Users, type LucideIcon } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Collection, HomeSection } from "@/lib/api/types";
import { localized } from "@/lib/format/numerals";
import { Bow, HandHeart } from "./ornaments";
import { TitleWithHeart } from "./section-head";

/** Decorative only: icons rotate through this set by position — nothing in the data says which icon a collection "is". */
const ICONS: LucideIcon[] = [Heart, PartyPopper, Gift, Users, Flower2, House, Cake, Sparkles];

/** More than this wraps into a second row and crowds the bow; the rest stay one tap away in the shop. */
const MAX_CHIPS = 6;

/**
 * The gingham banner: the band's headline over chips for the store's other
 * published collections (each a real collection page), a drawn bow at the reading
 * end and a few hand-drawn hearts. The chips are desktop furniture; on a phone the
 * band is the headline alone.
 */
export function GiftBand({ section, collections, locale }: { section: Extract<HomeSection, { type: "editorialBand" }>; collections: Collection[]; locale: Locale }) {
  const chips = collections.filter((collection) => collection.slug !== section.collection.slug).slice(0, MAX_CHIPS);
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <Reveal>
        <div className="gingham relative overflow-hidden rounded-panel px-5 py-7 lg:px-12 lg:py-9">
          <HandHeart className="absolute start-5 top-5 size-7 -rotate-6 text-ornament lg:start-10 lg:top-7 lg:size-9" />
          <HandHeart className="absolute start-10 top-14 hidden size-5 rotate-12 text-ornament lg:block" />
          <Bow className="pointer-events-none absolute -end-5 top-1/2 w-28 -translate-y-1/2 rotate-[8deg] rtl:-scale-x-100 rtl:-rotate-[8deg] lg:end-6 lg:w-60" />
          <div className="relative flex flex-col items-center gap-5 max-lg:pe-14 lg:px-24">
            <h2 className="band-title t-title text-center text-balance max-lg:ps-7">
              <TitleWithHeart title={localized(section.headline, locale)} className="size-[0.6em]" />
            </h2>
            {chips.length > 0 ? (
              <ul className="hidden flex-wrap justify-center gap-1 rounded-card bg-chip p-2 lg:flex">
                {chips.map((collection, index) => {
                  const Icon = ICONS[index % ICONS.length];
                  return (
                    <li key={collection.slug}>
                      <Link href={`/collections/${collection.slug}`} className="group flex min-h-11 min-w-24 flex-col items-center gap-1.5 rounded-card px-3 py-2 text-[0.8125rem] font-medium text-ink-secondary transition-colors duration-[var(--sf-duration-fast)] hover:bg-blush-soft hover:text-ink">
                        <Icon className="size-6 stroke-[1.5] text-ornament" aria-hidden="true" />
                        <span className="text-center leading-tight">{localized(collection.name, locale)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
