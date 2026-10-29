import { ShopPrivacyEndpoints } from "@/lib/api/privacy.endpoints";
import { jsonBody, shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/**
 * BFF → backend `/api/shop/newsletter`. Public (a guest is the usual caller), so an
 * expired session is not a reason to refuse. The backend answers `202 { status:
 * "accepted" }` identically for a new, a repeated and a previously unsubscribed
 * address; passed through unchanged — this layer adds nothing that could tell them
 * apart, and forwards the real client IP so the backend's per-address limit is
 * per visitor, not per this server.
 */
export async function POST(request: Request) {
  return toResponse(await shopRequest(request, ShopPrivacyEndpoints.newsletter, { body: await jsonBody(request), allowExpired: true }));
}
