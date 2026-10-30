import type { Locale } from "@/i18n/routing";
import type { HomeSection } from "@/lib/api/types";
import { localized } from "@/lib/format/numerals";
import { linkHref } from "@/lib/links";

export interface HeroSlide {
  src: string;
  width?: number;
  height?: number;
  /** A chip naming where this photograph leads — always a real route from store data. */
  caption: { label: string; href: string } | null;
}

/** A showcase of 3–4 reads as a showcase; more is a slideshow nobody finishes. */
export const MAX_HERO_SLIDES = 4;

/**
 * The hero showcase, from the merchant's own content: the campaign image first,
 * then each category tile's photograph. A photograph already shown (the same URL —
 * a category that reuses the campaign image, or another category) is skipped, so
 * the showcase never repeats itself. Every slide's caption links to a real route.
 */
export function buildHeroSlides(hero: Extract<HomeSection, { type: "campaignHero" }>, tiles: Extract<HomeSection, { type: "categoryTiles" }> | undefined, locale: Locale): HeroSlide[] {
  const slides: HeroSlide[] = [];
  const seen = new Set<string>();
  const add = (slide: HeroSlide) => {
    if (slides.length >= MAX_HERO_SLIDES || seen.has(slide.src)) return;
    seen.add(slide.src);
    slides.push(slide);
  };

  if (hero.image?.secureUrl) {
    add({
      src: hero.image.secureUrl,
      width: hero.image.width,
      height: hero.image.height,
      caption: hero.action ? { label: localized(hero.action.link.label, locale), href: linkHref(hero.action.link) } : null,
    });
  }
  for (const category of tiles?.categories ?? []) {
    if (!category.image?.secureUrl) continue;
    add({ src: category.image.secureUrl, width: category.image.width, height: category.image.height, caption: { label: localized(category.name, locale), href: `/categories/${category.slug}` } });
  }
  return slides;
}
