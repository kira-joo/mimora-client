import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { jsonBody, shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/**
 * BFF → backend `/api/shop/auth/signup`. The backend answers `202 { status:
 * "accepted" }` identically whether the phone was new or already registered, and
 * sets no session — so there is nothing to merge a guest cart into and the guest
 * cart token is left alone. The merge happens at sign-in (`auth/login`), which is
 * where the customer is sent next. Passed through unchanged: this layer must not
 * add anything that could distinguish the two cases.
 */
export async function POST(request: Request) {
  return toResponse(await shopRequest(request, ShopEndpoints.signup, { body: await jsonBody(request), allowExpired: true }));
}
