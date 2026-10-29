import type { Locale } from "@/i18n/routing";
import type { Category } from "@/lib/api/types";
import { localized } from "@/lib/format/numerals";

/*
 * Breadcrumb trails (MDS §6.3, §21). One builder feeds BOTH the visible
 * `nav > ol` and the BreadcrumbList JSON-LD, so what a customer reads and what
 * a search engine is told cannot drift apart. Hrefs are locale-less paths (the
 * i18n `Link` adds the locale); structured data makes them absolute itself.
 */
export interface Crumb {
  label: string;
  /** Absent on the page the customer is on. */
  href?: string;
}

/** A guard against a malformed tree — a real catalogue is a few levels deep. */
const MAX_DEPTH = 8;

/**
 * The category and its ancestors, root first. Stops at the first ancestor that
 * is not in `categories` (an unpublished parent is not a page that exists) and
 * at a repeat, so a cycle in the data cannot loop.
 */
export function categoryChain<T extends Pick<Category, "_id" | "parentId">>(categories: T[], categoryId: string | undefined | null): T[] {
  const chain: T[] = [];
  const seen = new Set<string>();
  let id = categoryId ?? undefined;
  while (id && !seen.has(id) && chain.length < MAX_DEPTH) {
    seen.add(id);
    const category = categories.find((candidate) => candidate._id === id);
    if (!category) break;
    chain.unshift(category);
    id = category.parentId ?? undefined;
  }
  return chain;
}

const categoryHref = (category: Pick<Category, "slug">) => `/categories/${category.slug}`;

interface TrailBase {
  homeLabel: string;
  locale: Locale;
}

/** Home › ancestors › category — the category is the current page, so it carries no link. */
export function categoryTrail({ homeLabel, locale, categories, category }: TrailBase & { categories: Category[]; category: Category }): Crumb[] {
  const chain = categoryChain(categories, category._id);
  const ancestors = chain.length > 0 && chain[chain.length - 1]!._id === category._id ? chain.slice(0, -1) : chain;
  return [{ label: homeLabel, href: "/" }, ...ancestors.map((ancestor) => ({ label: localized(ancestor.name, locale), href: categoryHref(ancestor) })), { label: localized(category.name, locale) }];
}

/** Home › the product's whole category chain › the product. A product with no known category goes straight from Home. */
export function productTrail({ homeLabel, locale, categories, categoryId, productName }: TrailBase & { categories: Category[]; categoryId?: string; productName: string }): Crumb[] {
  const chain = categoryChain(categories, categoryId);
  return [{ label: homeLabel, href: "/" }, ...chain.map((category) => ({ label: localized(category.name, locale), href: categoryHref(category) })), { label: productName }];
}

/** Home › the collection or brand (flat — neither has ancestors). */
export function flatTrail({ homeLabel, current }: Pick<TrailBase, "homeLabel"> & { current: string }): Crumb[] {
  return [{ label: homeLabel, href: "/" }, { label: current }];
}
