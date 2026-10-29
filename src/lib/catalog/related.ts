import type { Product } from "@/lib/api/types";

/** How many related products the page shows. */
export const RELATED_COUNT = 4;

/**
 * Which of a category's products to offer as "you may also like": never the
 * product being viewed, never a duplicate, purchasable ones before sold-out
 * ones (a suggestion the customer cannot buy is the last thing worth showing),
 * and otherwise the backend's own order.
 */
export function selectRelated<T extends Pick<Product, "slug" | "listing">>(candidates: T[], currentSlug: string, count = RELATED_COUNT): T[] {
  const seen = new Set<string>([currentSlug]);
  const unique = candidates.filter((candidate) => {
    if (seen.has(candidate.slug)) return false;
    seen.add(candidate.slug);
    return true;
  });
  const purchasable = unique.filter((candidate) => candidate.listing.purchasableVariantCount > 0);
  const soldOut = unique.filter((candidate) => candidate.listing.purchasableVariantCount <= 0);
  return [...purchasable, ...soldOut].slice(0, count);
}
