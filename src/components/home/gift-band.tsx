import { cn } from "@kira-joo/frontend-toolkit-tailwind/server";
import { Cake, Flower2, Gift, Heart, HeartHandshake, House, PartyPopper, Sparkles, Users, type LucideIcon } from "lucide-react";
import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import type { Collection, HomeSection, ImageAsset } from "@/lib/api/types";
import { localized } from "@/lib/format/numerals";
import { Bow, HandHeart, SolidHeart } from "./ornaments";
import { RibbonDivider } from "./ribbon-divider";
import { TitleWithHeart } from "./section-head";

/*
 * A collection's icon is store data: Staff sets it (Collections → Icon) and it arrives on the collection as `icon`.
 * A collection without one gets a default drawn from these sets BY POSITION ONLY — nothing here knows any collection's
 * slug or name, so renaming, adding or reordering collections in Staff never needs a code change.
 */

/** The desktop band's chips. */
const ICONS: LucideIcon[] = [Heart, PartyPopper, Gift, Users, Flower2, House, Cake, Sparkles];

/** The phone's occasions panel (the band's own collection first, then the rest in Staff's order). */
const OCCASION_ICONS: LucideIcon[] = [Gift, Cake, PartyPopper, Heart, Flower2, HeartHandshake, Sparkles, Users, House];

/**
 * The collection's own icon when Staff has set one, else the positional default — in the same box, so the panel's
 * geometry never depends on which collections have icons yet. Decorative: the collection's name is the link text.
 */
export function CollectionIcon({ icon, fallback: Fallback, className, strokeClassName }: { icon?: ImageAsset; fallback: LucideIcon; className: string; strokeClassName: string }) {
  if (icon?.secureUrl) {
    return <Image src={icon.secureUrl} alt="" aria-hidden="true" width={icon.width ?? 96} height={icon.height ?? 96} sizes="48px" className={cn(className, "object-contain")} />;
  }
  return <Fallback className={cn(className, strokeClassName, "text-ornament")} aria-hidden="true" />;
}

/** More than this wraps into a second row and crowds the bow; the rest stay one tap away in the shop. */
const MAX_CHIPS = 6;

/**
 * Desktop: the gingham banner — the band's headline over chips for the store's other
 * published collections (each a real collection page), a drawn bow at the reading end
 * and a few hand-drawn hearts. Phone: a rounded gingham gift card — the band's headline
 * beside a large bow, over a cream panel of every collection as an occasion (icon in a pink
 * circle, name beneath; the band's own collection first). The two are separate renderings
 * so the desktop band stays exactly as it was.
 */
export function GiftBand({ section, collections, locale }: { section: Extract<HomeSection, { type: "editorialBand" }>; collections: Collection[]; locale: Locale }) {
  const chips = collections.filter((collection) => collection.slug !== section.collection.slug).slice(0, MAX_CHIPS);
  const headline = localized(section.headline, locale);
  const occasions = [section.collection, ...collections.filter((collection) => collection.slug !== section.collection.slug)];
  return (
    <>
      {/* Phone: the same wavy ribbon that opens the product rail separates the category shortcuts from this card. Its
          margins are uneven on purpose: the shortcut row above already ends in 1rem of padding plus its cards' lift, so
          a small top margin and a larger bottom one leave the ribbon visually centred between the two. */}
      <RibbonDivider className="mt-1" />
      <section className="container-sf mt-5 md:mx-auto md:max-w-[36rem] lg:hidden">
        <Reveal>
          <div className="gingham relative overflow-hidden rounded-panel p-3">
            <div className="relative flex min-h-[6.75rem] items-center pb-3">
              <Bow className="pointer-events-none absolute -end-4 -top-5 w-36 rotate-[10deg] rtl:-scale-x-100 rtl:-rotate-[10deg]" />
              <HandHeart className="absolute end-[9.5rem] top-0 size-4 rotate-12 text-ornament" />
              <SolidHeart className="absolute end-9 top-[4.5rem] size-2.5 text-ornament" />
              <h2 className="t-title band-title relative max-w-[14rem] px-1 md:max-w-[19rem] text-balance [font-size:calc(var(--sf-text-title)*1.1)]">
                <TitleWithHeart title={headline} />
              </h2>
            </div>
            <ul className="relative flex flex-wrap justify-center rounded-card bg-chip p-1.5 shadow-card">
              {occasions.map((collection, index) => {
                return (
                  <li key={collection.slug} className="w-1/4">
                    <Link
                      href={`/collections/${collection.slug}`}
                      className="group flex h-full min-h-11 flex-col items-center gap-1.5 rounded-card px-0.5 py-2 outline-offset-1 transition-colors duration-[var(--sf-duration-fast)] focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-blush transition-transform duration-[var(--sf-duration-fast)] ease-standard group-active:scale-95">
                        <CollectionIcon icon={collection.icon} fallback={OCCASION_ICONS[index % OCCASION_ICONS.length]} className="size-5" strokeClassName="stroke-[1.6]" />
                      </span>
                      <span className="text-balance text-center text-[0.75rem] font-semibold leading-tight text-ink">{localized(collection.name, locale)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </Reveal>
      </section>
      <section className="container-sf mt-[var(--sf-section)] max-lg:hidden">
        <Reveal>
          <div className="gingham relative overflow-hidden rounded-panel px-12 py-9">
            <HandHeart className="absolute start-10 top-7 size-9 -rotate-6 text-ornament" />
            <HandHeart className="absolute start-10 top-14 size-5 rotate-12 text-ornament" />
            <Bow className="pointer-events-none absolute end-6 top-1/2 w-60 -translate-y-1/2 rotate-[8deg] rtl:-scale-x-100 rtl:-rotate-[8deg]" />
            <div className="relative flex flex-col items-center gap-5 px-24">
              <h2 className="t-title text-center text-balance">
                <TitleWithHeart title={headline} className="size-[0.6em]" />
              </h2>
              {chips.length > 0 ? (
                <ul className="flex flex-wrap justify-center gap-1 rounded-card bg-chip p-2">
                  {chips.map((collection, index) => {
                    return (
                      <li key={collection.slug}>
                        <Link
                          href={`/collections/${collection.slug}`}
                          className="group flex min-h-11 min-w-24 flex-col items-center gap-1.5 rounded-card px-3 py-2 text-[0.8125rem] font-medium text-ink-secondary transition-colors duration-[var(--sf-duration-fast)] hover:bg-blush-soft hover:text-ink"
                        >
                          <CollectionIcon icon={collection.icon} fallback={ICONS[index % ICONS.length]} className="size-6" strokeClassName="stroke-[1.5]" />
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
    </>
  );
}
