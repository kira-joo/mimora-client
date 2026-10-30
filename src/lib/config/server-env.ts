import "server-only";

/**
 * Server-only configuration. `STAFF_API_URL` has no `NEXT_PUBLIC_` prefix on
 * purpose: the browser must never learn the backend's origin (04 §3).
 *
 * Read lazily, at first use, so `next build` can run without a backend and the
 * failure names the variable instead of surfacing as a relative-URL 404.
 */
export function staffApiUrl(): string {
  const value = process.env.STAFF_API_URL;
  if (!value) throw new Error("STAFF_API_URL is not set — the storefront cannot reach its backend.");
  return value;
}

/** The secret the backend sends in `X-Revalidate-Secret` (mimora-staff publish-revalidation.ts). */
export function revalidateSecret(): string | undefined {
  return process.env.REVALIDATE_SECRET || undefined;
}
