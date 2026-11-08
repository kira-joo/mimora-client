import "server-only";
import { cache } from "react";
import { classifyApiError } from "@kira-joo/frontend-toolkit-core/server";
import { storefrontApi } from "../api/storefront-client";
import { StorefrontEndpoints as E, type ProductListQuery } from "../api/storefront.endpoints";
import { CATALOG_REVALIDATE_SECONDS, CacheTag } from "../cache/cache-tag";
import { MAX_PAGE_SIZE, fetchAllPages } from "./paging";

/*
 * Every catalog read, with the tags the backend actually publishes for it.
 * ISR + tags for content and price; NOTHING transactional is read here —
 * stock, cart, quote and orders are `no-store` and go through /api/session
 * (MDS §5). A product's purchasability in the cached matrix is provisional:
 * the product page refreshes it live, and add-to-cart re-validates on the
 * server regardless.
 *
 * `cache()` dedupes within one render (layout + page + metadata share a call).
 */
/**
 * 404 → `null`; anything else rethrows. Not the toolkit's `nullableOnNotFound`:
 * that recognises only its `AppError` (`__isAppError` + category), while
 * `createApiClient` throws the normalised `ApiError` shape — so it rethrew every
 * 404 (measured 2026-10-20: an unpublished legal page failed `next build`, and an
 * unknown product slug rendered the error page instead of not-found). This uses
 * the toolkit's own `classifyApiError`, which reads both shapes. Package fix
 * proposed in the Phase 6 report; replace this with the toolkit helper once released.
 */
async function nullableOnNotFound<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    if (classifyApiError(error) === "notFound") return null;
    throw error;
  }
}

function tagged(tags: CacheTag[], revalidate = CATALOG_REVALIDATE_SECONDS) {
  return { transport: { next: { tags, revalidate } } };
}

export const getStoreProfile = cache(() => nullableOnNotFound(() => storefrontApi().request(E.storeProfile, tagged([CacheTag.STORE_PROFILE]))));
/** The theme-save route publishes STORE_PROFILE — there is no THEME tag on the wire. */
export const getTheme = cache(() => nullableOnNotFound(() => storefrontApi().request(E.theme, tagged([CacheTag.STORE_PROFILE]))));

export const getContent = cache(() =>
  storefrontApi().request(E.content, tagged([CacheTag.CONTENT, CacheTag.CATEGORIES, CacheTag.COLLECTIONS, CacheTag.PAGES, CacheTag.STORE_PROFILE]))
);

export const getCategories = cache(() => storefrontApi().request(E.categories, tagged([CacheTag.CATEGORIES])));
export const getCollections = cache(() => storefrontApi().request(E.collections, tagged([CacheTag.COLLECTIONS])));
export const getBrands = cache(() => storefrontApi().request(E.brands, tagged([CacheTag.BRANDS])));

export const listProducts = cache((query: ProductListQuery) => storefrontApi().request(E.products, { query, ...tagged([CacheTag.PRODUCTS, CacheTag.CATEGORIES, CacheTag.COLLECTIONS]) }));
/**
 * EVERY published product, a page at a time (no first-page cap) — for the
 * sitemap and the product pages' `generateStaticParams`. Rejects on a failed
 * page; callers wrap it in `orNull` (D-15) so an unreachable backend means "no
 * list", never a silently partial one or a failed build.
 */
export const listAllProducts = cache(() =>
  fetchAllPages((page) => listProducts({ page, limit: MAX_PAGE_SIZE }), {
    onTruncated: (totalPages, maxPages) => console.error(`[catalog] product walk stopped at ${maxPages} of ${totalPages} pages — the sitemap and prebuilt product pages cover only the first ${maxPages * MAX_PAGE_SIZE} products.`),
  })
);
export const getProductDetail = cache((slug: string) => nullableOnNotFound(() => storefrontApi().request(E.productDetail, { params: { slug }, ...tagged([CacheTag.PRODUCTS]) })));
export const getFacets = cache((scope: { categoryId?: string; collectionId?: string; search?: string } = {}) =>
  storefrontApi().request(E.facets, { query: Object.fromEntries(Object.entries(scope).filter(([, value]) => value)), ...tagged([CacheTag.PRODUCTS, CacheTag.CATEGORIES]) })
);
export const getSizeGuide = cache((id: string) => nullableOnNotFound(() => storefrontApi().request(E.sizeGuide, { params: { id }, ...tagged([CacheTag.SIZE_GUIDES]) })));
/** Review moderation publishes PRODUCTS (it recomputes the rating rollup). */
export const getReviews = cache((productId: string, page = 1) => storefrontApi().request(E.reviews, { params: { productId }, query: { page, limit: 10 }, ...tagged([CacheTag.PRODUCTS]) }));
export const getPage = cache((slug: string) => nullableOnNotFound(() => storefrontApi().request(E.page, { params: { slug }, ...tagged([CacheTag.PAGES]) })));

/** Automatic promotions only — a coded one is never listed by the backend. `PROMOTIONS` is what the admin routes publish. */
export const getActivePromotions = cache(() => storefrontApi().request(E.activePromotions, tagged([CacheTag.PROMOTIONS])));

export const getFulfilmentSettings = cache(() => nullableOnNotFound(() => storefrontApi().request(E.fulfilmentSettings, tagged([CacheTag.FULFILMENT_SETTINGS]))));
export const getPaymentMethods = cache(() => storefrontApi().request(E.paymentMethods, tagged([CacheTag.PAYMENT_SETTINGS])));
export const getDeliveryZones = cache(() => storefrontApi().request(E.deliveryZones, tagged([CacheTag.DELIVERY_ZONES])));
export const getPickupLocations = cache(() => storefrontApi().request(E.pickupLocations, tagged([CacheTag.PICKUP_LOCATIONS])));
export const getOperatingHours = cache(() => storefrontApi().request(E.operatingHours, tagged([CacheTag.OPERATING_HOURS])));

/**
 * D-15 — a catalog read that fails must not fail the build or the page. Used
 * for everything that has a designed absent state; the caller decides what
 * that state is. Logged, because a swallowed failure is indistinguishable from
 * an empty store.
 */
export async function orNull<T>(read: () => Promise<T>, label: string): Promise<T | null> {
  try {
    return await read();
  } catch (error) {
    const { statusCode, message } = (error ?? {}) as { statusCode?: number; message?: string };
    console.error(`[catalog] ${label} failed (${statusCode ?? "no response"}: ${message ?? String(error)}) — rendering its absent state.`);
    return null;
  }
}
