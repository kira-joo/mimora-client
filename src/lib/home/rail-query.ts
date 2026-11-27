import type { ProductListQuery } from "@/lib/api/storefront.endpoints";
import type { Category, Collection, HomeSection } from "@/lib/api/types";

/** The most products a home section shows; its View All link opens the full listing. */
export const HOME_RAIL_LIMIT = 10;

/**
 * The listing read behind a product-bearing home section, or null when it shows none. One function for every source,
 * so adding a source (Staff configuration) never means another fetch path:
 *
 * - `collection` / `collectionStory`: that collection, in the merchant's manual order (the listing's default);
 * - `category`: that category and its descendants, in manual order;
 * - `newest`: explicitly newest-first — the default order is the manual arrangement, not arrival.
 *
 * Content names collections and categories by slug; the listing takes ids, resolved from the published lists. A slug
 * with no published match yields null — the section is skipped rather than showing the whole catalog.
 */
export function railQuery(section: HomeSection, collections: Pick<Collection, "_id" | "slug">[], categories: Pick<Category, "_id" | "slug">[]): ProductListQuery | null {
  const limit = HOME_RAIL_LIMIT;
  if (section.type === "collectionStory") return byCollection(section.collection.slug);
  if (section.type !== "productRail") return null;
  switch (section.source) {
    case "newest":
      return { limit, sort: "newest" };
    case "collection":
      return section.collection ? byCollection(section.collection.slug) : null;
    case "category": {
      const categoryId = section.category ? categories.find((category) => category.slug === section.category!.slug)?._id : undefined;
      return categoryId ? { limit, categoryId } : null;
    }
  }

  function byCollection(slug: string): ProductListQuery | null {
    const collectionId = collections.find((collection) => collection.slug === slug)?._id;
    return collectionId ? { limit, collectionId } : null;
  }
}

/** Where a product rail's View All link goes: the full listing of the same products. */
export function railHref(section: Extract<HomeSection, { type: "productRail" }>): string {
  if (section.source === "collection" && section.collection) return `/collections/${section.collection.slug}`;
  if (section.source === "category" && section.category) return `/categories/${section.category.slug}`;
  return "/products?sort=newest";
}
