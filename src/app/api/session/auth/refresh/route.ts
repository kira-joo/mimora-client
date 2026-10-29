import { randomUUID } from "node:crypto";
import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { clearSession, readSessionCookies } from "@/lib/session/cookies";
import { shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/**
 * Rotates the session. Lives UNDER the refresh cookie's path
 * (`/api/session/auth`) so the cookie reaches it and nothing else.
 *
 * The backend requires an Idempotency-Key here, and a fresh one per attempt is
 * the only correct choice: a reused key replays the stored empty 204 without
 * re-issuing cookies, and the next refresh would then present an
 * already-rotated token — reuse detection revokes the whole family and the
 * customer is signed out for nothing. The client's single-flight (sessionApi
 * `refreshAuth`) keeps it to one attempt at a time.
 *
 * Every failure is one 401, whatever the backend's reason — and the local
 * cookies are cleared, so the customer drops cleanly to guest instead of
 * looping on a session that cannot be renewed.
 */
export async function POST(request: Request) {
  const { refresh } = await readSessionCookies();
  if (!refresh) {
    await clearSession();
    return toResponse({ status: 401, data: { statusCode: 401, error: "UNAUTHORIZED", message: "Session expired." } });
  }
  const result = await shopRequest(request, ShopEndpoints.refresh, { withRefresh: true, allowExpired: true, idempotencyKey: randomUUID() });
  if (result.status >= 400) await clearSession();
  return toResponse(result);
}
