import { ShopEndpoints } from "@/lib/api/shop.endpoints";
import { jsonBody, shopRequest, toResponse } from "@/lib/session/shop-request";

export const dynamic = "force-dynamic";

/** BFF → backend `/api/shop/profile/password` (no-store; see lib/session/shop-request.ts). */
export async function PUT(request: Request) {
  return toResponse(await shopRequest(request, ShopEndpoints.passwordChange, { body: await jsonBody(request) }));
}
