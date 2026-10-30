import type { HomeSection, Localized } from "@/lib/api/types";
import { linkHref } from "@/lib/links";

type Section<T extends HomeSection["type"]> = Extract<HomeSection, { type: T }>;

/**
 * The hero's second action. There is no gift-box builder, so it never pretends to be one: it leads to the
 * editorial band's collection — or, when that is where the primary action already goes, to the first category
 * the store tiles on the home page. Two buttons with one destination are one button; `null` when nothing distinct
 * is published.
 */
export function heroSecondaryAction(
  hero: Section<"campaignHero">,
  band: Section<"editorialBand"> | undefined,
  tiles: Section<"categoryTiles"> | undefined,
): { name: Localized; href: string } | null {
  const primary = hero.action ? linkHref(hero.action.link) : null;
  const candidates = [
    ...(band ? [{ name: band.collection.name, href: linkHref({ kind: "collection", slug: band.collection.slug }) }] : []),
    ...(tiles?.categories ?? []).map((category) => ({ name: category.name, href: linkHref({ kind: "category", slug: category.slug }) })),
  ];
  return candidates.find((candidate) => candidate.href !== primary) ?? null;
}
