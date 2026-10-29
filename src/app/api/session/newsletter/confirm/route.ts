import { ShopPrivacyEndpoints } from "@/lib/api/privacy.endpoints";
import { jsonBody, shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/**
 * BFF → backend `/api/shop/newsletter/confirm` (no-store). The emailed token is the credential, so an
 * expired session is not a reason to refuse; the backend answers 204 once, then 401 for every other
 * state (replayed, expired, unknown, since unsubscribed) without saying which. Passed through unchanged.
 */
export async function POST(request: Request) {
  return toResponse(await shopRequest(request, ShopPrivacyEndpoints.confirmNewsletter, { body: await jsonBody(request), allowExpired: true }));
}
