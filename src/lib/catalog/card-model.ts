import type { Locale } from "@/i18n/routing";
import type { Category, ImageAsset, OptionAxis, Product } from "@/lib/api/types";
import { localized } from "@/lib/format/numerals";
import { promotionFor, type ProductPromotion, type PromotionBadge } from "./promotions";

/*
 * What a product card needs, resolved on the SERVER: names in the page locale,
 * the one badge, and nothing the browser does not need. Computed where the
 * page is rendered so anything time-based (the "new" window) is decided once
 * and can never differ between server and client markup.
 */
export interface CardProduct {
  id: string;
  slug: string;
  name: string;
  category?: string;
  images: Array<{ src: string; alt: string; width?: number; height?: number }>;
  optionAxes: OptionAxis[];
  /** Cached catalog price (content); the cart re-quotes authoritatively. */
  price?: string;
  priceIsRange: boolean;
  compareAt?: string;
  soldOut: boolean;
  badge: "soldOut" | "sale" | "new" | null;
  /** At or below the store's low-stock threshold, from the listing response. A hint from cached listing data (the product page confirms it live); never shown on a sold-out card. */
  lowStock?: boolean;
  /** The automatic promotion this product falls under — its name and condition only, never a price (the quote prices). */
  promotion?: ProductPromotion;
}

/** A product added within this window reads as new (a presentation rule, not a business one). */
const NEW_FOR_DAYS = 14;

export function toCardProduct(product: Product, locale: Locale, categories: Category[], now: number, promotions: PromotionBadge[] = []): CardProduct {
  const name = localized(product.name, locale);
  const images: ImageAsset[] = product.images.length ? product.images : product.listing.primaryImage ? [product.listing.primaryImage] : [];
  const soldOut = product.listing.purchasableVariantCount === 0;
  const compareAt = product.listing.compareAtPrice;
  const isNew = now - Date.parse(product.createdAt) <= NEW_FOR_DAYS * 86_400_000;
  const category = categories.find((candidate) => candidate._id === product.categoryId);
  // A sold-out product advertises nothing it cannot sell.
  const promotion = soldOut ? null : promotionFor(promotions, { productId: product._id, categoryId: product.categoryId, collectionIds: product.collectionIds });
  return {
    id: product._id,
    slug: product.slug,
    name,
    category: category ? localized(category.name, locale) : undefined,
    // Alt: the merchant's own where they wrote one (MDS §20); otherwise the product name names the photograph.
    images: images.map((image, index) => ({ src: image.secureUrl, alt: (image.alt && localized(image.alt, locale)) || (index === 0 ? name : ""), width: image.width, height: image.height })),
    optionAxes: product.optionAxes,
    price: product.listing.minActivePrice,
    priceIsRange: Boolean(product.listing.minActivePrice && product.listing.maxActivePrice && product.listing.minActivePrice !== product.listing.maxActivePrice),
    compareAt,
    soldOut,
    // One badge at most, by what matters most to the decision — all from real data; no invented "best seller".
    badge: soldOut ? "soldOut" : compareAt ? "sale" : isNew ? "new" : null,
    ...(promotion ? { promotion } : {}),
    ...(!soldOut && product.listing.lowStock ? { lowStock: true } : {}),
  };
}
