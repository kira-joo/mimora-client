import "server-only";
import type { AdapterRequest, AdapterResponse, RequestAdapter } from "@kira-joo/frontend-toolkit-core/server";
import { BackendIdentityError } from "../config/backend-identity";

/**
 * One retry for a server-side catalog READ that got no answer — never for anything that changes state.
 *
 * Why it exists: a deploy prerenders every category, collection, brand and product page at once, and the first wave of
 * those reads lands on a backend whose serverless instances are all cold (each connects to the database and checks its
 * indexes before answering). Under that burst the first reads can exceed the 10 s request timeout. Measured on Vercel:
 * the same commit failed three builds and passed two (cc53281, 2026-11-08), and ab25f71 failed the same way on
 * 2026-11-17 — every failure a first-wave "Request timed out". A read that times out on a cold instance succeeds a
 * moment later on a warm one, so it is retried once instead of failing the page.
 *
 * Retried (once, after `delayMs`): a GET whose request produced NO response — the adapter's timeout (`TimeoutError`) or
 * a network failure — or a 502/503/504 from the platform, or a backend identity check that could not reach the backend
 * (`BackendIdentityError` with `retryable`). Never retried: any non-GET; a request its caller aborted; any other status
 * (a 4xx is deterministic, a 500 is a bug to surface); a backend that answered as the WRONG store.
 *
 * The retry is logged, so a build or revalidation that needed one is visible rather than silently slower.
 */
export async function sendWithTransientRetry(
  request: AdapterRequest,
  send: RequestAdapter,
  { delayMs = 750, log = (message: string) => console.warn(message) }: { delayMs?: number; log?: (message: string) => void } = {}
): Promise<AdapterResponse> {
  if (request.method !== "GET") return send(request);

  let reason: string | null = null;
  try {
    const response = await send(request);
    if (!RETRYABLE_STATUSES.has(response.status)) return response;
    reason = `HTTP ${response.status}`;
  } catch (error) {
    if (request.signal?.aborted || !isTransient(error)) throw error;
    reason = (error as Error).name === "TimeoutError" ? "timed out" : (error as Error).message || String(error);
  }

  log(`[storefront-api] GET ${pathOf(request.url)} — ${reason}; retrying once in ${delayMs} ms.`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
  return send(request);
}

const RETRYABLE_STATUSES = new Set([502, 503, 504]);

function isTransient(error: unknown): boolean {
  if (error instanceof BackendIdentityError) return error.retryable;
  const name = (error as { name?: string } | null)?.name;
  // TimeoutError: the adapter's own timeout. TypeError: fetch's "network failure" (no response at all).
  return name === "TimeoutError" || name === "TypeError";
}

/** The path only — never the backend's origin, which this app keeps out of anything it prints (non-negotiable 5). */
function pathOf(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}
