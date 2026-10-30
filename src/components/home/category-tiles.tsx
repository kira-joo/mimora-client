import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/reveal";
import type { Locale } from "@/i18n/routing";
import type { HomeSection } from "@/lib/api/types";
import { localized } from "@/lib/format/numerals";
import { MOTION } from "@/lib/motion/tokens";
import { SectionHead, ViewAll } from "./section-head";

const COLUMNS: Record<number, string> = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3" };

/**
 * Shop by category. Desktop: a grid of panels — photograph, name, one line, and a
 * circular arrow. Phone: a horizontal scroll-snap row showing about 2.7 cards (the
 * partial card is the scroll cue), name only. `contain: paint` keeps the scrolled
 * -away cards from counting as page overflow in RTL.
 */
export async function CategoryTiles({ section, locale }: { section: Extract<HomeSection, { type: "categoryTiles" }>; locale: Locale }) {
  if (section.categories.length === 0) return null;
  const t = await getTranslations("common");
  return (
    <section className="container-sf mt-[var(--sf-section)]">
      <Reveal>
        <SectionHead title={localized(section.heading, locale) || t("browseCategories")} action={<ViewAll href="/products" label={t("shopAll")} />} />
      </Reveal>
      <ul className={`-mx-[var(--sf-gutter)] flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-[var(--sf-gutter)] px-[var(--sf-gutter)] pb-3 [scrollbar-width:none] max-lg:[contain:paint] lg:mx-0 lg:grid lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0 ${COLUMNS[section.categories.length] ?? "lg:grid-cols-4"}`}>
        {section.categories.map((category, index) => {
          const name = localized(category.name, locale);
          const description = category.description ? localized(category.description, locale) : "";
          return (
            <li key={category.slug} className="w-[calc((100%-1.5rem)/2.7)] flex-none snap-start max-md:min-w-[8.5rem] md:w-[calc((100%-2.25rem)/3.7)] lg:w-auto">
              <Reveal className="h-full" delay={Math.min(index, 5) * MOTION.stagger}>
                <Link href={`/categories/${category.slug}`} className="group flex h-full flex-col rounded-card bg-panel p-1.5 shadow-card outline-offset-4 transition-transform duration-[var(--sf-duration-standard)] ease-standard focus-visible:outline-2 focus-visible:outline-focus lg:p-2 [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5">
                  <span className="media block aspect-square rounded-[calc(var(--sf-radius-card)-0.375rem)] lg:aspect-[4/3]">
                    {category.image?.secureUrl ? <Image src={category.image.secureUrl} alt="" fill sizes="(min-width: 1024px) 24vw, 38vw" className="object-cover transition-transform duration-[var(--sf-duration-slow)] ease-standard [@media(hover:hover)_and_(pointer:fine)]:group-hover:scale-[1.04]" /> : null}
                  </span>
                  <span className="flex items-center justify-between gap-3 px-1.5 pb-1.5 pt-3 lg:px-2.5 lg:pb-2">
                    <span className="min-w-0">
                      <span className="block font-display text-[0.9375rem] font-semibold leading-snug text-ink lg:text-[1.125rem]">{name}</span>
                      {description ? <span className="mt-0.5 hidden text-[0.8125rem] leading-snug text-ink-muted lg:block">{description}</span> : null}
                    </span>
                    <span className="hidden size-9 flex-none items-center justify-center rounded-full border border-line-strong text-ink transition-colors duration-[var(--sf-duration-fast)] group-hover:border-action group-hover:bg-action group-hover:text-on-action lg:flex" aria-hidden="true">
                      <ArrowLeft className="size-4 ltr:-scale-x-100" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
