import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { jsonBody, shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/auth/verify-email` (no-store; see lib/session/shop-request.ts). */
export async function POST(request: Request) {
  return toResponse(await shopRequest(request, ShopEndpoints.verifyEmail, { body: await jsonBody(request), allowExpired: true }));
}
