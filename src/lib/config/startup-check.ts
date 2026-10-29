/**
 * What this deployment is configured WITHOUT, as one line per gap.
 *
 * Each of these degrades quietly at runtime, which is right for a request and
 * wrong for a deployment: an unset REVALIDATE_SECRET makes the receiver answer
 * 404 to every invalidation the backend sends, so prices on prerendered pages
 * lag by the safety-net interval and nothing says why — the second silence in
 * the composition the workspace constitution is built around. So production
 * announces them once, at boot (src/instrumentation.ts).
 *
 * Pure, so the announcement itself is testable rather than trusted.
 */
export function configurationGaps(env: Record<string, string | undefined>): string[] {
  const gaps: string[] = [];
  if (!env.STAFF_API_URL) gaps.push("STAFF_API_URL is not set — every catalog read and every cart, checkout and account call will fail.");
  if (!env.STORE_ID) gaps.push("STORE_ID is not set — the storefront cannot verify that STAFF_API_URL is this store's backend, so every catalog read and every cart, checkout and account call is refused. It must equal the backend's STORE_ID.");
  if (!env.REVALIDATE_SECRET) gaps.push("REVALIDATE_SECRET is not set — cache invalidation is OFF: the backend's invalidations are refused (404), and prerendered prices and stock badges lag by up to the 300s safety net.");
  if (!env.SITE_URL) gaps.push("SITE_URL is not set — the sitemap is EMPTY and robots.txt names no sitemap.");
  if (!env.STORE_TIMEZONE) gaps.push("STORE_TIMEZONE is not set — order and review dates render in UTC, not the store's zone. It must match the backend's STORE_TIMEZONE.");
  return gaps;
}

/** The store's IANA zone for displaying dates. Must equal the backend's STORE_TIMEZONE. */
export function storeTimeZone(): string {
  return process.env.STORE_TIMEZONE || "UTC";
}
