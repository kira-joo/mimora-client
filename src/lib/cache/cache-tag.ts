/*
 * The cache-tag vocabulary — the exact strings mimora-staff PUBLISHES
 * from its admin routes' `revalidateTags` (measured from source, 2026-10-13).
 *
 * Duplicated rather than shared, deliberately: packages carry zero domain
 * knowledge (workspace CLAUDE.md), so the backend and this app each own a copy
 * and the contract test pins this one to the literal strings.
 *
 * NOTE — these are the tags that are actually EMITTED, not the backend's own
 * `CacheTag` const, which also lists THEME, REVIEWS, VARIANTS and FULFILMENT
 * and lacks seven that are emitted. A read tagged THEME would never be
 * invalidated: the theme-save route publishes STORE_PROFILE. Subscribe to what
 * is sent, not to what is declared.
 */
export const CacheTag = {
  STORE_PROFILE: "STORE_PROFILE",
  CONTENT: "CONTENT",
  PAGES: "PAGES",
  CATEGORIES: "CATEGORIES",
  COLLECTIONS: "COLLECTIONS",
  BRANDS: "BRANDS",
  PRODUCTS: "PRODUCTS",
  SIZE_GUIDES: "SIZE_GUIDES",
  PROMOTIONS: "PROMOTIONS",
  FULFILMENT_SETTINGS: "FULFILMENT_SETTINGS",
  DELIVERY_ZONES: "DELIVERY_ZONES",
  PICKUP_LOCATIONS: "PICKUP_LOCATIONS",
  OPERATING_HOURS: "OPERATING_HOURS",
  PAYMENT_SETTINGS: "PAYMENT_SETTINGS",
} as const;

export type CacheTag = (typeof CacheTag)[keyof typeof CacheTag];

const KNOWN = new Set<string>(Object.values(CacheTag));

export function isKnownCacheTag(tag: string): tag is CacheTag {
  return KNOWN.has(tag);
}

/**
 * A safety net under tag invalidation, never a substitute for it: a missed
 * webhook (backend down, secret rotated) heals within this window instead of
 * serving stale content forever, and a page degraded at build time (D-15 —
 * backend unreachable) is re-rendered from the real data within it.
 */
export const CATALOG_REVALIDATE_SECONDS = 300;
