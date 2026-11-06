import { linkHref } from "@/lib/links";
import { localized } from "@/lib/format/numerals";
import type { Category, ResolvedLink } from "@/lib/api/types";
import type { Locale } from "@/i18n/routing";

export interface HeaderLink {
  key: string;
  href: string;
  label: string;
  /** A category's published sub-categories, in their Staff order. Empty for everything else. */
  children: HeaderLink[];
}

type TreeCategory = Pick<Category, "_id" | "slug" | "name" | "parentId" | "sortOrder">;

const bySortOrder = (a: TreeCategory, b: TreeCategory) => a.sortOrder - b.sortOrder;
const categoryLink = (category: TreeCategory, locale: Locale, children: HeaderLink[] = []): HeaderLink => ({
  key: `category-${category.slug}`,
  href: linkHref({ kind: "category", slug: category.slug }),
  label: localized(category.name, locale),
  children,
});

/** The published top-level categories, in Staff order. A sub-category whose parent is unpublished is not among them. */
export function topLevelCategories<T extends TreeCategory>(categories: T[]): T[] {
  return categories.filter((category) => !category.parentId).sort(bySortOrder);
}

/**
 * The header's navigation, generated from the category tree managed in Staff: "Home" (chrome, always first), then every
 * published top-level category in its Staff order, each carrying its published sub-categories as a dropdown, then the
 * merchant's non-category links from the storefront content (collections, pages). Category links in that content list
 * are not repeated — the tree already holds every category, in the order Staff gives it.
 *
 * `categories` is the storefront list, which holds published categories only, so an unpublished category never shows,
 * and neither does anything beneath it. One level of dropdown, by design: deeper categories are reached from their
 * parent's page.
 */
export function headerLinks(navigation: ResolvedLink[], categories: TreeCategory[], locale: Locale, homeLabel: string): HeaderLink[] {
  const childrenOf = (parentId: string) => categories.filter((category) => category.parentId === parentId).sort(bySortOrder).map((category) => categoryLink(category, locale));
  return [
    { key: "home", href: "/", label: homeLabel, children: [] },
    ...topLevelCategories(categories).map((category) => categoryLink(category, locale, childrenOf(category._id))),
    ...navigation.filter((link) => link.kind !== "category").map((link) => ({ key: `${link.kind}-${link.slug}`, href: linkHref(link), label: localized(link.label, locale), children: [] })),
  ];
}

/** Whether `pathname` is inside a link: Home only on "/", anything else on itself, below it, or on one of its children. */
export function isCurrentLink(link: Pick<HeaderLink, "href" | "children">, pathname: string): boolean {
  if (link.href === "/") return pathname === "/";
  const within = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return within(link.href) || link.children.some((child) => within(child.href));
}
